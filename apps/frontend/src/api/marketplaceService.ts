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
  aiStatus: AiSuggestionStatus | null;
  quality: number;
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
  counts: Record<'ALL' | 'AI_READY' | MlPanelStatus, number>;
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
  description: string | null;
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
  quality: { score: number; tips: string[] };
  ai: { status: AiSuggestionStatus; payload: AiListingSuggestion | null; error: string | null; updatedAt: string; appliedAt: string | null } | null;
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
  status?: 'ALL' | 'AI_READY' | MlPanelStatus;
  page?: number;
  pageSize?: number;
}

export type MlOrderStage =
  | 'AWAITING_PAYMENT'
  | 'AWAITING_SUPPLIER'
  | 'TO_PICK'
  | 'READY_TO_SHIP'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export interface MlOrderItem {
  productId: string | null;
  title: string;
  quantity: number;
  fromStore: number;
  fromSupplier: number;
  supplier: string | null;
}

export interface MlOrder {
  id: string;
  externalOrderId: string;
  orderId: string | null;
  status: string;
  stage: MlOrderStage;
  buyerNickname: string | null;
  total: number;
  items: MlOrderItem[];
  shipmentId: string | null;
  shipmentStatus: string | null;
  shipmentSubstatus: string | null;
  logisticType: string | null;
  trackingNumber: string | null;
  dispatchBy: string | null;
  supplierReceivedAt: string | null;
  pickedAt: string | null;
  labelPrintedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  soldAt: string | null;
  open: boolean;
}

export interface MlOrderList {
  items: MlOrder[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<'OPEN' | 'ALL' | MlOrderStage, number>;
  supplierNeeds: Array<{ supplier: string; items: Array<{ title: string; quantity: number }> }>;
}

export type MlOrderAction = 'SUPPLIER_RECEIVED' | 'PICKED' | 'BACK_TO_PICK';

// --- Inteligência artificial ---

export type AiSuggestionStatus = 'QUEUED' | 'RUNNING' | 'READY' | 'APPLIED' | 'FAILED';
export type AiApplyField = 'title' | 'category' | 'attributes' | 'description';

export interface AiSettings {
  enabled: boolean;
  hasApiKey: boolean;
  apiKeyMasked: string | null;
  model: string;
  models: string[];
  monthlyBudgetBrl: number;
  usdToBrl: number;
  month: { spentBrl: number; calls: number; products: number };
}

export interface AiSuggestedAttribute {
  id: string;
  name: string;
  valueId: string | null;
  valueName: string;
  source: string;
  confidence: 'alta' | 'media';
}

export interface AiListingSuggestion {
  categoryId: string | null;
  categoryName: string | null;
  title: string;
  attributes: AiSuggestedAttribute[];
  description: string;
  keywords: string[];
  regionalNames: string[];
  clipScript: string;
  photoChecklist: string[];
  notes: string;
  discarded: string[];
  trends: string[];
  catalog: Array<{ id: string; name: string; pictures: string[] }>;
  generatedAt: string;
}

export interface AiPhotoCandidate {
  url: string;
  source: string;
  width: number | null;
  height: number | null;
  verdict: { index: number; sameProduct: boolean; watermark: boolean; whiteBackground: boolean; reason: string } | null;
  recommended: boolean;
}

export const aiService = {
  async getSettings(): Promise<AiSettings> {
    return unwrap((await apiClient.get('/ai/settings')).data);
  },
  async updateSettings(settings: Partial<Omit<AiSettings, 'hasApiKey' | 'apiKeyMasked' | 'models' | 'month'>> & { apiKey?: string }): Promise<AiSettings> {
    return unwrap((await apiClient.put('/ai/settings', settings)).data);
  },
  async test(): Promise<{ ok: boolean }> {
    return unwrap((await apiClient.post('/ai/test')).data);
  },
};

function unwrap<T>(data: { data: T }): T {
  return data.data;
}

export const mlPanelService = {
  async aiGenerate(productId: string): Promise<AiListingSuggestion> {
    // A IA leva de 10 a 60 segundos; o padrão do cliente HTTP cortaria antes.
    return unwrap((await apiClient.post(`/marketplace/ml-panel/products/${productId}/ai`, undefined, { timeout: 180_000 })).data);
  },

  async aiApply(productId: string, fields: AiApplyField[], attributeIds?: string[], description?: string): Promise<MlProductDetail> {
    return unwrap((await apiClient.post(`/marketplace/ml-panel/products/${productId}/ai/apply`, { fields, attributeIds, description })).data);
  },

  async aiQueue(productIds: string[]): Promise<{ queued: number }> {
    return unwrap((await apiClient.post('/marketplace/ml-panel/ai/queue', { productIds })).data);
  },

  async aiApplyMany(productIds: string[]): Promise<Array<{ productId: string; ok: boolean; error?: string }>> {
    return unwrap((await apiClient.post('/marketplace/ml-panel/ai/apply', { productIds }, { timeout: 300_000 })).data);
  },

  async photoCandidates(productId: string): Promise<AiPhotoCandidate[]> {
    return unwrap((await apiClient.get(`/marketplace/ml-panel/products/${productId}/photos/candidates`, { timeout: 180_000 })).data);
  },

  async photoImport(productId: string, urls: string[]): Promise<{ detail: MlProductDetail; added: number; failed: string[] }> {
    return unwrap((await apiClient.post(`/marketplace/ml-panel/products/${productId}/photos/import`, { urls }, { timeout: 120_000 })).data);
  },

  async listOrders(stage: 'OPEN' | 'ALL' | MlOrderStage, page = 1): Promise<MlOrderList> {
    return unwrap((await apiClient.get('/marketplace/ml-panel/orders', { params: { stage, page } })).data);
  },

  async syncOrders(): Promise<void> {
    await apiClient.post('/marketplace/ml-panel/orders/sync', undefined, { timeout: 120_000 });
  },

  async moveOrder(id: string, action: MlOrderAction): Promise<MlOrder> {
    return unwrap((await apiClient.post(`/marketplace/ml-panel/orders/${id}/move`, { action })).data);
  },

  async refreshOrder(id: string): Promise<MlOrder> {
    return unwrap((await apiClient.post(`/marketplace/ml-panel/orders/${id}/refresh`)).data);
  },

  /** Abre o PDF da etiqueta em outra aba. */
  async openLabel(id: string): Promise<void> {
    // Abre a aba antes da espera: depois dela o navegador bloquearia o pop-up.
    const tab = window.open('', '_blank');
    let res;
    try {
      res = await apiClient.get(`/marketplace/ml-panel/orders/${id}/label`, { responseType: 'blob' });
    } catch (err) {
      tab?.close();
      // Com responseType blob, a mensagem de erro da API chega dentro do Blob.
      const data = (err as { response?: { data?: unknown } }).response?.data;
      if (data instanceof Blob) {
        let body: { error?: string; message?: string } = {};
        try {
          body = JSON.parse(await data.text());
        } catch {
          // corpo sem JSON: fica a mensagem padrao
        }
        throw new Error(body.error || body.message || 'Etiqueta indisponível');
      }
      throw err;
    }
    const url = URL.createObjectURL(res.data as Blob);
    if (tab) {
      tab.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return;
    }
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },

  async getSettings(): Promise<MlStoreSettings> {
    return unwrap((await apiClient.get('/marketplace/ml-panel/settings')).data);
  },

  async updateSettings(settings: Partial<MlStoreSettings>): Promise<MlStoreSettings> {
    return unwrap((await apiClient.put('/marketplace/ml-panel/settings', settings)).data);
  },

  async list(query: MlPanelQuery): Promise<MlPanelList> {
    return unwrap((await apiClient.get('/marketplace/ml-panel/products', { params: query, timeout: 60_000 })).data);
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
    return unwrap((await apiClient.post('/marketplace/ml-panel/products/approve', { productIds }, { timeout: 300_000 })).data);
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
