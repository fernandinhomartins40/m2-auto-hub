import { z } from 'zod';

export const updateVehicleMakeSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must not exceed 50 characters')
    .trim()
    .optional(),
  country: z
    .string()
    .min(2, 'Country must be at least 2 characters')
    .max(50, 'Country must not exceed 50 characters')
    .trim()
    .optional(),
  logo: z.string().url('Invalid logo URL').optional().nullable(),
  active: z.boolean().optional(),
});

export type UpdateVehicleMakeDto = z.infer<typeof updateVehicleMakeSchema>;
