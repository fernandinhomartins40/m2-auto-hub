import { Request, Response, NextFunction } from 'express';
import { AdminAuthService } from './admin-auth.service.js';
import { adminLoginSchema } from './dto/admin-login.dto.js';
import { createAdminSchema } from './dto/create-admin.dto.js';
import { changePasswordSchema } from './dto/change-password.dto.js';
import { updateAdminProfileSchema } from './dto/update-profile.dto.js';
import { updateAdminSchema } from './dto/update-admin.dto.js';
import { logger } from '@shared/utils/logger.util.js';
import {
  createClearCookieOptions,
  createSessionCookieOptions,
} from '@shared/utils/auth-cookie.util.js';
import { AdminRole, AdminStatus } from '@prisma/client';

export class AdminAuthController {
  private adminAuthService: AdminAuthService;

  constructor() {
    this.adminAuthService = new AdminAuthService();
  }

  /**
   * POST /auth/admin/login
   */
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      logger.info('Admin login controller - received request');
      logger.info('Request body:', { email: req.body?.email, hasPassword: !!req.body?.password });

      const dto = adminLoginSchema.parse(req.body);
      logger.info('Request body validated successfully');

      const result = await this.adminAuthService.login(dto);
      logger.info('Login service completed successfully');

      // Set httpOnly cookie for admin
      res.cookie('adminToken', result.token, createSessionCookieOptions(dto.rememberMe));

      logger.info('Cookie set successfully, sending response');

      res.status(200).json({
        success: true,
        data: {
          admin: result.admin,
          // Cookie httpOnly continua sendo usado pelo painel web.
          // O token também é devolvido no corpo para clients nativos
          // (app Flutter), que autenticam via Authorization: Bearer.
          token: result.token,
        },
      });
    } catch (error) {
      logger.error('Admin login controller error:', error);
      next(error);
    }
  };

  /**
   * GET /auth/admin/profile
   */
  getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.admin) {
        throw new Error('Admin not authenticated');
      }

      const admin = await this.adminAuthService.getProfile(req.admin.adminId);

      res.status(200).json({
        success: true,
        data: admin,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /auth/admin/profile
   */
  updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.admin) {
        throw new Error('Admin not authenticated');
      }

      const dto = updateAdminProfileSchema.parse(req.body);
      const admin = await this.adminAuthService.updateProfile(
        req.admin.adminId,
        dto
      );

      res.status(200).json({
        success: true,
        data: admin,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /auth/admin/change-password
   */
  changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.admin) {
        throw new Error('Admin not authenticated');
      }

      const dto = changePasswordSchema.parse(req.body);
      await this.adminAuthService.changePassword(req.admin.adminId, dto);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /auth/admin/stats
   */
  getMechanicStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.admin) {
        throw new Error('Admin not authenticated');
      }

      const stats = await this.adminAuthService.getMechanicStats(req.admin.adminId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /auth/admin/activity-history
   */
  getActivityHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.admin) {
        throw new Error('Admin not authenticated');
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await this.adminAuthService.getMechanicActivityHistory(
        req.admin.adminId,
        page,
        limit
      );

      res.status(200).json({
        success: true,
        data: result.activities,
        meta: {
          page: result.page,
          limit: result.limit,
          totalCount: result.totalCount,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /auth/admin/preferences
   */
  getPreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.admin) {
        throw new Error('Admin not authenticated');
      }

      const preferences = await this.adminAuthService.getPreferences(req.admin.adminId);

      res.status(200).json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /auth/admin/preferences
   */
  updatePreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.admin) {
        throw new Error('Admin not authenticated');
      }

      await this.adminAuthService.updatePreferences(req.admin.adminId, req.body);

      res.status(200).json({
        success: true,
        message: 'Preferences updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /auth/admin/logout
   */
  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Clear httpOnly cookie
      res.clearCookie('adminToken', createClearCookieOptions());

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /auth/admin/create
   * Create new admin user (only ADMIN and SUPER_ADMIN)
   */
  createAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.admin) {
        throw new Error('Admin not authenticated');
      }

      const dto = createAdminSchema.parse(req.body);
      const admin = await this.adminAuthService.createAdmin(req.admin.adminId, dto);

      res.status(201).json({
        success: true,
        data: admin,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /auth/admin/users
   * Get all admin users (only ADMIN and SUPER_ADMIN)
   */
  getAllAdmins = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.admin) {
        throw new Error('Admin not authenticated');
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filters: any = {};

      if (req.query.role) {
        filters.role = req.query.role as AdminRole;
      }

      if (req.query.status) {
        filters.status = req.query.status as AdminStatus;
      }

      if (req.query.email) {
        filters.email = req.query.email as string;
      }

      if (req.query.search) {
        filters.search = req.query.search as string;
      }

      const result = await this.adminAuthService.getAllAdmins(page, limit, filters);

      res.status(200).json({
        success: true,
        data: result.admins,
        meta: {
          page: result.page,
          limit: result.limit,
          totalCount: result.totalCount,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /auth/admin/users/:id
   * Update admin user (only ADMIN and SUPER_ADMIN)
   */
  updateAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.admin) {
        throw new Error('Admin not authenticated');
      }

      const targetAdminId = req.params.id;
      const dto = updateAdminSchema.parse(req.body);
      const admin = await this.adminAuthService.updateAdmin(
        req.admin.adminId,
        targetAdminId,
        dto
      );

      res.status(200).json({
        success: true,
        data: admin,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /auth/admin/users/:id
   * Delete (soft) admin user (only SUPER_ADMIN)
   */
  deleteAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.admin) {
        throw new Error('Admin not authenticated');
      }

      const targetAdminId = req.params.id;
      await this.adminAuthService.deleteAdmin(req.admin.adminId, targetAdminId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
