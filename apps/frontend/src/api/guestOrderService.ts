import apiClient from './apiClient';

export interface CreateGuestOrderRequest {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    type?: 'HOME' | 'WORK' | 'OTHER';
  };
  items: Array<{
    productId?: string;
    serviceId?: string;
    type: 'PRODUCT' | 'SERVICE';
    quantity: number;
  }>;
  paymentMethod: string;
  couponCode?: string;
}

export interface GuestOrderResponse {
  id: string;
  customerId: string;
  status: string;
  hasProducts: boolean;
  hasServices: boolean;
  quoteStatus?: string;
  total: number;
  subtotal: number;
  discountAmount: number;
  items: Array<{
    id: string;
    name: string;
    type: string;
    quantity: number;
    price: number;
    subtotal: number;
    priceQuoted: boolean;
  }>;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  createdAt: string;
}

class GuestOrderService {
  async createGuestOrder(data: CreateGuestOrderRequest): Promise<GuestOrderResponse> {
    const response = await apiClient.post<{ data: GuestOrderResponse }>('/orders/guest', data);
    return response.data.data;
  }
}

export default new GuestOrderService();
