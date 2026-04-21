import { z } from 'zod';

export const createProductSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .min(3, 'Name must be at least 3 characters')
    .max(200, 'Name must not exceed 200 characters')
    .trim(),
  description: z
    .string({ required_error: 'Description is required' })
    .min(10, 'Description must be at least 10 characters')
    .trim(),
  category: z
    .string({ required_error: 'Category is required' })
    .min(2, 'Category must be at least 2 characters')
    .trim(),
  subcategory: z
    .string()
    .min(2, 'Subcategory must be at least 2 characters')
    .optional()
    .transform(val => val || undefined),
  sku: z
    .string({ required_error: 'SKU is required' })
    .min(3, 'SKU must be at least 3 characters')
    .max(50, 'SKU must not exceed 50 characters')
    .trim()
    .toUpperCase(),
  supplier: z
    .string({ required_error: 'Supplier is required' })
    .min(2, 'Supplier must be at least 2 characters')
    .trim(),
  costPrice: z
    .number({ required_error: 'Cost price is required' })
    .positive('Cost price must be positive')
    .multipleOf(0.01, 'Cost price must have at most 2 decimal places'),
  salePrice: z
    .number({ required_error: 'Sale price is required' })
    .positive('Sale price must be positive')
    .multipleOf(0.01, 'Sale price must have at most 2 decimal places'),
  promoPrice: z
    .number()
    .positive('Promo price must be positive')
    .multipleOf(0.01, 'Promo price must have at most 2 decimal places')
    .optional(),
  stock: z
    .number()
    .int('Stock must be an integer')
    .min(0, 'Stock cannot be negative')
    .default(0),
  minStock: z
    .number()
    .int('Min stock must be an integer')
    .min(0, 'Min stock cannot be negative')
    .default(5),
  images: z
    .array(z.string().min(1, 'Image URL cannot be empty'))
    .min(1, 'At least one image is required')
    .default([]),
  specifications: z.record(z.any()).optional(),
  status: z
    .enum(['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK', 'DISCONTINUED'])
    .default('ACTIVE'),
  // Ofertas
  offerType: z
    .enum(['DIA', 'SEMANA', 'MES'])
    .optional()
    .nullable(),
  offerStartDate: z
    .string()
    .datetime()
    .optional()
    .nullable()
    .transform(val => val ? new Date(val) : null),
  offerEndDate: z
    .string()
    .datetime()
    .optional()
    .nullable()
    .transform(val => val ? new Date(val) : null),
  offerBadge: z
    .string()
    .max(50, 'Offer badge must not exceed 50 characters')
    .optional()
    .nullable(),
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers and hyphens')
    .optional(),
  metaDescription: z.string().max(160, 'Meta description must not exceed 160 characters').optional(),
  metaKeywords: z.string().max(255, 'Meta keywords must not exceed 255 characters').optional(),
})
// Validação refinada: Se offerType estiver presente, datas e promoPrice são obrigatórios
.refine(
  (data) => {
    if (data.offerType) {
      return data.offerStartDate !== null && data.offerStartDate !== undefined;
    }
    return true;
  },
  {
    message: 'Offer start date is required when offer type is set',
    path: ['offerStartDate'],
  }
)
.refine(
  (data) => {
    if (data.offerType) {
      return data.offerEndDate !== null && data.offerEndDate !== undefined;
    }
    return true;
  },
  {
    message: 'Offer end date is required when offer type is set',
    path: ['offerEndDate'],
  }
)
.refine(
  (data) => {
    if (data.offerType) {
      return data.promoPrice !== null && data.promoPrice !== undefined && data.promoPrice > 0;
    }
    return true;
  },
  {
    message: 'Promotional price is required and must be positive when offer type is set',
    path: ['promoPrice'],
  }
)
.refine(
  (data) => {
    if (data.offerType && data.offerStartDate && data.offerEndDate) {
      return data.offerEndDate > data.offerStartDate;
    }
    return true;
  },
  {
    message: 'Offer end date must be after start date',
    path: ['offerEndDate'],
  }
)
.refine(
  (data) => {
    if (data.offerType && data.promoPrice && data.salePrice) {
      return data.promoPrice < data.salePrice;
    }
    return true;
  },
  {
    message: 'Promotional price must be less than sale price',
    path: ['promoPrice'],
  }
)
.transform((data) => {
  // Se não há offerType, limpar campos de oferta
  if (!data.offerType) {
    return {
      ...data,
      offerStartDate: null,
      offerEndDate: null,
      offerBadge: null,
    };
  }
  return data;
});

export type CreateProductDto = z.infer<typeof createProductSchema>;
