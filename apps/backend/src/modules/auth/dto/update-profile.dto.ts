import { z } from 'zod';

/**
 * Atualização de perfil do cliente.
 *
 * A troca de email exige `currentPassword`, já que o email é o identificador
 * de login: sem essa checagem, uma sessão sequestrada tomaria a conta.
 */
export const updateCustomerProfileSchema = z
  .object({
    name: z
      .string()
      .min(3, 'Name must be at least 3 characters')
      .max(100, 'Name must not exceed 100 characters')
      .trim()
      .optional(),
    email: z
      .string()
      .email('Invalid email format')
      .toLowerCase()
      .trim()
      .optional(),
    phone: z
      .string()
      .trim()
      .refine(
        (val) => /^\d{10,13}$/.test(val.replace(/\D/g, '')),
        'Phone must be 10 or 11 digits'
      )
      .optional(),
    cpf: z
      .string()
      .trim()
      .refine(
        (val) => val === '' || /^\d{11}$/.test(val.replace(/\D/g, '')),
        'CPF must be 11 digits'
      )
      .optional(),
    birthDate: z
      .string()
      .trim()
      .refine(
        (val) => val === '' || !Number.isNaN(Date.parse(val)),
        'Invalid birth date'
      )
      .optional()
      .nullable(),
    currentPassword: z.string().optional(),
  })
  .refine(
    (data) => !data.email || (data.currentPassword && data.currentPassword.length > 0),
    {
      message: 'Current password is required to change the email',
      path: ['currentPassword'],
    }
  );

export type UpdateCustomerProfileDto = z.infer<typeof updateCustomerProfileSchema>;

/**
 * Atualização de perfil do admin/mecânico.
 *
 * Só nome e email são editáveis pelo próprio usuário — `role`, `status` e
 * `permissions` ficam de fora de propósito, para que um PUT no próprio perfil
 * não possa ser usado para escalar privilégio.
 */
export const updateAdminProfileSchema = z
  .object({
    name: z
      .string()
      .min(3, 'Name must be at least 3 characters')
      .max(100, 'Name must not exceed 100 characters')
      .trim()
      .optional(),
    email: z
      .string()
      .email('Invalid email format')
      .toLowerCase()
      .trim()
      .optional(),
    currentPassword: z.string().optional(),
  })
  .refine(
    (data) => !data.email || (data.currentPassword && data.currentPassword.length > 0),
    {
      message: 'Current password is required to change the email',
      path: ['currentPassword'],
    }
  );

export type UpdateAdminProfileDto = z.infer<typeof updateAdminProfileSchema>;
