import { Request, Response, NextFunction } from 'express';
import { JwtUtil, TokenPayload } from '@shared/utils/jwt.util.js';
import { ApiError } from '@shared/utils/error.util.js';
import { CustomerStatus } from '@prisma/client';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export class AuthMiddleware {
  /**
   * Verify JWT token and attach user to request
   */
  static authenticate(req: Request, res: Response, next: NextFunction): void {
    try {
      // Try to get token from cookie first, then fallback to Authorization header
      let token = req.cookies?.authToken;

      if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7); // Remove 'Bearer ' prefix
        }
      }

      if (!token) {
        // Don't log error - this is expected when no customer session exists
        throw ApiError.unauthorized('No token provided');
      }

      try {
        const payload = JwtUtil.verifyToken(token);

        // Validate token structure
        if (!payload.customerId) {
          throw ApiError.unauthorized('Invalid token structure - missing customerId');
        }

        req.user = payload;
        next();
      } catch (error) {
        // Don't log error - token verification failures are expected for invalid/expired tokens
        throw ApiError.unauthorized('Invalid or expired token');
      }
    } catch (error) {
      // Pass error to error handler without logging (already handled appropriately)
      next(error);
    }
  }

  /**
   * Check if user is active
   */
  static requireActive(req: Request, res: Response, next: NextFunction): void {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required');
      }

      if (req.user.status !== CustomerStatus.ACTIVE) {
        throw ApiError.forbidden('Account is not active');
      }

      next();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Require specific customer level
   */
  static requireLevel(...allowedLevels: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        if (!req.user) {
          throw ApiError.unauthorized('Authentication required');
        }

        if (!allowedLevels.includes(req.user.level)) {
          throw ApiError.forbidden('Insufficient privileges');
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }
}

// Export authenticateCustomer alias
export const authenticateCustomer = AuthMiddleware.authenticate;
