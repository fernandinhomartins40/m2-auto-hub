import { z } from 'zod';

export enum ChecklistItemStatus {
  NOT_CHECKED = 'NOT_CHECKED',
  OK = 'OK',
  ATTENTION = 'ATTENTION',
  CRITICAL = 'CRITICAL',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
}

export const checklistItemCheckSchema = z.object({
  categoryId: z.string().uuid('categoryId must be a valid UUID'),
  categoryName: z.string().min(1, 'categoryName is required'),
  itemId: z.string().uuid('itemId must be a valid UUID'),
  itemName: z.string().min(1, 'itemName is required'),
  status: z.nativeEnum(ChecklistItemStatus),
  notes: z.string().optional(),
  photos: z.array(z.string()).optional().default([]), // Removida validação .url() restritiva
});

export const createRevisionSchema = z.object({
  customerId: z
    .string({ required_error: 'Customer ID is required' })
    .uuid('Customer ID must be a valid UUID'),
  vehicleId: z
    .string({ required_error: 'Vehicle ID is required' })
    .uuid('Vehicle ID must be a valid UUID'),
  date: z
    .string({ required_error: 'Date is required' })
    .datetime('Date must be a valid ISO 8601 datetime'),
  mileage: z
    .number()
    .int('Mileage must be an integer')
    .min(0, 'Mileage cannot be negative')
    .optional()
    .transform(val => val || undefined),
  checklistItems: z
    .array(checklistItemCheckSchema)
    .min(1, 'At least one checklist item is required'),
  generalNotes: z
    .string()
    .max(5000, 'General notes must not exceed 5000 characters')
    .trim()
    .optional()
    .transform(val => val || undefined),
  recommendations: z
    .string()
    .max(5000, 'Recommendations must not exceed 5000 characters')
    .trim()
    .optional()
    .transform(val => val || undefined),
  assignedMechanicId: z
    .string()
    .uuid('Mechanic ID must be a valid UUID')
    .optional()
    .transform(val => val || undefined),
  mechanicNotes: z
    .string()
    .max(5000, 'Mechanic notes must not exceed 5000 characters')
    .trim()
    .optional()
    .transform(val => val || undefined),
});

export type CreateRevisionDto = z.infer<typeof createRevisionSchema>;
export type ChecklistItemCheck = z.infer<typeof checklistItemCheckSchema>;
