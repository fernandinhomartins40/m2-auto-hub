import { Request } from 'express';
import { MarketplaceProvider } from '@prisma/client';
import {
  TokenSet,
  ProviderAccount,
  NormalizedProduct,
  ExternalListing,
  ListingPatch,
  NormalizedOrder,
  CategorySuggestion,
  CategoryAttribute,
  NormalizedWebhookEvent,
} from '../marketplace.types.js';

/**
 * Interface comum implementada por cada marketplace.
 * Isola diferencas (assinatura HMAC da Shopee, formatos de payload do ML)
 * por tras de um contrato unico consumido pelos services.
 */
export interface MarketplaceAdapter {
  readonly provider: MarketplaceProvider;

  /** Escopos/topicos recomendados a marcar no painel do marketplace. */
  readonly recommendedScopes: string[];

  // --- OAuth ---

  /** URL para a qual o usuario e redirecionado para autorizar a conta. */
  getAuthorizationUrl(account: Pick<ProviderAccount, 'appId'>, state: string, redirectUri: string): string;

  /** Troca o `code` recebido no callback por um conjunto de tokens. */
  exchangeCodeForToken(
    account: Pick<ProviderAccount, 'appId' | 'appSecret'>,
    code: string,
    redirectUri: string,
    extra?: Record<string, string>
  ): Promise<TokenSet>;

  /** Renova o access token a partir do refresh token. */
  refreshToken(account: Pick<ProviderAccount, 'appId' | 'appSecret'>, refreshToken: string): Promise<TokenSet>;

  /** Sanity-check: confirma que o token autentica (ex.: busca dados do vendedor). */
  testConnection(account: ProviderAccount): Promise<{ ok: boolean; sellerNickname?: string | null }>;

  // --- Catalogo ---

  /** Sugere categorias a partir de um termo (predictor). */
  suggestCategories(account: ProviderAccount, query: string): Promise<CategorySuggestion[]>;

  /** Lista atributos (obrigatorios e opcionais) de uma categoria. */
  getCategoryAttributes(account: ProviderAccount, categoryId: string): Promise<CategoryAttribute[]>;

  // --- Publicacao ---

  publishProduct(account: ProviderAccount, product: NormalizedProduct): Promise<ExternalListing>;

  updateListing(account: ProviderAccount, externalId: string, patch: ListingPatch): Promise<void>;

  pauseListing(account: ProviderAccount, externalId: string): Promise<void>;

  closeListing(account: ProviderAccount, externalId: string): Promise<void>;

  // --- Pedidos ---

  fetchOrder(account: ProviderAccount, externalOrderId: string): Promise<NormalizedOrder>;

  // --- Webhooks ---

  /** Valida a autenticidade do webhook (assinatura/origem). */
  verifyWebhook(req: Request, account: ProviderAccount | null): boolean;

  /** Extrai o evento normalizado do corpo do webhook. */
  parseWebhook(req: Request): NormalizedWebhookEvent | null;
}
