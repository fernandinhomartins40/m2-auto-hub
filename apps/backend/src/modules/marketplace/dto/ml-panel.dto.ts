import { z } from 'zod';
import { MarketplaceStockMode } from '@prisma/client';
import { LISTING_TYPES, WARRANTY_TYPES } from '../mappers/publication.js';

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use o formato HH:MM');
const listingType = z.enum(Object.keys(LISTING_TYPES) as [keyof typeof LISTING_TYPES, ...Array<keyof typeof LISTING_TYPES>]);
/** Texto opcional: vazio vira null (volta ao valor do cadastro). */
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional()
  .transform(value => (value === undefined ? undefined : value || null));
const optionalPositive = z.number().positive().nullable().optional();

export const mlSettingsSchema = z.object({
  markupPercent: z.number().min(-50).max(300).optional(),
  listingTypeId: listingType.optional(),
  warrantyType: z.enum(WARRANTY_TYPES).optional(),
  warrantyDays: z.number().int().min(0).max(3650).optional(),
  dispatchCutoff: time.optional(),
  supplierDeadline: time.optional(),
});
export type MlSettingsDto = z.infer<typeof mlSettingsSchema>;

export const mlProfileSchema = z.object({
  title: optionalText(60),
  brand: optionalText(120),
  partNumber: optionalText(120),
  categoryId: optionalText(40),
  categoryName: optionalText(200),
  attributes: z.array(z.object({
    id: z.string().min(1),
    valueId: z.string().nullable().optional(),
    valueName: z.string().max(255).nullable().optional(),
  })).optional(),
  packageWeightG: z.number().int().positive().max(100000).nullable().optional(),
  packageHeightCm: optionalPositive,
  packageWidthCm: optionalPositive,
  packageLengthCm: optionalPositive,
  stockMode: z.nativeEnum(MarketplaceStockMode).optional(),
  supplierQuantity: z.number().int().min(0).max(9999).optional(),
  manufacturingDays: z.number().int().min(0).max(45).optional(),
  markupPercent: z.number().min(-50).max(300).nullable().optional(),
  fixedPrice: optionalPositive,
  listingTypeId: listingType.nullable().optional(),
});
export type MlProfileDto = z.infer<typeof mlProfileSchema>;

export const mlPanelQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  scope: z.enum(['default', 'all']).default('default'),
  status: z.enum(['ALL', 'READY', 'PENDING', 'PUBLISHED', 'PAUSED', 'ERROR']).default('ALL'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type MlPanelQueryDto = z.infer<typeof mlPanelQuerySchema>;

export const mlImagesSchema = z.object({ images: z.array(z.string().min(1)).max(12) });
export const mlBulkApproveSchema = z.object({ productIds: z.array(z.string().uuid()).min(1).max(100) });
export const mlCategorySearchSchema = z.object({ q: z.string().trim().max(120).optional() });
