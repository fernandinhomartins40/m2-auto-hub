import { Request, Response, NextFunction } from 'express';
import { GuestOrdersService } from './guest-orders.service.js';
import { createGuestOrderSchema } from './dto/create-guest-order.dto.js';

export class GuestOrdersController {
  private guestOrdersService: GuestOrdersService;

  constructor() {
    this.guestOrdersService = new GuestOrdersService();
  }

  /**
   * POST /orders/guest
   * Create order without authentication (for checkout)
   */
  createGuestOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body
      const dto = createGuestOrderSchema.parse(req.body);

      // Create order
      const order = await this.guestOrdersService.createGuestOrder(dto);

      res.status(201).json({
        success: true,
        data: order,
        message: 'Order created successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}
