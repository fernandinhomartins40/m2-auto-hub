import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z
    .string({ required_error: 'Phone or email is required' })
    .min(1, 'Phone or email is required')
    .trim(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
  // Apps nativos pedem sessão longa: quem instala o app não espera sair a cada semana.
  rememberMe: z.boolean().optional(),
});

export type LoginDto = z.infer<typeof loginSchema>;
