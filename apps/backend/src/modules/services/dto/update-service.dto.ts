import { z } from 'zod';

export const updateServiceSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(200, 'Name must not exceed 200 characters')
    .trim()
    .optional(),
  description: z
    .string()
    .max(5000, 'Description must not exceed 5000 characters')
    .trim()
    .optional(),
  category: z
    .string()
    .min(2, 'Category must be at least 2 characters')
    .trim()
    .optional(),
  estimatedTime: z
    .string()
    .min(1, 'Estimated time is required')
    .trim()
    .optional(),
  basePrice: z
    .number()
    .min(0, 'Base price must be greater than or equal to zero')
    .multipleOf(0.01, 'Base price must have at most 2 decimal places')
    .optional()
    .nullable(),
  specifications: z.record(z.any()).optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers and hyphens')
    .optional(),
  metaDescription: z.string().max(160, 'Meta description must not exceed 160 characters').optional().nullable(),
});

export type UpdateServiceDto = z.infer<typeof updateServiceSchema>;
