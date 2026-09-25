import { z } from 'zod';
import { AdminRole, AdminStatus } from '@prisma/client';

/**
 * Edição de um usuário do painel por ADMIN/SUPER_ADMIN (Configurações >
 * Usuários). Lista fechada de propósito: antes o corpo ia cru para o Prisma, e
 * a senha era gravada em texto puro — o login (bcrypt) nunca mais batia.
 */
export const updateAdminSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100).optional(),
    email: z.string().trim().toLowerCase().pipe(z.string().email('Invalid email format')).optional(),
    role: z.nativeEnum(AdminRole, { errorMap: () => ({ message: 'Invalid role' }) }).optional(),
    status: z
      .nativeEnum(AdminStatus, { errorMap: () => ({ message: 'Invalid status' }) })
      .optional(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/\d/, 'Password must contain at least one number')
      .regex(
        /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/;'`~]/,
        'Password must contain at least one special character'
      )
      .optional(),
  })
  .strip();

export type UpdateAdminDto = z.infer<typeof updateAdminSchema>;
