import { z } from 'zod';

export const createVehicleMakeSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must not exceed 50 characters')
    .trim(),
  country: z
    .string({ required_error: 'Country is required' })
    .min(2, 'Country must be at least 2 characters')
    .max(50, 'Country must not exceed 50 characters')
    .trim(),
  logo: z.string().url('Invalid logo URL').optional(),
  active: z.boolean().default(true),
});

export type CreateVehicleMakeDto = z.infer<typeof createVehicleMakeSchema>;
