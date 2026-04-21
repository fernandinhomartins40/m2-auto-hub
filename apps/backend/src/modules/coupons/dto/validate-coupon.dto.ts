import { z } from 'zod';

export const validateCouponSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  cartValue: z.number().positive('Cart value must be positive'),
});

export type ValidateCouponDto = z.infer<typeof validateCouponSchema>;
