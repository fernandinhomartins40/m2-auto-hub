import { z } from 'zod';

export const updateProductSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(200, 'Name must not exceed 200 characters')
    .trim()
    .optional(),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .trim()
    .optional(),
  category: z
    .string()
    .min(2, 'Category must be at least 2 characters')
    .trim()
    .optional(),
  subcategory: z
    .string()
    .min(2, 'Subcategory must be at least 2 characters')
    .optional()
    .nullable(),
  sku: z
    .string()
    .min(3, 'SKU must be at least 3 characters')
    .max(50, 'SKU must not exceed 50 characters')
    .trim()
    .toUpperCase()
    .optional(),
  supplier: z
    .string()
    .min(2, 'Supplier must be at least 2 characters')
    .trim()
    .optional(),
  costPrice: z
    .number()
    .positive('Cost price must be positive')
    .multipleOf(0.01, 'Cost price must have at most 2 decimal places')
    .optional(),
  salePrice: z
    .number()
    .positive('Sale price must be positive')
    .multipleOf(0.01, 'Sale price must have at most 2 decimal places')
    .optional(),
  promoPrice: z
    .number()
    .positive('Promo price must be positive')
    .multipleOf(0.01, 'Promo price must have at most 2 decimal places')
    .optional()
    .nullable(),
  stock: z
    .number()
    .int('Stock must be an integer')
    .min(0, 'Stock cannot be negative')
    .optional(),
  minStock: z
    .number()
    .int('Min stock must be an integer')
    .min(0, 'Min stock cannot be negative')
    .optional(),
  images: z
    .array(z.string().min(1, 'Image URL cannot be empty'))
    .min(1, 'At least one image is required')
    .optional(),
  specifications: z.record(z.any()).optional().nullable(),
  status: z
    .enum(['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK', 'DISCONTINUED'])
    .optional(),
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
  metaDescription: z.string().max(160, 'Meta description must not exceed 160 characters').optional().nullable(),
  metaKeywords: z.string().max(255, 'Meta keywords must not exceed 255 characters').optional().nullable(),
})
// Observação: as validações de negócio da oferta (datas obrigatórias, promoPrice,
// promoPrice < salePrice, fim > início) NÃO são feitas aqui. Num update parcial o
// payload pode conter só alguns campos (ex.: editar apenas a vigência), e exigir
// promoPrice/salePrice presentes quebraria esse caso. Essas regras ficam no
// ProductsService.updateProduct, que mescla o dto com os dados já existentes do
// produto (offerType/promoPrice/salePrice atuais) antes de validar.
.transform((data) => {
  // Se offerType está sendo removido (null), limpar campos de oferta
  if (data.offerType === null) {
    return {
      ...data,
      offerStartDate: null,
      offerEndDate: null,
      offerBadge: null,
    };
  }
  return data;
});

export type UpdateProductDto = z.infer<typeof updateProductSchema>;
