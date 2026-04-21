import { Request, Response, NextFunction } from 'express';
import { CustomerVehiclesService } from './customer-vehicles.service.js';
import { createVehicleSchema } from './dto/create-vehicle.dto.js';
import { updateVehicleSchema } from './dto/update-vehicle.dto.js';
import { z } from 'zod';

export class CustomerVehiclesController {
  private vehiclesService: CustomerVehiclesService;

  constructor() {
    this.vehiclesService = new CustomerVehiclesService();
  }

  /**
   * GET /customer-vehicles
   * Get all vehicles for authenticated customer
   */
  getVehicles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('[CustomerVehiclesController] getVehicles called');
      console.log('[CustomerVehiclesController] req.user:', req.user);
      console.log('[CustomerVehiclesController] req.cookies:', req.cookies);
      console.log('[CustomerVehiclesController] req.headers.authorization:', req.headers.authorization);

      if (!req.user || !req.user.customerId) {
        console.error('[CustomerVehiclesController] Invalid user context:', req.user);
        const error: any = new Error('User not authenticated or invalid token');
        error.statusCode = 401;
        throw error;
      }

      console.log('[CustomerVehiclesController] Fetching vehicles for customerId:', req.user.customerId);
      const vehicles = await this.vehiclesService.getVehicles(req.user.customerId);
      console.log('[CustomerVehiclesController] Found vehicles:', vehicles.length);

      res.status(200).json({
        success: true,
        data: vehicles,
      });
    } catch (error) {
      console.error('[CustomerVehiclesController] Error:', error);
      next(error);
    }
  };


  /**
   * GET /customer-vehicles/:id
   * Get vehicle by ID
   */
  getVehicleById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const vehicle = await this.vehiclesService.getVehicleById(
        req.params.id,
        req.user.customerId
      );

      res.status(200).json({
        success: true,
        data: vehicle,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /customer-vehicles/:id/revisions
   * Get vehicle with revisions history
   */
  getVehicleWithRevisions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const vehicle = await this.vehiclesService.getVehicleWithRevisions(
        req.params.id,
        req.user.customerId
      );

      res.status(200).json({
        success: true,
        data: vehicle,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /customer-vehicles
   * Create new vehicle
   */
  createVehicle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const dto = createVehicleSchema.parse(req.body);
      const vehicle = await this.vehiclesService.createVehicle(
        req.user.customerId,
        dto
      );

      res.status(201).json({
        success: true,
        data: vehicle,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /customer-vehicles/:id
   * Update vehicle
   */
  updateVehicle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const dto = updateVehicleSchema.parse(req.body);
      const vehicle = await this.vehiclesService.updateVehicle(
        req.params.id,
        req.user.customerId,
        dto
      );

      res.status(200).json({
        success: true,
        data: vehicle,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /customer-vehicles/:id/mileage
   * Update vehicle mileage
   */
  updateMileage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const mileageSchema = z.object({
        mileage: z.number().int().min(0),
      });

      const { mileage } = mileageSchema.parse(req.body);
      const vehicle = await this.vehiclesService.updateMileage(
        req.params.id,
        req.user.customerId,
        mileage
      );

      res.status(200).json({
        success: true,
        data: vehicle,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /customer-vehicles/:id
   * Delete vehicle
   */
  deleteVehicle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      await this.vehiclesService.deleteVehicle(req.params.id, req.user.customerId);

      res.status(200).json({
        success: true,
        message: 'Vehicle deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}
