import { EllonEntityType, EllonJobStatus } from '@prisma/client';
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
  integrationCode: z.string().trim().min(1).max(100).optional(),
  password: z.string().min(8).max(200).optional(),
  accessHash: z.string().min(16).max(4096).optional(),
  syncProducts: z.boolean().optional(),
  syncCustomers: z.boolean().optional(),
  syncOrders: z.boolean().optional(),
});

export const upsertEllonLinkSchema = z.object({
  entityType: z.nativeEnum(EllonEntityType),
  localId: z.string().uuid(),
  externalId: z.string().trim().min(1).max(100),
  externalSequence: z.number().int().nonnegative().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

export const queryEllonJobsSchema = z.object({
  status: z.nativeEnum(EllonJobStatus).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type UpdateEllonConfigDto = z.infer<typeof updateEllonConfigSchema>;
export type UpsertEllonLinkDto = z.infer<typeof upsertEllonLinkSchema>;
