import { z } from 'zod';

export const updateCouponSchema = z.object({
  description: z.string().min(1, 'Description is required').max(500).optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']).optional(),
  discountValue: z.number().positive('Discount value must be positive').optional(),
  minValue: z.number().positive().optional().nullable(),
  maxDiscount: z.number().positive().optional().nullable(),
  expiresAt: z.string().datetime().optional(),
  usageLimit: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional(),
}).refine(
  (data) => {
    if (data.discountType === 'PERCENTAGE' && data.discountValue && data.discountValue > 100) {
      return false;
    }
    return true;
  },
  {
    message: 'Percentage discount cannot exceed 100%',
    path: ['discountValue'],
  }
);

export type UpdateCouponDto = z.infer<typeof updateCouponSchema>;
