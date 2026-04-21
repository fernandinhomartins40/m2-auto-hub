import { Request, Response, NextFunction } from 'express';
import { CouponsService } from './coupons.service.js';
import { createCouponSchema } from './dto/create-coupon.dto.js';
import { updateCouponSchema } from './dto/update-coupon.dto.js';
import { validateCouponSchema } from './dto/validate-coupon.dto.js';

export class CouponsController {
  private couponsService: CouponsService;

  constructor() {
    this.couponsService = new CouponsService();
  }

  /**
   * POST /coupons
   * Create new coupon (Admin only)
   */
  createCoupon = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = createCouponSchema.parse(req.body);
      const coupon = await this.couponsService.createCoupon(dto);

      res.status(201).json({
        success: true,
        data: coupon,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /coupons
   * Get all coupons with filters
   */
  getCoupons = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const filters: any = {};
      if (req.query.isActive !== undefined) {
        filters.isActive = req.query.isActive === 'true';
      }
      if (req.query.isExpired !== undefined) {
        filters.isExpired = req.query.isExpired === 'true';
      }
      if (req.query.search) {
        filters.search = req.query.search;
      }

      const result = await this.couponsService.getCoupons(page, limit, filters);

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /coupons/active
   * Get active coupons
   */
  getActiveCoupons = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const coupons = await this.couponsService.getActiveCoupons();

      res.status(200).json({
        success: true,
        data: coupons,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /coupons/:id
   * Get coupon by ID
   */
  getCouponById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const coupon = await this.couponsService.getCouponById(req.params.id);

      res.status(200).json({
        success: true,
        data: coupon,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /coupons/:id
   * Update coupon
   */
  updateCoupon = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = updateCouponSchema.parse(req.body);
      const coupon = await this.couponsService.updateCoupon(req.params.id, dto);

      res.status(200).json({
        success: true,
        data: coupon,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /coupons/:id
   * Delete coupon
   */
  deleteCoupon = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.couponsService.deleteCoupon(req.params.id);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /coupons/:id/activate
   * Activate coupon
   */
  activateCoupon = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const coupon = await this.couponsService.activateCoupon(req.params.id);

      res.status(200).json({
        success: true,
        data: coupon,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /coupons/:id/deactivate
   * Deactivate coupon
   */
  deactivateCoupon = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const coupon = await this.couponsService.deactivateCoupon(req.params.id);

      res.status(200).json({
        success: true,
        data: coupon,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /coupons/validate
   * Validate coupon for cart
   */
  validateCoupon = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const dto = validateCouponSchema.parse(req.body);
      const result = await this.couponsService.validateCoupon(dto);

      res.status(200).json({
        success: result.isValid,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /coupons/:id/stats
   * Get coupon statistics
   */
  getCouponStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const stats = await this.couponsService.getCouponStats(req.params.id);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /coupons/active/count
   * Get count of active coupons
   */
  getActiveCouponCount = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const count = await this.couponsService.getActiveCouponCount();

      res.status(200).json({
        success: true,
        data: { count },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * ✅ ETAPA 3.1: GET /coupons/customer-available
   * Get coupons available for customer based on cart value
   */
  getCustomerAvailableCoupons = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const cartValue = parseFloat(req.query.cartValue as string) || 0;
      const coupons = await this.couponsService.getCustomerAvailableCoupons(cartValue);

      res.status(200).json({
        success: true,
        data: coupons,
      });
    } catch (error) {
      next(error);
    }
  };
}
