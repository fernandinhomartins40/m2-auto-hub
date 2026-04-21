import { Request, Response, NextFunction } from 'express';
import { CompatibilityService } from './compatibility.service.js';
import { createCompatibilitySchema } from './dto/create-compatibility.dto.js';
import { updateCompatibilitySchema } from './dto/update-compatibility.dto.js';
import { z } from 'zod';

export class CompatibilityController {
  private compatibilityService: CompatibilityService;

  constructor() {
    this.compatibilityService = new CompatibilityService();
  }

  /**
   * GET /compatibility
   */
  getCompatibilities = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const productId = req.query.productId as string | undefined;
      const compatibilities = await this.compatibilityService.getCompatibilities(productId);

      res.status(200).json({
        success: true,
        data: compatibilities,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /compatibility/:id
   */
  getCompatibilityById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const compatibility = await this.compatibilityService.getCompatibilityById(req.params.id);

      res.status(200).json({
        success: true,
        data: compatibility,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /compatibility
   */
  createCompatibility = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = createCompatibilitySchema.parse(req.body);
      const compatibility = await this.compatibilityService.createCompatibility(dto);

      res.status(201).json({
        success: true,
        data: compatibility,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /compatibility/:id
   */
  updateCompatibility = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = updateCompatibilitySchema.parse(req.body);
      const compatibility = await this.compatibilityService.updateCompatibility(
        req.params.id,
        dto
      );

      res.status(200).json({
        success: true,
        data: compatibility,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /compatibility/:id
   */
  deleteCompatibility = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.compatibilityService.deleteCompatibility(req.params.id);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /compatibility/products/search
   * Find compatible products for a vehicle
   */
  findCompatibleProducts = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const makeId = req.query.makeId as string | undefined;
      const modelId = req.query.modelId as string | undefined;
      const variantId = req.query.variantId as string | undefined;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;

      const compatibilities = await this.compatibilityService.findCompatibleProducts(
        makeId,
        modelId,
        variantId,
        year
      );

      res.status(200).json({
        success: true,
        data: compatibilities,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /compatibility/vehicles/:productId
   * Get compatible vehicles for a product
   */
  getCompatibleVehicles = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const compatibilities = await this.compatibilityService.getCompatibleVehicles(
        req.params.productId
      );

      res.status(200).json({
        success: true,
        data: compatibilities,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /compatibility/:id/verify
   */
  verifyCompatibility = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schema = z.object({
        verified: z.boolean().default(true),
      });

      const { verified } = schema.parse(req.body);
      const compatibility = await this.compatibilityService.verifyCompatibility(
        req.params.id,
        verified
      );

      res.status(200).json({
        success: true,
        data: compatibility,
      });
    } catch (error) {
      next(error);
    }
  };
}
