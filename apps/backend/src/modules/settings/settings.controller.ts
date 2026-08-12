import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { processLandingPageImage, processPwaIcon } from '../../middleware/upload.middleware.js';
import { updateSettingsSchema } from './dto/update-settings.dto.js';
import { settingsService } from './settings.service.js';
import { CryptoUtil } from '@shared/utils/crypto.util.js';
import plateLookupService from '@shared/services/plate-lookup.service.js';

export class SettingsController {
  private buildAbsoluteUrl(req: Request, value: string) {
    if (/^https?:\/\//i.test(value)) {
      return value;
    }

    return `${req.protocol}://${req.get('host')}${value}`;
  }

  private getPwaApp(req: Request): 'customer' | 'admin' | 'mechanic' {
    const app = String(req.query.app || 'customer');
    if (app === 'admin' || app === 'mechanic') {
      return app;
    }

    return 'customer';
  }

  private buildPwaProfile(req: Request, settings: any) {
    const app = this.getPwaApp(req);
    const baseName = settings.storeName || 'M2 Center Auto';

    if (app === 'admin') {
      return {
        id: '/pwa/admin',
        name: settings.pwaAdminName?.trim() || `${baseName} Painel`,
        shortName: settings.pwaAdminShortName?.trim() || `${baseName.slice(0, 8)} Painel`.trim(),
        description:
          settings.pwaAdminDescription?.trim() ||
          'Acesse o painel do lojista para vendas, operacao e gestao da loja.',
        startUrl: '/store-panel?source=pwa-admin',
        // O que separa as instalações é o `id` distinto (+ start_url distinto).
        // Mantemos scope '/' para que o botão instalar (na tela /admin-login,
        // fora de /store-panel) consiga disparar a instalação — um scope
        // restrito bloquearia o install fora dele. O manifest admin é servido
        // desde o HTML nas rotas de admin (ver index.html), garantindo que o
        // navegador instale o app do painel, não o do cliente.
        scope: '/',
        display: settings.pwaAdminDisplay || 'standalone',
        backgroundColor: settings.pwaAdminBackgroundColor || '#0f172a',
        themeColor: settings.pwaAdminThemeColor || '#0f172a',
        icons: {
          icon192: settings.pwaAdminIcon192Url,
          icon512: settings.pwaAdminIcon512Url,
          desktop: settings.pwaAdminDesktopIconUrl,
          apple: settings.pwaAdminAppleTouchIconUrl,
          maskable: settings.pwaAdminMaskableIconUrl,
        },
      };
    }

    if (app === 'mechanic') {
      return {
        id: '/pwa/mechanic',
        name: settings.pwaMechanicName?.trim() || `${baseName} Mecanico`,
        shortName: settings.pwaMechanicShortName?.trim() || `${baseName.slice(0, 8)} Oficina`.trim(),
        description:
          settings.pwaMechanicDescription?.trim() ||
          'Acompanhe revisoes, checklist e atendimento da oficina em um app dedicado.',
        startUrl: '/mechanic-panel?source=pwa-mechanic',
        // scope '/' + id/start_url distintos (ver comentário no perfil admin).
        scope: '/',
        display: settings.pwaMechanicDisplay || 'standalone',
        backgroundColor: settings.pwaMechanicBackgroundColor || '#0f172a',
        themeColor: settings.pwaMechanicThemeColor || '#0f172a',
        icons: {
          icon192: settings.pwaMechanicIcon192Url,
          icon512: settings.pwaMechanicIcon512Url,
          desktop: settings.pwaMechanicDesktopIconUrl,
          apple: settings.pwaMechanicAppleTouchIconUrl,
          maskable: settings.pwaMechanicMaskableIconUrl,
        },
      };
    }

    return {
      id: '/pwa/customer',
      name: settings.pwaName?.trim() || `${baseName} Cliente`,
      shortName: settings.pwaShortName?.trim() || `${baseName.slice(0, 8)} Cliente`.trim(),
      description:
        settings.pwaDescription?.trim() ||
        'Acesse sua area do cliente, acompanhe pedidos, revisoes e veiculos pelo celular.',
      startUrl: '/customer?source=pwa-customer',
      // scope '/' + id/start_url distintos (ver comentário no perfil admin).
      scope: '/',
      display: settings.pwaDisplay || 'standalone',
      backgroundColor: settings.pwaBackgroundColor || '#0f172a',
      themeColor: settings.pwaThemeColor || '#0f172a',
      icons: {
        icon192: settings.pwaIcon192Url,
        icon512: settings.pwaIcon512Url,
        desktop: settings.pwaDesktopIconUrl,
        apple: settings.pwaAppleTouchIconUrl,
        maskable: settings.pwaMaskableIconUrl,
      },
    };
  }

  async getSettings(_req: Request, res: Response): Promise<void> {
    try {
      const settings = await settingsService.getSettings();
      res.status(200).json({ success: true, data: settingsService.maskSecrets(settings) });
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
        profile.icons.desktop
          ? {
              src: this.buildAbsoluteUrl(req, profile.icons.desktop),
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            }
          : null,
        profile.icons.icon192
          ? {
              src: this.buildAbsoluteUrl(req, profile.icons.icon192),
              sizes: '192x192',
              type: 'image/png',
            }
          : null,
        profile.icons.icon512
          ? {
              src: this.buildAbsoluteUrl(req, profile.icons.icon512),
              sizes: '512x512',
              type: 'image/png',
            }
          : null,
        profile.icons.maskable
          ? {
              src: this.buildAbsoluteUrl(req, profile.icons.maskable),
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
        display: profile.display,
        background_color: profile.backgroundColor,
        theme_color: profile.themeColor,
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

  async getAppleTouchIcon(req: Request, res: Response): Promise<void> {
    try {
      const settings = await settingsService.getSettings();
      const profile = this.buildPwaProfile(req, settings);
      const iconUrl =
        profile.icons.apple ||
        profile.icons.desktop ||
        profile.icons.icon192 ||
        profile.icons.icon512 ||
        profile.icons.maskable;

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
        data: settingsService.maskSecrets(updated),
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
        data: settingsService.maskSecrets(reset),
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

  /**
   * Testa os tokens de consulta de placa. Aceita os tokens digitados no
   * formulario; se vierem vazios, usa os que ja estao salvos.
   */
  async testPlateLookup(req: Request, res: Response): Promise<void> {
    try {
      const { bearerToken, deviceToken, plate } = req.body ?? {};

      let effectiveBearer = typeof bearerToken === 'string' ? bearerToken.trim() : '';
      let effectiveDevice = typeof deviceToken === 'string' ? deviceToken.trim() : '';

      if (!effectiveBearer || !effectiveDevice) {
        const settings = await settingsService.getSettings();
        effectiveBearer =
          effectiveBearer || CryptoUtil.decrypt(settings.plateLookupBearerToken) || '';
        effectiveDevice =
          effectiveDevice || CryptoUtil.decrypt(settings.plateLookupDeviceToken) || '';
      }

      if (!effectiveBearer || !effectiveDevice) {
        res.status(400).json({
          success: false,
          error: 'Informe o Bearer Token e o Device Token para testar.',
        });
        return;
      }

      const result = await plateLookupService.testCredentials({
        bearerToken: effectiveBearer,
        deviceToken: effectiveDevice,
        plate: typeof plate === 'string' ? plate : undefined,
      });

      res.status(200).json({
        success: true,
        connected: result.success,
        message: result.message,
        sample: result.sample,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Erro ao testar a consulta de placa',
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
