import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .trim(),
  description: z
    .string()
    .max(500, 'Description must not exceed 500 characters')
    .trim()
    .optional()
    .transform(val => val || undefined),
  icon: z
    .string()
    .max(50, 'Icon must not exceed 50 characters')
    .trim()
    .optional()
    .transform(val => val || undefined),
  isDefault: z.boolean().optional().default(false),
  isEnabled: z.boolean().optional().default(true),
  order: z
    .number({ required_error: 'Order is required' })
    .int('Order must be an integer')
    .min(0, 'Order must be non-negative'),
});

export type CreateCategoryDto = z.infer<typeof createCategorySchema>;
