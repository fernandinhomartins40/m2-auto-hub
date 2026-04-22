// Tipos compartilhados entre frontend e backend

// Auth Types
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf?: string;
  birthDate?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  totalOrders: number;
  totalSpent: number;
  level: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  addresses: Address[];
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  id: string;
  customerId: string;
  type: 'HOME' | 'WORK' | 'OTHER';
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// Product Types
export interface Product {
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
  images: string;
  specifications?: string;
  vehicleCompatibility: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Service Types
export interface Service {
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

// Order Types
export interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  subtotal: number;
  discountAmount: number;
  total: number;
  status: 'PENDING' | 'CONFIRMED' | 'IN_PRODUCTION' | 'PREPARING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  source: 'WEB' | 'APP' | 'PHONE';
  hasProducts: boolean;
  hasServices: boolean;
  couponCode?: string;
  address: Address;
  addressId: string;
  paymentMethod: string;
  trackingCode?: string;
  estimatedDelivery?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId?: string;
  serviceId?: string;
  name: string;
  price: number;
  quantity: number;
  type: 'PRODUCT' | 'SERVICE';
}

// Promotion Types
export interface Promotion {
  id: string;
  name: string;
  description: string;
  type: 'PERCENTAGE' | 'FIXED' | 'BUY_ONE_GET_ONE';
  value: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  targetProducts: string;
  minValue?: number;
  usageLimit?: number;
  usedCount: number;
  createdAt: string;
  updatedAt: string;
}

// Coupon Types
export interface Coupon {
  id: string;
  code: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minValue?: number;
  maxValue?: number;
  expiresAt: string;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Favorite Types
export interface Favorite {
  id: string;
  customerId: string;
  productId: string;
  createdAt: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Auth Request/Response Types
export interface LoginRequest {
  identifier: string; // Pode ser email ou telefone
  password: string;
}

export interface LoginResponse {
  token: string;
  customer: Customer;
}

export interface RegisterRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
  cpf?: string;
}

export interface RegisterResponse {
  token: string;
  customer: Customer;
}

// Revision Types (from apps/frontend/src/types/revisions.ts)
export interface Vehicle {
  id: string;
  customerId: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  chassisNumber?: string;
  color?: string;
  mileage?: number;
  createdAt: Date | string;
}

export interface ChecklistItem {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isEnabled: boolean;
  order: number;
  createdAt: Date | string;
}

export interface ChecklistCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  isDefault: boolean;
  isEnabled: boolean;
  order: number;
  items: ChecklistItem[];
  createdAt: Date | string;
}

export enum ItemStatus {
  NOT_CHECKED = 'not_checked',
  OK = 'ok',
  ATTENTION = 'attention',
  CRITICAL = 'critical',
  NOT_APPLICABLE = 'not_applicable'
}

export interface RevisionChecklistItem {
  itemId: string;
  status: ItemStatus;
  notes?: string;
  photosUrls?: string[];
  checkedAt?: Date | string;
  checkedBy?: string;
}

export interface Revision {
  id: string;
  customerId: string;
  vehicleId: string;
  date: Date | string;
  mileage?: number;
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
  checklistItems: RevisionChecklistItem[];
  generalNotes?: string;
  recommendations?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  completedAt?: Date | string;
}

// Cart Types (from apps/frontend/src/contexts/CartContext.tsx)
export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  category?: string;
  type?: 'product' | 'service';
  description?: string;
}

export interface CouponInfo {
  code: string;
  discountAmount: number;
  discountType: 'PERCENTAGE' | 'FIXED';
  description?: string;
}
