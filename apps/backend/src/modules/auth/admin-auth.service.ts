import { Admin, AdminStatus, AdminRole } from '@prisma/client';
import { prisma } from '@config/database.js';
import { HashUtil } from '@shared/utils/hash.util.js';
import { JwtUtil } from '@shared/utils/jwt.util.js';
import { ApiError } from '@shared/utils/error.util.js';
import { AdminLoginDto } from './dto/admin-login.dto.js';
import { CreateAdminDto } from './dto/create-admin.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { UpdateAdminProfileDto } from './dto/update-profile.dto.js';
import { UpdateAdminDto } from './dto/update-admin.dto.js';
import { logger } from '@shared/utils/logger.util.js';

export interface AdminAuthResponse {
  token: string;
  admin: Omit<Admin, 'password'>;
}

export class AdminAuthService {
  /**
   * Login admin
   */
  async login(dto: AdminLoginDto): Promise<AdminAuthResponse> {
    try {
      logger.info(`Admin login attempt: ${dto.email}`);

      // Busca sem diferenciar maiúsculas: a edição de usuário gravava o email
      // como digitado, e o DTO de login sempre chega em minúsculas.
      const admin = await prisma.admin.findFirst({
        where: { email: { equals: dto.email, mode: 'insensitive' } },
        orderBy: { createdAt: 'asc' },
      });

      if (!admin) {
        logger.warn(`Admin login failed - email not found: ${dto.email}`);
        throw ApiError.unauthorized('Invalid email or password');
      }

      logger.info(`Admin found: ${admin.email}, status: ${admin.status}`);

      // Check if admin is active
      if (admin.status !== AdminStatus.ACTIVE) {
        logger.warn(`Admin login failed - account not active: ${dto.email}`);
        throw ApiError.forbidden('Your account is not active');
      }

      // Verify password
      logger.info('Verifying password...');
      const isPasswordValid = await HashUtil.comparePassword(
        dto.password,
        admin.password
      );

      if (!isPasswordValid) {
        logger.warn(`Admin login failed - invalid password: ${dto.email}`);
        throw ApiError.unauthorized('Invalid email or password');
      }

      logger.info('Password verified successfully');

      // Update last login
      logger.info('Updating last login timestamp...');
      await prisma.admin.update({
        where: { id: admin.id },
        data: { lastLoginAt: new Date() },
      });

      // Generate JWT token
      logger.info('Generating JWT token...');
      // Sem "manter conectado" o token vale só um turno de trabalho: o cookie
      // de sessão pode sobreviver ao fechar o navegador quando ele restaura
      // abas, então o limite real precisa estar no próprio JWT.
      const expiresIn =
        dto.rememberMe === true ? '30d' : dto.rememberMe === false ? '12h' : undefined;
      const token = JwtUtil.generateAdminToken(
        {
          adminId: admin.id,
          email: admin.email,
          role: admin.role,
          status: admin.status,
        },
        expiresIn
      );

      // Remove password from response
      const { password, ...adminWithoutPassword } = admin;

      logger.info(`Admin logged in successfully: ${admin.email}`);

      return {
        token,
        admin: adminWithoutPassword,
      };
    } catch (error) {
      logger.error('Admin login error:', error);
      throw error;
    }
  }

  /**
   * Get admin profile
   */
  async getProfile(adminId: string): Promise<Omit<Admin, 'password'>> {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw ApiError.notFound('Admin not found');
    }

    const { password, ...adminWithoutPassword } = admin;
    return adminWithoutPassword;
  }

  /**
   * Update admin profile
   *
   * Apenas nome e email — trocar o email exige a senha atual, por ser o
   * identificador de login.
   */
  async updateProfile(
    adminId: string,
    dto: UpdateAdminProfileDto
  ): Promise<Omit<Admin, 'password'>> {
    const current = await prisma.admin.findUnique({ where: { id: adminId } });

    if (!current) {
      throw ApiError.notFound('Admin not found');
    }

    const data: { name?: string; email?: string } = {};

    if (dto.name !== undefined) {
      data.name = dto.name;
    }

    if (dto.email !== undefined && dto.email !== current.email) {
      const isPasswordValid = await HashUtil.comparePassword(
        dto.currentPassword ?? '',
        current.password
      );

      if (!isPasswordValid) {
        logger.warn(`Email change failed - invalid password: ${current.email}`);
        throw ApiError.unauthorized('Current password is incorrect');
      }

      const existing = await prisma.admin.findFirst({
        where: { email: dto.email, NOT: { id: adminId } },
      });

      if (existing) {
        throw ApiError.conflict('Email already in use');
      }

      data.email = dto.email;
    }

    const admin = await prisma.admin.update({
      where: { id: adminId },
      data,
    });

    const { password, ...adminWithoutPassword } = admin;
    return adminWithoutPassword;
  }

  /**
   * Change admin password
   */
  async changePassword(
    adminId: string,
    dto: ChangePasswordDto
  ): Promise<void> {
    try {
      logger.info(`Password change attempt for admin: ${adminId}`);

      // Find admin
      const admin = await prisma.admin.findUnique({
        where: { id: adminId },
      });

      if (!admin) {
        throw ApiError.notFound('Admin not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await HashUtil.comparePassword(
        dto.currentPassword,
        admin.password
      );

      if (!isCurrentPasswordValid) {
        logger.warn(`Password change failed - invalid current password: ${admin.email}`);
        throw ApiError.unauthorized('Current password is incorrect');
      }

      // Hash new password
      const hashedNewPassword = await HashUtil.hashPassword(dto.newPassword);

      // Update password
      await prisma.admin.update({
        where: { id: adminId },
        data: { password: hashedNewPassword },
      });

      logger.info(`Password changed successfully for admin: ${admin.email}`);
    } catch (error) {
      logger.error('Password change error:', error);
      throw error;
    }
  }

  /**
   * Get mechanic statistics
   */
  async getMechanicStats(adminId: string): Promise<{
    totalRevisions: number;
    completedRevisions: number;
    inProgressRevisions: number;
    pendingRevisions: number;
    completionRate: number;
    averageCompletionTime: number | null;
  }> {
    const [
      totalRevisions,
      completedRevisions,
      inProgressRevisions,
      pendingRevisions,
      completedWithTime,
    ] = await Promise.all([
      prisma.revision.count({
        where: { assignedMechanicId: adminId },
      }),
      prisma.revision.count({
        where: {
          assignedMechanicId: adminId,
          status: 'COMPLETED',
        },
      }),
      prisma.revision.count({
        where: {
          assignedMechanicId: adminId,
          status: 'IN_PROGRESS',
        },
      }),
      prisma.revision.count({
        where: {
          assignedMechanicId: adminId,
          status: 'DRAFT',
        },
      }),
      prisma.revision.findMany({
        where: {
          assignedMechanicId: adminId,
          status: 'COMPLETED',
          completedAt: { not: null },
          assignedAt: { not: null },
        },
        select: {
          assignedAt: true,
          completedAt: true,
        },
      }),
    ]);

    // Calculate average completion time in hours
    let averageCompletionTime: number | null = null;
    if (completedWithTime.length > 0) {
      const totalTime = completedWithTime.reduce((sum, rev) => {
        if (rev.assignedAt && rev.completedAt) {
          return sum + (rev.completedAt.getTime() - rev.assignedAt.getTime());
        }
        return sum;
      }, 0);
      averageCompletionTime = Math.round(totalTime / completedWithTime.length / (1000 * 60 * 60)); // Convert to hours
    }

    const completionRate = totalRevisions > 0
      ? Math.round((completedRevisions / totalRevisions) * 100)
      : 0;

    return {
      totalRevisions,
      completedRevisions,
      inProgressRevisions,
      pendingRevisions,
      completionRate,
      averageCompletionTime,
    };
  }

  /**
   * Get mechanic activity history
   */
  async getMechanicActivityHistory(
    adminId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    activities: Array<{
      id: string;
      type: string;
      revisionId: string;
      vehicleInfo: string;
      customerName: string;
      status: string;
      date: Date;
    }>;
    totalCount: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [revisions, totalCount] = await Promise.all([
      prisma.revision.findMany({
        where: { assignedMechanicId: adminId },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: {
          vehicle: {
            select: {
              brand: true,
              model: true,
              year: true,
              plate: true,
            },
          },
          customer: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.revision.count({
        where: { assignedMechanicId: adminId },
      }),
    ]);

    const activities = revisions.map((rev) => ({
      id: rev.id,
      type: rev.status === 'COMPLETED' ? 'COMPLETED' :
            rev.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'ASSIGNED',
      revisionId: rev.id,
      vehicleInfo: `${rev.vehicle.brand} ${rev.vehicle.model} ${rev.vehicle.year} - ${rev.vehicle.plate}`,
      customerName: rev.customer.name,
      status: rev.status,
      date: rev.updatedAt,
    }));

    return {
      activities,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    };
  }

  /**
   * Get admin preferences
   */
  async getPreferences(adminId: string): Promise<{
    notifications: {
      newRevisionAssigned: boolean;
      revisionDeadlineReminder: boolean;
      emailNotifications: boolean;
    };
    display: {
      theme: 'light' | 'dark' | 'system';
      language: string;
    };
  }> {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { id: true, preferences: true },
    });

    if (!admin) {
      throw ApiError.notFound('Admin not found');
    }

    // Default preferences
    const defaultPreferences = {
      notifications: {
        newRevisionAssigned: true,
        revisionDeadlineReminder: true,
        emailNotifications: false,
      },
      display: {
        theme: 'system' as const,
        language: 'pt-BR',
      },
    };

    // Merge with stored preferences
    const storedPrefs = admin.preferences as any;
    if (storedPrefs) {
      return {
        notifications: {
          ...defaultPreferences.notifications,
          ...(storedPrefs.notifications || {}),
        },
        display: {
          ...defaultPreferences.display,
          ...(storedPrefs.display || {}),
        },
      };
    }

    return defaultPreferences;
  }

  /**
   * Update admin preferences
   */
  async updatePreferences(
    adminId: string,
    preferences: {
      notifications?: {
        newRevisionAssigned?: boolean;
        revisionDeadlineReminder?: boolean;
        emailNotifications?: boolean;
      };
      display?: {
        theme?: 'light' | 'dark' | 'system';
        language?: string;
      };
    }
  ): Promise<void> {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { id: true, preferences: true },
    });

    if (!admin) {
      throw ApiError.notFound('Admin not found');
    }

    // Merge with existing preferences
    const currentPrefs = (admin.preferences as any) || {};
    const updatedPrefs = {
      notifications: {
        ...(currentPrefs.notifications || {}),
        ...(preferences.notifications || {}),
      },
      display: {
        ...(currentPrefs.display || {}),
        ...(preferences.display || {}),
      },
    };

    await prisma.admin.update({
      where: { id: adminId },
      data: { preferences: updatedPrefs as any },
    });

    logger.info(`Preferences updated for admin: ${adminId}`);
  }

  /**
   * Create new admin user
   * Only ADMIN and SUPER_ADMIN can create new admin users
   * SUPER_ADMIN can create any role, ADMIN cannot create SUPER_ADMIN
   */
  async createAdmin(
    creatorAdminId: string,
    dto: CreateAdminDto
  ): Promise<Omit<Admin, 'password'>> {
    try {
      logger.info(`Admin creation attempt by: ${creatorAdminId}`);

      // 1. Verificar permissões do criador
      const creator = await prisma.admin.findUnique({
        where: { id: creatorAdminId },
      });

      if (!creator) {
        throw ApiError.notFound('Creator admin not found');
      }

      // Apenas ADMIN e SUPER_ADMIN podem criar usuários
      if (creator.role !== AdminRole.ADMIN && creator.role !== AdminRole.SUPER_ADMIN) {
        logger.warn(
          `Admin creation denied - insufficient privileges: ${creator.email}`
        );
        throw ApiError.forbidden(
          'Only ADMIN and SUPER_ADMIN can create new users'
        );
      }

      // Apenas SUPER_ADMIN pode criar outros SUPER_ADMIN
      if (
        dto.role === AdminRole.SUPER_ADMIN &&
        creator.role !== AdminRole.SUPER_ADMIN
      ) {
        logger.warn(
          `Admin creation denied - cannot create SUPER_ADMIN: ${creator.email}`
        );
        throw ApiError.forbidden('Only SUPER_ADMIN can create other SUPER_ADMIN users');
      }

      // 2. Validar email único
      const existingAdmin = await prisma.admin.findUnique({
        where: { email: dto.email },
      });

      if (existingAdmin) {
        logger.warn(`Admin creation failed - email already exists: ${dto.email}`);
        throw ApiError.conflict('Email already in use');
      }

      // 3. Hash da senha
      logger.info('Hashing password...');
      const hashedPassword = await HashUtil.hashPassword(dto.password);

      // 4. Criar admin
      logger.info(`Creating admin with role: ${dto.role}`);
      const admin = await prisma.admin.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          name: dto.name,
          role: dto.role,
          status: AdminStatus.ACTIVE,
        },
      });

      const { password, ...adminWithoutPassword } = admin;

      logger.info(
        `Admin created successfully: ${admin.email} (${admin.role}) by ${creator.email}`
      );

      return adminWithoutPassword;
    } catch (error) {
      logger.error('Admin creation error:', error);
      throw error;
    }
  }

  /**
   * Get all admin users (paginated)
   * Only ADMIN and SUPER_ADMIN can list users
   */
  async getAllAdmins(
    page: number = 1,
    limit: number = 20,
    filters?: {
      role?: AdminRole;
      status?: AdminStatus;
      search?: string;
      email?: string;
    }
  ): Promise<{
    admins: Omit<Admin, 'password'>[];
    totalCount: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters?.role) {
      where.role = filters.role;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.email) {
      // Email filter - case insensitive search
      where.email = { contains: filters.email.toLowerCase(), mode: 'insensitive' };
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [admins, totalCount] = await Promise.all([
      prisma.admin.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
          permissions: true,
          preferences: true,
        },
      }),
      prisma.admin.count({ where }),
    ]);

    return {
      admins,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    };
  }

  /**
   * Update admin user
   * SUPER_ADMIN can update anyone
   * ADMIN can update STAFF and MANAGER (not ADMIN or SUPER_ADMIN)
   */
  async updateAdmin(
    updaterAdminId: string,
    targetAdminId: string,
    dto: UpdateAdminDto
  ): Promise<Omit<Admin, 'password'>> {
    try {
      // Verificar permissões do atualizador
      const updater = await prisma.admin.findUnique({
        where: { id: updaterAdminId },
      });

      if (!updater) {
        throw ApiError.notFound('Updater admin not found');
      }

      if (updater.role !== AdminRole.ADMIN && updater.role !== AdminRole.SUPER_ADMIN) {
        throw ApiError.forbidden('Insufficient privileges');
      }

      // Buscar admin alvo
      const targetAdmin = await prisma.admin.findUnique({
        where: { id: targetAdminId },
      });

      if (!targetAdmin) {
        throw ApiError.notFound('Target admin not found');
      }

      // ADMIN não pode atualizar outros ADMIN ou SUPER_ADMIN
      if (
        updater.role === AdminRole.ADMIN &&
        (targetAdmin.role === AdminRole.ADMIN || targetAdmin.role === AdminRole.SUPER_ADMIN)
      ) {
        throw ApiError.forbidden('Cannot update admin with equal or higher role');
      }

      const data: {
        name?: string;
        email?: string;
        role?: AdminRole;
        status?: AdminStatus;
        password?: string;
      } = {};

      if (dto.name !== undefined) data.name = dto.name;
      if (dto.role !== undefined) data.role = dto.role;
      if (dto.status !== undefined) data.status = dto.status;

      if (dto.email !== undefined && dto.email !== targetAdmin.email) {
        const existing = await prisma.admin.findFirst({
          where: { email: dto.email, NOT: { id: targetAdminId } },
        });

        if (existing) {
          throw ApiError.conflict('Email already in use');
        }

        data.email = dto.email;
      }

      // A senha só pode chegar ao banco como hash: o login compara via bcrypt.
      if (dto.password) {
        data.password = await HashUtil.hashPassword(dto.password);
      }

      const updated = await prisma.admin.update({
        where: { id: targetAdminId },
        data,
      });

      const { password, ...adminWithoutPassword } = updated;

      logger.info(
        `Admin ${targetAdminId} updated by ${updater.email}: ${JSON.stringify({
          ...data,
          password: data.password ? '[redacted]' : undefined,
        })}`
      );

      return adminWithoutPassword;
    } catch (error) {
      logger.error('Admin update error:', error);
      throw error;
    }
  }

  /**
   * Delete (soft) admin user - set status to INACTIVE
   */
  async deleteAdmin(
    deleterAdminId: string,
    targetAdminId: string
  ): Promise<void> {
    try {
      // Verificar permissões
      const deleter = await prisma.admin.findUnique({
        where: { id: deleterAdminId },
      });

      if (!deleter) {
        throw ApiError.notFound('Deleter admin not found');
      }

      if (deleter.role !== AdminRole.SUPER_ADMIN) {
        throw ApiError.forbidden('Only SUPER_ADMIN can delete users');
      }

      // Não pode deletar a si mesmo
      if (deleterAdminId === targetAdminId) {
        throw ApiError.badRequest('Cannot delete yourself');
      }

      const target = await prisma.admin.findUnique({
        where: { id: targetAdminId },
        select: { id: true, email: true, role: true },
      });

      if (!target) {
        throw ApiError.notFound('Target admin not found');
      }

      // A oficina precisa manter ao menos um SUPER_ADMIN, senão ninguém
      // consegue gerenciar usuários depois.
      //
      // Pela API esta guarda é inalcançável (excluir um SUPER_ADMIN exige que
      // o autor também seja um, logo haveria dois). Ela existe para chamadas
      // diretas ao service — scripts de manutenção, seeds e jobs.
      if (target.role === AdminRole.SUPER_ADMIN) {
        const superAdmins = await prisma.admin.count({
          where: { role: AdminRole.SUPER_ADMIN },
        });

        if (superAdmins <= 1) {
          throw ApiError.badRequest(
            'Não é possível excluir o único SUPER_ADMIN do sistema'
          );
        }
      }

      // Exclusão real. O histórico de trabalho (revisões, OS, agendamentos e
      // tickets) permanece: as FKs usam ON DELETE SET NULL, então o registro
      // apenas fica sem responsável — o nome segue no cache `mechanicName`.
      await prisma.admin.delete({ where: { id: targetAdminId } });

      logger.info(`Admin ${target.email} deleted by ${deleter.email}`);
    } catch (error) {
      logger.error('Admin deletion error:', error);
      throw error;
    }
  }
}
