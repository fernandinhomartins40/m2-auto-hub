import { z } from 'zod';

export const updateOrderSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED']).optional(),
  trackingCode: z.string().optional(),
  estimatedDelivery: z.string().datetime().optional(),
});

export type UpdateOrderDto = z.infer<typeof updateOrderSchema>;
