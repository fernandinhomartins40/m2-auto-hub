import { Request, Response, NextFunction } from 'express';
import { VehiclesService } from './vehicles.service.js';
import { createVehicleMakeSchema } from './dto/create-vehicle-make.dto.js';
import { updateVehicleMakeSchema } from './dto/update-vehicle-make.dto.js';
import { createVehicleModelSchema } from './dto/create-vehicle-model.dto.js';
import { updateVehicleModelSchema } from './dto/update-vehicle-model.dto.js';
import { createVehicleVariantSchema } from './dto/create-vehicle-variant.dto.js';
import { updateVehicleVariantSchema } from './dto/update-vehicle-variant.dto.js';

export class VehiclesController {
  private vehiclesService: VehiclesService;

  constructor() {
    this.vehiclesService = new VehiclesService();
  }

  // =========================================================================
  // VEHICLE MAKES
  // =========================================================================

  /**
   * GET /vehicles/makes
   */
  getMakes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const activeOnly = req.query.activeOnly === 'true';
      const makes = await this.vehiclesService.getMakes(activeOnly);

      res.status(200).json({
        success: true,
        data: makes,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /vehicles/makes/:id
   */
  getMakeById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const includeModels = req.query.includeModels === 'true';
      const make = await this.vehiclesService.getMakeById(req.params.id, includeModels);

      res.status(200).json({
        success: true,
        data: make,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /vehicles/makes
   */
  createMake = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = createVehicleMakeSchema.parse(req.body);
      const make = await this.vehiclesService.createMake(dto);

      res.status(201).json({
        success: true,
        data: make,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /vehicles/makes/:id
   */
  updateMake = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = updateVehicleMakeSchema.parse(req.body);
      const make = await this.vehiclesService.updateMake(req.params.id, dto);

      res.status(200).json({
        success: true,
        data: make,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /vehicles/makes/:id
   */
  deleteMake = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.vehiclesService.deleteMake(req.params.id);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  // =========================================================================
  // VEHICLE MODELS
  // =========================================================================

  /**
   * GET /vehicles/models
   */
  getModels = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const makeId = req.query.makeId as string | undefined;
      const activeOnly = req.query.activeOnly === 'true';
      const models = await this.vehiclesService.getModels(makeId, activeOnly);

      res.status(200).json({
        success: true,
        data: models,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /vehicles/models/:id
   */
  getModelById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const includeVariants = req.query.includeVariants === 'true';
      const model = await this.vehiclesService.getModelById(req.params.id, includeVariants);

      res.status(200).json({
        success: true,
        data: model,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /vehicles/models
   */
  createModel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = createVehicleModelSchema.parse(req.body);
      const model = await this.vehiclesService.createModel(dto);

      res.status(201).json({
        success: true,
        data: model,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /vehicles/models/:id
   */
  updateModel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = updateVehicleModelSchema.parse(req.body);
      const model = await this.vehiclesService.updateModel(req.params.id, dto);

      res.status(200).json({
        success: true,
        data: model,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /vehicles/models/:id
   */
  deleteModel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.vehiclesService.deleteModel(req.params.id);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  // =========================================================================
  // VEHICLE VARIANTS
  // =========================================================================

  /**
   * GET /vehicles/variants
   */
  getVariants = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const modelId = req.query.modelId as string | undefined;
      const activeOnly = req.query.activeOnly === 'true';
      const variants = await this.vehiclesService.getVariants(modelId, activeOnly);

      res.status(200).json({
        success: true,
        data: variants,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /vehicles/variants/:id
   */
  getVariantById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const variant = await this.vehiclesService.getVariantById(req.params.id);

      res.status(200).json({
        success: true,
        data: variant,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /vehicles/variants
   */
  createVariant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = createVehicleVariantSchema.parse(req.body);
      const variant = await this.vehiclesService.createVariant(dto);

      res.status(201).json({
        success: true,
        data: variant,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /vehicles/variants/:id
   */
  updateVariant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = updateVehicleVariantSchema.parse(req.body);
      const variant = await this.vehiclesService.updateVariant(req.params.id, dto);

      res.status(200).json({
        success: true,
        data: variant,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /vehicles/variants/:id
   */
  deleteVariant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.vehiclesService.deleteVariant(req.params.id);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  // =========================================================================
  // UTILITY ENDPOINTS
  // =========================================================================

  /**
   * GET /vehicles/hierarchy
   */
  getVehicleHierarchy = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const hierarchy = await this.vehiclesService.getVehicleHierarchy();

      res.status(200).json({
        success: true,
        data: hierarchy,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /vehicles/search
   */
  searchVehicles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query.q as string;

      if (!query || query.trim().length < 2) {
        res.status(400).json({
          success: false,
          error: 'Query must be at least 2 characters',
        });
        return;
      }

      const results = await this.vehiclesService.searchVehicles(query);

      res.status(200).json({
        success: true,
        data: results,
      });
    } catch (error) {
      next(error);
    }
  };
}
