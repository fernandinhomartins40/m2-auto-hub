import { z } from 'zod';

export const createOrderItemSchema = z.object({
  productId: z.string().uuid().optional(),
  serviceId: z.string().uuid().optional(),
  type: z.enum(['PRODUCT', 'SERVICE']),
  quantity: z.number().int().min(1),
}).refine(
  (data) => (data.type === 'PRODUCT' && data.productId) || (data.type === 'SERVICE' && data.serviceId),
  {
    message: 'productId is required for PRODUCT type, serviceId is required for SERVICE type',
  }
);

export const createOrderSchema = z.object({
  addressId: z.string().uuid(),
  paymentMethod: z.string().min(1),
  source: z.enum(['WEB', 'APP', 'PHONE']).default('WEB'),
  couponCode: z.string().optional(),
  items: z.array(createOrderItemSchema).min(1, 'At least one item is required'),
});

export type CreateOrderDto = z.infer<typeof createOrderSchema>;
export type CreateOrderItemDto = z.infer<typeof createOrderItemSchema>;
