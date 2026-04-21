import { Request, Response } from 'express';
import { SupportConfigService } from './support-config.service.js';

const supportConfigService = new SupportConfigService();

export class SupportConfigController {
  /**
   * GET /support/config - Configurações de suporte
   */
  getSupportConfig(req: Request, res: Response) {
    const config = supportConfigService.getSupportConfig();
    const isOnline = supportConfigService.isOnline();
    const nextAvailable = supportConfigService.getNextAvailableTime();

    res.json({
      success: true,
      data: {
        ...config,
        status: {
          isOnline,
          nextAvailable,
        },
      },
    });
  }
}
