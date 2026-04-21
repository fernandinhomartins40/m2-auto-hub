import { z } from 'zod';

export const updateItemSchema = z.object({
  categoryId: z
    .string()
    .uuid('Category ID must be a valid UUID')
    .optional(),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(200, 'Name must not exceed 200 characters')
    .trim()
    .optional(),
  description: z
    .string()
    .max(1000, 'Description must not exceed 1000 characters')
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

export type UpdateItemDto = z.infer<typeof updateItemSchema>;
