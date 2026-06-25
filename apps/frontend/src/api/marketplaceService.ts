// src/api/marketplaceService.ts
import apiClient from './apiClient';

export type MarketplaceProviderSlug = 'mercadolivre' | 'shopee';

export type MarketplaceConnectionStatus =
  | 'DISCONNECTED'
  | 'PENDING'
  | 'CONNECTED'
  | 'TOKEN_EXPIRED'
  | 'ERROR';

export type ListingSyncStatus =
  | 'DRAFT'
  | 'QUEUED'
  | 'PUBLISHED'
  | 'OUT_OF_SYNC'
  | 'PAUSED'
  | 'ERROR';

export interface MarketplaceConnection {
  id: string;
  provider: 'MERCADO_LIVRE' | 'SHOPEE';
  status: MarketplaceConnectionStatus;
  appId: string | null;
  appSecretMasked: string | null;
  hasCredentials: boolean;
  sellerId: string | null;
  sellerNickname: string | null;
  tokenExpiresAt: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  scopes: unknown;
  connectedAt: string | null;
}

export interface ReadinessItem {
  key: string;
  label: string;
  status: 'ok' | 'pending' | 'manual';
  hint?: string;
}

export interface OnboardingStep {
  title: string;
  description: string;
  link?: { label: string; url: string };
}

export interface ProviderGuide {
  provider: 'MERCADO_LIVRE' | 'SHOPEE';
  displayName: string;
  redirectUri: string;
  webhookUrl: string;
  recommendedScopes: string[];
  consoleUrl: string;
  steps: OnboardingStep[];
  prerequisites: string[];
  hasApprovalGate: boolean;
}

export interface MarketplaceListing {
  id: string;
  productId: string;
  provider: 'MERCADO_LIVRE' | 'SHOPEE';
  externalId: string | null;
  externalUrl: string | null;
  status: ListingSyncStatus;
  lastSyncedPrice: string | null;
  lastSyncedStock: number | null;
  lastError: string | null;
  publishedAt: string | null;
  product?: {
    id: string;
    name: string;
    sku: string;
    salePrice: number;
    stock: number;
    status: string;
  };
}

export interface CategorySuggestion {
  id: string;
  name: string;
  path?: string;
}

export interface CategoryAttribute {
  id: string;
  name: string;
  required: boolean;
  type?: string;
  values?: Array<{ id: string; name: string }>;
}

function unwrap<T>(data: { data: T }): T {
  return data.data;
}

export const marketplaceService = {
  async getConnections(): Promise<MarketplaceConnection[]> {
    const res = await apiClient.get('/marketplace/connections');
    return unwrap(res.data);
  },

  async getGuide(
    provider: MarketplaceProviderSlug
  ): Promise<{ guide: ProviderGuide; readiness: ReadinessItem[] }> {
    const res = await apiClient.get(`/marketplace/${provider}/guide`);
    return unwrap(res.data);
  },

  async getReadiness(provider: MarketplaceProviderSlug): Promise<ReadinessItem[]> {
    const res = await apiClient.get(`/marketplace/${provider}/readiness`);
    return unwrap(res.data);
  },

  async setCredentials(
    provider: MarketplaceProviderSlug,
    appId: string,
    appSecret: string
  ): Promise<MarketplaceConnection> {
    const res = await apiClient.post(`/marketplace/${provider}/credentials`, { appId, appSecret });
    return unwrap(res.data);
  },

  async authorize(provider: MarketplaceProviderSlug): Promise<string> {
    const res = await apiClient.get(`/marketplace/${provider}/authorize`);
    return unwrap<{ authorizationUrl: string }>(res.data).authorizationUrl;
  },

  async testConnection(
    provider: MarketplaceProviderSlug
  ): Promise<{ ok: boolean; sellerNickname?: string | null }> {
    const res = await apiClient.post(`/marketplace/${provider}/test`);
    return unwrap(res.data);
  },

  async disconnect(provider: MarketplaceProviderSlug): Promise<void> {
    await apiClient.post(`/marketplace/${provider}/disconnect`);
  },

  async suggestCategories(
    provider: MarketplaceProviderSlug,
    q: string
  ): Promise<CategorySuggestion[]> {
    const res = await apiClient.get(`/marketplace/${provider}/categories/suggest`, { params: { q } });
    return unwrap(res.data);
  },

  async getCategoryAttributes(
    provider: MarketplaceProviderSlug,
    categoryId: string
  ): Promise<CategoryAttribute[]> {
    const res = await apiClient.get(`/marketplace/${provider}/categories/${categoryId}/attributes`);
    return unwrap(res.data);
  },

  async getListings(provider?: MarketplaceProviderSlug): Promise<MarketplaceListing[]> {
    const res = await apiClient.get('/marketplace/listings', {
      params: provider ? { provider } : undefined,
    });
    return unwrap(res.data);
  },

  async getProductListings(productId: string): Promise<MarketplaceListing[]> {
    const res = await apiClient.get(`/marketplace/products/${productId}/listings`);
    return unwrap(res.data);
  },

  async publish(
    productId: string,
    providers: MarketplaceProviderSlug[],
    categoryMapping?: Record<string, unknown>
  ): Promise<MarketplaceListing[]> {
    const res = await apiClient.post(`/marketplace/listings/${productId}/publish`, {
      providers,
      categoryMapping,
    });
    return unwrap(res.data);
  },

  async syncListing(id: string): Promise<MarketplaceListing> {
    const res = await apiClient.post(`/marketplace/listings/${id}/sync`);
    return unwrap(res.data);
  },

  async pauseListing(id: string): Promise<MarketplaceListing> {
    const res = await apiClient.post(`/marketplace/listings/${id}/pause`);
    return unwrap(res.data);
  },

  async closeListing(id: string): Promise<void> {
    await apiClient.delete(`/marketplace/listings/${id}`);
  },
};

export default marketplaceService;
