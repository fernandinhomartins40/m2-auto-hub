import { z } from 'zod';
import { AdminRole } from '@prisma/client';

/**
 * DTO for creating a new admin user
 * Only ADMIN and SUPER_ADMIN can create new admin users
 */
export const createAdminSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.nativeEnum(AdminRole, {
    errorMap: () => ({ message: 'Invalid role' })
  })
});

export type CreateAdminDto = z.infer<typeof createAdminSchema>;
