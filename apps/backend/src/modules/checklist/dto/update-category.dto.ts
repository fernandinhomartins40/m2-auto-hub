import { z } from 'zod';

export const updateCategorySchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .trim()
    .optional(),
  description: z
    .string()
    .max(500, 'Description must not exceed 500 characters')
    .trim()
    .nullable()
    .optional()
    .transform(val => val || undefined),
  icon: z
    .string()
    .max(50, 'Icon must not exceed 50 characters')
    .trim()
    .nullable()
    .optional()
    .transform(val => val || undefined),
  isDefault: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
  order: z
    .number()
    .int('Order must be an integer')
    .min(0, 'Order must be non-negative')
    .optional(),
});

export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;
