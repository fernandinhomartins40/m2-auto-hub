import { z } from 'zod';

export const updateCompatibilitySchema = z.object({
  makeId: z.string().uuid('Invalid Make ID').optional().nullable(),
  modelId: z.string().uuid('Invalid Model ID').optional().nullable(),
  variantId: z.string().uuid('Invalid Variant ID').optional().nullable(),
  yearStart: z
    .number()
    .int('Year must be an integer')
    .min(1900, 'Year must be after 1900')
    .max(new Date().getFullYear() + 1)
    .optional()
    .nullable(),
  yearEnd: z
    .number()
    .int('Year must be an integer')
    .min(1900, 'Year must be after 1900')
    .optional()
    .nullable(),
  compatibilityData: z.record(z.any()).optional(),
  verified: z.boolean().optional(),
  notes: z.string().max(1000, 'Notes must not exceed 1000 characters').optional().nullable(),
});

export type UpdateCompatibilityDto = z.infer<typeof updateCompatibilitySchema>;
