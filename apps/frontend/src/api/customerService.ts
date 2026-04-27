import apiClient from './apiClient';

// ==================== TYPES ====================

export interface CustomerQuoteItem {
  id: string;
  serviceId?: string | null;
  name: string;
  quantity: number;
  price: number;
  quotedPrice: number | null;
  priceQuoted?: boolean;
  observations?: string | null;
}

export interface CustomerQuoteAddress {
  id: string;
  street: string;
  number: string;
  complement?: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  type: 'HOME' | 'WORK' | 'OTHER';
}

export interface CustomerQuote {
  id: string;
  userId: string;
  customerName: string;
  customerWhatsApp: string;
  items: CustomerQuoteItem[];
  total: number;
  status: 'PENDING' | 'ANALYZING' | 'QUOTED' | 'APPROVED' | 'REJECTED';
  orderStatus?: string | null;
  observations?: string | null;
  quoteNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  quotedAt?: string | null;
  quoteApprovedAt?: string | null;
  source?: 'WEB' | 'APP' | 'PHONE';
  address?: CustomerQuoteAddress | null;
}

export interface CreateCustomerQuotePayload {
  addressId?: string;
  observations?: string;
  items: Array<{
    serviceId: string;
    quantity: number;
    observations?: string;
  }>;
}

export interface CustomerOrder {
  id: string;
  status:
    | 'PENDING'
    | 'CONFIRMED'
    | 'IN_PRODUCTION'
    | 'PREPARING'
    | 'SHIPPED'
    | 'DELIVERED'
    | 'CANCELLED';
  quoteStatus?: string | null;
  hasProducts: boolean;
  hasServices: boolean;
  total: number;
  subtotal?: number;
  discountAmount?: number;
  paymentMethod?: string;
  items: CustomerOrderItem[];
  address?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerOrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  type: 'product' | 'service';
}

export interface CustomerNotification {
  id: string;
  type:
    | 'NEW_QUOTE_REQUEST'
    | 'QUOTE_RESPONDED'
    | 'QUOTE_APPROVED'
    | 'QUOTE_REJECTED'
    | 'ORDER_STATUS_UPDATED'
    | 'ORDER_CREATED';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExportQuotePdfPayload {
  html: string;
  filename?: string;
}

// ==================== QUOTES ====================

export async function getMyQuotes(status?: string): Promise<CustomerQuote[]> {
  const params = status && status !== 'all' ? { status } : {};
  const response = await apiClient.get('/customers/me/quotes', { params });
  return response.data;
}

export async function getMyQuoteById(id: string): Promise<CustomerQuote> {
  const response = await apiClient.get(`/customers/me/quotes/${id}`);
  return response.data;
}

export async function createQuoteRequest(data: CreateCustomerQuotePayload): Promise<CustomerQuote> {
  const response = await apiClient.post('/customers/me/quotes', data);
  return response.data;
}

export async function exportQuotePdf(id: string, payload: ExportQuotePdfPayload): Promise<void> {
  const response = await apiClient.post(`/customers/me/quotes/${id}/export-pdf`, payload, {
    responseType: 'blob',
    timeout: 30000,
  });

  const contentDisposition = response.headers['content-disposition'];
  const fallbackFilename = payload.filename || `orcamento-${id.slice(0, 8)}.pdf`;
  const matchedFilename = contentDisposition?.match(/filename="?([^"]+)"?/i)?.[1];
  const filename = matchedFilename || fallbackFilename;

  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function approveQuote(
  id: string
): Promise<{ id: string; status: string; orderStatus: string; message: string }> {
  const response = await apiClient.patch(`/customers/me/quotes/${id}/approve`);
  return response.data;
}

export async function rejectQuote(
  id: string
): Promise<{ id: string; status: string; message: string }> {
  const response = await apiClient.patch(`/customers/me/quotes/${id}/reject`);
  return response.data;
}

// ==================== ORDERS ====================

export async function getMyOrders(): Promise<CustomerOrder[]> {
  const response = await apiClient.get('/customers/me/orders');
  return response.data;
}

export async function getMyOrderById(id: string): Promise<CustomerOrder> {
  const response = await apiClient.get(`/customers/me/orders/${id}`);
  return response.data;
}

// ==================== NOTIFICATIONS ====================

export async function getMyNotifications(): Promise<CustomerNotification[]> {
  const response = await apiClient.get('/customer/notifications');
  return response.data;
}

export async function getUnreadNotificationCount(): Promise<number> {
  const response = await apiClient.get('/customer/notifications/unread-count');
  return response.data.count;
}

export async function markNotificationAsRead(id: string): Promise<CustomerNotification> {
  const response = await apiClient.patch(`/customer/notifications/${id}/read`);
  return response.data;
}

export async function markAllNotificationsAsRead(): Promise<{ message: string; count: number }> {
  const response = await apiClient.patch('/customer/notifications/mark-all-read');
  return response.data;
}

// ==================== DEFAULT EXPORT ====================

const customerService = {
  getMyQuotes,
  getMyQuoteById,
  createQuoteRequest,
  exportQuotePdf,
  approveQuote,
  rejectQuote,
  getMyOrders,
  getMyOrderById,
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};

export default customerService;
