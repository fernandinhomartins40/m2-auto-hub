import { z } from 'zod';

export const serviceOrderItemInputSchema = z.object({
  type: z.enum(['SERVICE', 'PRODUCT']),
  // Referencia opcional ao catalogo
  productId: z.string().uuid().optional().nullable(),
  serviceId: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(1, 'Nome do item é obrigatório').max(200),
  unitPrice: z.number().min(0, 'Preço não pode ser negativo'),
  quantity: z.number().int().min(1, 'Quantidade mínima é 1'),
});
export type ServiceOrderItemInput = z.infer<typeof serviceOrderItemInputSchema>;

const baseFields = {
  // Cliente/veiculo cadastrado (opcional)
  customerId: z.string().uuid().optional().nullable(),
  vehicleId: z.string().uuid().optional().nullable(),
  // Dados avulsos / cache
  customerName: z.string().trim().min(1, 'Nome do cliente é obrigatório').max(200),
  customerPhone: z.string().trim().max(30).optional().nullable(),
  vehicleLabel: z.string().trim().max(200).optional().nullable(),
  vehiclePlate: z.string().trim().max(20).optional().nullable(),
  mileage: z.number().int().min(0).optional().nullable(),
  description: z.string().trim().max(5000).optional().nullable(),
  internalNotes: z.string().trim().max(5000).optional().nullable(),
  assignedMechanicId: z.string().uuid().optional().nullable(),
  discount: z.number().min(0).optional(),
};

export const createServiceOrderSchema = z.object({
  ...baseFields,
  items: z.array(serviceOrderItemInputSchema).default([]),
});
export type CreateServiceOrderDto = z.infer<typeof createServiceOrderSchema>;

export const updateServiceOrderSchema = z.object({
  ...baseFields,
  customerName: baseFields.customerName.optional(),
  items: z.array(serviceOrderItemInputSchema).optional(),
});
export type UpdateServiceOrderDto = z.infer<typeof updateServiceOrderSchema>;

export const queryServiceOrdersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  mechanicId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
});
export type QueryServiceOrdersDto = z.infer<typeof queryServiceOrdersSchema>;

export const assignMechanicSchema = z.object({
  mechanicId: z.string().uuid('ID do mecânico inválido'),
});
export type AssignMechanicDto = z.infer<typeof assignMechanicSchema>;
