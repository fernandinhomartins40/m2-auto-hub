import { z } from 'zod';

export const updateVehicleModelSchema = z.object({
  makeId: z.string().uuid('Invalid Make ID').optional(),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .trim()
    .optional(),
  segment: z
    .string()
    .min(2, 'Segment must be at least 2 characters')
    .trim()
    .optional(),
  bodyType: z
    .string()
    .min(2, 'Body type must be at least 2 characters')
    .trim()
    .optional(),
  fuelTypes: z
    .array(z.string().min(2, 'Fuel type must be at least 2 characters'))
    .min(1, 'At least one fuel type is required')
    .optional(),
  active: z.boolean().optional(),
});

export type UpdateVehicleModelDto = z.infer<typeof updateVehicleModelSchema>;
