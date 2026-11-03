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

// --- Painel do Mercado Livre ---

export type MlStockMode = 'STORE_ONLY' | 'STORE_PLUS_SUPPLIER' | 'MADE_TO_ORDER';
export type MlPanelStatus = 'READY' | 'PENDING' | 'PUBLISHED' | 'PAUSED' | 'ERROR';
export type MlListingType = 'gold_special' | 'gold_pro';
export type MlWarrantyType = 'Garantia do vendedor' | 'Garantia de fábrica' | 'Sem garantia';

export interface MlStoreSettings {
  markupPercent: number;
  listingTypeId: MlListingType;
  warrantyType: MlWarrantyType;
  warrantyDays: number;
  dispatchCutoff: string;
  supplierDeadline: string;
}

export interface MlPanelRow {
  productId: string;
  name: string;
  sku: string;
  image: string | null;
  stock: number;
  sitePrice: number;
  price: number;
  quantity: number;
  stockMode: MlStockMode;
  title: string;
  status: MlPanelStatus;
  missing: string[];
  approvedAt: string | null;
  listing: {
    id: string;
    externalId: string | null;
    externalUrl: string | null;
    status: ListingSyncStatus;
    pausedBySystem: boolean;
    lastError: string | null;
  } | null;
}

export interface MlPanelList {
  items: MlPanelRow[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<'ALL' | MlPanelStatus, number>;
  truncated: boolean;
  connected: boolean;
}

export interface MlAttributeValue {
  id: string;
  valueId?: string | null;
  valueName?: string | null;
}

export interface MlProfile {
  title: string | null;
  brand: string | null;
  partNumber: string | null;
  categoryId: string | null;
  categoryName: string | null;
  attributes: MlAttributeValue[] | null;
  packageWeightG: number | null;
  packageHeightCm: number | null;
  packageWidthCm: number | null;
  packageLengthCm: number | null;
  stockMode: MlStockMode;
  supplierQuantity: number;
  manufacturingDays: number;
  markupPercent: string | number | null;
  fixedPrice: string | number | null;
  listingTypeId: MlListingType | null;
  approvedAt: string | null;
}

export interface MlEffective {
  title: string;
  brand: string | null;
  partNumber: string | null;
  gtin: string | null;
  packageWeightG: number | null;
  packageHeightCm: number | null;
  packageWidthCm: number | null;
  packageLengthCm: number | null;
  basePrice: number;
  price: number;
  quantity: number;
  stockMode: MlStockMode;
  supplierQuantity: number;
  manufacturingDays: number;
  listingTypeId: string;
}

export interface MlReadinessCheck {
  key: string;
  label: string;
  ok: boolean;
  hint?: string;
}

export interface MlProductDetail {
  product: {
    id: string;
    name: string;
    sku: string;
    description: string;
    stock: number;
    salePrice: number;
    promoPrice: number | null;
    images: Array<{ path: string; url: string }>;
    ellon: { stock: unknown; reserved: unknown; barcode: unknown; factoryReference: unknown; application: unknown };
  };
  profile: MlProfile | null;
  effective: MlEffective;
  readiness: MlReadinessCheck[];
  status: MlPanelStatus;
  listing: (MarketplaceListing & { pausedBySystem: boolean }) | null;
  category: { id: string; name: string | null } | null;
  categoryAttributes: Array<CategoryAttribute & { value: { valueId: string | null; valueName: string | null } | null }>;
  categorySuggestions: CategorySuggestion[];
  fee: { saleFee: number; net: number } | null;
  settings: MlStoreSettings;
  connected: boolean;
}

export type MlProfileUpdate = Partial<Omit<MlProfile, 'approvedAt' | 'markupPercent' | 'fixedPrice'>> & {
  markupPercent?: number | null;
  fixedPrice?: number | null;
};

export interface MlPanelQuery {
  q?: string;
  scope?: 'default' | 'all';
  status?: 'ALL' | MlPanelStatus;
  page?: number;
  pageSize?: number;
}

function unwrap<T>(data: { data: T }): T {
  return data.data;
}

export const mlPanelService = {
  async getSettings(): Promise<MlStoreSettings> {
    return unwrap((await apiClient.get('/marketplace/ml-panel/settings')).data);
  },

  async updateSettings(settings: Partial<MlStoreSettings>): Promise<MlStoreSettings> {
    return unwrap((await apiClient.put('/marketplace/ml-panel/settings', settings)).data);
  },

  async list(query: MlPanelQuery): Promise<MlPanelList> {
    return unwrap((await apiClient.get('/marketplace/ml-panel/products', { params: query })).data);
  },

  async detail(productId: string): Promise<MlProductDetail> {
    return unwrap((await apiClient.get(`/marketplace/ml-panel/products/${productId}`)).data);
  },

  async update(productId: string, profile: MlProfileUpdate): Promise<MlProductDetail> {
    return unwrap((await apiClient.put(`/marketplace/ml-panel/products/${productId}`, profile)).data);
  },

  async searchCategories(productId: string, q: string): Promise<CategorySuggestion[]> {
    return unwrap((await apiClient.get(`/marketplace/ml-panel/products/${productId}/categories`, { params: { q } })).data);
  },

  async addImages(productId: string, files: File[]): Promise<MlProductDetail> {
    const form = new FormData();
    files.forEach(file => form.append('images', file));
    // Sem isso o axios converte o FormData em JSON (o cliente usa JSON por padrao).
    const res = await apiClient.post(`/marketplace/ml-panel/products/${productId}/images`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return unwrap(res.data);
  },

  async setImages(productId: string, images: string[]): Promise<MlProductDetail> {
    return unwrap((await apiClient.put(`/marketplace/ml-panel/products/${productId}/images`, { images })).data);
  },

  async approve(productId: string): Promise<MlProductDetail> {
    return unwrap((await apiClient.post(`/marketplace/ml-panel/products/${productId}/approve`)).data);
  },

  async approveMany(productIds: string[]): Promise<Array<{ productId: string; ok: boolean; error?: string }>> {
    return unwrap((await apiClient.post('/marketplace/ml-panel/products/approve', { productIds })).data);
  },

  async activateListing(id: string): Promise<MarketplaceListing> {
    return unwrap((await apiClient.post(`/marketplace/listings/${id}/activate`)).data);
  },
};

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
