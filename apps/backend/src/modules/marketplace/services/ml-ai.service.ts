import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { AiSuggestionStatus, MarketplaceProvider, Prisma } from '@prisma/client';
import { prisma } from '@config/database.js';
import { ApiError } from '@shared/utils/error.util.js';
import { logger } from '@shared/utils/logger.util.js';
import { aiService } from '../../ai/ai.service.js';
import { getAdapter } from '../adapters/index.js';
import { MercadoLivreAdapter } from '../adapters/mercado-livre.adapter.js';
import { CatalogProduct, CategoryAttribute } from '../marketplace.types.js';
import {
  ListingContext,
  ListingSuggestion,
  PhotoVerdict,
  buildListingMessages,
  buildPhotoMessages,
  parsePhotoVerdicts,
  sanitizeSuggestion,
} from '../mappers/ai-listing.js';
import { effectiveFields, parseSettings, profileAttributes } from '../mappers/publication.js';
import { tokenRefreshService } from './token-refresh.service.js';
import { mlPanelService } from './ml-panel.service.js';

const PROVIDER = MarketplaceProvider.MERCADO_LIVRE;
const PRODUCTS_DIR = path.join(process.cwd(), 'uploads', 'products');
const PHOTO_SIZE = 1200;
const MIN_PHOTO = 500;
const MAX_PHOTOS = 12;
const MAX_DOWNLOAD = 10 * 1024 * 1024;
const QUEUE_BATCH = 2;

export type ApplyField = 'title' | 'category' | 'attributes' | 'description';

export interface PhotoCandidate {
  url: string;
  source: string;
  width: number | null;
  height: number | null;
  verdict: PhotoVerdict | null;
  recommended: boolean;
}

function adapter(): MercadoLivreAdapter {
  return getAdapter(PROVIDER) as MercadoLivreAdapter;
}

function specs(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

async function download(url: string): Promise<Buffer> {
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const length = Number(res.headers.get('content-length') ?? 0);
  if (length > MAX_DOWNLOAD) throw new Error('imagem grande demais');
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > MAX_DOWNLOAD) throw new Error('imagem grande demais');
  return buffer;
}

/**
 * Assistente de anuncio com IA: sugere titulo, categoria, ficha tecnica,
 * descricao com nomes regionais, roteiro de clip e fotos. Tudo fica como
 * sugestao ate o lojista aplicar.
 */
export class MlAiService {
  // --- Contexto ---

  private async context(productId: string): Promise<{ context: ListingContext; categoryAttributes: CategoryAttribute[] }> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { marketplaceProfiles: { where: { provider: PROVIDER } } },
    });
    if (!product) throw ApiError.notFound('Produto não encontrado.');
    const account = await tokenRefreshService.ensureFreshToken(PROVIDER).catch(() => null);
    if (!account?.accessToken) throw ApiError.badRequest('Conecte a conta do Mercado Livre primeiro.');

    const profile = product.marketplaceProfiles[0] ?? null;
    const conn = await prisma.marketplaceConnection.findUnique({ where: { provider: PROVIDER }, select: { settings: true } });
    const eff = effectiveFields(product, profile, parseSettings(conn?.settings));
    const s = specs(product.specifications);

    let category = profile?.categoryId ? { id: profile.categoryId, name: profile.categoryName } : null;
    if (!category) {
      const [first] = await adapter().suggestCategories(account, eff.title).catch(() => []);
      if (first) category = { id: first.id, name: first.name };
    }
    const [attributes, trends, catalog] = await Promise.all([
      category ? adapter().getCategoryAttributes(account, category.id).catch(() => [] as CategoryAttribute[]) : Promise.resolve([]),
      category ? adapter().getTrends(account, category.id).catch(() => [] as string[]) : Promise.resolve([]),
      this.catalog(account, eff.brand, eff.partNumber, eff.title),
    ]);

    return {
      categoryAttributes: attributes,
      context: {
        product: {
          name: product.name,
          sku: product.sku,
          brand: eff.brand,
          partNumber: eff.partNumber,
          gtin: eff.gtin,
          application: typeof s.application === 'string' ? s.application : null,
          category: product.category,
          description: product.description,
          currentTitle: eff.title,
        },
        category,
        attributes,
        trends,
        catalog,
      },
    };
  }

  /** Catalogo: primeiro pela marca + numero de peca (mesmo produto), depois pelo titulo. */
  private async catalog(account: Parameters<MercadoLivreAdapter['searchCatalog']>[0], brand: string | null, part: string | null, title: string): Promise<CatalogProduct[]> {
    const exact = brand && part ? await adapter().searchCatalog(account, `${brand} ${part}`).catch(() => []) : [];
    if (exact.length) return exact;
    return adapter().searchCatalog(account, title).catch(() => []);
  }

  // --- Sugestao ---

  async generate(productId: string): Promise<ListingSuggestion & { catalog: CatalogProduct[]; trends: string[] }> {
    const { context } = await this.context(productId);
    if (!context.category) throw ApiError.badRequest('Não foi possível descobrir a categoria do Mercado Livre. Escolha a categoria no editor e tente de novo.');
    const raw = await aiService.chat<Record<string, unknown>>('listing_assistant', buildListingMessages(context), { productId, maxTokens: 6000 });
    const suggestion = sanitizeSuggestion(raw, context);
    const payload = { ...suggestion, catalog: context.catalog, trends: context.trends.slice(0, 20), generatedAt: new Date().toISOString() };
    await prisma.marketplaceAiSuggestion.upsert({
      where: { productId_provider: { productId, provider: PROVIDER } },
      update: { status: AiSuggestionStatus.READY, payload: payload as unknown as Prisma.InputJsonValue, error: null, appliedAt: null },
      create: { productId, provider: PROVIDER, status: AiSuggestionStatus.READY, payload: payload as unknown as Prisma.InputJsonValue },
    });
    return payload;
  }

  async get(productId: string) {
    return prisma.marketplaceAiSuggestion.findUnique({ where: { productId_provider: { productId, provider: PROVIDER } } });
  }

  /**
   * Aplica ao perfil do produto os campos escolhidos. Caracteristicas se somam
   * as ja preenchidas (a sugestao vale no que repete). `attributeIds` limita
   * quais entram; vazio = todas.
   */
  async apply(productId: string, fields: ApplyField[], attributeIds?: string[], description?: string) {
    const row = await this.get(productId);
    if (!row?.payload) throw ApiError.badRequest('Gere a sugestão da IA primeiro.');
    const suggestion = row.payload as unknown as ListingSuggestion;
    const profile = await prisma.marketplaceProductProfile.findUnique({ where: { productId_provider: { productId, provider: PROVIDER } } });

    const update: Parameters<typeof mlPanelService.updateProfile>[1] = {};
    if (fields.includes('title') && suggestion.title) update.title = suggestion.title;
    if (fields.includes('category') && suggestion.categoryId && suggestion.categoryId !== profile?.categoryId) {
      update.categoryId = suggestion.categoryId;
      update.categoryName = suggestion.categoryName;
    }
    if (fields.includes('description')) update.description = (description ?? suggestion.description) || null;
    if (fields.includes('attributes')) {
      const chosen = suggestion.attributes.filter(attr => !attributeIds?.length || attributeIds.includes(attr.id));
      // Trocando de categoria, as caracteristicas antigas nao valem mais.
      const keep = update.categoryId ? [] : profileAttributes(profile).filter(attr => !chosen.some(c => c.id === attr.id));
      update.attributes = [...keep, ...chosen.map(attr => ({ id: attr.id, valueId: attr.valueId, valueName: attr.valueName }))];
    }
    const detail = await mlPanelService.updateProfile(productId, update);
    await prisma.marketplaceAiSuggestion.update({ where: { id: row.id }, data: { status: AiSuggestionStatus.APPLIED, appliedAt: new Date() } });
    return detail;
  }

  // --- Fotos ---

  /**
   * Fotos candidatas do catalogo oficial, medidas e conferidas pela IA (mesma
   * peca, sem marca d'agua). Recomendadas: aprovadas pela IA e com 500 px ou mais.
   */
  async photoCandidates(productId: string): Promise<PhotoCandidate[]> {
    const { context } = await this.context(productId);
    const urls = [...new Set(context.catalog.flatMap(item => item.pictures))].slice(0, 10);
    if (urls.length === 0) return [];

    type Measured = { url: string; width: number | null; height: number | null };
    const measured = await Promise.all(urls.map(async (url): Promise<Measured | null> => {
      try {
        const meta = await sharp(await download(url)).metadata();
        return { url, width: meta.width ?? null, height: meta.height ?? null };
      } catch {
        return null;
      }
    }));
    const usable = measured.filter((item): item is Measured => item !== null);
    if (usable.length === 0) return [];

    const raw = await aiService.chat<Record<string, unknown>>('photo_check', buildPhotoMessages(context.product, usable.map(item => item.url)), { productId, vision: true, maxTokens: 1500 });
    const verdicts = new Map(parsePhotoVerdicts(raw, usable.length).map(verdict => [verdict.index, verdict]));

    return usable.map((item, index) => {
      const verdict = verdicts.get(index) ?? null;
      const bigEnough = Math.min(item.width ?? 0, item.height ?? 0) >= MIN_PHOTO;
      return {
        ...item,
        source: 'Catálogo do Mercado Livre',
        verdict,
        recommended: Boolean(verdict?.sameProduct && !verdict.watermark && bigEnough),
      };
    });
  }

  /**
   * Baixa as fotos escolhidas e padroniza em 1200 x 1200, peca centralizada em
   * fundo branco. Foto com menos de 500 px e recusada (o ML nao aceita).
   */
  async importPhotos(productId: string, urls: string[]) {
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { images: true } });
    if (!product) throw ApiError.notFound('Produto não encontrado.');
    const current = Array.isArray(product.images) ? product.images.filter((url): url is string => typeof url === 'string') : [];
    const room = MAX_PHOTOS - current.length;
    if (room <= 0) throw ApiError.badRequest(`O anúncio já tem ${MAX_PHOTOS} fotos, o máximo do Mercado Livre.`);

    fs.mkdirSync(PRODUCTS_DIR, { recursive: true });
    const added: string[] = [];
    const failed: string[] = [];
    for (const url of urls.slice(0, room)) {
      try {
        const image = sharp(await download(url));
        const meta = await image.metadata();
        if (Math.min(meta.width ?? 0, meta.height ?? 0) < MIN_PHOTO) throw new Error(`menor que ${MIN_PHOTO} px`);
        const filename = `${productId}-${randomUUID()}-full.jpg`;
        await image
          .resize(PHOTO_SIZE, PHOTO_SIZE, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
          .flatten({ background: '#ffffff' })
          .jpeg({ quality: 90 })
          .toFile(path.join(PRODUCTS_DIR, filename));
        added.push(`/uploads/products/${filename}`);
      } catch (err) {
        failed.push(`${url}: ${String((err as Error).message ?? err)}`);
      }
    }
    if (added.length) await prisma.product.update({ where: { id: productId }, data: { images: [...current, ...added] } });
    const detail = await mlPanelService.detail(productId);
    return { detail, added: added.length, failed };
  }

  // --- Lote ---

  /** Coloca produtos na fila do preparo com IA (ignora o que ja esta rodando). */
  async enqueue(productIds: string[]) {
    let queued = 0;
    for (const productId of productIds) {
      const existing = await this.get(productId);
      if (existing?.status === AiSuggestionStatus.RUNNING || existing?.status === AiSuggestionStatus.QUEUED) continue;
      await prisma.marketplaceAiSuggestion.upsert({
        where: { productId_provider: { productId, provider: PROVIDER } },
        update: { status: AiSuggestionStatus.QUEUED, error: null },
        create: { productId, provider: PROVIDER, status: AiSuggestionStatus.QUEUED },
      });
      queued += 1;
    }
    void this.processQueue();
    return { queued };
  }

  private processing = false;

  /** Processa a fila aos poucos. Limite do mes atingido: para e deixa o resto na fila. */
  async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    try {
      // Sugestao que ficou "rodando" por reinicio do servidor volta para a fila.
      await prisma.marketplaceAiSuggestion.updateMany({
        where: { status: AiSuggestionStatus.RUNNING, updatedAt: { lt: new Date(Date.now() - 10 * 60_000) } },
        data: { status: AiSuggestionStatus.QUEUED },
      });
      for (;;) {
        const batch = await prisma.marketplaceAiSuggestion.findMany({
          where: { provider: PROVIDER, status: AiSuggestionStatus.QUEUED },
          orderBy: { updatedAt: 'asc' },
          take: QUEUE_BATCH,
        });
        if (batch.length === 0) return;
        const results = await Promise.all(batch.map(async row => {
          await prisma.marketplaceAiSuggestion.update({ where: { id: row.id }, data: { status: AiSuggestionStatus.RUNNING } });
          try {
            await this.generate(row.productId);
            return 'ok';
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            const stop = /Limite mensal|desligada|Cadastre a chave|Sem saldo|inválida/.test(message);
            await prisma.marketplaceAiSuggestion.update({
              where: { id: row.id },
              data: stop ? { status: AiSuggestionStatus.QUEUED, error: message } : { status: AiSuggestionStatus.FAILED, error: message },
            });
            logger.warn('[MlAi] falha no preparo', { productId: row.productId, err: message });
            return stop ? 'stop' : 'fail';
          }
        }));
        if (results.includes('stop')) return;
      }
    } finally {
      this.processing = false;
    }
  }

  /** Aplica todos os campos das sugestoes prontas. */
  async applyMany(productIds: string[]) {
    const results: Array<{ productId: string; ok: boolean; error?: string }> = [];
    for (const productId of productIds) {
      try {
        await this.apply(productId, ['title', 'category', 'attributes', 'description']);
        results.push({ productId, ok: true });
      } catch (err) {
        results.push({ productId, ok: false, error: err instanceof Error ? err.message : String(err) });
      }
    }
    return results;
  }
}

export const mlAiService = new MlAiService();
