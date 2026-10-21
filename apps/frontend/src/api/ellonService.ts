import apiClient from './apiClient';

export interface EllonConfig {
  status: 'DISABLED' | 'PENDING' | 'CONNECTED' | 'ERROR';
  enabled: boolean;
  baseUrl: string;
  companyCode: number | null;
  transactionCode: number | null;
  costCenterCode: number | null;
  sellerCode: number | null;
  warehouseCode: number | null;
  paymentMethodCode: number | null;
  carrierCode: number | null;
  usernameMasked: string | null;
  integrationCodeMasked: string | null;
  hasPassword: boolean;
  accessHashMasked: string | null;
  hasBearerToken: boolean;
  lastConnectionAt: string | null;
  lastError: string | null;
  syncProducts: boolean;
  syncCustomers: boolean;
  syncOrders: boolean;
  lastProductSyncAt: string | null;
  lastFullProductSyncAt: string | null;
  lastCustomerSyncAt: string | null;
  lastOrderSyncAt: string | null;
  exportOrderSources: OrderSource[];
  stockIncludesPreOrders: boolean;
  reservationTtlDays: number;
  serviceItemTypes: string[];
  defaultCustomerCode: number | null;
  paymentMethodMap: Record<string, number> | null;
  preOrderStatusMap: Record<string, PreOrderState> | null;
  observationLimit: number;
  customerUpdatesEnabled: boolean;
  liveStockCheck: boolean;
  loyaltyFromStoreSales: boolean;
  loyaltyStoreSalesSince: string | null;
}

export interface EllonOrderStatus {
  exported: boolean;
  preOrder: string | null;
  status: string | null;
  cancelled: boolean;
  invoiced: boolean;
  nfe: { key: string; number: string; series: string; issuedAt: string } | null;
  delivery: { status: string | null; deliveredAt: string | null; carrier: string | null; tracking: string | null } | null;
  divergence: { m2Total: number; ellonTotal: number; difference: number } | null;
  cancellationRequestedAt: string | null;
  lastSyncAt: string | null;
  job: { status: string; lastError: string | null; parked: boolean } | null;
}

export interface PurchaseEntry {
  id: string;
  kind: 'SALE' | 'PRE_ORDER';
  origin: 'site' | 'oficina' | 'loja';
  date: string | null;
  total: number;
  status: string | null;
  cancelled: boolean;
  items: Array<{ name: string; quantity: number; total: number }>;
}

export interface EllonSalesReport {
  from: string;
  to: string;
  count: number;
  total: number;
  averageTicket: number;
  cancelled: number;
  undated: number;
  byDay: Array<{ date: string; total: number; count: number }>;
  byOrigin: Array<{ name: string; total: number; count: number }>;
  bySeller: Array<{ name: string; total: number; count: number }>;
  topProducts: Array<{ name: string; quantity: number; total: number }>;
}

export type PreOrderState = 'OPEN' | 'INVOICED' | 'CANCELLED';
export interface EllonContract {
  swagger: {
    fetchedAt: string;
    version: string | null;
    operations: Array<{ method: string; path: string; summary: string; parameters: string[]; body: unknown; response: unknown }>;
  } | null;
  observed: {
    productTypes: Array<{ type: string | null; total: number; examples: string[]; isService: boolean }>;
    preOrderStatuses: Array<{ status: string; total: number; mapped: PreOrderState | null; detected: PreOrderState }>;
    fieldsByType: Record<string, Array<{ key: string; total: number }>>;
    consumerCandidates: Array<{ externalId: string; name: string | null }>;
    stockEvidence: { measured: number; dropped: number; unchanged: number; suggestion: 'INCLUDES' | 'EXCLUDES' | 'INCONCLUSIVE' };
    settings: { observationLimit: number; customerUpdatesEnabled: boolean; stockIncludesPreOrders: boolean };
  };
}

export type OrderSource = 'WEB' | 'APP' | 'PHONE' | 'MERCADO_LIVRE' | 'SHOPEE';

export interface EllonPreflight {
  ready: boolean;
  serviceOrderStatus: string;
  hasRegisteredCustomer: boolean;
  customerWillBeCreated: boolean;
  customerMode: 'linked' | 'export' | 'default' | 'missing';
  customerProblem: string | null;
  unmappedItems: Array<{ itemId: string; type: string; localId: string | null; name: string }>;
  fiscalIssues: Array<{ itemId: string; name: string; ellonType: string | null; message: string }>;
  warnings: string[];
  missingConfig: string[];
}

export interface EllonCatalogItem { externalId: string; externalSequence: number; name: string; sku: string; salePrice: number; type: string | null; unit: string | null }
export interface EllonServiceMapping { id: string; name: string; category: string; link: { id: string; externalId: string; externalSequence: number; ellonType: string | null } | null }
export interface EllonReservation { sourceType: 'ORDER' | 'SERVICE_ORDER'; sourceId: string; label: string; productId: string; productName: string; quantity: number; since: string; preOrder: string | null; expired: boolean }
export interface EllonLinkWithMetadata extends EllonLink { metadata: Record<string, unknown> | null; updatedAt: string }
export interface EllonPending {
  divergences: EllonLinkWithMetadata[];
  cancellations: EllonLinkWithMetadata[];
  reservations: { active: EllonReservation[]; expired: EllonReservation[] };
  customerConflicts: EllonLinkWithMetadata[];
  parkedJobs: EllonJob[];
}
export interface EllonPaymentMethods { m2: Array<{ value: string; orders: number }>; ellon: Array<{ externalId: string; name: string | null }> }

export type EllonEntityType = 'PRODUCT' | 'SERVICE' | 'CUSTOMER' | 'ORDER' | 'SERVICE_ORDER';
export interface EllonLink { id: string; entityType: EllonEntityType; localId: string; externalId: string; externalSequence: number | null }
export interface EllonJob { id: string; type: string; status: string; localEntityId: string | null; attempts: number; lastError: string | null; createdAt: string }
export interface EllonSyncSummary {
  products: number;
  customers: number;
  snapshots: Array<{ type: string; _count: { _all: number }; _max: { syncedAt: string | null } }>;
  jobs: Array<{ status: string; _count: { _all: number } }>;
}

export type EllonSnapshotType = 'CUSTOMER' | 'PAYMENT_METHOD' | 'SELLER' | 'CARRIER' | 'PRODUCT_GROUP' | 'PRODUCT_BRAND' | 'PRE_ORDER' | 'SALE' | 'NFE' | 'DELIVERY';
export interface EllonSnapshot { id: string; type: EllonSnapshotType; externalId: string; name: string | null; payload: Record<string, unknown>; syncedAt: string }
export interface Paginated<T> { data: T[]; meta: { page: number; limit: number; total: number; totalPages: number } }
export type EllonSyncTarget = 'products' | 'products-full' | 'customers' | 'references' | 'orders';

export const ellonService = {
  async getConfig(): Promise<EllonConfig> {
    const response = await apiClient.get('/ellon/config');
    return response.data.data;
  },
  async getSummary(): Promise<EllonSyncSummary> {
    const response = await apiClient.get('/ellon/summary');
    return response.data.data;
  },
  async updateConfig(data: Record<string, unknown>): Promise<EllonConfig> {
    const response = await apiClient.put('/ellon/config', data);
    return response.data.data;
  },
  async test(): Promise<void> { await apiClient.post('/ellon/test'); },
  async preflightServiceOrder(id: string): Promise<EllonPreflight> {
    const response = await apiClient.get(`/ellon/service-orders/${id}/preflight`);
    return response.data.data;
  },
  async exportServiceOrder(id: string): Promise<void> {
    await apiClient.post(`/ellon/service-orders/${id}/export`);
  },
  async listLinks(): Promise<EllonLink[]> {
    const response = await apiClient.get('/ellon/links');
    return response.data.data;
  },
  async upsertLink(data: { entityType: EllonEntityType; localId: string; externalId: string; externalSequence?: number | null }): Promise<EllonLink> {
    const response = await apiClient.put('/ellon/links', data);
    return response.data.data;
  },
  async listJobs(): Promise<EllonJob[]> {
    const response = await apiClient.get('/ellon/jobs', { params: { limit: 10 } });
    return response.data.data;
  },
  async retryJob(id: string): Promise<void> { await apiClient.post(`/ellon/jobs/${id}/retry`); },
  async syncProducts(): Promise<void> { await apiClient.post('/ellon/sync/products'); },
  async orderStatus(entity: 'order' | 'service-order', id: string): Promise<EllonOrderStatus> {
    const response = await apiClient.get(`/ellon/orders/${entity}/${id}/status`);
    return response.data.data;
  },
  async refreshOrder(entity: 'order' | 'service-order', id: string): Promise<EllonOrderStatus & { found: boolean; errors: string[] }> {
    const response = await apiClient.post(`/ellon/orders/${entity}/${id}/refresh`);
    return response.data.data;
  },
  async customerHistory(customerId: string): Promise<{ linked: boolean; ellonCustomerId: string | null; purchases: PurchaseEntry[] }> {
    const response = await apiClient.get(`/ellon/customers/${customerId}/history`);
    return response.data.data;
  },
  async salesReport(params: { from?: string; to?: string }): Promise<EllonSalesReport> {
    const response = await apiClient.get('/ellon/reports/sales', { params });
    return response.data.data;
  },
  async myStorePurchases(): Promise<{ linked: boolean; purchases: PurchaseEntry[] }> {
    const response = await apiClient.get('/customers/me/store-purchases');
    return { linked: response.data.linked, purchases: response.data.data };
  },
  async getContract(): Promise<EllonContract> {
    const response = await apiClient.get('/ellon/contract');
    return response.data.data;
  },
  async refreshContract(): Promise<void> { await apiClient.post('/ellon/contract/refresh'); },
  async createDefaultCustomer(): Promise<{ defaultCustomerCode: number }> {
    const response = await apiClient.post('/ellon/default-customer');
    return response.data.data;
  },
  async getPending(): Promise<EllonPending> {
    const response = await apiClient.get('/ellon/pending');
    return response.data.data;
  },
  async searchCatalog(search: string): Promise<EllonCatalogItem[]> {
    const response = await apiClient.get('/ellon/catalog', { params: { search } });
    return response.data.data;
  },
  async listServices(): Promise<EllonServiceMapping[]> {
    const response = await apiClient.get('/ellon/services');
    return response.data.data;
  },
  async listPaymentMethods(): Promise<EllonPaymentMethods> {
    const response = await apiClient.get('/ellon/payment-methods');
    return response.data.data;
  },
  async acknowledgeDivergence(linkId: string): Promise<void> { await apiClient.post(`/ellon/links/${linkId}/acknowledge-divergence`); },
  async requestCancellation(entity: 'order' | 'service-order', id: string): Promise<{ status: 'REQUESTED' | 'CANCELLED'; preOrder: string }> {
    const response = await apiClient.post(`/ellon/cancellations/${entity}/${id}`);
    return response.data.data;
  },
  async removeLink(id: string): Promise<void> { await apiClient.delete(`/ellon/links/${id}`); },
  async syncNow(target: EllonSyncTarget): Promise<void> { await apiClient.post(`/ellon/sync/${target}`); },
  async listSnapshots(params: { type?: EllonSnapshotType; search?: string; page?: number; limit?: number }): Promise<Paginated<EllonSnapshot>> {
    const response = await apiClient.get('/ellon/snapshots', { params });
    return { data: response.data.data, meta: response.data.meta };
  },
};

export default ellonService;
