import jwt, { JwtPayload } from 'jsonwebtoken';
import { environment } from '@config/environment.js';

export interface TokenPayload {
  customerId: string;
  email: string;
  level: string;
  status: string;
}

export interface AdminTokenPayload {
  adminId: string;
  email: string;
  role: string;
  status: string;
}

export class JwtUtil {
  /**
   * Generate JWT token for customers
   */
  static generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, environment.jwt.secret, {
      expiresIn: environment.jwt.expiresIn as jwt.SignOptions['expiresIn'],
      issuer: 'moria-backend',
      audience: 'moria-frontend',
    });
  }

  /**
   * Generate JWT token for admins
   */
  static generateAdminToken(payload: AdminTokenPayload): string {
    return jwt.sign(payload, environment.jwt.secret, {
      expiresIn: environment.jwt.expiresIn as jwt.SignOptions['expiresIn'],
      issuer: 'moria-backend',
      audience: 'moria-admin',
    });
  }

  /**
   * Verify and decode JWT token for customers
   */
  static verifyToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, environment.jwt.secret, {
        issuer: 'moria-backend',
        audience: 'moria-frontend',
      }) as JwtPayload;

      return {
        customerId: decoded.customerId,
        email: decoded.email,
        level: decoded.level,
        status: decoded.status,
      };
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Verify and decode JWT token for admins
   */
  static verifyAdminToken(token: string): AdminTokenPayload {
    try {
      const decoded = jwt.verify(token, environment.jwt.secret, {
        issuer: 'moria-backend',
        audience: 'moria-admin',
      }) as JwtPayload;

      return {
        adminId: decoded.adminId,
        email: decoded.email,
        role: decoded.role,
        status: decoded.status,
      };
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  static decodeToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.decode(token) as JwtPayload;
      if (!decoded) return null;

      return {
        customerId: decoded.customerId,
        email: decoded.email,
        level: decoded.level,
        status: decoded.status,
      };
    } catch {
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as JwtPayload;
      if (!decoded || !decoded.exp) return true;

      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch {
      return true;
    }
  }
}
