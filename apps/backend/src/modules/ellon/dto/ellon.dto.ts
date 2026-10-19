import { EllonEntityType, EllonJobStatus, OrderSource } from '@prisma/client';
import { z } from 'zod';

const optionalPositiveInt = z.number().int().positive().nullable().optional();

export const updateEllonConfigSchema = z.object({
  enabled: z.boolean().optional(),
  baseUrl: z.string().url().optional(),
  companyCode: optionalPositiveInt,
  transactionCode: optionalPositiveInt,
  costCenterCode: optionalPositiveInt,
  sellerCode: optionalPositiveInt,
  warehouseCode: optionalPositiveInt,
  paymentMethodCode: optionalPositiveInt,
  carrierCode: optionalPositiveInt,
  username: z.string().trim().min(1).max(100).optional(),
  integrationCode: z.string().trim().min(1).max(100).optional(),
  password: z.string().min(8).max(200).optional(),
  accessHash: z.string().min(16).max(4096).optional(),
  syncProducts: z.boolean().optional(),
  syncCustomers: z.boolean().optional(),
  syncOrders: z.boolean().optional(),
  exportOrderSources: z.array(z.nativeEnum(OrderSource)).max(10).optional(),
  stockIncludesPreOrders: z.boolean().optional(),
  reservationTtlDays: z.number().int().min(1).max(90).optional(),
  serviceItemTypes: z.array(z.string().trim().min(1).max(30)).max(20).optional(),
  defaultCustomerCode: optionalPositiveInt,
  paymentMethodMap: z.record(z.string().trim().min(1).max(60), z.number().int().positive()).nullable().optional(),
});

export const upsertEllonLinkSchema = z.object({
  entityType: z.nativeEnum(EllonEntityType),
  localId: z.string().uuid(),
  externalId: z.string().trim().min(1).max(100),
  externalSequence: z.number().int().nonnegative().default(0),
  metadata: z.record(z.unknown()).nullable().optional(),
});

export const queryEllonJobsSchema = z.object({
  status: z.nativeEnum(EllonJobStatus).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const querySnapshotsSchema = z.object({
  type: z.enum(['CUSTOMER', 'PAYMENT_METHOD', 'SELLER', 'CARRIER', 'PRODUCT_GROUP', 'PRODUCT_BRAND', 'PRE_ORDER', 'SALE', 'NFE']).optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
});

export const queryLinksSchema = z.object({
  entityType: z.nativeEnum(EllonEntityType).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export const catalogQuerySchema = z.object({ search: z.string().trim().min(2).max(100) });

export const cancellationEntitySchema = z.enum(['order', 'service-order']);

export const syncTargetSchema = z.enum(['products', 'products-full', 'customers', 'references', 'orders']);

export type UpdateEllonConfigDto = z.infer<typeof updateEllonConfigSchema>;
export type UpsertEllonLinkDto = z.infer<typeof upsertEllonLinkSchema>;
