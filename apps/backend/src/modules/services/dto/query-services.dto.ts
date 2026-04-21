import { z } from 'zod';

export const queryServicesSchema = z.object({
  // Pagination
  page: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).optional(),

  // Search
  search: z.string().trim().optional(),

  // Filters
  category: z.string().trim().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),

  // Sorting
  sortBy: z.enum(['name', 'basePrice', 'category', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type QueryServicesDto = z.infer<typeof queryServicesSchema>;
