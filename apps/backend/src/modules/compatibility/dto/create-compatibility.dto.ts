import { z } from 'zod';

export const createCompatibilitySchema = z.object({
  productId: z.string({ required_error: 'Product ID is required' }).uuid('Invalid Product ID'),
  makeId: z.string().uuid('Invalid Make ID').optional(),
  modelId: z.string().uuid('Invalid Model ID').optional(),
  variantId: z.string().uuid('Invalid Variant ID').optional(),
  yearStart: z
    .number()
    .int('Year must be an integer')
    .min(1900, 'Year must be after 1900')
    .max(new Date().getFullYear() + 1)
    .optional(),
  yearEnd: z
    .number()
    .int('Year must be an integer')
    .min(1900, 'Year must be after 1900')
    .optional()
    .nullable(),
  compatibilityData: z.record(z.any(), { required_error: 'Compatibility data is required' }),
  verified: z.boolean().default(false),
  notes: z.string().max(1000, 'Notes must not exceed 1000 characters').optional(),
});

export type CreateCompatibilityDto = z.infer<typeof createCompatibilitySchema>;
