import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'path';
import 'express-async-errors';
import { corsOptions } from '@config/cors.js';
import { ErrorMiddleware } from '@middlewares/error.middleware.js';
import { logger } from '@shared/utils/logger.util.js';
import authRoutes from '@modules/auth/auth.routes.js';
import addressesRoutes from '@modules/addresses/addresses.routes.js';
import productsRoutes from '@modules/products/products.routes.js';
import servicesRoutes from '@modules/services/services.routes.js';
import vehiclesRoutes from '@modules/vehicles/vehicles.routes.js';
import compatibilityRoutes from '@modules/compatibility/compatibility.routes.js';
import ordersRoutes from '@modules/orders/orders.routes.js';
import promotionsRoutes from '@modules/promotions/promotions.routes.js';
import couponsRoutes from '@modules/coupons/coupons.routes.js';
import favoritesRoutes from '@modules/favorites/favorites.routes.js';
import customerVehiclesRoutes from '@modules/customer-vehicles/customer-vehicles.routes.js';
import checklistRoutes from '@modules/checklist/checklist.routes.js';
import revisionsRoutes from '@modules/revisions/revisions.routes.js';
import customerRevisionsRoutes from '@modules/customer-revisions/customer-revisions.routes.js';
import adminRoutes from '@modules/admin/admin.routes.js';
import customerRoutes from '@modules/customer/customer.routes.js';
import supportRoutes from '@modules/support/support.routes.js';
import reportsRoutes from '@modules/reports/reports.routes.js';
import landingPageRoutes from '@modules/landing-page/landing-page.routes.js';
import settingsRoutes from '@modules/settings/settings.routes.js';
import notificationsRoutes from '@modules/notifications/notifications.routes.js';

export function createApp(): Express {
  const app = express();

  // Trust proxy
  app.set('trust proxy', 1);

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  // CORS
  app.use(cors(corsOptions));

  // Cookie parsing
  app.use(cookieParser());

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Compression
  app.use(compression());

  // Servir arquivos estáticos de upload
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Request logging
  app.use((req, _res, next) => {
    logger.info(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    next();
  });

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      message: 'Server is running',
      timestamp: new Date().toISOString(),
    });
  });

  // API Routes - Fase 1
  app.use('/auth', authRoutes);
  app.use('/addresses', addressesRoutes);

  // API Routes - Fase 2
  app.use('/products', productsRoutes);
  app.use('/services', servicesRoutes);
  app.use('/vehicles', vehiclesRoutes);
  app.use('/compatibility', compatibilityRoutes);

  // API Routes - Fase 3
  app.use('/orders', ordersRoutes);
  app.use('/promotions', promotionsRoutes);
  app.use('/coupons', couponsRoutes);
  app.use('/favorites', favoritesRoutes);

  // API Routes - Fase 4
  app.use('/customer-vehicles', customerVehiclesRoutes);
  app.use('/checklist', checklistRoutes);
  app.use('/revisions', revisionsRoutes);
  app.use('/customer-revisions', customerRevisionsRoutes);

  // Admin Routes
  app.use('/admin', adminRoutes);

  // Customer Routes
  app.use('/customers', customerRoutes);

  // Support Routes
  app.use('/support', supportRoutes);

  // Reports Routes (Admin only)
  app.use('/admin/reports', reportsRoutes);

  // Landing Page Routes (NEW - Padrão Ferraco)
  app.use('/landing-page', landingPageRoutes);

  // Settings Routes (Sistema de Configurações)
  app.use('/settings', settingsRoutes);

  // Notifications Routes
  app.use('/', notificationsRoutes);

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'Route not found',
    });
  });

  // Error handling middleware (must be last)
  app.use(ErrorMiddleware.handle);

  return app;
}
