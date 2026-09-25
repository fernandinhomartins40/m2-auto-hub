import { z } from 'zod';

export const adminLoginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email format')
    .toLowerCase(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(6, 'Password must be at least 6 characters'),
  // "Manter conectado": true estende a sessão, false a limita ao navegador
  // aberto. Ausente mantém o comportamento padrão (clients nativos não enviam).
  rememberMe: z.boolean().optional(),
});

export type AdminLoginDto = z.infer<typeof adminLoginSchema>;
