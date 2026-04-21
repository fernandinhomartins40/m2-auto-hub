import { z } from 'zod';

export const updateVehicleVariantSchema = z.object({
  modelId: z.string().uuid('Invalid Model ID').optional(),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .trim()
    .optional(),
  engineInfo: z.record(z.any()).optional(),
  transmission: z
    .string()
    .min(2, 'Transmission must be at least 2 characters')
    .trim()
    .optional(),
  yearStart: z
    .number()
    .int('Year must be an integer')
    .min(1900, 'Year must be after 1900')
    .max(new Date().getFullYear() + 1, 'Year cannot be in the far future')
    .optional(),
  yearEnd: z
    .number()
    .int('Year must be an integer')
    .min(1900, 'Year must be after 1900')
    .optional()
    .nullable(),
  specifications: z.record(z.any()).optional(),
  active: z.boolean().optional(),
});

export type UpdateVehicleVariantDto = z.infer<typeof updateVehicleVariantSchema>;
