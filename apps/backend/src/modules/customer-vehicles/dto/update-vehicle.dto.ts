import { z } from 'zod';

export const updateVehicleSchema = z.object({
  brand: z
    .string()
    .min(2, 'Brand must be at least 2 characters')
    .max(50, 'Brand must not exceed 50 characters')
    .trim()
    .optional(),
  model: z
    .string()
    .min(1, 'Model must be at least 1 character')
    .max(100, 'Model must not exceed 100 characters')
    .trim()
    .optional(),
  year: z
    .number()
    .int('Year must be an integer')
    .min(1900, 'Year must be 1900 or later')
    .max(new Date().getFullYear() + 1, `Year must be ${new Date().getFullYear() + 1} or earlier`)
    .optional(),
  plate: z
    .string()
    .min(7, 'Plate must be at least 7 characters')
    .max(10, 'Plate must not exceed 10 characters')
    .trim()
    .toUpperCase()
    .optional(),
  chassisNumber: z
    .string()
    .min(17, 'Chassis number must be 17 characters')
    .max(17, 'Chassis number must be 17 characters')
    .nullable()
    .optional()
    .transform(val => val || undefined),
  color: z
    .string()
    .min(3, 'Color must be at least 3 characters')
    .max(30, 'Color must not exceed 30 characters')
    .trim()
    .nullable()
    .optional()
    .transform(val => val || undefined),
  mileage: z
    .number()
    .int('Mileage must be an integer')
    .min(0, 'Mileage cannot be negative')
    .nullable()
    .optional()
    .transform(val => val || undefined),
});

export type UpdateVehicleDto = z.infer<typeof updateVehicleSchema>;
