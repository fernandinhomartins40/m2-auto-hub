import { Request, Response, NextFunction } from 'express';
import { serviceOrdersService } from './service-orders.service.js';
import {
  createServiceOrderSchema,
  updateServiceOrderSchema,
  queryServiceOrdersSchema,
  assignMechanicSchema,
} from './dto/service-order.dto.js';

export class ServiceOrdersController {
  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = queryServiceOrdersSchema.parse(req.query);
      const result = await serviceOrdersService.findAll(query);
      res.status(200).json({ success: true, data: result.data, meta: result.meta });
    } catch (error) {
      next(error);
    }
  };

  getStatistics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const mechanicId = req.query.mechanicId ? String(req.query.mechanicId) : undefined;
      const data = await serviceOrdersService.statistics(mechanicId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  getByMechanic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = queryServiceOrdersSchema.parse({ ...req.query, mechanicId: req.params.mechanicId });
      const result = await serviceOrdersService.findAll(query);
      res.status(200).json({ success: true, data: result.data, meta: result.meta });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await serviceOrdersService.findById(req.params.id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = createServiceOrderSchema.parse(req.body);
      const data = await serviceOrdersService.create(dto);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = updateServiceOrderSchema.parse(req.body);
      const data = await serviceOrdersService.update(req.params.id, dto);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  start = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await serviceOrdersService.start(req.params.id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  complete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await serviceOrdersService.complete(req.params.id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  cancel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await serviceOrdersService.cancel(req.params.id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  assignMechanic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { mechanicId } = assignMechanicSchema.parse(req.body);
      const data = await serviceOrdersService.assignMechanic(req.params.id, mechanicId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  unassignMechanic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await serviceOrdersService.unassignMechanic(req.params.id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await serviceOrdersService.remove(req.params.id);
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  };
}

export const serviceOrdersController = new ServiceOrdersController();
