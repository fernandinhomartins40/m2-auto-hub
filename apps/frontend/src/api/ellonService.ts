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
  integrationCodeMasked: string | null;
  hasPassword: boolean;
  accessHashMasked: string | null;
  hasBearerToken: boolean;
  lastConnectionAt: string | null;
  lastError: string | null;
  syncProducts: boolean;
  syncCustomers: boolean;
  syncOrders: boolean;
}

export interface EllonPreflight {
  ready: boolean;
  serviceOrderStatus: string;
  hasRegisteredCustomer: boolean;
  customerWillBeCreated: boolean;
  unmappedItems: Array<{ itemId: string; type: string; localId: string | null; name: string }>;
  missingConfig: string[];
}

export type EllonEntityType = 'PRODUCT' | 'SERVICE' | 'CUSTOMER' | 'ORDER' | 'SERVICE_ORDER';
export interface EllonLink { id: string; entityType: EllonEntityType; localId: string; externalId: string; externalSequence: number | null }
export interface EllonJob { id: string; type: string; status: string; localEntityId: string | null; attempts: number; lastError: string | null; createdAt: string }

export const ellonService = {
  async getConfig(): Promise<EllonConfig> {
    const response = await apiClient.get('/ellon/config');
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
};

export default ellonService;
