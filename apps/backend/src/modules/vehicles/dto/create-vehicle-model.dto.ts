import { z } from 'zod';

export const createVehicleModelSchema = z.object({
  makeId: z.string({ required_error: 'Make ID is required' }).uuid('Invalid Make ID'),
  name: z
    .string({ required_error: 'Name is required' })
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .trim(),
  segment: z
    .string({ required_error: 'Segment is required' })
    .min(2, 'Segment must be at least 2 characters')
    .trim(),
  bodyType: z
    .string({ required_error: 'Body type is required' })
    .min(2, 'Body type must be at least 2 characters')
    .trim(),
  fuelTypes: z
    .array(z.string().min(2, 'Fuel type must be at least 2 characters'))
    .min(1, 'At least one fuel type is required'),
  active: z.boolean().default(true),
});

export type CreateVehicleModelDto = z.infer<typeof createVehicleModelSchema>;
