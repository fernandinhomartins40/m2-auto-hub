import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import { loginSchema } from './dto/login.dto.js';
import { registerSchema } from './dto/register.dto.js';
import { changePasswordSchema } from './dto/change-password.dto.js';
import { updateCustomerProfileSchema } from './dto/update-profile.dto.js';
import {
  createClearCookieOptions,
  createSessionCookieOptions,
} from '@shared/utils/auth-cookie.util.js';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * POST /auth/login
   */
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = loginSchema.parse(req.body);
      const result = await this.authService.login(dto);

      // Set httpOnly cookie
      res.cookie('authToken', result.token, createSessionCookieOptions());

      res.status(200).json({
        success: true,
        data: {
          customer: result.customer,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /auth/register
   */
  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = registerSchema.parse(req.body);
      const result = await this.authService.register(dto);

      // Set httpOnly cookie
      res.cookie('authToken', result.token, createSessionCookieOptions());

      res.status(201).json({
        success: true,
        data: {
          customer: result.customer,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /auth/profile
   */
  getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const customer = await this.authService.getProfile(req.user.customerId);

      res.status(200).json({
        success: true,
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /auth/profile
   */
  updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const dto = updateCustomerProfileSchema.parse(req.body);
      const customer = await this.authService.updateProfile(
        req.user.customerId,
        dto
      );

      res.status(200).json({
        success: true,
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /auth/change-password
   */
  changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const dto = changePasswordSchema.parse(req.body);
      await this.authService.changePassword(req.user.customerId, dto);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /auth/logout
   */
  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Clear httpOnly cookie
      res.clearCookie('authToken', createClearCookieOptions());

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}
