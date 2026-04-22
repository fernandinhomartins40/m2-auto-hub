// src/types/promotions.ts - Tipos avançados para sistema de promoções

export type PromotionType =
  | 'PERCENTAGE'
  | 'FIXED'
  | 'BUY_ONE_GET_ONE'
  | 'BUY_X_GET_Y'
  | 'TIERED_DISCOUNT'
  | 'CASHBACK'
  | 'FREE_SHIPPING'
  | 'BUNDLE_DISCOUNT'
  | 'LOYALTY_POINTS'
  | 'PROGRESSIVE_DISCOUNT'
  | 'TIME_LIMITED_FLASH'
  | 'QUANTITY_BASED'
  | 'CATEGORY_COMBO';

export type PromotionTarget =
  | 'ALL_PRODUCTS'
  | 'SPECIFIC_PRODUCTS'
  | 'CATEGORY'
  | 'BRAND'
  | 'PRICE_RANGE'
  | 'NEW_ARRIVALS'
  | 'CLEARANCE'
  | 'CUSTOMER_SEGMENT';

export type PromotionTrigger =
  | 'CART_VALUE'
  | 'ITEM_QUANTITY'
  | 'FIRST_PURCHASE'
  | 'REPEAT_CUSTOMER'
  | 'BIRTHDAY'
  | 'ANNIVERSARY'
  | 'SEASONAL'
  | 'MANUAL_CODE'
  | 'AUTO_APPLY'
  | 'GEOLOCATION'
  | 'TIME_OF_DAY';

export type CustomerSegment =
  | 'ALL'
  | 'VIP'
  | 'REGULAR'
  | 'NEW_CUSTOMER'
  | 'RETURNING_CUSTOMER'
  | 'HIGH_VALUE'
  | 'FREQUENT_BUYER'
  | 'INACTIVE_CUSTOMER'
  | 'BIRTHDAY_THIS_MONTH'
  | 'GEOGRAPHIC_REGION';

export type PromotionRuleValue = string | number | boolean | Date;

export interface PromotionRule {
  id: string;
  type: 'MIN_QUANTITY' | 'MIN_VALUE' | 'MAX_USES_PER_CUSTOMER' | 'CUSTOMER_SEGMENT' | 'TIME_WINDOW' | 'PRODUCT_COMBINATION' | 'EXCLUDE_SALE_ITEMS';
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'between';
  value: PromotionRuleValue;
  values?: PromotionRuleValue[];
  description: string;
}

export interface PromotionTier {
  id: string;
  threshold: number; // Valor ou quantidade
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  description: string;
}

export interface PromotionSchedule {
  startDate: string;
  endDate: string;
  timeWindows?: {
    dayOfWeek: number[]; // 0-6 (domingo-sábado)
    startTime: string; // HH:MM
    endTime: string; // HH:MM
  }[];
  timezone?: string;
  recurringType?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  excludeDates?: string[];
}

export interface PromotionRewards {
  primary: {
    type: PromotionType;
    value: number;
    maxAmount?: number;
    unit?: string;
  };
  secondary?: {
    type: 'LOYALTY_POINTS' | 'CASHBACK' | 'FREE_PRODUCT' | 'NEXT_ORDER_DISCOUNT';
    value: number;
    productId?: string;
    description?: string;
  };
  freeShipping?: boolean;
  giftWrap?: boolean;
  prioritySupport?: boolean;
}

export interface PromotionAnalytics {
  views: number;
  clicks: number;
  conversions: number;
  revenue: number;
  avgOrderValue: number;
  customerAcquisition: number;
  customerRetention: number;
  costPerAcquisition: number;
  returnOnInvestment: number;
}

export interface AdvancedPromotion {
  id: string;
  name: string;
  description: string;
  shortDescription?: string;
  bannerImage?: string;
  badgeText?: string;

  // Configuração básica
  type: PromotionType;
  target: PromotionTarget;
  trigger: PromotionTrigger;

  // Segmentação
  customerSegments: CustomerSegment[];
  geographicRestrictions?: string[];
  deviceTypes?: ('MOBILE' | 'DESKTOP' | 'TABLET')[];

  // Regras e condições
  rules: PromotionRule[];
  tiers?: PromotionTier[]; // Para descontos escalonados

  // Produtos alvo
  targetProductIds?: string[];
  targetCategories?: string[];
  targetBrands?: string[];
  targetPriceRange?: { min: number; max: number };
  excludeProductIds?: string[];
  excludeCategories?: string[];

  // Recompensas
  rewards: PromotionRewards;

  // Agendamento
  schedule: PromotionSchedule;

  // Limitações de uso
  usageLimit?: number;
  usageLimitPerCustomer?: number;
  usedCount: number;

  // Combinação com outras promoções
  canCombineWithOthers: boolean;
  excludePromotionIds?: string[];
  priority: number; // Para ordem de aplicação

  // Códigos
  code?: string; // Para promoções com código
  autoApply: boolean;

  // Estados
  isActive: boolean;
  isDraft: boolean;
  isExpired?: boolean;

  // Analytics
  analytics?: PromotionAnalytics;

  // Metadados
  createdBy: string;
  lastModifiedBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;

  // Configurações avançadas
  customLogic?: string; // JavaScript para lógica personalizada
  webhookUrl?: string; // Para integrações externas
  tags: string[];
  notes?: string;
}

// Resultado de aplicação de promoção
export interface PromotionApplicationResult {
  promotionId: string;
  promotionName: string;
  applied: boolean;
  reason?: string;
  discountAmount: number;
  originalAmount: number;
  finalAmount: number;
  appliedRules: string[];
  warnings?: string[];
  metadata?: Record<string, string | number | boolean | null>;
}

// Contexto de aplicação de promoções
export interface PromotionContext {
  customerId?: string;
  customerSegment?: CustomerSegment;
  cartItems: {
    productId: string;
    quantity: number;
    price: number;
    category: string;
    brand?: string;
  }[];
  cartTotal: number;
  orderHistory?: {
    totalOrders: number;
    totalSpent: number;
    avgOrderValue: number;
    lastOrderDate?: string;
  };
  currentDate: string;
  currentTime: string;
  timezone?: string;
  geolocation?: {
    country: string;
    state: string;
    city: string;
  };
  deviceType: 'MOBILE' | 'DESKTOP' | 'TABLET';
  referralSource?: string;
  appliedCoupons?: string[];
  loyaltyPoints?: number;
}

// Interface para engine de promoções
export interface PromotionEngine {
  evaluatePromotions(
    promotions: AdvancedPromotion[],
    context: PromotionContext
  ): PromotionApplicationResult[];

  calculateBestCombination(
    applicablePromotions: PromotionApplicationResult[]
  ): PromotionApplicationResult[];

  validatePromotionRules(
    promotion: AdvancedPromotion,
    context: PromotionContext
  ): { valid: boolean; reasons: string[] };
}

// Templates de promoção
export interface PromotionTemplate {
  id: string;
  name: string;
  description: string;
  category: 'SEASONAL' | 'CUSTOMER_ACQUISITION' | 'RETENTION' | 'CLEARANCE' | 'UPSELL' | 'CROSS_SELL';
  template: Partial<AdvancedPromotion>;
  configurationFields: {
    field: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'multiselect' | 'date' | 'boolean';
    options?: { value: string | number | boolean; label: string }[];
    required: boolean;
    description?: string;
  }[];
}

// Estatísticas de promoções
export interface PromotionStats {
  totalPromotions: number;
  activePromotions: number;
  expiredPromotions: number;
  totalDiscountGiven: number;
  totalRevenue: number;
  conversionRate: number;
  avgDiscountPerOrder: number;
  topPerformingPromotions: {
    promotionId: string;
    promotionName: string;
    conversions: number;
    revenue: number;
  }[];
  promotionsByType: Record<PromotionType, number>;
  customerSegmentPerformance: Record<CustomerSegment, {
    usage: number;
    revenue: number;
    conversionRate: number;
  }>;
}

// Filtros para listagem de promoções
export interface PromotionFilter {
  type?: PromotionType[];
  status?: ('ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'DRAFT' | 'SCHEDULED')[];
  customerSegment?: CustomerSegment[];
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  searchTerm?: string;
  tags?: string[];
  createdBy?: string;
  priority?: {
    min: number;
    max: number;
  };
}