import { Request, Response, NextFunction } from 'express';
import { OrdersService } from './orders.service.js';
import { createOrderSchema } from './dto/create-order.dto.js';
import { updateOrderSchema } from './dto/update-order.dto.js';
import { OrderStatus } from '@prisma/client';
import notificationsService from '../notifications/notifications.service.js';
import { prisma } from '@config/database.js';

export class OrdersController {
  private ordersService: OrdersService;

  constructor() {
    this.ordersService = new OrdersService();
  }

  /**
   * POST /orders
   * Create new order
   */
  createOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const dto = createOrderSchema.parse(req.body);
      const order = await this.ordersService.createOrder(req.user.customerId, dto);

      // Notify admins about new order
      try {
        // Get customer name from database
        const customer = await prisma.customer.findUnique({
          where: { id: req.user.customerId },
          select: { name: true },
        });
        const customerName = customer?.name || 'Cliente';
        await notificationsService.notifyNewOrder(order.id, customerName);
      } catch (error) {
        console.error('Failed to send order notification:', error);
        // Don't fail the order creation if notification fails
      }

      res.status(201).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /orders
   * Get orders for customer with pagination and filters
   */
  getOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const filters: any = {};
      if (req.query.status) {
        filters.status = req.query.status as OrderStatus;
      }
      if (req.query.startDate) {
        filters.startDate = new Date(req.query.startDate as string);
      }
      if (req.query.endDate) {
        filters.endDate = new Date(req.query.endDate as string);
      }

      const result = await this.ordersService.getOrders(
        req.user.customerId,
        page,
        limit,
        filters
      );

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /orders/:id
   * Get order by ID
   */
  getOrderById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const order = await this.ordersService.getOrderById(
        req.params.id,
        req.user.customerId
      );

      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /orders/:id
   * Update order
   */
  updateOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const dto = updateOrderSchema.parse(req.body);
      const order = await this.ordersService.updateOrder(
        req.params.id,
        req.user.customerId,
        dto
      );

      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /orders/:id/cancel
   * Cancel order
   */
  cancelOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const order = await this.ordersService.cancelOrder(
        req.params.id,
        req.user.customerId
      );

      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /orders/stats
   * Get order statistics
   */
  getOrderStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const stats = await this.ordersService.getOrderStats(req.user.customerId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };
}
