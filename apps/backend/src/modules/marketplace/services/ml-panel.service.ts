import {
  AiSuggestionStatus,
  ListingSyncStatus,
  MarketplaceConnectionStatus,
  MarketplaceListing,
  MarketplaceProductProfile,
  MarketplaceProvider,
  Prisma,
  Product,
} from '@prisma/client';
import { prisma } from '@config/database.js';
import { ApiError } from '@shared/utils/error.util.js';
import { logger } from '@shared/utils/logger.util.js';
import { processProductImage } from '../../../middleware/upload.middleware.js';
import { MercadoLivreAdapter, plainText } from '../adapters/mercado-livre.adapter.js';
import { getAdapter } from '../adapters/index.js';
import { CategoryAttribute, ProviderAccount } from '../marketplace.types.js';
import {
  AUTO_ATTRIBUTES,
  EffectiveFields,
  ReadinessCheck,
  StoreSettings,
  effectiveFields,
  parseSettings,
  profileAttributes,
  qualityScore,
  readiness,
} from '../mappers/publication.js';
import { absoluteImageUrl } from '../mappers/product-normalizer.js';
import { connectionService } from './connection.service.js';
import { listingService } from './listing.service.js';
import { tokenRefreshService } from './token-refresh.service.js';
import { MlProfileDto, MlSettingsDto, MlPanelQueryDto } from '../dto/ml-panel.dto.js';

const PROVIDER = MarketplaceProvider.MERCADO_LIVRE;
const CATEGORY_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_CANDIDATES = 3000;

export type PanelStatus = 'READY' | 'PENDING' | 'PUBLISHED' | 'PAUSED' | 'ERROR';

type ProductWithRelations = Product & {
  marketplaceProfiles: MarketplaceProductProfile[];
  marketplaceListings: MarketplaceListing[];
};

function images(product: Product): string[] {
  return Array.isArray(product.images) ? product.images.filter((url): url is string => typeof url === 'string') : [];
}

function panelStatus(listing: MarketplaceListing | undefined, checks: ReadinessCheck[]): PanelStatus {
  if (listing?.externalId) {
    if (listing.status === ListingSyncStatus.PAUSED) return 'PAUSED';
    if (listing.status === ListingSyncStatus.ERROR || listing.status === ListingSyncStatus.OUT_OF_SYNC) return 'ERROR';
    return 'PUBLISHED';
  }
  if (listing?.status === ListingSyncStatus.ERROR) return 'ERROR';
  return checks.every(check => check.ok) ? 'READY' : 'PENDING';
}

/**
 * Painel do Mercado Livre: mostra o que falta em cada produto, guarda a edicao
 * rapida no perfil do produto e so publica o que o lojista aprovar.
 */
export class MlPanelService {
  private categoryCache = new Map<string, { at: number; attributes: CategoryAttribute[] }>();

  // --- Regras da loja ---

  async getSettings(): Promise<StoreSettings> {
    const conn = await connectionService.getRaw(PROVIDER);
    return parseSettings(conn?.settings);
  }

  async updateSettings(dto: MlSettingsDto): Promise<StoreSettings> {
    await connectionService.ensureAll();
    const next = { ...(await this.getSettings()), ...dto };
    await prisma.marketplaceConnection.update({
      where: { provider: PROVIDER },
      data: { settings: next as unknown as Prisma.InputJsonValue },
    });
    // Acrescimo, garantia e tipo valem para os anuncios ja publicados tambem.
    void this.resyncAll();
    return next;
  }

  private async resyncAll(): Promise<void> {
    const listings = await prisma.marketplaceListing.findMany({
      where: { provider: PROVIDER, externalId: { not: null } },
      select: { id: true },
    });
    for (const listing of listings) {
      await listingService.sync(listing.id).catch(err =>
        logger.warn('[MlPanel] falha ao reaplicar regras', { listingId: listing.id, err: String(err) })
      );
    }
  }

  // --- Categoria ---

  private async account(): Promise<ProviderAccount | null> {
    const conn = await connectionService.getRaw(PROVIDER);
    if (!conn || conn.status !== MarketplaceConnectionStatus.CONNECTED) return null;
    return tokenRefreshService.ensureFreshToken(PROVIDER).catch(() => null);
  }

  private async categoryAttributes(account: ProviderAccount, categoryId: string): Promise<CategoryAttribute[]> {
    const cached = this.categoryCache.get(categoryId);
    if (cached && Date.now() - cached.at < CATEGORY_TTL_MS) return cached.attributes;
    const attributes = await getAdapter(PROVIDER).getCategoryAttributes(account, categoryId);
    this.categoryCache.set(categoryId, { at: Date.now(), attributes });
    return attributes;
  }

  /**
   * Obrigatorios ainda vazios (null quando nao da para consultar a categoria) e
   * quantas caracteristicas a loja preenche de quantas a categoria oferece.
   */
  private async attributeStats(
    account: ProviderAccount | null,
    profile: MarketplaceProductProfile | undefined
  ): Promise<{ missing: string[] | null; filled: number; total: number }> {
    const filled = new Set(profileAttributes(profile ?? null).map(item => item.id));
    if (!account || !profile?.categoryId) return { missing: null, filled: filled.size, total: 0 };
    const attributes = await this.categoryAttributes(account, profile.categoryId).catch(() => null);
    if (!attributes) return { missing: null, filled: filled.size, total: 0 };
    const fillable = attributes.filter(attr => !AUTO_ATTRIBUTES.has(attr.id) && !attr.readOnly);
    return {
      missing: fillable.filter(attr => attr.required && !filled.has(attr.id)).map(attr => attr.name),
      filled: fillable.filter(attr => filled.has(attr.id)).length,
      total: fillable.length,
    };
  }

  private quality(eff: EffectiveFields, product: Product, profile: MarketplaceProductProfile | undefined, stats: { filled: number; total: number }, checks: ReadinessCheck[]) {
    return qualityScore({
      photos: images(product).length,
      titleLength: eff.title.length,
      filledAttributes: stats.filled,
      totalAttributes: stats.total,
      descriptionLength: plainText(profile?.description?.trim() || product.description || '').length,
      ready: checks.every(check => check.ok),
    });
  }

  // --- Lista ---

  private evaluate(product: ProductWithRelations, settings: StoreSettings) {
    const profile = product.marketplaceProfiles[0];
    const eff = effectiveFields(product, profile ?? null, settings);
    return { profile, eff, listing: product.marketplaceListings[0] };
  }

  async list(query: MlPanelQueryDto) {
    const settings = await this.getSettings();
    const account = await this.account();
    const search = query.q?.trim();
    const where: Prisma.ProductWhereInput = {
      AND: [
        search
          ? { OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
            { supplier: { contains: search, mode: 'insensitive' } },
          ] }
          : {},
        // Por padrao: produtos com estoque, mais os que ja tem perfil ou anuncio.
        query.scope === 'all'
          ? {}
          : { OR: [
            { stock: { gt: 0 } },
            { marketplaceProfiles: { some: { provider: PROVIDER } } },
            { marketplaceListings: { some: { provider: PROVIDER } } },
          ] },
      ],
    };

    const products = await prisma.product.findMany({
      where,
      include: {
        marketplaceProfiles: { where: { provider: PROVIDER } },
        marketplaceListings: { where: { provider: PROVIDER } },
        aiSuggestions: { where: { provider: PROVIDER }, select: { status: true } },
      },
      orderBy: { name: 'asc' },
      take: MAX_CANDIDATES,
    });

    const rows = [];
    for (const product of products) {
      const { profile, eff, listing } = this.evaluate(product, settings);
      const stats = await this.attributeStats(account, profile);
      const checks = readiness(eff, images(product), profile?.categoryId, stats.missing);
      rows.push({
        aiStatus: product.aiSuggestions[0]?.status ?? null,
        quality: this.quality(eff, product, profile, stats, checks).score,
        productId: product.id,
        name: product.name,
        sku: product.sku,
        image: images(product)[0] ? absoluteImageUrl(images(product)[0]) : null,
        stock: product.stock,
        sitePrice: eff.basePrice,
        price: eff.price,
        quantity: eff.quantity,
        stockMode: eff.stockMode,
        title: eff.title,
        status: panelStatus(listing, checks),
        missing: checks.filter(check => !check.ok).map(check => check.label),
        approvedAt: profile?.approvedAt ?? null,
        listing: listing
          ? {
            id: listing.id,
            externalId: listing.externalId,
            externalUrl: listing.externalUrl,
            status: listing.status,
            pausedBySystem: listing.pausedBySystem,
            lastError: listing.lastError,
          }
          : null,
      });
    }

    const counts = { ALL: rows.length, READY: 0, PENDING: 0, PUBLISHED: 0, PAUSED: 0, ERROR: 0, AI_READY: 0 };
    for (const row of rows) {
      counts[row.status] += 1;
      if (row.aiStatus === AiSuggestionStatus.READY) counts.AI_READY += 1;
    }
    const filtered = query.status === 'AI_READY'
      ? rows.filter(row => row.aiStatus === AiSuggestionStatus.READY)
      : query.status && query.status !== 'ALL' ? rows.filter(row => row.status === query.status) : rows;
    const start = (query.page - 1) * query.pageSize;
    return {
      items: filtered.slice(start, start + query.pageSize),
      total: filtered.length,
      page: query.page,
      pageSize: query.pageSize,
      counts,
      truncated: products.length >= MAX_CANDIDATES,
      connected: Boolean(account),
    };
  }

  // --- Detalhe ---

  private async loadProduct(productId: string): Promise<ProductWithRelations> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        marketplaceProfiles: { where: { provider: PROVIDER } },
        marketplaceListings: { where: { provider: PROVIDER } },
      },
    });
    if (!product) throw ApiError.notFound('Produto não encontrado.');
    return product;
  }

  async detail(productId: string) {
    const [product, settings, account] = await Promise.all([this.loadProduct(productId), this.getSettings(), this.account()]);
    const { profile, eff, listing } = this.evaluate(product, settings);
    const specs = (product.specifications && typeof product.specifications === 'object' && !Array.isArray(product.specifications))
      ? product.specifications as Record<string, unknown>
      : {};

    let categoryAttributes: Array<CategoryAttribute & { value: { valueId: string | null; valueName: string | null } | null }> = [];
    let categorySuggestions: Array<{ id: string; name: string; path?: string }> = [];
    if (account) {
      if (profile?.categoryId) {
        const filled = new Map(profileAttributes(profile).map(item => [item.id, item]));
        const attributes = await this.categoryAttributes(account, profile.categoryId).catch(() => []);
        categoryAttributes = attributes
          .filter(attr => !AUTO_ATTRIBUTES.has(attr.id))
          .map(attr => {
            const value = filled.get(attr.id);
            return { ...attr, value: value ? { valueId: value.valueId ?? null, valueName: value.valueName ?? null } : null };
          });
      } else {
        categorySuggestions = await getAdapter(PROVIDER).suggestCategories(account, eff.title).catch(() => []);
      }
    }

    const stats = await this.attributeStats(account, profile);
    const checks = readiness(eff, images(product), profile?.categoryId, stats.missing);
    const [fee, ai] = await Promise.all([
      this.estimateFee(account, eff, profile?.categoryId),
      prisma.marketplaceAiSuggestion.findUnique({ where: { productId_provider: { productId, provider: PROVIDER } } }),
    ]);

    return {
      quality: this.quality(eff, product, profile, stats, checks),
      ai: ai ? { status: ai.status, payload: ai.payload, error: ai.error, updatedAt: ai.updatedAt, appliedAt: ai.appliedAt } : null,
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        description: product.description,
        stock: product.stock,
        salePrice: Number(product.salePrice),
        promoPrice: product.promoPrice ? Number(product.promoPrice) : null,
        images: images(product).map(url => ({ path: url, url: absoluteImageUrl(url) })),
        ellon: {
          stock: specs.ellonStock ?? null,
          reserved: specs.reservedStock ?? null,
          barcode: specs.barcode ?? null,
          factoryReference: specs.factoryReference ?? null,
          application: specs.application ?? null,
        },
      },
      profile: profile ?? null,
      effective: eff,
      readiness: checks,
      status: panelStatus(listing, checks),
      listing: listing ?? null,
      category: profile?.categoryId ? { id: profile.categoryId, name: profile.categoryName } : null,
      categoryAttributes,
      categorySuggestions,
      fee,
      settings,
      connected: Boolean(account),
    };
  }

  private async estimateFee(account: ProviderAccount | null, eff: EffectiveFields, categoryId?: string | null) {
    if (!account || !categoryId || eff.price <= 0) return null;
    const adapter = getAdapter(PROVIDER) as MercadoLivreAdapter;
    const saleFee = await adapter.estimateSaleFee(account, eff.price, categoryId, eff.listingTypeId).catch(() => null);
    if (saleFee === null) return null;
    return { saleFee, net: Math.round((eff.price - saleFee) * 100) / 100 };
  }

  async suggestCategories(productId: string, q?: string) {
    const account = await this.account();
    if (!account) throw ApiError.badRequest('Conecte a conta do Mercado Livre primeiro.');
    const query = q?.trim() || (await this.detail(productId)).effective.title;
    return getAdapter(PROVIDER).suggestCategories(account, query);
  }

  // --- Edicao rapida ---

  async updateProfile(productId: string, dto: MlProfileDto) {
    await this.loadProduct(productId);
    const data: Prisma.MarketplaceProductProfileUncheckedUpdateInput = {
      ...dto,
      attributes: dto.attributes === undefined ? undefined : (dto.attributes as Prisma.InputJsonValue),
      markupPercent: dto.markupPercent === undefined ? undefined : dto.markupPercent,
      fixedPrice: dto.fixedPrice === undefined ? undefined : dto.fixedPrice,
    };
    // Trocar de categoria invalida as caracteristicas preenchidas para a anterior.
    const current = await prisma.marketplaceProductProfile.findUnique({ where: { productId_provider: { productId, provider: PROVIDER } } });
    if (dto.categoryId !== undefined && current?.categoryId && dto.categoryId !== current.categoryId && dto.attributes === undefined) {
      data.attributes = Prisma.DbNull;
    }
    await prisma.marketplaceProductProfile.upsert({
      where: { productId_provider: { productId, provider: PROVIDER } },
      update: data,
      create: { ...(data as Prisma.MarketplaceProductProfileUncheckedCreateInput), productId, provider: PROVIDER },
    });

    // Anuncio no ar recebe preco, quantidade e prazo novos na hora.
    const listing = await prisma.marketplaceListing.findUnique({ where: { productId_provider: { productId, provider: PROVIDER } } });
    if (listing?.externalId && dto.description !== undefined) {
      const product = await this.loadProduct(productId);
      const text = dto.description?.trim() || product.description;
      const account = await this.account();
      if (account && text) {
        await (getAdapter(PROVIDER) as MercadoLivreAdapter).updateDescription(account, listing.externalId, text).catch(err =>
          logger.warn('[MlPanel] falha ao atualizar descricao do anuncio', { productId, err: String(err) })
        );
      }
    }
    if (listing?.externalId) {
      await listingService.sync(listing.id).catch(err =>
        logger.warn('[MlPanel] falha ao atualizar anuncio apos edicao', { productId, err: String(err) })
      );
    }
    return this.detail(productId);
  }

  async addImages(productId: string, files: Express.Multer.File[]) {
    const product = await this.loadProduct(productId);
    const added: string[] = [];
    for (const file of files) {
      const processed = await processProductImage(file.path, productId);
      added.push(processed.full);
    }
    await prisma.product.update({ where: { id: productId }, data: { images: [...images(product), ...added] } });
    return this.detail(productId);
  }

  /** Reordena ou remove fotos. So aceita caminhos que o produto ja tem. */
  async setImages(productId: string, paths: string[]) {
    const product = await this.loadProduct(productId);
    const known = new Set(images(product));
    const next = paths.filter(path => known.has(path));
    await prisma.product.update({ where: { id: productId }, data: { images: next } });
    return this.detail(productId);
  }

  // --- Aprovacao ---

  async approveAndPublish(productId: string, adminId?: string) {
    const detail = await this.detail(productId);
    if (!detail.connected) throw ApiError.badRequest('Conecte a conta do Mercado Livre primeiro.');
    const missing = detail.readiness.filter(check => !check.ok);
    if (missing.length && !detail.listing?.externalId) {
      throw ApiError.badRequest(`Falta completar: ${missing.map(check => check.label).join(', ')}.`);
    }
    await prisma.marketplaceProductProfile.upsert({
      where: { productId_provider: { productId, provider: PROVIDER } },
      update: { approvedAt: new Date(), approvedById: adminId ?? null },
      create: { productId, provider: PROVIDER, approvedAt: new Date(), approvedById: adminId ?? null },
    });
    await listingService.publish(productId, PROVIDER);
    return this.detail(productId);
  }

  async approveMany(productIds: string[], adminId?: string) {
    const results: Array<{ productId: string; ok: boolean; error?: string }> = [];
    for (const productId of productIds) {
      try {
        await this.approveAndPublish(productId, adminId);
        results.push({ productId, ok: true });
      } catch (err) {
        results.push({ productId, ok: false, error: err instanceof Error ? err.message : String(err) });
      }
    }
    return results;
  }
}

export const mlPanelService = new MlPanelService();
