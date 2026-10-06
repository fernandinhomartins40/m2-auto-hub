import { EllonEntityType, EllonJobType, Prisma, ProductStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { prisma } from '@config/database.js';
import { ellonClient } from './ellon.client.js';

type RawProduct = Record<string, unknown>;

interface SyncResult {
  pages: number;
  received: number;
  created: number;
  updated: number;
  linkedBySku: number;
  skipped: number;
  errors: Array<{ externalId?: string; message: string }>;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
}

function decimal(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  let normalized = text(value).replace(/\s/g, '');
  if (normalized.includes(',') && normalized.includes('.')) normalized = normalized.replace(/\./g, '').replace(',', '.');
  else normalized = normalized.replace(',', '.');
  const parsed = Number(normalized.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function integer(value: unknown): number {
  return Math.max(0, Math.floor(decimal(value)));
}

function productsFrom(body: unknown): RawProduct[] {
  if (Array.isArray(body)) return body.filter(item => item && typeof item === 'object') as RawProduct[];
  if (!body || typeof body !== 'object') return [];
  const object = body as Record<string, unknown>;
  for (const key of ['produtos', 'Produtos', 'data', 'items', 'registros']) {
    if (Array.isArray(object[key])) return productsFrom(object[key]);
  }
  return object.id !== undefined ? [object] : [];
}

function imageList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    const candidate = text(item && typeof item === 'object' ? (item as Record<string, unknown>).foto : item);
    if (/^https?:\/\//i.test(candidate)) return [candidate];
    if (/^data:image\//i.test(candidate) && candidate.length <= 2_000_000) return [candidate];
    return [];
  }).slice(0, 12);
}

function normalizedProduct(raw: RawProduct) {
  const externalId = text(raw.id);
  if (!externalId || !/^\d+$/.test(externalId)) throw new Error('Produto Ellon sem ID numérico válido.');
  const sequence = integer(raw.sequencia);
  const name = text(raw.descricao) || `Produto Ellon ${externalId}`;
  const externalSku = text(raw.reduzida) || text(raw.ref_fabrica) || text(raw.codigo_barra);
  const fallbackSku = `ELLON-${externalId}-${sequence}`;
  const stock = integer(raw.quantidade);
  const salePrice = Math.max(0, decimal(raw.preco_venda));
  const promo = Math.max(0, decimal(raw.preco_oferta));
  const images = imageList(raw.fotos);
  return {
    externalId,
    sequence,
    externalSku,
    fallbackSku,
    data: {
      name,
      description: text(raw.aplicacao) || name,
      category: text(raw.grupo) || 'Sem categoria',
      subcategory: text(raw.sub_grupo) || null,
      supplier: text(raw.marca) || text((Array.isArray(raw.fornecedores) ? raw.fornecedores[0] as Record<string, unknown> : {}).nome) || 'Ellon',
      costPrice: new Prisma.Decimal(Math.max(0, decimal(raw.custo_real))),
      salePrice: new Prisma.Decimal(salePrice),
      promoPrice: promo > 0 ? new Prisma.Decimal(promo) : null,
      stock,
      minStock: integer(raw.estoque_minimo),
      images,
      status: stock > 0 ? ProductStatus.ACTIVE : ProductStatus.OUT_OF_STOCK,
      specifications: {
        ellonId: externalId,
        ellonSequence: sequence,
        barcode: text(raw.codigo_barra),
        factoryReference: text(raw.ref_fabrica),
        ncm: text(raw.ncm),
        unit: text(raw.unidade),
        brand: text(raw.marca),
        section: text(raw.secao),
        weight: text(raw.peso),
        height: decimal(raw.altura),
        width: decimal(raw.largura),
        length: decimal(raw.comprimento),
      } as Prisma.InputJsonValue,
    },
  };
}

export class EllonProductSyncService {
  async enqueue(createdById?: string, manual = false) {
    const active = await prisma.ellonJob.findFirst({
      where: {
        type: EllonJobType.SYNC_PRODUCTS,
        status: { in: ['PENDING', 'PROCESSING'] },
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
        payload: { requestedAt: new Date().toISOString() },
        createdById,
      },
    });
  }

  async syncAll(): Promise<SyncResult> {
    const result: SyncResult = { pages: 0, received: 0, created: 0, updated: 0, linkedBySku: 0, skipped: 0, errors: [] };
    const seenPages = new Set<string>();
    const connection = await prisma.ellonConnection.findUnique({ where: { id: 'default' } });
    const filter = connection?.lastProductSyncAt
      ? { data_alteracao: connection.lastProductSyncAt.toISOString().slice(0, 10) }
      : {};

    for (let page = 1; page <= 1000; page += 1) {
      const body = await ellonClient.request<unknown>('POST', '/publico/integracoes/produtos', { query: { pagina: page }, body: filter });
      const products = productsFrom(body);
      if (products.length === 0) break;
      const fingerprint = products.map(item => `${text(item.id)}:${integer(item.sequencia)}`).join('|');
      if (seenPages.has(fingerprint)) break;
      seenPages.add(fingerprint);
      result.pages += 1;
      result.received += products.length;

      for (const raw of products) {
        try {
          const product = normalizedProduct(raw);
          const externalKey = {
            entityType: EllonEntityType.PRODUCT,
            externalId: product.externalId,
            externalSequence: product.sequence,
          };
          const link = await prisma.ellonEntityLink.findUnique({
            where: { entityType_externalId_externalSequence: externalKey },
          });
          if (link) {
            await prisma.product.update({ where: { id: link.localId }, data: product.data });
            result.updated += 1;
            continue;
          }

          const sameSku = product.externalSku
            ? await prisma.product.findUnique({ where: { sku: product.externalSku } })
            : null;
          if (sameSku) {
            await prisma.$transaction([
              prisma.product.update({ where: { id: sameSku.id }, data: product.data }),
              prisma.ellonEntityLink.create({
                data: { ...externalKey, localId: sameSku.id, metadata: { linkedBy: 'sku', sku: product.externalSku } },
              }),
            ]);
            result.linkedBySku += 1;
            continue;
          }

          const created = await prisma.product.create({
            data: {
              ...product.data,
              sku: product.externalSku || product.fallbackSku,
              slug: `ellon-${product.externalId}-${product.sequence}`,
            },
          });
          await prisma.ellonEntityLink.create({ data: { ...externalKey, localId: created.id } });
          result.created += 1;
        } catch (error) {
          result.skipped += 1;
          if (result.errors.length < 100) {
            result.errors.push({ externalId: text(raw.id) || undefined, message: error instanceof Error ? error.message : String(error) });
          }
        }
      }
    }

    await prisma.ellonConnection.update({
      where: { id: 'default' },
      data: { lastProductSyncAt: new Date(), lastError: result.skipped ? `${result.skipped} produto(s) ignorado(s).` : null },
    });
    return result;
  }
}

export const ellonProductSyncService = new EllonProductSyncService();
