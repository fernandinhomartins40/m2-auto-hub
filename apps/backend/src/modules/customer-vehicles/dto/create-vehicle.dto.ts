import { z } from 'zod';

export const createVehicleSchema = z.object({
  brand: z
    .string({ required_error: 'Brand is required' })
    .min(2, 'Brand must be at least 2 characters')
    .max(50, 'Brand must not exceed 50 characters')
    .trim(),
  model: z
    .string({ required_error: 'Model is required' })
    .min(1, 'Model must be at least 1 character')
    .max(100, 'Model must not exceed 100 characters')
    .trim(),
  year: z
    .number({ required_error: 'Year is required' })
    .int('Year must be an integer')
    .min(1900, 'Year must be 1900 or later')
    .max(new Date().getFullYear() + 1, `Year must be ${new Date().getFullYear() + 1} or earlier`),
  plate: z
    .string({ required_error: 'Plate is required' })
    .min(7, 'Plate must be at least 7 characters')
    .max(10, 'Plate must not exceed 10 characters')
    .trim()
    .toUpperCase(),
  chassisNumber: z
    .string()
    .min(17, 'Chassis number must be 17 characters')
    .max(17, 'Chassis number must be 17 characters')
    .optional()
    .transform(val => val || undefined),
  color: z
    .string()
    .min(3, 'Color must be at least 3 characters')
    .max(30, 'Color must not exceed 30 characters')
    .trim()
    .optional()
    .transform(val => val || undefined),
  mileage: z
    .number()
    .int('Mileage must be an integer')
    .min(0, 'Mileage cannot be negative')
    .optional()
    .transform(val => val || undefined),
});

export type CreateVehicleDto = z.infer<typeof createVehicleSchema>;
