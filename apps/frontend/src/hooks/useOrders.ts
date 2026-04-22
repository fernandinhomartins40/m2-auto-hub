// src/hooks/useOrders.ts
import { useState } from 'react';
import { orderService, handleApiError } from '@/api';
import { Order } from '@/api/orderService';

interface CreateOrderData {
  customerId: string;
  items: Array<{
    productId?: string;
    serviceId?: string;
    name: string;
    price: number;
    quantity: number;
    type: 'PRODUCT' | 'SERVICE';
  }>;
  addressId: string;
  paymentMethod: string;
  couponCode?: string;
}

interface UseOrdersResult {
  orders: Order[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  page: number;
  limit: number;
  fetchOrders: (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) => Promise<void>;
  getOrderById: (id: string) => Promise<Order | null>;
  createOrder: (data: CreateOrderData) => Promise<Order | null>;
  updateOrderStatus: (orderId: string, status: string) => Promise<Order | null>;
  cancelOrder: (orderId: string) => Promise<Order | null>;
}

export const useOrders = (): UseOrdersResult => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);

  const fetchOrders = async (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await orderService.getOrders(params);
      setOrders(response.orders);
      setTotalCount(response.totalCount);
      setPage(response.page);
      setLimit(response.limit);
    } catch (err) {
      const apiError = handleApiError(err);
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  };

  const getOrderById = async (id: string): Promise<Order | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const order = await orderService.getOrderById(id);
      return order;
    } catch (err) {
      const apiError = handleApiError(err);
      setError(apiError.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async (data: CreateOrderData): Promise<Order | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const order = await orderService.createOrder(data);
      return order;
    } catch (err) {
      const apiError = handleApiError(err);
      setError(apiError.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string): Promise<Order | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const order = await orderService.updateOrderStatus(orderId, status);
      // Update the order in the local state
      setOrders(prev => prev.map(o => o.id === orderId ? order : o));
      return order;
    } catch (err) {
      const apiError = handleApiError(err);
      setError(apiError.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async (orderId: string): Promise<Order | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const order = await orderService.cancelOrder(orderId);
      // Update the order in the local state
      setOrders(prev => prev.map(o => o.id === orderId ? order : o));
      return order;
    } catch (err) {
      const apiError = handleApiError(err);
      setError(apiError.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    orders,
    loading,
    error,
    totalCount,
    page,
    limit,
    fetchOrders,
    getOrderById,
    createOrder,
    updateOrderStatus,
    cancelOrder,
  };
};