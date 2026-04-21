import { Request, Response, NextFunction } from 'express';
import { PromotionsService } from './promotions.service.js';
import { createPromotionSchema } from './dto/create-promotion.dto.js';
import { updatePromotionSchema } from './dto/update-promotion.dto.js';

export class PromotionsController {
  private promotionsService: PromotionsService;

  constructor() {
    this.promotionsService = new PromotionsService();
  }

  /**
   * POST /promotions
   * Create new promotion (Admin only)
   */
  createPromotion = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      console.log('[PromotionsController] Recebendo requisição de criação de promoção');
      console.log('[PromotionsController] Body:', JSON.stringify(req.body, null, 2));

      if (!req.admin) {
        console.error('[PromotionsController] Admin não autenticado');
        throw new Error('Admin not authenticated');
      }

      console.log('[PromotionsController] Validando schema...');
      const dto = createPromotionSchema.parse(req.body);
      console.log('[PromotionsController] Schema validado com sucesso');
      console.log('[PromotionsController] DTO:', JSON.stringify(dto, null, 2));

      console.log('[PromotionsController] Criando promoção...');
      const promotion = await this.promotionsService.createPromotion(
        req.admin.adminId,
        dto
      );
      console.log('[PromotionsController] Promoção criada:', promotion.id);

      res.status(201).json({
        success: true,
        data: promotion,
      });
    } catch (error) {
      console.error('[PromotionsController] Erro ao criar promoção:', error);
      console.error('[PromotionsController] Stack:', error instanceof Error ? error.stack : 'No stack');
      next(error);
    }
  };

  /**
   * GET /promotions
   * Get all promotions with filters
   */
  getPromotions = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const filters: any = {};
      if (req.query.isActive !== undefined) {
        filters.isActive = req.query.isActive === 'true';
      }
      if (req.query.isDraft !== undefined) {
        filters.isDraft = req.query.isDraft === 'true';
      }
      if (req.query.type) {
        filters.type = req.query.type;
      }
      if (req.query.search) {
        filters.search = req.query.search;
      }

      const result = await this.promotionsService.getPromotions(page, limit, filters);

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /promotions/active
   * Get active promotions for customer
   */
  getActivePromotions = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const customerId = req.user?.customerId;
      const promotions = await this.promotionsService.getActivePromotions(customerId);

      res.status(200).json({
        success: true,
        data: promotions,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /promotions/:id
   * Get promotion by ID
   */
  getPromotionById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const promotion = await this.promotionsService.getPromotionById(req.params.id);

      res.status(200).json({
        success: true,
        data: promotion,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /promotions/code/:code
   * Get promotion by code
   */
  getPromotionByCode = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const promotion = await this.promotionsService.getPromotionByCode(
        req.params.code
      );

      res.status(200).json({
        success: true,
        data: promotion,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /promotions/:id
   * Update promotion
   */
  updatePromotion = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.admin) {
        throw new Error('Admin not authenticated');
      }

      const dto = updatePromotionSchema.parse(req.body);
      const promotion = await this.promotionsService.updatePromotion(
        req.params.id,
        req.admin.adminId,
        dto
      );

      res.status(200).json({
        success: true,
        data: promotion,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /promotions/:id
   * Delete promotion
   */
  deletePromotion = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await this.promotionsService.deletePromotion(req.params.id);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /promotions/:id/activate
   * Activate promotion
   */
  activatePromotion = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.admin) {
        throw new Error('Admin not authenticated');
      }

      const promotion = await this.promotionsService.activatePromotion(
        req.params.id,
        req.admin.adminId
      );

      res.status(200).json({
        success: true,
        data: promotion,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /promotions/:id/deactivate
   * Deactivate promotion
   */
  deactivatePromotion = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.admin) {
        throw new Error('Admin not authenticated');
      }

      const promotion = await this.promotionsService.deactivatePromotion(
        req.params.id,
        req.admin.adminId
      );

      res.status(200).json({
        success: true,
        data: promotion,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /promotions/:id/stats
   * Get promotion statistics
   */
  getPromotionStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const stats = await this.promotionsService.getPromotionStats(req.params.id);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /promotions/calculate
   * Calculate applicable promotions for cart
   */
  calculatePromotions = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { items, totalAmount } = req.body;
      const customerId = req.user?.customerId;

      if (!items || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Cart items are required',
        });
        return;
      }

      if (!totalAmount || totalAmount <= 0) {
        res.status(400).json({
          success: false,
          message: 'Total amount must be greater than 0',
        });
        return;
      }

      const result = await this.promotionsService.calculatePromotions({
        items,
        customerId,
        totalAmount,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
