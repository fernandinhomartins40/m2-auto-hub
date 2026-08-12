import { Settings } from '@prisma/client';
import { prisma } from '@config/database.js';
import { CryptoUtil } from '@shared/utils/crypto.util.js';
import { UpdateSettingsDTO } from './dto/update-settings.dto.js';

export class SettingsService {
  private getDefaultCustomerPwaConfig(storeName = 'M2 Center Auto') {
    return {
      pwaName: storeName,
      pwaShortName: storeName.slice(0, 12),
      pwaDescription: 'Acesse a loja, acompanhe pedidos e use o app no celular.',
      pwaThemeColor: '#0f172a',
      pwaBackgroundColor: '#0f172a',
      pwaDisplay: 'standalone',
      pwaIcon192Url: null,
      pwaIcon512Url: null,
      pwaDesktopIconUrl: null,
      pwaAppleTouchIconUrl: null,
      pwaMaskableIconUrl: null,
    } as const;
  }

  private getDefaultAdminPwaConfig(storeName = 'M2 Center Auto') {
    const shortName = storeName.slice(0, 8).trim() || 'M2';
    return {
      pwaAdminName: `${storeName} Painel`,
      pwaAdminShortName: `${shortName} Painel`,
      pwaAdminDescription: 'Painel do lojista para vendas, operacao, revisoes e gestao da loja.',
      pwaAdminThemeColor: '#0f172a',
      pwaAdminBackgroundColor: '#0f172a',
      pwaAdminDisplay: 'standalone',
      pwaAdminIcon192Url: null,
      pwaAdminIcon512Url: null,
      pwaAdminDesktopIconUrl: null,
      pwaAdminAppleTouchIconUrl: null,
      pwaAdminMaskableIconUrl: null,
    } as const;
  }

  private getDefaultMechanicPwaConfig(storeName = 'M2 Center Auto') {
    const shortName = storeName.slice(0, 8).trim() || 'M2';
    return {
      pwaMechanicName: `${storeName} Mecanico`,
      pwaMechanicShortName: `${shortName} Oficina`,
      pwaMechanicDescription: 'App da oficina para mecanicos acompanharem revisoes, atendimentos e checklist.',
      pwaMechanicThemeColor: '#0f172a',
      pwaMechanicBackgroundColor: '#0f172a',
      pwaMechanicDisplay: 'standalone',
      pwaMechanicIcon192Url: null,
      pwaMechanicIcon512Url: null,
      pwaMechanicDesktopIconUrl: null,
      pwaMechanicAppleTouchIconUrl: null,
      pwaMechanicMaskableIconUrl: null,
    } as const;
  }

  async getSettings(): Promise<Settings> {
    let settings = await prisma.settings.findFirst();

    if (!settings) {
      settings = await this.createDefaultSettings();
    }

    return settings;
  }

  async getPublicSettings(): Promise<Partial<Settings>> {
    const settings = await this.getSettings();

    return {
      id: settings.id,
      storeName: settings.storeName,
      phone: settings.phone,
      whatsapp: settings.whatsapp,
      email: settings.email,
      address: settings.address,
      city: settings.city,
      state: settings.state,
      zipCode: settings.zipCode,
      businessHours: settings.businessHours,
      freeShippingMin: settings.freeShippingMin,
      deliveryFee: settings.deliveryFee,
      deliveryDays: settings.deliveryDays,
      pwaName: settings.pwaName,
      pwaShortName: settings.pwaShortName,
      pwaDescription: settings.pwaDescription,
      pwaThemeColor: settings.pwaThemeColor,
      pwaBackgroundColor: settings.pwaBackgroundColor,
      pwaDisplay: settings.pwaDisplay,
      pwaIcon192Url: settings.pwaIcon192Url,
      pwaIcon512Url: settings.pwaIcon512Url,
      pwaDesktopIconUrl: settings.pwaDesktopIconUrl,
      pwaAppleTouchIconUrl: settings.pwaAppleTouchIconUrl,
      pwaMaskableIconUrl: settings.pwaMaskableIconUrl,
      pwaAdminName: settings.pwaAdminName,
      pwaAdminShortName: settings.pwaAdminShortName,
      pwaAdminDescription: settings.pwaAdminDescription,
      pwaAdminThemeColor: settings.pwaAdminThemeColor,
      pwaAdminBackgroundColor: settings.pwaAdminBackgroundColor,
      pwaAdminDisplay: settings.pwaAdminDisplay,
      pwaAdminIcon192Url: settings.pwaAdminIcon192Url,
      pwaAdminIcon512Url: settings.pwaAdminIcon512Url,
      pwaAdminDesktopIconUrl: settings.pwaAdminDesktopIconUrl,
      pwaAdminAppleTouchIconUrl: settings.pwaAdminAppleTouchIconUrl,
      pwaAdminMaskableIconUrl: settings.pwaAdminMaskableIconUrl,
      pwaMechanicName: settings.pwaMechanicName,
      pwaMechanicShortName: settings.pwaMechanicShortName,
      pwaMechanicDescription: settings.pwaMechanicDescription,
      pwaMechanicThemeColor: settings.pwaMechanicThemeColor,
      pwaMechanicBackgroundColor: settings.pwaMechanicBackgroundColor,
      pwaMechanicDisplay: settings.pwaMechanicDisplay,
      pwaMechanicIcon192Url: settings.pwaMechanicIcon192Url,
      pwaMechanicIcon512Url: settings.pwaMechanicIcon512Url,
      pwaMechanicDesktopIconUrl: settings.pwaMechanicDesktopIconUrl,
      pwaMechanicAppleTouchIconUrl: settings.pwaMechanicAppleTouchIconUrl,
      pwaMechanicMaskableIconUrl: settings.pwaMechanicMaskableIconUrl,
      whatsappConnected: settings.whatsappConnected,
      correiosConnected: settings.correiosConnected,
      paymentConnected: settings.paymentConnected,
    };
  }

  async updateSettings(data: UpdateSettingsDTO): Promise<Settings> {
    let settings = await prisma.settings.findFirst();

    if (!settings) {
      settings = await this.createDefaultSettings();
    }

    const { plateLookupBearerToken, plateLookupDeviceToken, ...rest } = data;

    const updateData: Record<string, unknown> = { ...rest };

    // Tokens de placa sao guardados criptografados. String vazia significa
    // "limpar"; campo ausente significa "manter o token atual", para que o
    // painel possa salvar as demais configuracoes sem reenviar o segredo.
    if (plateLookupBearerToken !== undefined) {
      updateData.plateLookupBearerToken = plateLookupBearerToken
        ? CryptoUtil.encrypt(plateLookupBearerToken)
        : null;
    }

    if (plateLookupDeviceToken !== undefined) {
      updateData.plateLookupDeviceToken = plateLookupDeviceToken
        ? CryptoUtil.encrypt(plateLookupDeviceToken)
        : null;
    }

    return prisma.settings.update({
      where: { id: settings.id },
      data: updateData,
    });
  }

  /**
   * Remove os tokens da resposta, devolvendo apenas se estao configurados.
   * O segredo nunca sai do servidor depois de salvo.
   */
  maskSecrets(settings: Settings) {
    const { plateLookupBearerToken, plateLookupDeviceToken, ...safe } = settings;

    return {
      ...safe,
      plateLookupBearerTokenSet: Boolean(plateLookupBearerToken),
      plateLookupDeviceTokenSet: Boolean(plateLookupDeviceToken),
    };
  }

  async resetSettings(): Promise<Settings> {
    const settings = await prisma.settings.findFirst();

    if (!settings) {
      return this.createDefaultSettings();
    }

    return prisma.settings.update({
      where: { id: settings.id },
      data: {
        storeName: 'M2 Center Auto',
        cnpj: '',
        phone: '',
        whatsapp: '5511999999999',
        email: 'contato@m2centerauto.com.br',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        defaultMargin: 35,
        freeShippingMin: 150,
        deliveryFee: 15.9,
        deliveryDays: 3,
        businessHours: {
          monday: '08:00-18:00',
          tuesday: '08:00-18:00',
          wednesday: '08:00-18:00',
          thursday: '08:00-18:00',
          friday: '08:00-18:00',
          saturday: '08:00-12:00',
          sunday: 'Fechado',
        },
        notifyNewOrders: true,
        notifyLowStock: true,
        notifyWeeklyReports: false,
        whatsappApiKey: null,
        correiosApiKey: null,
        paymentGatewayKey: null,
        googleAnalyticsId: null,
        plateLookupEnabled: false,
        plateLookupBearerToken: null,
        plateLookupDeviceToken: null,
        pdfHeaderLogoUrl: null,
        pdfHeaderHtml:
          '<p><strong>M2 Center Auto</strong></p><p>contato@m2centerauto.com.br • WhatsApp: (11) 99999-9999</p>',
        pdfFooterLogoUrl: null,
        pdfFooterHtml: '<p>Obrigado pela preferência.</p>',
        ...this.getDefaultCustomerPwaConfig('M2 Center Auto'),
        ...this.getDefaultAdminPwaConfig('M2 Center Auto'),
        ...this.getDefaultMechanicPwaConfig('M2 Center Auto'),
        whatsappConnected: false,
        correiosConnected: false,
        paymentConnected: false,
        analyticsConnected: false,
      } as any,
    });
  }

  private async createDefaultSettings(): Promise<Settings> {
    return prisma.settings.create({
      data: {
        storeName: 'M2 Center Auto',
        cnpj: '',
        phone: '',
        whatsapp: '5511999999999',
        email: 'contato@m2centerauto.com.br',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        defaultMargin: 35,
        freeShippingMin: 150,
        deliveryFee: 15.9,
        deliveryDays: 3,
        businessHours: {
          monday: '08:00-18:00',
          tuesday: '08:00-18:00',
          wednesday: '08:00-18:00',
          thursday: '08:00-18:00',
          friday: '08:00-18:00',
          saturday: '08:00-12:00',
          sunday: 'Fechado',
        },
        notifyNewOrders: true,
        notifyLowStock: true,
        notifyWeeklyReports: false,
        pdfHeaderLogoUrl: null,
        pdfHeaderHtml:
          '<p><strong>M2 Center Auto</strong></p><p>contato@m2centerauto.com.br • WhatsApp: (11) 99999-9999</p>',
        pdfFooterLogoUrl: null,
        pdfFooterHtml: '<p>Obrigado pela preferência.</p>',
        ...this.getDefaultCustomerPwaConfig('M2 Center Auto'),
        ...this.getDefaultAdminPwaConfig('M2 Center Auto'),
        ...this.getDefaultMechanicPwaConfig('M2 Center Auto'),
      } as any,
    });
  }

  async testWhatsAppConnection(apiKey: string): Promise<boolean> {
    return apiKey.length > 10;
  }

  async testCorreiosConnection(apiKey: string): Promise<boolean> {
    return apiKey.length > 10;
  }

  async testPaymentConnection(apiKey: string): Promise<boolean> {
    return apiKey.length > 10;
  }
}

export const settingsService = new SettingsService();
