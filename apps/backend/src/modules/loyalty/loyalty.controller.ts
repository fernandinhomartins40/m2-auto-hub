import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@shared/utils/error.util.js';
import { loyaltyService } from './loyalty.service.js';

export class LoyaltyController {
  getSettings = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await loyaltyService.getSettings();
      res.json(settings);
    } catch (error) {
      next(error);
    }
  };

  getCustomerStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.customerId) {
        throw ApiError.unauthorized('Cliente nao autenticado');
      }

      const stats = await loyaltyService.getCustomerStats(req.user.customerId);
      res.json(stats);
    } catch (error) {
      next(error);
    }
  };

  getCustomerTransactions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.customerId) {
        throw ApiError.unauthorized('Cliente nao autenticado');
      }

      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);
      const transactions = await loyaltyService.getTransactions(req.user.customerId, page, limit);
      res.json(transactions);
    } catch (error) {
      next(error);
    }
  };

  getCustomerRewards = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.customerId) {
        throw ApiError.unauthorized('Cliente nao autenticado');
      }

      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);
      const rewards = await loyaltyService.getCustomerRewards(req.user.customerId, page, limit);
      res.json(rewards);
    } catch (error) {
      next(error);
    }
  };

  redeemReward = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.customerId) {
        throw ApiError.unauthorized('Cliente nao autenticado');
      }

      const rewardId = String(req.body?.rewardId ?? '').trim();
      if (!rewardId) {
        throw ApiError.badRequest('rewardId e obrigatorio');
      }

      const redemption = await loyaltyService.redeemReward(req.user.customerId, rewardId);
      res.status(201).json(redemption);
    } catch (error) {
      next(error);
    }
  };

  getRedeemedRewards = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.customerId) {
        throw ApiError.unauthorized('Cliente nao autenticado');
      }

      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);
      const redemptions = await loyaltyService.getRedeemedRewards(req.user.customerId, page, limit);
      res.json(redemptions);
    } catch (error) {
      next(error);
    }
  };

  getAdminStats = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await loyaltyService.getAdminStats();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  };

  getAdminSettings = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await loyaltyService.getSettings();
      res.json(settings);
    } catch (error) {
      next(error);
    }
  };

  updateAdminSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await loyaltyService.updateSettings(req.body ?? {});
      res.json(settings);
    } catch (error) {
      next(error);
    }
  };

  getAdminRewards = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);
      const rewards = await loyaltyService.getAdminRewards(page, limit, {
        status: req.query.status as string | undefined,
        type: req.query.type as string | undefined,
        minLevel: req.query.minLevel as string | undefined,
      });
      res.json(rewards);
    } catch (error) {
      next(error);
    }
  };

  createReward = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reward = await loyaltyService.createReward(req.body);
      res.status(201).json(reward);
    } catch (error) {
      next(error);
    }
  };

  updateReward = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reward = await loyaltyService.updateReward(req.params.rewardId, req.body);
      res.json(reward);
    } catch (error) {
      next(error);
    }
  };

  deleteReward = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await loyaltyService.deleteReward(req.params.rewardId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  getCustomersWithPoints = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);
      const minPoints = req.query.minPoints !== undefined ? Number(req.query.minPoints) : undefined;
      const customers = await loyaltyService.getCustomersWithPoints(page, limit, {
        minPoints: Number.isFinite(minPoints as number) ? minPoints : undefined,
        level: req.query.level as string | undefined,
      });
      res.json(customers);
    } catch (error) {
      next(error);
    }
  };

  getAdminCustomerStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await loyaltyService.getCustomerStats(req.params.customerId);
      res.json(stats);
    } catch (error) {
      next(error);
    }
  };

  getAdminCustomerTransactions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);
      const transactions = await loyaltyService.getTransactions(req.params.customerId, page, limit);
      res.json(transactions);
    } catch (error) {
      next(error);
    }
  };

  adjustPoints = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const transaction = await loyaltyService.adjustPoints(req.body);
      res.status(201).json(transaction);
    } catch (error) {
      next(error);
    }
  };

  getAdminRedemptions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);
      const redemptions = await loyaltyService.getAdminRedemptions(page, limit, req.query.status as string | undefined);
      res.json(redemptions);
    } catch (error) {
      next(error);
    }
  };

  markRedemptionAsUsed = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const redemption = await loyaltyService.markRewardAsUsed(req.params.redemptionCode);
      res.json(redemption);
    } catch (error) {
      next(error);
    }
  };
}

export const loyaltyController = new LoyaltyController();
