import { Settings } from '@prisma/client';
import { prisma } from '@config/database.js';
import { UpdateSettingsDTO } from './dto/update-settings.dto.js';

/**
 * Serviço de gerenciamento de configurações do sistema
 */
export class SettingsService {
  /**
   * Busca as configurações do sistema
   * Cria configurações padrão se não existirem
   */
  async getSettings(): Promise<Settings> {
    // Buscar configuração existente
    let settings = await prisma.settings.findFirst();

    // Se não existir, criar com valores padrão
    if (!settings) {
      settings = await this.createDefaultSettings();
    }

    return settings;
  }

  /**
   * Busca configurações públicas (sem dados sensíveis)
   * Usado pelo frontend para informações gerais
   */
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
      whatsappConnected: settings.whatsappConnected,
      correiosConnected: settings.correiosConnected,
      paymentConnected: settings.paymentConnected,
    };
  }

  /**
   * Atualiza as configurações do sistema
   */
  async updateSettings(data: UpdateSettingsDTO): Promise<Settings> {
    // Buscar configuração existente
    let settings = await prisma.settings.findFirst();

    // Se não existir, criar primeiro
    if (!settings) {
      settings = await this.createDefaultSettings();
    }

    // Atualizar
    const updated = await prisma.settings.update({
      where: { id: settings.id },
      data,
    });

    return updated;
  }

  /**
   * Reseta as configurações para os valores padrão
   */
  async resetSettings(): Promise<Settings> {
    // Buscar configuração existente
    const settings = await prisma.settings.findFirst();

    if (!settings) {
      return await this.createDefaultSettings();
    }

    // Resetar para valores padrão
    const reset = await prisma.settings.update({
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
        deliveryFee: 15.90,
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
        pdfHeaderHtml: '<p><strong>M2 Center Auto</strong></p><p>contato@m2centerauto.com.br • WhatsApp: (11) 99999-9999</p>',
        pdfFooterLogoUrl: null,
        pdfFooterHtml: '<p>Obrigado pela preferência.</p>',
        whatsappConnected: false,
        correiosConnected: false,
        paymentConnected: false,
        analyticsConnected: false,
      } as any,
    });

    return reset;
  }

  /**
   * Cria configurações padrão
   */
  private async createDefaultSettings(): Promise<Settings> {
    const settings = await prisma.settings.create({
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
        deliveryFee: 15.90,
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
        pdfHeaderHtml: '<p><strong>M2 Center Auto</strong></p><p>contato@m2centerauto.com.br • WhatsApp: (11) 99999-9999</p>',
        pdfFooterLogoUrl: null,
        pdfFooterHtml: '<p>Obrigado pela preferência.</p>',
      } as any,
    });

    return settings;
  }

  /**
   * Valida conexão do WhatsApp
   */
  async testWhatsAppConnection(apiKey: string): Promise<boolean> {
    // TODO: Implementar validação real com API do WhatsApp
    // Por enquanto, apenas simula validação
    return apiKey.length > 10;
  }

  /**
   * Valida conexão dos Correios
   */
  async testCorreiosConnection(apiKey: string): Promise<boolean> {
    // TODO: Implementar validação real com API dos Correios
    // Por enquanto, apenas simula validação
    return apiKey.length > 10;
  }

  /**
   * Valida conexão do gateway de pagamento
   */
  async testPaymentConnection(apiKey: string): Promise<boolean> {
    // TODO: Implementar validação real com gateway
    // Por enquanto, apenas simula validação
    return apiKey.length > 10;
  }
}

export const settingsService = new SettingsService();
