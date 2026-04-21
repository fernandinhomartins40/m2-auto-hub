import { Request, Response } from 'express';
import { settingsService } from './settings.service.js';
import { updateSettingsSchema } from './dto/update-settings.dto.js';
import { ZodError } from 'zod';
import { processLandingPageImage } from '../../middleware/upload.middleware.js';

/**
 * Controller para gerenciamento de configurações do sistema
 */
export class SettingsController {
  /**
   * GET /settings
   * Busca as configurações do sistema (requer autenticação admin)
   */
  async getSettings(req: Request, res: Response): Promise<void> {
    try {
      const settings = await settingsService.getSettings();

      res.status(200).json({
        success: true,
        data: settings,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar configurações',
        details: error.message,
      });
    }
  }

  /**
   * GET /settings/public
   * Busca configurações públicas (sem autenticação)
   */
  async getPublicSettings(req: Request, res: Response): Promise<void> {
    try {
      const settings = await settingsService.getPublicSettings();

      res.status(200).json({
        success: true,
        data: settings,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar configurações públicas',
        details: error.message,
      });
    }
  }

  /**
   * PUT /settings
   * Atualiza as configurações (requer autenticação admin)
   */
  async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      // Validar dados com Zod
      const validatedData = updateSettingsSchema.parse(req.body);

      // Atualizar configurações
      const updated = await settingsService.updateSettings(validatedData);

      res.status(200).json({
        success: true,
        data: updated,
        message: 'Configurações atualizadas com sucesso',
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          details: error.errors,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Erro ao atualizar configurações',
        details: error.message,
      });
    }
  }

  /**
   * POST /settings/assets/upload
   * Upload de assets visuais do branding de PDF
   */
  async uploadPdfAsset(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'Imagem é obrigatória',
        });
        return;
      }

      const slot = req.body?.slot === 'footer' ? 'footer' : 'header';
      const imageUrl = await processLandingPageImage(req.file.path, `pdf-${slot}-logo`);

      res.status(200).json({
        success: true,
        data: {
          url: imageUrl,
          slot,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Erro ao fazer upload do asset do PDF',
        details: error.message,
      });
    }
  }

  /**
   * POST /settings/reset
   * Reseta configurações para valores padrão (requer autenticação admin)
   */
  async resetSettings(req: Request, res: Response): Promise<void> {
    try {
      const reset = await settingsService.resetSettings();

      res.status(200).json({
        success: true,
        data: reset,
        message: 'Configurações resetadas para valores padrão',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Erro ao resetar configurações',
        details: error.message,
      });
    }
  }

  /**
   * POST /settings/test-whatsapp
   * Testa conexão com WhatsApp API
   */
  async testWhatsApp(req: Request, res: Response): Promise<void> {
    try {
      const { apiKey } = req.body;

      if (!apiKey) {
        res.status(400).json({
          success: false,
          error: 'API Key do WhatsApp é obrigatória',
        });
        return;
      }

      const isValid = await settingsService.testWhatsAppConnection(apiKey);

      res.status(200).json({
        success: true,
        connected: isValid,
        message: isValid ? 'Conexão bem-sucedida' : 'Falha na conexão',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Erro ao testar conexão WhatsApp',
        details: error.message,
      });
    }
  }

  /**
   * POST /settings/test-correios
   * Testa conexão com Correios API
   */
  async testCorreios(req: Request, res: Response): Promise<void> {
    try {
      const { apiKey } = req.body;

      if (!apiKey) {
        res.status(400).json({
          success: false,
          error: 'API Key dos Correios é obrigatória',
        });
        return;
      }

      const isValid = await settingsService.testCorreiosConnection(apiKey);

      res.status(200).json({
        success: true,
        connected: isValid,
        message: isValid ? 'Conexão bem-sucedida' : 'Falha na conexão',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Erro ao testar conexão Correios',
        details: error.message,
      });
    }
  }

  /**
   * POST /settings/test-payment
   * Testa conexão com Gateway de Pagamento
   */
  async testPayment(req: Request, res: Response): Promise<void> {
    try {
      const { apiKey } = req.body;

      if (!apiKey) {
        res.status(400).json({
          success: false,
          error: 'API Key do Gateway é obrigatória',
        });
        return;
      }

      const isValid = await settingsService.testPaymentConnection(apiKey);

      res.status(200).json({
        success: true,
        connected: isValid,
        message: isValid ? 'Conexão bem-sucedida' : 'Falha na conexão',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Erro ao testar conexão Gateway',
        details: error.message,
      });
    }
  }
}

export const settingsController = new SettingsController();
