import { EllonEntityType, EllonJobType, Prisma, Product, ProductStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { prisma } from '@config/database.js';
import { ellonClient } from './ellon.client.js';
import { ellonStockService } from './ellon-stock.service.js';
import { DAY_MS, Raw, decimal, errorMessage, integer, localDate, normalizeCategory, text } from './ellon-sync.util.js';

interface SyncResult {
  mode: 'full' | 'incremental';
  pages: number;
  received: number;
  created: number;
  updated: number;
  linkedBySku: number;
  deactivated: number;
  categoriesCreated: number;
  skipped: number;
  errors: Array<{ externalId?: string; message: string }>;
}

/** Estado persistido no payload do job para retomar a paginação após falha. */
export interface ProductSyncProgress {
  mode: 'full' | 'incremental';
  since: string | null;
  runStartedAt: string;
  nextPage: number;
  fingerprints: string[];
  result: SyncResult;
}

const FULL_SYNC_INTERVAL_MS = DAY_MS;
// Proteção contra resposta parcial da Ellon: acima disso nada é inativado.
const MAX_DEACTIVATION_RATIO = 0.3;

function productsFrom(body: unknown): Raw[] {
  if (Array.isArray(body)) return body.filter(item => item && typeof item === 'object') as Raw[];
  if (!body || typeof body !== 'object') return [];
  const object = body as Raw;
  for (const key of ['produtos', 'Produtos', 'data', 'items', 'registros']) {
    if (Array.isArray(object[key])) return productsFrom(object[key]);
  }
  return object.id !== undefined ? [object] : [];
}

function imageList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    const candidate = text(item && typeof item === 'object' ? (item as Raw).foto : item);
    if (/^https?:\/\//i.test(candidate)) return [candidate];
    if (/^data:image\//i.test(candidate) && candidate.length <= 2_000_000) return [candidate];
    return [];
  }).slice(0, 12);
}

export function normalizedProduct(raw: Raw) {
  const externalId = text(raw.id);
  if (!externalId || !/^\d+$/.test(externalId)) throw new Error('Produto Ellon sem ID numérico válido.');
  const sequence = integer(raw.sequencia);
  const name = (text(raw.descricao) || `Produto Ellon ${externalId}`).slice(0, 200);
  const externalSku = (text(raw.reduzida) || text(raw.ref_fabrica) || text(raw.codigo_barra)).slice(0, 50);
  const stock = integer(raw.quantidade);
  const promo = Math.max(0, decimal(raw.preco_oferta));
  const suppliers = Array.isArray(raw.fornecedores) ? raw.fornecedores.filter(item => item && typeof item === 'object') as Raw[] : [];
  return {
    externalId,
    sequence,
    externalSku,
    fallbackSku: `ELLON-${externalId}-${sequence}`,
    application: text(raw.aplicacao),
    images: imageList(raw.fotos),
    category: normalizeCategory(text(raw.grupo)) || 'Sem categoria',
    data: {
      name,
      subcategory: normalizeCategory(text(raw.sub_grupo)) || null,
      supplier: text(raw.marca) || text(suppliers[0]?.nome) || 'Ellon',
      costPrice: new Prisma.Decimal(Math.max(0, decimal(raw.custo_real))),
      salePrice: new Prisma.Decimal(Math.max(0, decimal(raw.preco_venda))),
      promoPrice: promo > 0 ? new Prisma.Decimal(promo) : null,
      stock,
      minStock: integer(raw.estoque_minimo),
    },
    specifications: {
      ellonId: externalId,
      ellonSequence: sequence,
      sequenceDescription: text(raw.descricao_sequencia),
      application: text(raw.aplicacao),
      barcode: text(raw.codigo_barra),
      reducedReference: text(raw.reduzida),
      factoryReference: text(raw.ref_fabrica),
      ncm: text(raw.ncm),
      unit: text(raw.unidade),
      type: text(raw.tipo),
      brand: text(raw.marca),
      group: text(raw.grupo),
      subgroup: text(raw.sub_grupo),
      section: text(raw.secao),
      weight: text(raw.peso),
      height: decimal(raw.altura),
      width: decimal(raw.largura),
      length: decimal(raw.comprimento),
      lastPurchaseAt: text(raw.data_ultima_compra) || text(raw.ultima_compra),
      lastSaleAt: text(raw.data_ultima_venda) || text(raw.ultima_venda),
      suppliers: suppliers.map(item => ({ id: text(item.id), name: text(item.nome), reference: text(item.referencia) })),
    },
  };
}

type Normalized = ReturnType<typeof normalizedProduct>;

/** Estoque local = Ellon − saídas do M2 ainda não faturadas lá (ver EllonStockService). */
function withReservation(product: Normalized, reserved: number): Normalized {
  const ellonStock = product.data.stock;
  return {
    ...product,
    data: { ...product.data, stock: Math.max(0, ellonStock - reserved) },
    specifications: { ...product.specifications, ellonStock, reservedStock: reserved },
  } as Normalized;
}

function statusFor(stock: number, current: Product | null, deactivatedBySync: boolean): ProductStatus {
  // Status definidos manualmente no M2 (descontinuado/inativo) prevalecem sobre o ERP.
  if (current?.status === ProductStatus.DISCONTINUED) return current.status;
  if (current?.status === ProductStatus.INACTIVE && !deactivatedBySync) return current.status;
  return stock > 0 ? ProductStatus.ACTIVE : ProductStatus.OUT_OF_STOCK;
}

/** Campos editoriais do M2 (fotos, descrição de venda, ofertas próprias) não são apagados pelo ERP. */
function updateData(product: Normalized, current: Product, deactivatedBySync: boolean, category: string): Prisma.ProductUpdateInput {
  const currentSpecs = (current.specifications && typeof current.specifications === 'object' && !Array.isArray(current.specifications))
    ? current.specifications as Record<string, unknown>
    : {};
  const descriptionFromErp = !current.description.trim()
    || current.description === current.name
    || current.description === currentSpecs.application;
  const hasLocalOffer = Boolean(current.offerType);
  return {
    ...product.data,
    category,
    ...(hasLocalOffer && !product.data.promoPrice && { promoPrice: current.promoPrice }),
    ...(descriptionFromErp && { description: product.application || product.data.name }),
    ...(product.images.length > 0 && { images: product.images }),
    specifications: { ...currentSpecs, ...product.specifications } as Prisma.InputJsonValue,
    status: statusFor(product.data.stock, current, deactivatedBySync),
  };
}

export class EllonProductSyncService {
  async enqueue(createdById?: string, manual = false, full = false) {
    const active = await prisma.ellonJob.findFirst({
      where: {
        type: EllonJobType.SYNC_PRODUCTS,
        // Falha com retentativa agendada continua de onde parou; não abre uma carga paralela.
        OR: [{ status: { in: ['PENDING', 'PROCESSING'] } }, { status: 'FAILED', nextAttemptAt: { lt: new Date('9000-01-01') } }],
      },
      orderBy: { createdAt: 'desc' },
    });
    if (active) return active;

    const bucket = Math.floor(Date.now() / (10 * 60_000));
    const idempotencyKey = manual ? `product-sync:manual:${randomUUID()}` : `product-sync:${bucket}`;
    return prisma.ellonJob.upsert({
      where: { idempotencyKey },
      update: {},
      create: {
        type: EllonJobType.SYNC_PRODUCTS,
        idempotencyKey,
        payload: { requestedAt: new Date().toISOString(), ...(full && { full: true }) },
        createdById,
      },
    });
  }

  private async initialProgress(forceFull: boolean): Promise<ProductSyncProgress> {
    const connection = await prisma.ellonConnection.findUnique({ where: { id: 'default' } });
    const fullDue = !connection?.lastProductSyncAt
      || !connection.lastFullProductSyncAt
      || Date.now() - connection.lastFullProductSyncAt.getTime() >= FULL_SYNC_INTERVAL_MS;
    const mode = forceFull || fullDue ? 'full' : 'incremental';
    return {
      mode,
      // Um dia de sobreposição cobre fuso horário e a semântica (dia exato ou "desde") do filtro Ellon.
      since: mode === 'incremental' && connection?.lastProductSyncAt
        ? localDate(new Date(connection.lastProductSyncAt.getTime() - DAY_MS))
        : null,
      runStartedAt: new Date().toISOString(),
      nextPage: 1,
      fingerprints: [],
      result: { mode, pages: 0, received: 0, created: 0, updated: 0, linkedBySku: 0, deactivated: 0, categoriesCreated: 0, skipped: 0, errors: [] },
    };
  }

  private async categoryResolver(result: SyncResult) {
    const known = new Map((await prisma.productCategory.findMany({ select: { name: true } }))
      .map(item => [item.name.toLowerCase(), item.name]));
    return async (name: string): Promise<string> => {
      const existing = known.get(name.toLowerCase());
      if (existing) return existing;
      const created = await prisma.productCategory.upsert({ where: { name }, update: {}, create: { name } });
      known.set(name.toLowerCase(), created.name);
      result.categoriesCreated += 1;
      return created.name;
    };
  }

  private async availableSku(preferred: string, fallback: string): Promise<string> {
    for (const candidate of [preferred, fallback]) {
      if (candidate && !(await prisma.product.findUnique({ where: { sku: candidate }, select: { id: true } }))) return candidate;
    }
    return `${fallback}-${randomUUID().slice(0, 8)}`;
  }

  private async availableSlug(base: string): Promise<string> {
    const taken = await prisma.product.findUnique({ where: { slug: base }, select: { id: true } });
    return taken ? `${base}-${randomUUID().slice(0, 8)}` : base;
  }

  private async upsertProduct(raw: Raw, result: SyncResult, resolveCategory: (name: string) => Promise<string>, reserved: Map<string, number>) {
    const normalized = normalizedProduct(raw);
    const product = normalized;
    const category = await resolveCategory(product.category);
    const externalKey = { entityType: EllonEntityType.PRODUCT, externalId: product.externalId, externalSequence: product.sequence };
    const seen = { lastSeenAt: new Date().toISOString() };

    const link = await prisma.ellonEntityLink.findUnique({ where: { entityType_externalId_externalSequence: externalKey } });
    const linkedProduct = link ? await prisma.product.findUnique({ where: { id: link.localId } }) : null;
    if (link && linkedProduct) {
      const product = withReservation(normalized, reserved.get(linkedProduct.id) ?? 0);
      const metadata = (link.metadata && typeof link.metadata === 'object' ? link.metadata : {}) as Record<string, unknown>;
      await prisma.$transaction([
        prisma.product.update({ where: { id: linkedProduct.id }, data: updateData(product, linkedProduct, Boolean(metadata.deactivatedBySync), category) }),
        prisma.ellonEntityLink.update({ where: { id: link.id }, data: { metadata: { ...metadata, ...seen, deactivatedBySync: false } } }),
      ]);
      result.updated += 1;
      return;
    }
    // Vínculo órfão (produto local apagado): recria o produto a partir da Ellon.
    if (link) await prisma.ellonEntityLink.delete({ where: { id: link.id } });

    const sameSku = product.externalSku ? await prisma.product.findUnique({ where: { sku: product.externalSku } }) : null;
    const sameSkuLinked = sameSku
      ? await prisma.ellonEntityLink.findUnique({ where: { entityType_localId: { entityType: EllonEntityType.PRODUCT, localId: sameSku.id } } })
      : null;
    if (sameSku && !sameSkuLinked) {
      const product = withReservation(normalized, reserved.get(sameSku.id) ?? 0);
      await prisma.$transaction([
        prisma.product.update({ where: { id: sameSku.id }, data: updateData(product, sameSku, false, category) }),
        prisma.ellonEntityLink.create({ data: { ...externalKey, localId: sameSku.id, metadata: { linkedBy: 'sku', sku: product.externalSku, ...seen } } }),
      ]);
      result.linkedBySku += 1;
      return;
    }

    // SKU já pertence a outra variação Ellon (mesma referência, outra sequência): usa SKU próprio.
    const sku = await this.availableSku(sameSku ? '' : product.externalSku, product.fallbackSku);
    const slug = await this.availableSlug(`ellon-${product.externalId}-${product.sequence}`);
    await prisma.$transaction(async tx => {
      const created = await tx.product.create({
        data: {
          ...product.data,
          category,
          description: product.application || product.data.name,
          images: product.images,
          specifications: product.specifications as Prisma.InputJsonValue,
          status: statusFor(product.data.stock, null, false),
          sku,
          slug,
        },
      });
      await tx.ellonEntityLink.create({ data: { ...externalKey, localId: created.id, metadata: { imported: true, ...seen } } });
    });
    result.created += 1;
  }

  /** Inativa produtos vinculados que deixaram de existir na Ellon numa carga completa bem-sucedida. */
  private async deactivateMissing(runStartedAt: Date, result: SyncResult) {
    const [linked, stale] = await Promise.all([
      prisma.ellonEntityLink.count({ where: { entityType: EllonEntityType.PRODUCT } }),
      prisma.ellonEntityLink.findMany({ where: { entityType: EllonEntityType.PRODUCT, updatedAt: { lt: runStartedAt } } }),
    ]);
    if (!stale.length) return;
    if (result.received === 0 || stale.length > linked * MAX_DEACTIVATION_RATIO) {
      result.errors.push({ message: `${stale.length} produto(s) vinculados não vieram na carga completa; inativação suspensa por segurança.` });
      return;
    }
    for (const link of stale) {
      const metadata = (link.metadata && typeof link.metadata === 'object' ? link.metadata : {}) as Record<string, unknown>;
      const updated = await prisma.product.updateMany({
        where: { id: link.localId, status: { in: [ProductStatus.ACTIVE, ProductStatus.OUT_OF_STOCK] } },
        data: { status: ProductStatus.INACTIVE },
      });
      await prisma.ellonEntityLink.update({ where: { id: link.id }, data: { metadata: { ...metadata, deactivatedBySync: updated.count > 0 || Boolean(metadata.deactivatedBySync), missingSince: runStartedAt.toISOString() } } });
      result.deactivated += updated.count;
    }
  }

  async syncAll(
    options: { full?: boolean; progress?: ProductSyncProgress | null; checkpoint?: (progress: ProductSyncProgress) => Promise<void> } = {},
  ): Promise<SyncResult> {
    const progress = options.progress ?? await this.initialProgress(Boolean(options.full));
    const { result } = progress;
    const seenPages = new Set(progress.fingerprints);
    const resolveCategory = await this.categoryResolver(result);
    const reserved = await ellonStockService.activeByProduct();
    const filter = progress.since ? { data_alteracao: progress.since } : {};
    let finished = false;

    for (let page = progress.nextPage; page <= 5000; page += 1) {
      const body = await ellonClient.request<unknown>('POST', '/publico/integracoes/produtos', { query: { pagina: page }, body: filter, read: true });
      const products = productsFrom(body);
      const fingerprint = products.map(item => `${text(item.id)}:${integer(item.sequencia)}`).join('|');
      if (products.length === 0 || seenPages.has(fingerprint)) { finished = true; break; }
      seenPages.add(fingerprint);
      result.pages += 1;
      result.received += products.length;

      for (const raw of products) {
        try {
          await this.upsertProduct(raw, result, resolveCategory, reserved);
        } catch (error) {
          result.skipped += 1;
          if (result.errors.length < 100) result.errors.push({ externalId: text(raw.id) || undefined, message: errorMessage(error) });
          // O produto existe na Ellon: não pode ser tratado como removido no fim da carga completa.
          if (text(raw.id)) {
            await prisma.ellonEntityLink.updateMany({
              where: { entityType: EllonEntityType.PRODUCT, externalId: text(raw.id) },
              data: { updatedAt: new Date() },
            }).catch(() => undefined);
          }
        }
      }
      progress.nextPage = page + 1;
      progress.fingerprints = [...seenPages].slice(-3);
      await options.checkpoint?.(progress);
    }
    if (!finished) throw new Error('Limite de páginas de produtos atingido antes do fim da listagem Ellon.');

    const runStartedAt = new Date(progress.runStartedAt);
    if (progress.mode === 'full') await this.deactivateMissing(runStartedAt, result);
    // O checkpoint é o início da execução: alterações feitas durante a carga entram na próxima.
    await prisma.ellonConnection.update({
      where: { id: 'default' },
      data: {
        lastProductSyncAt: runStartedAt,
        ...(progress.mode === 'full' && { lastFullProductSyncAt: runStartedAt }),
        lastError: result.skipped ? `${result.skipped} produto(s) ignorado(s) na última sincronização.` : null,
      },
    });
    return result;
  }
}

export const ellonProductSyncService = new EllonProductSyncService();
