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

import { ensureLandingPageConfig } from './bootstrap/essential-data.js';

export function createApp(): Express {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  app.use(cors(corsOptions));
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(compression());

  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  app.use((req, _res, next) => {
    logger.info(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    next();
  });

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      message: 'Server is running',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/landing-page/config', async (_req: Request, res: Response) => {
    const config = await ensureLandingPageConfig();

    res.status(200).json({
      success: true,
      data: {
        id: config.id,
        header: JSON.parse(config.header),
        hero: JSON.parse(config.hero),
        marquee: JSON.parse(config.marquee),
        about: JSON.parse(config.about),
        products: JSON.parse(config.products),
        services: JSON.parse(config.services),
        contactPage: config.contactPage ? JSON.parse(config.contactPage) : undefined,
        aboutPage: config.aboutPage ? JSON.parse(config.aboutPage) : undefined,
        contact: JSON.parse(config.contact),
        footer: JSON.parse(config.footer),
        updatedAt: config.updatedAt,
      },
    });
  });

  app.use('/auth', authRoutes);
  app.use('/addresses', addressesRoutes);
  app.use('/products', productsRoutes);
  app.use('/services', servicesRoutes);
  app.use('/vehicles', vehiclesRoutes);
  app.use('/compatibility', compatibilityRoutes);
  app.use('/orders', ordersRoutes);
  app.use('/promotions', promotionsRoutes);
  app.use('/coupons', couponsRoutes);
  app.use('/favorites', favoritesRoutes);
  app.use('/customer-vehicles', customerVehiclesRoutes);
  app.use('/checklist', checklistRoutes);
  app.use('/revisions', revisionsRoutes);
  app.use('/customer-revisions', customerRevisionsRoutes);
  app.use('/admin', adminRoutes);
  app.use('/customers', customerRoutes);
  app.use('/support', supportRoutes);
  app.use('/admin/reports', reportsRoutes);
  app.use('/landing-page', landingPageRoutes);
  app.use('/settings', settingsRoutes);
  app.use('/', notificationsRoutes);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'Route not found',
    });
  });

  app.use(ErrorMiddleware.handle);

  return app;
}
