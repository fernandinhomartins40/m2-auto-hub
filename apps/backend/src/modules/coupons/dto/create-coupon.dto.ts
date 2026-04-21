import { z } from 'zod';

export const createCouponSchema = z.object({
  code: z
    .string()
    .min(3, 'Code must be at least 3 characters')
    .max(50, 'Code must not exceed 50 characters')
    .regex(/^[A-Z0-9_-]+$/, 'Code must contain only uppercase letters, numbers, hyphens and underscores')
    .transform((val) => val.toUpperCase()),
  description: z.string().min(1, 'Description is required').max(500),
  discountType: z.enum(['PERCENTAGE', 'FIXED']),
  discountValue: z.number().positive('Discount value must be positive'),
  minValue: z.number().positive().optional(),
  maxDiscount: z.number().positive().optional(),
  expiresAt: z.string().datetime(),
  usageLimit: z.number().int().positive().optional(),
  isActive: z.boolean().default(true),
}).refine(
  (data) => {
    if (data.discountType === 'PERCENTAGE' && data.discountValue > 100) {
      return false;
    }
    return true;
  },
  {
    message: 'Percentage discount cannot exceed 100%',
    path: ['discountValue'],
  }
);

export type CreateCouponDto = z.infer<typeof createCouponSchema>;
