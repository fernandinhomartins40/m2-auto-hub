import { Request, Response, NextFunction } from 'express';
import { JwtUtil, AdminTokenPayload } from '@shared/utils/jwt.util.js';
import { ApiError } from '@shared/utils/error.util.js';
import { AdminStatus, AdminRole } from '@prisma/client';
import { runWithRLSContext } from './prisma-rls.middleware.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      admin?: AdminTokenPayload;
    }
  }
}

export class AdminAuthMiddleware {
  /**
   * Verify JWT token and attach admin to request
   */
  static authenticate(req: Request, res: Response, next: NextFunction): void {
    try {
      // Try to get token from cookie first, then fallback to Authorization header
      let token = req.cookies?.adminToken;

      if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7); // Remove 'Bearer ' prefix
        }
      }

      if (!token) {
        throw ApiError.unauthorized('No token provided');
      }

      try {
        const payload = JwtUtil.verifyAdminToken(token);
        req.admin = payload;
        runWithRLSContext(payload.adminId, payload.role, next);
      } catch (error) {
        throw ApiError.unauthorized('Invalid or expired token');
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check if admin is active
   */
  static requireActive(req: Request, res: Response, next: NextFunction): void {
    try {
      if (!req.admin) {
        throw ApiError.unauthorized('Authentication required');
      }

      if (req.admin.status !== AdminStatus.ACTIVE) {
        throw ApiError.forbidden('Account is not active');
      }

      next();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Require specific admin role
   */
  static requireRole(...allowedRoles: AdminRole[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        if (!req.admin) {
          throw ApiError.unauthorized('Authentication required');
        }

        if (!allowedRoles.includes(req.admin.role as AdminRole)) {
          throw ApiError.forbidden('Insufficient privileges');
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Require minimum admin level (staff < manager < admin < super_admin)
   */
  static requireMinRole(minRole: AdminRole) {
    const roleHierarchy = {
      [AdminRole.STAFF]: 1,
      [AdminRole.MANAGER]: 2,
      [AdminRole.ADMIN]: 3,
      [AdminRole.SUPER_ADMIN]: 4,
    };

    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        if (!req.admin) {
          throw ApiError.unauthorized('Authentication required');
        }

        const userLevel = roleHierarchy[req.admin.role as AdminRole] || 0;
        const requiredLevel = roleHierarchy[minRole] || 999;

        if (userLevel < requiredLevel) {
          throw ApiError.forbidden('Insufficient privileges');
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }
}
