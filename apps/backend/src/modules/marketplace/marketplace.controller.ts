import { Request, Response, NextFunction } from 'express';
import { environment } from '@config/environment.js';
import { ApiError } from '@shared/utils/error.util.js';
import { connectionService } from './services/connection.service.js';
import { oauthService } from './services/oauth.service.js';
import { listingService } from './services/listing.service.js';
import { tokenRefreshService } from './services/token-refresh.service.js';
import { readinessService } from './services/readiness.service.js';
import { getAdapter } from './adapters/index.js';
import {
  parseProviderSlug,
  setCredentialsSchema,
  publishProductSchema,
  suggestCategoriesSchema,
} from './dto/marketplace.dto.js';

export class MarketplaceController {
  // --- Conexao / onboarding ---

  getConnections = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const connections = await connectionService.listSafe();
      res.status(200).json({ success: true, data: connections });
    } catch (error) {
      next(error);
    }
  };

  getGuide = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const provider = parseProviderSlug(req.params.provider);
      const [guide, readiness] = await Promise.all([
        readinessService.guide(provider),
        readinessService.readiness(provider),
      ]);
      res.status(200).json({ success: true, data: { guide, readiness } });
    } catch (error) {
      next(error);
    }
  };

  getReadiness = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const provider = parseProviderSlug(req.params.provider);
      const readiness = await readinessService.readiness(provider);
      res.status(200).json({ success: true, data: readiness });
    } catch (error) {
      next(error);
    }
  };

  setCredentials = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const provider = parseProviderSlug(req.params.provider);
      const dto = setCredentialsSchema.parse(req.body);
      const conn = await connectionService.setCredentials(provider, dto.appId, dto.appSecret);
      res.status(200).json({ success: true, data: conn });
    } catch (error) {
      next(error);
    }
  };

  authorize = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const provider = parseProviderSlug(req.params.provider);
      const url = await oauthService.buildAuthorizationUrl(provider);
      res.status(200).json({ success: true, data: { authorizationUrl: url } });
    } catch (error) {
      next(error);
    }
  };

  /** Callback OAuth (rota publica, sem auth de admin). Redireciona para o frontend. */
  callback = async (req: Request, res: Response): Promise<void> => {
    const slug = req.params.provider;
    const frontend = environment.app.baseUrl;
    try {
      const provider = parseProviderSlug(slug);
      const code = String(req.query.code ?? '');
      const state = req.query.state ? String(req.query.state) : undefined;
      const shopId = req.query.shop_id ? String(req.query.shop_id) : undefined;

      if (!code) {
        throw ApiError.badRequest('Código de autorização ausente.');
      }

      await oauthService.handleCallback(provider, code, state, shopId ? { shop_id: shopId } : {});
      res.redirect(`${frontend}/admin?tab=marketplaces&connected=${slug}`);
    } catch (error) {
      const message = error instanceof Error ? encodeURIComponent(error.message) : 'erro';
      res.redirect(`${frontend}/admin?tab=marketplaces&error=${message}`);
    }
  };

  testConnection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const provider = parseProviderSlug(req.params.provider);
      const result = await oauthService.testConnection(provider);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  disconnect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const provider = parseProviderSlug(req.params.provider);
      await connectionService.disconnect(provider);
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  };

  // --- Catalogo ---

  suggestCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const provider = parseProviderSlug(req.params.provider);
      const { q } = suggestCategoriesSchema.parse(req.query);
      const account = await tokenRefreshService.ensureFreshToken(provider);
      const data = await getAdapter(provider).suggestCategories(account, q);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  getCategoryAttributes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const provider = parseProviderSlug(req.params.provider);
      const account = await tokenRefreshService.ensureFreshToken(provider);
      const data = await getAdapter(provider).getCategoryAttributes(account, req.params.categoryId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  // --- Listings / publicacao ---

  getListings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const provider = req.query.provider ? parseProviderSlug(String(req.query.provider)) : undefined;
      const data = await listingService.list(provider);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  publish = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const productId = req.params.productId;
      const dto = publishProductSchema.parse(req.body);

      const results = [];
      for (const slug of dto.providers) {
        const provider = parseProviderSlug(slug);
        const listing = await listingService.publish(productId, provider, dto.categoryMapping);
        results.push(listing);
      }
      res.status(200).json({ success: true, data: results });
    } catch (error) {
      next(error);
    }
  };

  syncListing = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await listingService.sync(req.params.id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  pauseListing = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await listingService.pause(req.params.id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  closeListing = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await listingService.close(req.params.id);
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  };

  /** Lista os anuncios de um produto especifico (para o ProductModal). */
  getProductListings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { prisma } = await import('@config/database.js');
      const data = await prisma.marketplaceListing.findMany({
        where: { productId: req.params.productId },
      });
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}

export const marketplaceController = new MarketplaceController();
