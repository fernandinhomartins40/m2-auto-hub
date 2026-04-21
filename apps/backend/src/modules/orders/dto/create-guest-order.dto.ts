import { z } from 'zod';
import { AddressType } from '@prisma/client';

export const createGuestOrderItemSchema = z.object({
  productId: z.string().uuid().optional(),
  serviceId: z.string().uuid().optional(),
  type: z.enum(['PRODUCT', 'SERVICE']),
  quantity: z.number().int().min(1),
}).refine(
  (data) => (data.type === 'PRODUCT' && data.productId) || (data.type === 'SERVICE' && data.serviceId),
  { message: 'productId is required for PRODUCT type, serviceId is required for SERVICE type' }
);

export const createGuestOrderAddressSchema = z.object({
  street: z.string().min(3),
  number: z.string().min(1),
  complement: z.string().nullable().optional(),
  neighborhood: z.string().min(2),
  city: z.string().min(2),
  state: z.string().min(2).max(2),
  zipCode: z.string().min(8).transform(val => val.replace(/\D/g, '')),
  type: z.nativeEnum(AddressType).default(AddressType.HOME),
});

export const createGuestOrderSchema = z.object({
  // Dados do cliente
  customerName: z.string().min(3),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(10),

  // Endereço
  address: createGuestOrderAddressSchema,

  // Itens
  items: z.array(createGuestOrderItemSchema).min(1, 'At least one item is required'),

  // Pagamento
  paymentMethod: z.string().min(1),
  couponCode: z.string().optional(),
});

export type CreateGuestOrderDto = z.infer<typeof createGuestOrderSchema>;
export type CreateGuestOrderItemDto = z.infer<typeof createGuestOrderItemSchema>;
export type CreateGuestOrderAddressDto = z.infer<typeof createGuestOrderAddressSchema>;
