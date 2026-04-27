import { Settings } from '@prisma/client';
import { prisma } from '@config/database.js';
import { UpdateSettingsDTO } from './dto/update-settings.dto.js';

export class SettingsService {
  private getDefaultPwaConfig(storeName = 'M2 Center Auto') {
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

    return prisma.settings.update({
      where: { id: settings.id },
      data,
    });
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
        pdfHeaderLogoUrl: null,
        pdfHeaderHtml:
          '<p><strong>M2 Center Auto</strong></p><p>contato@m2centerauto.com.br • WhatsApp: (11) 99999-9999</p>',
        pdfFooterLogoUrl: null,
        pdfFooterHtml: '<p>Obrigado pela preferência.</p>',
        ...this.getDefaultPwaConfig('M2 Center Auto'),
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
        ...this.getDefaultPwaConfig('M2 Center Auto'),
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
