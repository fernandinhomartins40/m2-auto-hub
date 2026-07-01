// src/api/serviceOrderService.ts
import apiClient from './apiClient';

export type ServiceOrderStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type ServiceOrderItemType = 'SERVICE' | 'PRODUCT';

export interface ServiceOrderItem {
  id: string;
  type: ServiceOrderItemType;
  productId: string | null;
  serviceId: string | null;
  name: string;
  unitPrice: number | string;
  quantity: number;
  subtotal: number | string;
}

export interface ServiceOrder {
  id: string;
  number: number;
  status: ServiceOrderStatus;
  customerId: string | null;
  vehicleId: string | null;
  customerName: string;
  customerPhone: string | null;
  vehicleLabel: string | null;
  vehiclePlate: string | null;
  mileage: number | null;
  description: string | null;
  internalNotes: string | null;
  assignedMechanicId: string | null;
  mechanicName: string | null;
  assignedAt: string | null;
  laborTotal: number | string;
  partsTotal: number | string;
  discount: number | string;
  total: number | string;
  stockApplied: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  items: ServiceOrderItem[];
  assignedMechanic?: { id: string; name: string } | null;
  customer?: { id: string; name: string; phone: string } | null;
  vehicle?: { id: string; brand: string; model: string; year: number; plate: string } | null;
}

export interface ServiceOrderItemInput {
  type: ServiceOrderItemType;
  productId?: string | null;
  serviceId?: string | null;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface ServiceOrderInput {
  customerId?: string | null;
  vehicleId?: string | null;
  customerName: string;
  customerPhone?: string | null;
  vehicleLabel?: string | null;
  vehiclePlate?: string | null;
  mileage?: number | null;
  description?: string | null;
  internalNotes?: string | null;
  assignedMechanicId?: string | null;
  discount?: number;
  items: ServiceOrderItemInput[];
}

export interface ServiceOrderStatistics {
  open: number;
  inProgress: number;
  completedToday: number;
  total: number;
}

export interface ServiceOrderListParams {
  page?: number;
  limit?: number;
  status?: ServiceOrderStatus;
  mechanicId?: string;
  vehicleId?: string;
  search?: string;
}

function unwrap<T>(payload: { data: T }): T {
  return payload.data;
}

export const serviceOrderService = {
  async list(params?: ServiceOrderListParams): Promise<{ data: ServiceOrder[]; meta: any }> {
    const res = await apiClient.get('/service-orders', { params });
    return { data: res.data.data, meta: res.data.meta };
  },

  async getStatistics(mechanicId?: string): Promise<ServiceOrderStatistics> {
    const res = await apiClient.get('/service-orders/statistics', {
      params: mechanicId ? { mechanicId } : undefined,
    });
    return unwrap(res.data);
  },

  async getById(id: string): Promise<ServiceOrder> {
    const res = await apiClient.get(`/service-orders/${id}`);
    return unwrap(res.data);
  },

  async create(input: ServiceOrderInput): Promise<ServiceOrder> {
    const res = await apiClient.post('/service-orders', input);
    return unwrap(res.data);
  },

  async update(id: string, input: Partial<ServiceOrderInput>): Promise<ServiceOrder> {
    const res = await apiClient.put(`/service-orders/${id}`, input);
    return unwrap(res.data);
  },

  async start(id: string): Promise<ServiceOrder> {
    const res = await apiClient.patch(`/service-orders/${id}/start`);
    return unwrap(res.data);
  },

  async complete(id: string): Promise<ServiceOrder> {
    const res = await apiClient.patch(`/service-orders/${id}/complete`);
    return unwrap(res.data);
  },

  async cancel(id: string): Promise<ServiceOrder> {
    const res = await apiClient.patch(`/service-orders/${id}/cancel`);
    return unwrap(res.data);
  },

  async assignMechanic(id: string, mechanicId: string): Promise<ServiceOrder> {
    const res = await apiClient.post(`/service-orders/${id}/assign-mechanic`, { mechanicId });
    return unwrap(res.data);
  },

  async unassignMechanic(id: string): Promise<ServiceOrder> {
    const res = await apiClient.delete(`/service-orders/${id}/unassign-mechanic`);
    return unwrap(res.data);
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/service-orders/${id}`);
  },
};

export default serviceOrderService;
