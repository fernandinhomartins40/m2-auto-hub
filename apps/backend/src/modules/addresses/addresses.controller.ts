import { Request, Response, NextFunction } from 'express';
import { AddressesService } from './addresses.service.js';

export class AddressesController {
  private addressesService: AddressesService;

  constructor() {
    this.addressesService = new AddressesService();
  }

  /**
   * GET /addresses
   */
  getAddresses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const addresses = await this.addressesService.getAddresses(req.user.customerId);

      res.status(200).json({
        success: true,
        data: addresses,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /addresses/:id
   */
  getAddressById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const address = await this.addressesService.getAddressById(
        req.params.id,
        req.user.customerId
      );

      res.status(200).json({
        success: true,
        data: address,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /addresses
   */
  createAddress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const address = await this.addressesService.createAddress({
        ...req.body,
        customerId: req.user.customerId,
      });

      res.status(201).json({
        success: true,
        data: address,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /addresses/:id
   */
  updateAddress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const address = await this.addressesService.updateAddress(
        req.params.id,
        req.user.customerId,
        req.body
      );

      res.status(200).json({
        success: true,
        data: address,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /addresses/:id
   */
  deleteAddress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      await this.addressesService.deleteAddress(req.params.id, req.user.customerId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /addresses/:id/default
   */
  setDefaultAddress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const address = await this.addressesService.setDefaultAddress(
        req.params.id,
        req.user.customerId
      );

      res.status(200).json({
        success: true,
        data: address,
      });
    } catch (error) {
      next(error);
    }
  };
}
