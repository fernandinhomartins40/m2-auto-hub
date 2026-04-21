import rateLimit from 'express-rate-limit';
import { Request } from 'express';

/**
 * Rate limiting middleware for authentication endpoints
 * ✅ SECURITY ENHANCEMENT: Prevent brute force attacks
 */

// Strict limiter for login (5 attempts per 15 minutes)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
  // Use IP + email for more granular control
  keyGenerator: (req: Request) => {
    const email = req.body?.email || 'unknown';
    return `${req.ip}-${email}`;
  },
});

// Moderate limiter for general API requests (100 requests per 15 minutes)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Muitas requisições. Tente novamente mais tarde.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for password reset (3 attempts per hour)
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Muitas tentativas de redefinição de senha. Tente novamente em 1 hora.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for user creation (5 per hour per IP)
export const createUserLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Muitas tentativas de criação de usuário. Tente novamente em 1 hora.',
  standardHeaders: true,
  legacyHeaders: false,
});
