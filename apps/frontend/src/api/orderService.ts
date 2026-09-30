// src/api/orderService.ts
import apiClient from './apiClient';
import { Order } from '@/contexts/AuthContext';
export type { Order } from '@/contexts/AuthContext';
import type { GuestOrderResponse } from './guestOrderService';

export interface CreateOrderRequest {
  items: Array<{
    productId?: string;
    serviceId?: string;
    type: 'PRODUCT' | 'SERVICE';
    quantity: number;
  }>;
  addressId: string;
  paymentMethod: string;
  couponCode?: string;
  source?: 'WEB';
  appliedPromotions?: string[];
}

export interface OrderListResponse {
  success: boolean;
  data: Order[];
  meta: {
    totalCount: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface OrderTrackingEvent {
  id: string;
  status: string;
  description: string;
  timestamp: string;
  location?: string;
}

export interface OrderTrackingResponse {
  orderId: string;
  currentStatus: string;
  estimatedDelivery?: string;
  trackingNumber?: string;
  events: OrderTrackingEvent[];
}

class OrderService {
  async createOrder(data: CreateOrderRequest): Promise<GuestOrderResponse> {
    const response = await apiClient.post<{ success: boolean; data: GuestOrderResponse }>('/orders', data);
    return response.data.data;
  }

  async getOrders(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<OrderListResponse> {
    const response = await apiClient.get<OrderListResponse>('/orders', { params });
    return response.data;
  }

  async getOrderById(id: string): Promise<Order> {
    const response = await apiClient.get<Order>(`/orders/${id}`);
    return response.data;
  }

  async updateOrderStatus(orderId: string, status: string): Promise<Order> {
    const response = await apiClient.patch<Order>(`/orders/${orderId}/status`, { status });
    return response.data;
  }

  async cancelOrder(orderId: string): Promise<Order> {
    const response = await apiClient.patch<Order>(`/orders/${orderId}/cancel`);
    return response.data;
  }

  async getOrderTracking(orderId: string): Promise<OrderTrackingResponse> {
    const response = await apiClient.get<OrderTrackingResponse>(`/orders/${orderId}/tracking`);
    return response.data;
  }
}

export default new OrderService();
