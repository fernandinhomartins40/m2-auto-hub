import { Router } from 'express';
import { z } from 'zod';
import { passwordResetLimiter } from '@middlewares/rate-limit.middleware.js';
import { AuthMiddleware } from '@middlewares/auth.middleware.js';
import { changePasswordSchema } from './dto/change-password.dto.js';
import { EmailAuthService } from './email-auth.service.js';
import { logger } from '@shared/utils/logger.util.js';
import { AdminPasswordRecoveryService } from './admin-password-recovery.service.js';

const router = Router();
const service = new EmailAuthService();
const adminRecovery = new AdminPasswordRecoveryService();
const tokenSchema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) });

router.post('/admin/forgot-password', passwordResetLimiter, async (req, res) => {
  const { email } = z.object({ email: z.string().trim().email().max(254) }).parse(req.body);
  await adminRecovery.request(email).catch(() => logger.error('Admin password recovery email failed'));
  res.json({ success: true, message: 'Se houver uma conta ativa com este e-mail, enviaremos as instruções.' });
});
router.post('/admin/reset-password', passwordResetLimiter, async (req, res) => {
  const { token } = tokenSchema.parse(req.body);
  const { newPassword } = changePasswordSchema.parse({ ...req.body, currentPassword: 'reset-token' });
  await adminRecovery.consume(token, newPassword);
  res.json({ success: true });
});

router.post('/forgot-password', passwordResetLimiter, async (req, res) => {
  const { email } = z.object({ email: z.string().trim().email().max(254) }).parse(req.body);
  await service.request(email, 'RESET_PASSWORD').catch(() => logger.error('Password recovery email failed'));
  res.json({ success: true, message: 'Se houver uma conta ativa com este e-mail, enviaremos as instruções.' });
});
router.post('/reset-password', passwordResetLimiter, async (req, res) => {
  const { token } = tokenSchema.parse(req.body);
  const { newPassword } = changePasswordSchema.parse({ ...req.body, currentPassword: 'reset-token' });
  await service.consume(token, 'RESET_PASSWORD', newPassword);
  res.json({ success: true });
});
router.post('/verify-email', passwordResetLimiter, async (req, res) => {
  const { token } = tokenSchema.parse(req.body);
  await service.consume(token, 'VERIFY_EMAIL');
  res.json({ success: true });
});
router.post('/resend-verification', passwordResetLimiter, AuthMiddleware.authenticate, async (req, res) => {
  await service.request(req.user!.email, 'VERIFY_EMAIL');
  res.json({ success: true });
});
export default router;
