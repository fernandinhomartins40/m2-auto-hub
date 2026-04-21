import { z } from 'zod';
import { createPromotionSchema } from './create-promotion.dto.js';

export const updatePromotionSchema = createPromotionSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type UpdatePromotionDto = z.infer<typeof updatePromotionSchema>;
