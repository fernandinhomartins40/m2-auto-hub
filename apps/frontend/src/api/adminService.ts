// src/api/adminService.ts
import apiClient from './apiClient';

// ==================== INTERFACES ====================

export interface StoreOrder {
  id: string;
  userId: string;
  customerName: string;
  customerWhatsApp: string;
  items: OrderItem[];
  total: number;
  hasProducts: boolean;
  hasServices: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  source: 'website' | 'whatsapp' | 'phone';
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  type?: 'product' | 'service';
}

export interface Quote {
  id: string;
  userId: string;
  customerName: string;
  customerWhatsApp: string;
  items: QuoteItem[];
  total: number;
  status: 'PENDING' | 'ANALYZING' | 'QUOTED' | 'APPROVED' | 'REJECTED' | 'pending' | 'analyzing' | 'responded' | 'accepted' | 'rejected';
  sessionId?: string;
  hasLinkedOrder?: boolean;
  orderStatus?: string | null;
  createdAt: string;
  updatedAt: string;
  quotedAt?: string | null;
  quoteApprovedAt?: string | null;
  quoteNotes?: string | null;
  publicApprovalToken?: string | null;
  publicApprovalExpiresAt?: string | null;
  source?: 'website' | 'whatsapp' | 'phone';
}

export interface QuoteItem {
  id: string;
  name: string;
  quantity: number;
  price?: number | null;
  quotedPrice?: number | null;
}

export interface ExportQuotePdfPayload {
  html: string;
  filename?: string;
}

export interface ExportOrderPdfPayload {
  html: string;
  filename?: string;
}

export interface ExportCustomerPdfPayload {
  html: string;
  filename?: string;
}

export interface AdminNotificationCenterItem {
  id: string;
  source: 'persisted' | 'alert';
  type:
    | 'order'
    | 'quote'
    | 'stock'
    | 'revision'
    | 'loyalty'
    | 'customer'
    | 'promotion'
    | 'coupon'
    | 'system';
  backendType?: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  read: boolean;
  readAt: string | null;
  createdAt: string;
  actionLabel: string;
  actionUrl: string;
  actionTab: string;
  data?: any;
}

export interface AdminNotificationCenterSummary {
  unread: number;
  persisted: number;
  pendingOrders: number;
  pendingQuotes: number;
  stockAlerts: number;
  revisionAlerts: number;
  loyaltyAlerts: number;
  relationshipAlerts: number;
  customerAlerts: number;
  marketingAlerts: number;
}

export interface AdminNotificationCenterResponse {
  generatedAt: string;
  summary: AdminNotificationCenterSummary;
  notifications: AdminNotificationCenterItem[];
}

export interface AdminService {
  id: string;
  name: string;
  description: string;
  category: string;
  estimatedTime: string;
  basePrice?: number;
  specifications?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCoupon {
  id: string;
  code: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING';
  discountValue: number;
  minValue?: number;
  maxDiscount?: number;
  expiresAt: string;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  sku: string;
  supplier: string;
  costPrice: number;
  salePrice: number;
  promoPrice?: number;
  stock: number;
  minStock: number;
  images: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPromotion {
  id: string;
  title: string;
  description: string;
  type: 'percentage' | 'fixed' | 'bogo';
  value: number;
  startDate: string;
  endDate: string;
  products?: string[];
  services?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProvisionalUser {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  cpf?: string;
  level: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  createdAt: string;
  updatedAt: string;
  addresses?: Array<{
    id: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    type: string;
  }>;
}

export interface CustomerRelationshipInsight {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  level: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  birthDate: string | null;
  totalSpent: number;
  deliveredOrders: number;
  completedRevisions: number;
  lastOrderAt: string | null;
  lastRevisionAt: string | null;
  lastInteractionAt: string | null;
  daysSinceLastOrder: number | null;
  daysSinceLastRevision: number | null;
  daysSinceLastInteraction: number | null;
  daysUntilBirthday: number | null;
  interactionType: 'sale' | 'revision' | 'both';
  lastContactedAt: string | null;
  lastContactOutcome: RelationshipMessageOutcome | null;
  daysSinceLastContact: number | null;
}

export interface CustomerRelationshipInsightsResponse {
  generatedAt: string;
  config: {
    inactivityDays: number;
    postSaleDays: number;
    birthdayWindowDays: number;
    vipThreshold: number;
  };
  summary: {
    birthdays: number;
    inactiveSales: number;
    inactiveRevisions: number;
    postSaleFollowUps: number;
    vipAtRisk: number;
  };
  birthdays: CustomerRelationshipInsight[];
  inactiveSales: CustomerRelationshipInsight[];
  inactiveRevisions: CustomerRelationshipInsight[];
  postSaleFollowUps: CustomerRelationshipInsight[];
  vipAtRisk: CustomerRelationshipInsight[];
  categories: RelationshipCategoryResult[];
}

export type RelationshipRuleOperator =
  | 'gte'
  | 'lte'
  | 'gt'
  | 'lt'
  | 'eq'
  | 'neq'
  | 'between'
  | 'isNull'
  | 'notNull';

export interface RelationshipRule {
  field: string;
  operator: RelationshipRuleOperator;
  value?: number | string | null;
  value2?: number | string | null;
}

export interface RelationshipTemplate {
  id: string;
  categoryId: string;
  name: string;
  body: string;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface RelationshipCategory {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  accentColor: string;
  isSystem: boolean;
  isActive: boolean;
  sortOrder: number;
  rules: RelationshipRule[];
  sortBy: string;
  sortDir: string;
  createdAt: string;
  updatedAt: string;
  templates: RelationshipTemplate[];
}

/** Categoria já calculada (com clientes e templates) no endpoint de insights. */
export interface RelationshipCategoryResult {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  accentColor: string;
  isSystem: boolean;
  sortOrder: number;
  count: number;
  customers: CustomerRelationshipInsight[];
  templates: Array<{ id: string; name: string; body: string; isDefault: boolean }>;
}

export interface RelationshipTemplatePlaceholder {
  token: string;
  description: string;
}

export interface RelationshipCategoriesResponse {
  categories: RelationshipCategory[];
  placeholders: RelationshipTemplatePlaceholder[];
  fields: string[];
}

export interface RelationshipCategoryInput {
  name: string;
  description?: string;
  icon?: string;
  accentColor?: string;
  isActive?: boolean;
  sortOrder?: number;
  rules?: RelationshipRule[];
  sortBy?: string;
  sortDir?: string;
}

export interface RelationshipTemplateInput {
  name: string;
  body: string;
  isDefault?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}

export type RelationshipMessageStatus = "PENDING" | "SENT";
export type RelationshipMessageOutcome =
  | "PENDING"
  | "REPLIED"
  | "SCHEDULED"
  | "PURCHASED"
  | "NO_REPLY";

export interface RelationshipMessage {
  id: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  categoryKey: string;
  categoryName: string;
  templateName: string | null;
  messageBody: string;
  status: RelationshipMessageStatus;
  outcome: RelationshipMessageOutcome;
  notes: string | null;
  adminName: string | null;
  createdAt: string;
  confirmedAt: string | null;
}

export interface RelationshipMessagesResponse {
  items: RelationshipMessage[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface RelationshipDashboard {
  generatedAt: string;
  periodDays: number;
  summary: {
    totalSent: number;
    pendingConfirmation: number;
    customersImpacted: number;
    replied: number;
  };
  byCategory: Array<{ key: string; name: string; total: number }>;
  byOutcome: Array<{ outcome: RelationshipMessageOutcome; total: number }>;
  timeline: Array<{ date: string; total: number }>;
  coverage: Array<{
    key: string;
    name: string;
    accentColor: string;
    totalOpportunities: number;
    contacted: number;
    pending: number;
  }>;
}

export interface AdminCustomerVehicle {
  id: string;
  customerId: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  color: string;
  mileage: number | null;
  chassisNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Dados tecnicos vindos do cache proprio de placas ou da consulta externa.
 * Preenchido apenas quando o veiculo ainda nao esta no cadastro.
 */
export interface PlateTechnicalData {
  plate: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  chassisNumber: string | null;
  fuel: string | null;
  city: string | null;
  state: string | null;
  source: 'cache' | 'external';
  provider: string;
}

export interface VehicleLookupResult {
  found: boolean;
  plate: string;
  customer?: ProvisionalUser;
  vehicle?: AdminCustomerVehicle;
  technicalData?: PlateTechnicalData;
}

export interface RecognizedPlateCandidate {
  plate: string;
  confidence: number;
  detectionConfidence: number;
  region?: string | null;
  regionConfidence?: number | null;
  boundingBox: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
}

export interface RecognizedPlateResponse {
  provider: string;
  detectorModel: string;
  ocrModel: string;
  elapsedMs: number;
  plate: string | null;
  candidates: RecognizedPlateCandidate[];
}

export interface AdminRevision {
  id: string;
  customerId: string;
  vehicleId: string;
  date: string;
  mileage: number | null;
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  checklistItems: any;
  generalNotes: string | null;
  recommendations: string | null;
  assignedMechanicId: string | null;
  mechanicName: string | null;
  mechanicNotes: string | null;
  assignedAt: string | null;
  transferHistory: any[] | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  vehicle?: {
    id: string;
    brand: string;
    model: string;
    year: number;
    plate: string;
    color: string;
  };
  customer?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  assignedMechanic?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
  totalCustomers: number;
  activeProducts: number;
  lowStockProducts: number;
  activeCoupons: number;
  recentOrders: StoreOrder[];
}

// ==================== CREATE REQUESTS ====================

export interface CreateServiceRequest {
  name: string;
  description: string;
  category: string;
  estimatedTime: string;
  basePrice?: number;
  specifications?: string;
  isActive?: boolean;
}

export interface CreateCouponRequest {
  code: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING';
  discountValue: number;
  minValue?: number;
  maxDiscount?: number;
  expiresAt: string;
  usageLimit?: number;
  isActive?: boolean;
}

export interface CreateProductRequest {
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  sku: string;
  supplier: string;
  costPrice: number;
  salePrice: number;
  promoPrice?: number;
  stock: number;
  minStock: number;
  images?: string[];
  isActive?: boolean;
}

export interface CreatePromotionRequest {
  title: string;
  description: string;
  type: 'percentage' | 'fixed' | 'bogo';
  value: number;
  startDate: string;
  endDate: string;
  products?: string[];
  services?: string[];
  isActive?: boolean;
}

// ==================== SERVICE CLASS ====================

class AdminService {
  // ==================== DASHBOARD ====================

  async getDashboardStats(): Promise<DashboardStats> {
    const response = await apiClient.get<DashboardStats>('/admin/dashboard/stats');
    return response.data;
  }

  // ==================== ORDERS ====================

  async getOrders(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<{ orders: StoreOrder[]; totalCount: number }> {
    const response = await apiClient.get('/admin/orders', { params });
    return response.data;
  }

  async getOrderById(id: string): Promise<StoreOrder> {
    const response = await apiClient.get(`/admin/orders/${id}`);
    return response.data;
  }

  async updateOrderStatus(id: string, status: string): Promise<StoreOrder> {
    const response = await apiClient.patch(`/admin/orders/${id}/status`, { status });
    return response.data;
  }

  async createAdminOrder(data: {
    customerId?: string;
    addressId?: string;
    customerData?: {
      name: string;
      email: string;
      phone: string;
      cpf?: string;
    };
    address?: {
      street: string;
      number: string;
      complement?: string;
      neighborhood: string;
      city: string;
      state: string;
      zipCode: string;
      type: 'HOME' | 'WORK' | 'OTHER';
    };
    items: Array<{
      productId?: string;
      serviceId?: string;
      type: 'PRODUCT' | 'SERVICE';
      quantity: number;
    }>;
    paymentMethod: string;
    couponCode?: string;
  }): Promise<StoreOrder> {
    const response = await apiClient.post('/admin/orders', data);
    return response.data;
  }

  async exportOrderPdf(id: string, payload: ExportOrderPdfPayload): Promise<void> {
    const response = await apiClient.post(`/admin/orders/${id}/export-pdf`, payload, {
      responseType: 'blob',
      timeout: 30000,
    });

    const contentDisposition = response.headers['content-disposition'];
    const fallbackFilename = payload.filename || `pedido-${id.slice(0, 8)}.pdf`;
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

  async exportOrdersPdf(payload: ExportOrderPdfPayload): Promise<void> {
    const response = await apiClient.post('/admin/orders/export-pdf', payload, {
      responseType: 'blob',
      timeout: 30000,
    });

    const contentDisposition = response.headers['content-disposition'];
    const fallbackFilename = payload.filename || 'pedidos.pdf';
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

  // ==================== QUOTES ====================

  async getQuotes(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<{ quotes: Quote[]; totalCount: number }> {
    const response = await apiClient.get('/admin/quotes', { params });
    return response.data;
  }

  async getQuoteById(id: string): Promise<Quote> {
    const response = await apiClient.get(`/admin/quotes/${id}`);
    return response.data;
  }

  async exportQuotePdf(id: string, payload: ExportQuotePdfPayload): Promise<void> {
    const response = await apiClient.post(`/admin/quotes/${id}/export-pdf`, payload, {
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

  async updateQuotePrices(
    id: string,
    items: Array<{ id: string; quotedPrice: number }>,
    options?: { observations?: string; validityDays?: number }
  ): Promise<Quote> {
    const response = await apiClient.patch(`/admin/quotes/${id}/prices`, {
      items,
      observations: options?.observations,
      validityDays: options?.validityDays,
    });
    return response.data;
  }

  async approveQuote(id: string): Promise<Quote> {
    const response = await apiClient.patch(`/admin/quotes/${id}/approve`);
    return response.data;
  }

  async rejectQuote(id: string): Promise<Quote> {
    const response = await apiClient.patch(`/admin/quotes/${id}/reject`);
    return response.data;
  }

  async updateQuoteStatus(id: string, status: string): Promise<Quote> {
    const response = await apiClient.patch(`/admin/quotes/${id}/status`, { status });
    return response.data;
  }

  async createQuote(data: {
    customerId?: string;
    addressId?: string;
    customerData?: {
      name: string;
      email: string;
      phone: string;
      cpf?: string;
    };
    items: Array<{
      serviceId: string;
      quantity: number;
      quotedPrice: number;
      observations?: string;
    }>;
    observations?: string;
    validityDays: number;
    address?: {
      street: string;
      number: string;
      complement?: string;
      neighborhood: string;
      city: string;
      state: string;
      zipCode: string;
      type: 'HOME' | 'WORK' | 'OTHER';
    };
    sendToClient: boolean;
  }): Promise<Quote> {
    const response = await apiClient.post('/admin/quotes', data);
    return response.data;
  }

  // ==================== SERVICES ====================

  async getServices(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
  }): Promise<{ services: AdminService[]; totalCount: number }> {
    const response = await apiClient.get('/admin/services', { params });
    return {
      services: response.data.data || [],
      totalCount: response.data.meta?.totalCount || 0
    };
  }

  async getServiceById(id: string): Promise<AdminService> {
    const response = await apiClient.get(`/admin/services/${id}`);
    return response.data;
  }

  async createService(data: CreateServiceRequest): Promise<AdminService> {
    const response = await apiClient.post('/admin/services', data);
    return response.data;
  }

  async updateService(id: string, data: Partial<CreateServiceRequest>): Promise<AdminService> {
    const response = await apiClient.put(`/admin/services/${id}`, data);
    return response.data;
  }

  async deleteService(id: string): Promise<void> {
    await apiClient.delete(`/admin/services/${id}`);
  }

  async toggleServiceStatus(id: string): Promise<AdminService> {
    const response = await apiClient.patch(`/admin/services/${id}/toggle-status`);
    return response.data;
  }

  // ==================== COUPONS ====================

  async getCoupons(params?: {
    page?: number;
    limit?: number;
    search?: string;
    active?: boolean;
  }): Promise<{ coupons: AdminCoupon[]; totalCount: number }> {
    const response = await apiClient.get('/admin/coupons', { params });
    return {
      coupons: response.data.data || [],
      totalCount: response.data.meta?.totalCount || 0
    };
  }

  async getCouponById(id: string): Promise<AdminCoupon> {
    const response = await apiClient.get(`/admin/coupons/${id}`);
    return response.data;
  }

  async createCoupon(data: CreateCouponRequest): Promise<AdminCoupon> {
    const response = await apiClient.post('/admin/coupons', data);
    return response.data;
  }

  async updateCoupon(id: string, data: Partial<CreateCouponRequest>): Promise<AdminCoupon> {
    const response = await apiClient.put(`/admin/coupons/${id}`, data);
    return response.data;
  }

  async deleteCoupon(id: string): Promise<void> {
    await apiClient.delete(`/admin/coupons/${id}`);
  }

  async toggleCouponStatus(id: string): Promise<AdminCoupon> {
    const response = await apiClient.patch(`/admin/coupons/${id}/toggle-status`);
    return response.data;
  }

  // ==================== PRODUCTS ====================

  async getProducts(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
  }): Promise<{ products: AdminProduct[]; totalCount: number }> {
    const response = await apiClient.get('/admin/products', { params });
    return {
      products: response.data.data || [],
      totalCount: response.data.meta?.totalCount || 0
    };
  }

  async getProductById(id: string): Promise<AdminProduct> {
    const response = await apiClient.get(`/admin/products/${id}`);
    return response.data;
  }

  async createProduct(data: CreateProductRequest): Promise<AdminProduct> {
    const response = await apiClient.post('/admin/products', data);
    return response.data;
  }

  async updateProduct(id: string, data: Partial<CreateProductRequest>): Promise<AdminProduct> {
    const response = await apiClient.put(`/admin/products/${id}`, data);
    return response.data;
  }

  async deleteProduct(id: string): Promise<void> {
    await apiClient.delete(`/admin/products/${id}`);
  }

  async toggleProductStatus(id: string): Promise<AdminProduct> {
    const response = await apiClient.patch(`/admin/products/${id}/toggle-status`);
    return response.data;
  }

  async updateProductStock(id: string, stock: number): Promise<AdminProduct> {
    const response = await apiClient.patch(`/admin/products/${id}/stock`, { stock });
    return response.data;
  }

  // ==================== PROMOTIONS ====================

  async getPromotions(params?: {
    page?: number;
    limit?: number;
    search?: string;
    active?: boolean;
  }): Promise<{ promotions: AdminPromotion[]; totalCount: number }> {
    const response = await apiClient.get('/admin/promotions', { params });
    return response.data;
  }

  async getPromotionById(id: string): Promise<AdminPromotion> {
    const response = await apiClient.get(`/admin/promotions/${id}`);
    return response.data;
  }

  async createPromotion(data: CreatePromotionRequest): Promise<AdminPromotion> {
    const response = await apiClient.post('/admin/promotions', data);
    return response.data;
  }

  async updatePromotion(id: string, data: Partial<CreatePromotionRequest>): Promise<AdminPromotion> {
    const response = await apiClient.put(`/admin/promotions/${id}`, data);
    return response.data;
  }

  async deletePromotion(id: string): Promise<void> {
    await apiClient.delete(`/admin/promotions/${id}`);
  }

  async togglePromotionStatus(id: string): Promise<AdminPromotion> {
    const response = await apiClient.patch(`/admin/promotions/${id}/toggle-status`);
    return response.data;
  }

  // ==================== CUSTOMERS ====================

  async getCustomers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    level?: string;
    status?: string;
  }): Promise<{ customers: ProvisionalUser[]; totalCount: number }> {
    const response = await apiClient.get('/admin/customers', { params });
    return response.data;
  }

  async getCustomerById(id: string): Promise<ProvisionalUser> {
    const response = await apiClient.get(`/admin/customers/${id}`);
    return response.data;
  }

  async exportCustomerPdf(id: string, payload: ExportCustomerPdfPayload): Promise<void> {
    const response = await apiClient.post(`/admin/customers/${id}/export-pdf`, payload, {
      responseType: 'blob',
      timeout: 30000,
    });

    const contentDisposition = response.headers['content-disposition'];
    const fallbackFilename = payload.filename || `cliente-${id.slice(0, 8)}.pdf`;
    const matchedFilename = contentDisposition?.match(/filename=\"?([^\"]+)\"?/i)?.[1];
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

  async exportCustomersPdf(payload: ExportCustomerPdfPayload): Promise<void> {
    const response = await apiClient.post('/admin/customers/export-pdf', payload, {
      responseType: 'blob',
      timeout: 30000,
    });

    const contentDisposition = response.headers['content-disposition'];
    const fallbackFilename = payload.filename || 'clientes.pdf';
    const matchedFilename = contentDisposition?.match(/filename=\"?([^\"]+)\"?/i)?.[1];
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

  async updateCustomerLevel(id: string, level: string): Promise<ProvisionalUser> {
    const response = await apiClient.patch(`/admin/customers/${id}/level`, { level });
    return response.data;
  }

  async updateCustomerStatus(id: string, status: string): Promise<ProvisionalUser> {
    const response = await apiClient.patch(`/admin/customers/${id}/status`, { status });
    return response.data;
  }

  async createCustomer(data: {
    name: string;
    email: string;
    phone: string;
    cpf?: string;
  }): Promise<ProvisionalUser> {
    const response = await apiClient.post('/admin/customers', data);
    return response.data;
  }

  async createCustomerAddress(customerId: string, data: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    type: 'HOME' | 'WORK' | 'OTHER';
  }): Promise<{
    id: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    type: string;
  }> {
    const response = await apiClient.post(`/admin/customers/${customerId}/addresses`, data);
    return response.data;
  }

  async getCustomerVehicles(customerId: string): Promise<AdminCustomerVehicle[]> {
    const response = await apiClient.get(`/admin/customers/${customerId}/vehicles`);
    return response.data?.data ?? [];
  }

  async createVehicleForCustomer(customerId: string, data: {
    brand: string;
    model: string;
    year: number;
    plate: string;
    color: string;
    mileage?: number;
    chassisNumber?: string;
  }): Promise<any> {
    const response = await apiClient.post(`/admin/customers/${customerId}/vehicles`, data);
    return response.data;
  }

  async getCustomerRelationshipInsights(params?: {
    inactivityDays?: number;
    postSaleDays?: number;
    birthdayWindowDays?: number;
  }): Promise<CustomerRelationshipInsightsResponse> {
    const response = await apiClient.get('/admin/relationship/insights', { params });
    return response.data;
  }

  async getRelationshipCategories(): Promise<RelationshipCategoriesResponse> {
    const response = await apiClient.get('/admin/relationship/categories');
    return response.data;
  }

  async createRelationshipCategory(data: RelationshipCategoryInput): Promise<RelationshipCategory> {
    const response = await apiClient.post('/admin/relationship/categories', data);
    return response.data;
  }

  async updateRelationshipCategory(
    id: string,
    data: Partial<RelationshipCategoryInput>
  ): Promise<RelationshipCategory> {
    const response = await apiClient.put(`/admin/relationship/categories/${id}`, data);
    return response.data;
  }

  async deleteRelationshipCategory(id: string): Promise<{ success: boolean }> {
    const response = await apiClient.delete(`/admin/relationship/categories/${id}`);
    return response.data;
  }

  async createRelationshipTemplate(
    categoryId: string,
    data: RelationshipTemplateInput
  ): Promise<RelationshipTemplate> {
    const response = await apiClient.post(
      `/admin/relationship/categories/${categoryId}/templates`,
      data
    );
    return response.data;
  }

  async updateRelationshipTemplate(
    id: string,
    data: Partial<RelationshipTemplateInput>
  ): Promise<RelationshipTemplate> {
    const response = await apiClient.put(`/admin/relationship/templates/${id}`, data);
    return response.data;
  }

  async deleteRelationshipTemplate(id: string): Promise<{ success: boolean }> {
    const response = await apiClient.delete(`/admin/relationship/templates/${id}`);
    return response.data;
  }

  async createRelationshipMessage(data: {
    customerId: string;
    categoryId?: string | null;
    templateId?: string | null;
    messageBody: string;
  }): Promise<RelationshipMessage> {
    const response = await apiClient.post("/admin/relationship/messages", data);
    return response.data;
  }

  async confirmRelationshipMessage(
    id: string,
    data?: { outcome?: RelationshipMessageOutcome; notes?: string }
  ): Promise<RelationshipMessage> {
    const response = await apiClient.patch(`/admin/relationship/messages/${id}/confirm`, data ?? {});
    return response.data;
  }

  async updateRelationshipMessageOutcome(
    id: string,
    data: { outcome?: RelationshipMessageOutcome; notes?: string }
  ): Promise<RelationshipMessage> {
    const response = await apiClient.patch(`/admin/relationship/messages/${id}/outcome`, data);
    return response.data;
  }

  async deleteRelationshipMessage(id: string): Promise<{ success: boolean }> {
    const response = await apiClient.delete(`/admin/relationship/messages/${id}`);
    return response.data;
  }

  async getRelationshipMessages(params?: {
    page?: number;
    limit?: number;
    categoryKey?: string;
    status?: string;
    outcome?: string;
    customerId?: string;
    from?: string;
    to?: string;
  }): Promise<RelationshipMessagesResponse> {
    const response = await apiClient.get("/admin/relationship/messages", { params });
    return response.data;
  }

  async getRelationshipDashboard(params?: { days?: number }): Promise<RelationshipDashboard> {
    const response = await apiClient.get("/admin/relationship/dashboard", { params });
    return response.data;
  }

  async lookupVehicleByPlate(plate: string): Promise<VehicleLookupResult> {
    const response = await apiClient.get('/admin/vehicles/lookup', {
      params: { plate },
    });

    return response.data;
  }

  async recognizeVehiclePlate(image: Blob): Promise<RecognizedPlateResponse> {
    const formData = new FormData();
    formData.append('image', image, 'plate-capture.jpg');

    const response = await apiClient.post('/admin/vehicles/recognize', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 45000,
    });

    return response.data;
  }

  // ==================== REVISIONS ====================

  async getRevisions(params?: {
    page?: number;
    limit?: number;
    customerId?: string;
    vehicleId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{ data: AdminRevision[]; meta: any }> {
    const response = await apiClient.get('/admin/revisions', { params });
    return response.data;
  }

  async getRevisionById(id: string): Promise<AdminRevision> {
    const response = await apiClient.get(`/admin/revisions/${id}`);
    return response.data;
  }

  async updateRevisionStatus(id: string, status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'): Promise<AdminRevision> {
    const actionMap = {
      'IN_PROGRESS': 'start',
      'COMPLETED': 'complete',
      'CANCELLED': 'cancel'
    };
    const action = actionMap[status];
    const response = await apiClient.patch(`/admin/revisions/${id}/${action}`);
    return response.data;
  }

  async deleteRevision(id: string): Promise<void> {
    await apiClient.delete(`/admin/revisions/${id}`);
  }

  async startRevision(id: string): Promise<AdminRevision> {
    const response = await apiClient.patch(`/admin/revisions/${id}/start`);
    return response.data.data;
  }

  async completeRevision(id: string): Promise<AdminRevision> {
    const response = await apiClient.patch(`/admin/revisions/${id}/complete`);
    return response.data.data;
  }

  async updateRevision(id: string, data: {
    mechanicNotes?: string;
    checklistItems?: any;
    recommendations?: string;
  }): Promise<AdminRevision> {
    const response = await apiClient.put(`/admin/revisions/${id}`, data);
    return response.data.data;
  }

  // ==================== ADMIN USERS MANAGEMENT ====================

  /**
   * Create new admin user
   * Only ADMIN and SUPER_ADMIN
   */
  async createAdminUser(data: {
    email: string;
    password: string;
    name: string;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'STAFF';
  }): Promise<{
    id: string;
    email: string;
    name: string;
    role: string;
    status: string;
    createdAt: string;
  }> {
    const response = await apiClient.post('/auth/admin/users', data);
    return response.data.data;
  }

  /**
   * Get all admin users
   */
  async getAdminUsers(params?: {
    page?: number;
    limit?: number;
    role?: string;
    status?: string;
    search?: string;
  }): Promise<{
    data: Array<{
      id: string;
      email: string;
      name: string;
      role: string;
      status: string;
      createdAt: string;
      lastLoginAt?: string;
    }>;
    meta: {
      page: number;
      limit: number;
      totalCount: number;
      totalPages: number;
    };
  }> {
    const response = await apiClient.get('/auth/admin/users', { params });
    return {
      data: response.data.data,
      meta: response.data.meta,
    };
  }

  /**
   * Update admin user
   */
  async updateAdminUser(
    id: string,
    data: {
      name?: string;
      role?: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'STAFF';
      status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
    }
  ): Promise<{
    id: string;
    email: string;
    name: string;
    role: string;
    status: string;
  }> {
    const response = await apiClient.put(`/auth/admin/users/${id}`, data);
    return response.data.data;
  }

  /**
   * Delete (soft) admin user
   * Only SUPER_ADMIN
   */
  async deleteAdminUser(id: string): Promise<void> {
    await apiClient.delete(`/auth/admin/users/${id}`);
  }

  // ==================== NOTIFICATIONS ====================

  /**
   * Get admin notifications
   */
  async getNotifications(params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  }): Promise<Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    data?: any;
    read: boolean;
    readAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>> {
    const response = await apiClient.get('/admin/notifications', { params });
    return response.data;
  }

  /**
   * Get complete admin notification center
   */
  async getNotificationCenter(): Promise<AdminNotificationCenterResponse> {
    const response = await apiClient.get('/admin/notifications/center');
    return response.data;
  }

  /**
   * Get unread notifications count
   */
  async getUnreadNotificationsCount(): Promise<number> {
    const response = await apiClient.get('/admin/notifications/unread-count');
    return response.data.count;
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(id: string): Promise<void> {
    await apiClient.patch(`/admin/notifications/${id}/read`);
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsAsRead(): Promise<void> {
    await apiClient.patch('/admin/notifications/mark-all-read');
  }
}

export default new AdminService();
