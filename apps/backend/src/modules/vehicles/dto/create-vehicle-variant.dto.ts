import { z } from 'zod';

export const createVehicleVariantSchema = z.object({
  modelId: z.string({ required_error: 'Model ID is required' }).uuid('Invalid Model ID'),
  name: z
    .string({ required_error: 'Name is required' })
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .trim(),
  engineInfo: z.record(z.any(), { required_error: 'Engine info is required' }),
  transmission: z
    .string({ required_error: 'Transmission is required' })
    .min(2, 'Transmission must be at least 2 characters')
    .trim(),
  yearStart: z
    .number({ required_error: 'Year start is required' })
    .int('Year must be an integer')
    .min(1900, 'Year must be after 1900')
    .max(new Date().getFullYear() + 1, 'Year cannot be in the far future'),
  yearEnd: z
    .number()
    .int('Year must be an integer')
    .min(1900, 'Year must be after 1900')
    .optional()
    .nullable(),
  specifications: z.record(z.any(), { required_error: 'Specifications are required' }),
  active: z.boolean().default(true),
});

export type CreateVehicleVariantDto = z.infer<typeof createVehicleVariantSchema>;
