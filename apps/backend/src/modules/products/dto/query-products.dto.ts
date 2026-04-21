import { z } from 'zod';

export const queryProductsSchema = z.object({
  // Pagination
  page: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).optional(),

  // Search
  search: z.string().trim().optional(),

  // Filters
  category: z.string().trim().optional(),
  subcategory: z.string().trim().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK', 'DISCONTINUED']).optional(),
  supplier: z.string().trim().optional(),

  // Price range
  minPrice: z.string().transform(Number).pipe(z.number().positive()).optional(),
  maxPrice: z.string().transform(Number).pipe(z.number().positive()).optional(),

  // Stock filter
  inStock: z.string().transform(val => val === 'true').optional(),
  lowStock: z.string().transform(val => val === 'true').optional(),

  // Sorting
  sortBy: z.enum(['name', 'salePrice', 'stock', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type QueryProductsDto = z.infer<typeof queryProductsSchema>;
