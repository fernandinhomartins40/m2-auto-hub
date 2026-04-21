import { z } from 'zod';
import { RevisionStatus } from '@prisma/client';
import { ChecklistItemStatus } from './create-revision.dto.js';

export const checklistItemCheckSchema = z.object({
  categoryId: z.string().uuid(),
  categoryName: z.string(),
  itemId: z.string().uuid(),
  itemName: z.string(),
  status: z.nativeEnum(ChecklistItemStatus),
  notes: z.string().optional(),
  photos: z.array(z.string().url()).optional().default([]),
});

export const updateRevisionSchema = z.object({
  date: z
    .string()
    .datetime('Date must be a valid ISO 8601 datetime')
    .optional(),
  mileage: z
    .number()
    .int('Mileage must be an integer')
    .min(0, 'Mileage cannot be negative')
    .nullable()
    .optional()
    .transform(val => val || undefined),
  status: z.nativeEnum(RevisionStatus).optional(),
  checklistItems: z.array(checklistItemCheckSchema).optional(),
  generalNotes: z
    .string()
    .max(5000, 'General notes must not exceed 5000 characters')
    .trim()
    .nullable()
    .optional()
    .transform(val => val || undefined),
  recommendations: z
    .string()
    .max(5000, 'Recommendations must not exceed 5000 characters')
    .trim()
    .nullable()
    .optional()
    .transform(val => val || undefined),
  assignedMechanicId: z
    .string()
    .uuid('Mechanic ID must be a valid UUID')
    .nullable()
    .optional()
    .transform(val => val || undefined),
  mechanicName: z
    .string()
    .max(255, 'Mechanic name must not exceed 255 characters')
    .trim()
    .nullable()
    .optional()
    .transform(val => val || undefined),
  mechanicNotes: z
    .string()
    .max(5000, 'Mechanic notes must not exceed 5000 characters')
    .trim()
    .nullable()
    .optional()
    .transform(val => val || undefined),
});

export type UpdateRevisionDto = z.infer<typeof updateRevisionSchema>;
export type ChecklistItemCheck = z.infer<typeof checklistItemCheckSchema>;
