import apiClient from './apiClient';

export interface ShippingMethod {
  id: string;
  name: string;
  type: 'CORREIOS' | 'TRANSPORTADORA' | 'MOTOBOY' | 'RETIRADA';
  trackingUrl?: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShippingMethodDto {
  name: string;
  type: 'CORREIOS' | 'TRANSPORTADORA' | 'MOTOBOY' | 'RETIRADA';
  trackingUrl?: string;
  isActive?: boolean;
  order?: number;
}

export interface UpdateShippingMethodDto {
  name?: string;
  type?: 'CORREIOS' | 'TRANSPORTADORA' | 'MOTOBOY' | 'RETIRADA';
  trackingUrl?: string;
  isActive?: boolean;
  order?: number;
}

export interface OrderTracking {
  id: string;
  orderId: string;
  shippingMethodId: string;
  trackingCode: string;
  shippedAt: string;
  estimatedDelivery?: string;
  deliveredAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  shippingMethod: ShippingMethod;
}

export interface CreateTrackingDto {
  shippingMethodId: string;
  trackingCode: string;
  estimatedDelivery?: string;
  notes?: string;
}

class ShippingService {
  // Shipping Methods
  async getAllMethods(activeOnly: boolean = false): Promise<ShippingMethod[]> {
    const response = await apiClient.get('/shipping/methods', {
      params: { activeOnly },
    });
    return response.data;
  }

  async getMethodById(id: string): Promise<ShippingMethod> {
    const response = await apiClient.get(`/shipping/methods/${id}`);
    return response.data;
  }

  async createMethod(dto: CreateShippingMethodDto): Promise<ShippingMethod> {
    const response = await apiClient.post('/shipping/methods', dto);
    return response.data;
  }

  async updateMethod(id: string, dto: UpdateShippingMethodDto): Promise<ShippingMethod> {
    const response = await apiClient.put(`/shipping/methods/${id}`, dto);
    return response.data;
  }

  async deleteMethod(id: string): Promise<void> {
    await apiClient.delete(`/shipping/methods/${id}`);
  }

  async toggleActive(id: string): Promise<ShippingMethod> {
    const response = await apiClient.patch(`/shipping/methods/${id}/toggle`, {});
    return response.data;
  }

  async reorderMethods(orderedIds: string[]): Promise<ShippingMethod[]> {
    const response = await apiClient.post('/shipping/methods/reorder', { orderedIds });
    return response.data;
  }

  async seedDefaultMethods(): Promise<void> {
    await apiClient.post('/shipping/methods/seed', {});
  }

  // Order Tracking
  async addTracking(orderId: string, dto: CreateTrackingDto): Promise<OrderTracking> {
    const response = await apiClient.post(`/orders/${orderId}/tracking`, dto);
    return response.data;
  }

  async updateTracking(orderId: string, dto: Partial<CreateTrackingDto>): Promise<OrderTracking> {
    const response = await apiClient.patch(`/orders/${orderId}/tracking`, dto);
    return response.data;
  }

  async getTracking(orderId: string): Promise<OrderTracking | null> {
    try {
      const response = await apiClient.get(`/orders/${orderId}/tracking`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async deleteTracking(orderId: string): Promise<void> {
    await apiClient.delete(`/orders/${orderId}/tracking`);
  }

  getTrackingUrl(method: ShippingMethod, trackingCode: string): string | null {
    if (!method.trackingUrl) {
      return null;
    }
    return method.trackingUrl.replace('{code}', trackingCode);
  }
}

export default new ShippingService();
