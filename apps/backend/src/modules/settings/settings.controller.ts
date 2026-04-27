import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { processLandingPageImage, processPwaIcon } from '../../middleware/upload.middleware.js';
import { updateSettingsSchema } from './dto/update-settings.dto.js';
import { settingsService } from './settings.service.js';

export class SettingsController {
  private buildAbsoluteUrl(req: Request, value: string) {
    if (/^https?:\/\//i.test(value)) {
      return value;
    }

    return `${req.protocol}://${req.get('host')}${value}`;
  }

  private buildPwaProfile(req: Request, settings: any) {
    const app = req.query.app === 'admin' ? 'admin' : 'customer';
    const baseName = settings.pwaName?.trim() || settings.storeName || 'M2 Center Auto';
    const baseShortName = settings.pwaShortName?.trim() || baseName.slice(0, 12);

    if (app === 'admin') {
      return {
        id: '/pwa/admin',
        name: `${baseName} Painel`,
        shortName: `${baseShortName.slice(0, 8)} Painel`.trim(),
        description:
          'Acesse o painel do lojista, da oficina e da equipe com instalacao dedicada no celular.',
        startUrl: '/pwa-entry?app=admin',
        scope: '/',
      };
    }

    return {
      id: '/pwa/customer',
      name: `${baseName} Cliente`,
      shortName: `${baseShortName.slice(0, 8)} Cliente`.trim(),
      description:
        settings.pwaDescription?.trim() ||
        'Acesse sua area do cliente, acompanhe pedidos, revisoes e veiculos pelo celular.',
      startUrl: '/customer?source=pwa-customer',
      scope: '/',
    };
  }

  async getSettings(_req: Request, res: Response): Promise<void> {
    try {
      const settings = await settingsService.getSettings();
      res.status(200).json({ success: true, data: settings });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar configurações',
        details: error.message,
      });
    }
  }

  async getPublicSettings(_req: Request, res: Response): Promise<void> {
    try {
      const settings = await settingsService.getPublicSettings();
      res.status(200).json({ success: true, data: settings });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar configurações públicas',
        details: error.message,
      });
    }
  }

  async getPwaManifest(req: Request, res: Response): Promise<void> {
    try {
      const settings = await settingsService.getSettings();
      const profile = this.buildPwaProfile(req, settings);

      const icons = [
        settings.pwaDesktopIconUrl
          ? {
              src: this.buildAbsoluteUrl(req, settings.pwaDesktopIconUrl),
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            }
          : null,
        settings.pwaIcon192Url
          ? {
              src: this.buildAbsoluteUrl(req, settings.pwaIcon192Url),
              sizes: '192x192',
              type: 'image/png',
            }
          : null,
        settings.pwaIcon512Url
          ? {
              src: this.buildAbsoluteUrl(req, settings.pwaIcon512Url),
              sizes: '512x512',
              type: 'image/png',
            }
          : null,
        settings.pwaMaskableIconUrl
          ? {
              src: this.buildAbsoluteUrl(req, settings.pwaMaskableIconUrl),
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            }
          : null,
      ].filter(Boolean);

      res.type('application/manifest+json').status(200).json({
        id: profile.id,
        name: profile.name,
        short_name: profile.shortName,
        description: profile.description,
        start_url: profile.startUrl,
        scope: profile.scope,
        display: settings.pwaDisplay || 'standalone',
        background_color: settings.pwaBackgroundColor || '#0f172a',
        theme_color: settings.pwaThemeColor || '#0f172a',
        lang: 'pt-BR',
        orientation: 'portrait',
        icons,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Erro ao gerar manifesto do PWA',
        details: error.message,
      });
    }
  }

  async getAppleTouchIcon(_req: Request, res: Response): Promise<void> {
    try {
      const settings = await settingsService.getSettings();
      const iconUrl =
        settings.pwaAppleTouchIconUrl ||
        settings.pwaDesktopIconUrl ||
        settings.pwaIcon192Url ||
        settings.pwaIcon512Url ||
        settings.pwaMaskableIconUrl;

      if (!iconUrl) {
        res.status(404).end();
        return;
      }

      res.redirect(iconUrl);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar ícone Apple Touch',
        details: error.message,
      });
    }
  }

  async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = updateSettingsSchema.parse(req.body);
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

  async uploadPdfAsset(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: 'Imagem é obrigatória' });
        return;
      }

      const slot = req.body?.slot === 'footer' ? 'footer' : 'header';
      const imageUrl = await processLandingPageImage(req.file.path, `pdf-${slot}-logo`);

      res.status(200).json({
        success: true,
        data: { url: imageUrl, slot },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Erro ao fazer upload do asset do PDF',
        details: error.message,
      });
    }
  }

  async uploadPwaAsset(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: 'Imagem é obrigatória' });
        return;
      }

      const slot = req.body?.slot;
      const validSlots = ['icon-192', 'icon-512', 'desktop-icon', 'apple-touch-icon', 'maskable-icon'] as const;

      if (!validSlots.includes(slot)) {
        res.status(400).json({ success: false, error: 'Slot de ícone inválido' });
        return;
      }

      const imageUrl = await processPwaIcon(req.file.path, slot);

      res.status(200).json({
        success: true,
        data: { url: imageUrl, slot },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Erro ao fazer upload do ícone do PWA',
        details: error.message,
      });
    }
  }

  async resetSettings(_req: Request, res: Response): Promise<void> {
    try {
      const reset = await settingsService.resetSettings();

      res.status(200).json({
        success: true,
        data: reset,
        message: 'Configurações resetadas para os valores padrão',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Erro ao resetar configurações',
        details: error.message,
      });
    }
  }

  async testWhatsApp(req: Request, res: Response): Promise<void> {
    try {
      const { apiKey } = req.body;

      if (!apiKey) {
        res.status(400).json({ success: false, error: 'API Key do WhatsApp é obrigatória' });
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

  async testCorreios(req: Request, res: Response): Promise<void> {
    try {
      const { apiKey } = req.body;

      if (!apiKey) {
        res.status(400).json({ success: false, error: 'API Key dos Correios é obrigatória' });
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

  async testPayment(req: Request, res: Response): Promise<void> {
    try {
      const { apiKey } = req.body;

      if (!apiKey) {
        res.status(400).json({ success: false, error: 'API Key do gateway é obrigatória' });
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
        error: 'Erro ao testar conexão do gateway',
        details: error.message,
      });
    }
  }
}

export const settingsController = new SettingsController();
