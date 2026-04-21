import { z } from 'zod';

export const createItemSchema = z.object({
  categoryId: z
    .string({ required_error: 'Category ID is required' })
    .uuid('Category ID must be a valid UUID'),
  name: z
    .string({ required_error: 'Name is required' })
    .min(2, 'Name must be at least 2 characters')
    .max(200, 'Name must not exceed 200 characters')
    .trim(),
  description: z
    .string()
    .max(1000, 'Description must not exceed 1000 characters')
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

export type CreateItemDto = z.infer<typeof createItemSchema>;
