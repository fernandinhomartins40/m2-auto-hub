// src/schemas/index.ts - Schemas de validação baseados no Prisma

import { z } from 'zod';

// Enums baseados no schema Prisma
export const CustomerStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']);
export const CustomerLevelSchema = z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']);
export const AddressTypeSchema = z.enum(['HOME', 'WORK', 'OTHER']);
export const OrderStatusSchema = z.enum(['PENDING', 'CONFIRMED', 'IN_PRODUCTION', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED']);
export const OrderSourceSchema = z.enum(['WEB', 'APP', 'PHONE']);
export const OrderItemTypeSchema = z.enum(['PRODUCT', 'SERVICE']);
export const CouponDiscountTypeSchema = z.enum(['PERCENTAGE', 'FIXED']);
export const PromotionTypeSchema = z.enum(['PERCENTAGE', 'FIXED', 'BUY_ONE_GET_ONE']);

// Schema base para modelos com ID
const BaseModelSchema = z.object({
  id: z.string().cuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Customer Schema
export const CustomerSchema = BaseModelSchema.extend({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  email: z.string().email('Email inválido'),
  phone: z.string().regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, 'Telefone inválido'),
  cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido').optional(),
  birthDate: z.string().datetime().optional(),
  status: CustomerStatusSchema.default('ACTIVE'),
  totalOrders: z.number().int().min(0).default(0),
  totalSpent: z.number().min(0).default(0),
  level: CustomerLevelSchema.default('BRONZE'),
  addresses: z.array(z.lazy(() => AddressSchema)).default([]),
});

// Address Schema
export const AddressSchema = BaseModelSchema.extend({
  customerId: z.string().cuid(),
  type: AddressTypeSchema.default('HOME'),
  street: z.string().min(1, 'Rua é obrigatória').max(200),
  number: z.string().min(1, 'Número é obrigatório').max(20),
  complement: z.string().max(100).optional(),
  neighborhood: z.string().min(1, 'Bairro é obrigatório').max(100),
  city: z.string().min(1, 'Cidade é obrigatória').max(100),
  state: z.string().length(2, 'Estado deve ter 2 caracteres'),
  zipCode: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido'),
  isDefault: z.boolean().default(false),
});

// Product Schema
export const ProductSchema = BaseModelSchema.extend({
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  description: z.string().min(1, 'Descrição é obrigatória').max(2000),
  category: z.string().min(1, 'Categoria é obrigatória').max(100),
  subcategory: z.string().max(100).optional(),
  sku: z.string().min(1, 'SKU é obrigatório').max(50),
  supplier: z.string().min(1, 'Fornecedor é obrigatório').max(100),
  costPrice: z.number().positive('Preço de custo deve ser positivo'),
  salePrice: z.number().positive('Preço de venda deve ser positivo'),
  promoPrice: z.number().positive().optional(),
  stock: z.number().int().min(0).default(0),
  minStock: z.number().int().min(0).default(0),
  images: z.string(), // JSON string de array de URLs
  specifications: z.string().optional(), // JSON string
  vehicleCompatibility: z.string(), // JSON string de array
  isActive: z.boolean().default(true),
});

// Service Schema
export const ServiceSchema = BaseModelSchema.extend({
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  description: z.string().min(1, 'Descrição é obrigatória').max(2000),
  category: z.string().min(1, 'Categoria é obrigatória').max(100),
  estimatedTime: z.string().min(1, 'Tempo estimado é obrigatório'),
  basePrice: z.number().min(0, 'Preço base deve ser maior ou igual a zero').optional(),
  specifications: z.string().optional(), // JSON string
  isActive: z.boolean().default(true),
});

// Order Item Schema
export const OrderItemSchema = z.object({
  id: z.string().cuid(),
  orderId: z.string().cuid(),
  productId: z.string().cuid().optional(),
  serviceId: z.string().cuid().optional(),
  name: z.string().min(1, 'Nome é obrigatório'),
  price: z.number().positive('Preço deve ser positivo'),
  quantity: z.number().int().positive('Quantidade deve ser positiva'),
  type: OrderItemTypeSchema,
}).refine(
  (data) => data.productId || data.serviceId,
  {
    message: "Item deve ter productId ou serviceId",
    path: ["productId", "serviceId"],
  }
);

// Order Schema
export const OrderSchema = BaseModelSchema.extend({
  customerId: z.string().cuid(),
  items: z.array(OrderItemSchema).min(1, 'Pedido deve ter pelo menos um item'),
  total: z.number().positive('Total deve ser positivo'),
  status: OrderStatusSchema.default('PENDING'),
  source: OrderSourceSchema.default('WEB'),
  hasProducts: z.boolean().default(false),
  hasServices: z.boolean().default(false),
  couponCode: z.string().max(20).optional(),
  discountAmount: z.number().min(0).default(0),
  totalWithDiscount: z.number().positive(),
  addressId: z.string().cuid(),
  address: AddressSchema,
  paymentMethod: z.string().min(1, 'Método de pagamento é obrigatório'),
  trackingCode: z.string().optional(),
  estimatedDelivery: z.string().datetime().optional(),
});

// Coupon Schema
export const CouponSchema = BaseModelSchema.extend({
  code: z.string().min(1, 'Código é obrigatório').max(20).toUpperCase(),
  description: z.string().min(1, 'Descrição é obrigatória').max(200),
  discountType: CouponDiscountTypeSchema,
  discountValue: z.number().positive('Valor do desconto deve ser positivo'),
  minValue: z.number().positive().optional(),
  maxValue: z.number().positive().optional(),
  expiresAt: z.string().datetime(),
  usageLimit: z.number().int().positive().optional(),
  usedCount: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
}).refine(
  (data) => !data.minValue || !data.maxValue || data.minValue <= data.maxValue,
  {
    message: "Valor mínimo deve ser menor que valor máximo",
    path: ["maxValue"],
  }
);

// Promotion Schema
export const PromotionSchema = BaseModelSchema.extend({
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  description: z.string().min(1, 'Descrição é obrigatória').max(500),
  type: PromotionTypeSchema,
  value: z.number().positive('Valor deve ser positivo'),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  isActive: z.boolean().default(true),
  targetProducts: z.string(), // JSON string de array de IDs
  minValue: z.number().positive().optional(),
  usageLimit: z.number().int().positive().optional(),
  usedCount: z.number().int().min(0).default(0),
}).refine(
  (data) => new Date(data.startDate) < new Date(data.endDate),
  {
    message: "Data de início deve ser anterior à data de fim",
    path: ["endDate"],
  }
);

// Favorite Schema
export const FavoriteSchema = z.object({
  id: z.string().cuid(),
  customerId: z.string().cuid(),
  productId: z.string().cuid(),
  createdAt: z.string().datetime(),
});

// Schemas para criação (sem campos gerados automaticamente)
export const CreateCustomerSchema = CustomerSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  totalOrders: true,
  totalSpent: true,
  addresses: true,
});

export const CreateAddressSchema = AddressSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const CreateProductSchema = ProductSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const CreateServiceSchema = ServiceSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const CreateOrderSchema = OrderSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  address: true, // Será preenchido pelo backend
}).extend({
  items: z.array(OrderItemSchema.omit({ id: true, orderId: true })),
});

export const CreateCouponSchema = CouponSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  usedCount: true,
});

export const CreatePromotionSchema = PromotionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  usedCount: true,
});

export const CreateFavoriteSchema = FavoriteSchema.omit({
  id: true,
  createdAt: true,
});

// Schemas para atualização (todos os campos opcionais)
export const UpdateCustomerSchema = CreateCustomerSchema.partial();
export const UpdateAddressSchema = CreateAddressSchema.partial();
export const UpdateProductSchema = CreateProductSchema.partial();
export const UpdateServiceSchema = CreateServiceSchema.partial();
export const UpdateCouponSchema = CreateCouponSchema.partial();
export const UpdatePromotionSchema = CreatePromotionSchema.partial();

// Schemas de resposta da API
export const CustomerListResponseSchema = z.object({
  customers: z.array(CustomerSchema),
  totalCount: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
});

export const ProductListResponseSchema = z.object({
  products: z.array(ProductSchema),
  totalCount: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
});

export const ServiceListResponseSchema = z.object({
  services: z.array(ServiceSchema),
  totalCount: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
});

export const OrderListResponseSchema = z.object({
  orders: z.array(OrderSchema),
  totalCount: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
});

export const CouponListResponseSchema = z.object({
  coupons: z.array(CouponSchema),
  totalCount: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
});

export const PromotionListResponseSchema = z.object({
  promotions: z.array(PromotionSchema),
  totalCount: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
});

export const FavoriteListResponseSchema = z.object({
  favorites: z.array(FavoriteSchema),
  totalCount: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
});

// Schema de validação de cupom
export const CouponValidationResponseSchema = z.object({
  valid: z.boolean(),
  coupon: CouponSchema.optional(),
  discountAmount: z.number().min(0).optional(),
  error: z.string().optional(),
});

// Tipos derivados dos schemas
export type Customer = z.infer<typeof CustomerSchema>;
export type Address = z.infer<typeof AddressSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type Service = z.infer<typeof ServiceSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type OrderItem = z.infer<typeof OrderItemSchema>;
export type Coupon = z.infer<typeof CouponSchema>;
export type Promotion = z.infer<typeof PromotionSchema>;
export type Favorite = z.infer<typeof FavoriteSchema>;

export type CreateCustomer = z.infer<typeof CreateCustomerSchema>;
export type CreateAddress = z.infer<typeof CreateAddressSchema>;
export type CreateProduct = z.infer<typeof CreateProductSchema>;
export type CreateService = z.infer<typeof CreateServiceSchema>;
export type CreateOrder = z.infer<typeof CreateOrderSchema>;
export type CreateCoupon = z.infer<typeof CreateCouponSchema>;
export type CreatePromotion = z.infer<typeof CreatePromotionSchema>;
export type CreateFavorite = z.infer<typeof CreateFavoriteSchema>;

export type UpdateCustomer = z.infer<typeof UpdateCustomerSchema>;
export type UpdateAddress = z.infer<typeof UpdateAddressSchema>;
export type UpdateProduct = z.infer<typeof UpdateProductSchema>;
export type UpdateService = z.infer<typeof UpdateServiceSchema>;
export type UpdateCoupon = z.infer<typeof UpdateCouponSchema>;
export type UpdatePromotion = z.infer<typeof UpdatePromotionSchema>;
