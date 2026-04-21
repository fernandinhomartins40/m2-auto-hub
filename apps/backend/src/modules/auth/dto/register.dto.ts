import { z } from 'zod';

export const registerSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email format')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/;'`~]/, 'Password must contain at least one special character'),
  name: z
    .string({ required_error: 'Name is required' })
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must not exceed 100 characters')
    .trim(),
  phone: z
    .string({ required_error: 'Phone is required' })
    .regex(/^\d{10,11}$/, 'Phone must be 10 or 11 digits')
    .trim(),
  cpf: z
    .string()
    .regex(/^\d{11}$/, 'CPF must be 11 digits')
    .optional()
    .transform(val => val || undefined),
});

export type RegisterDto = z.infer<typeof registerSchema>;
