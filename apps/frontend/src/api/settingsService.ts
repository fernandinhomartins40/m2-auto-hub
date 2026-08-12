import apiClient from './apiClient';

export interface StoreSettings {
  id: string;
  // Informações da Loja
  storeName: string;
  cnpj: string;
  phone: string;
  whatsapp?: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;

  // Configurações de Vendas
  defaultMargin: number;
  freeShippingMin: number;
  deliveryFee: number;
  deliveryDays: number;

  // Horários de Funcionamento
  businessHours: Record<string, string>;

  // Notificações
  notifyNewOrders: boolean;
  notifyLowStock: boolean;
  notifyWeeklyReports: boolean;

  // Integrações
  whatsappApiKey?: string | null;
  whatsappConnected: boolean;
  correiosApiKey?: string | null;
  correiosConnected: boolean;
  paymentGatewayKey?: string | null;
  paymentConnected: boolean;
  googleAnalyticsId?: string | null;
  analyticsConnected: boolean;

  // Consulta de placa. Os tokens nunca voltam do servidor: o backend informa
  // apenas se já estão configurados.
  plateLookupEnabled: boolean;
  plateLookupProvider: string;
  plateLookupBearerTokenSet?: boolean;
  plateLookupDeviceTokenSet?: boolean;
  pdfHeaderLogoUrl?: string | null;
  pdfHeaderHtml: string;
  pdfFooterLogoUrl?: string | null;
  pdfFooterHtml: string;
  pwaName: string;
  pwaShortName: string;
  pwaDescription: string;
  pwaThemeColor: string;
  pwaBackgroundColor: string;
  pwaDisplay: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  pwaIcon192Url?: string | null;
  pwaIcon512Url?: string | null;
  pwaDesktopIconUrl?: string | null;
  pwaAppleTouchIconUrl?: string | null;
  pwaMaskableIconUrl?: string | null;
  pwaAdminName: string;
  pwaAdminShortName: string;
  pwaAdminDescription: string;
  pwaAdminThemeColor: string;
  pwaAdminBackgroundColor: string;
  pwaAdminDisplay: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  pwaAdminIcon192Url?: string | null;
  pwaAdminIcon512Url?: string | null;
  pwaAdminDesktopIconUrl?: string | null;
  pwaAdminAppleTouchIconUrl?: string | null;
  pwaAdminMaskableIconUrl?: string | null;
  pwaMechanicName: string;
  pwaMechanicShortName: string;
  pwaMechanicDescription: string;
  pwaMechanicThemeColor: string;
  pwaMechanicBackgroundColor: string;
  pwaMechanicDisplay: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  pwaMechanicIcon192Url?: string | null;
  pwaMechanicIcon512Url?: string | null;
  pwaMechanicDesktopIconUrl?: string | null;
  pwaMechanicAppleTouchIconUrl?: string | null;
  pwaMechanicMaskableIconUrl?: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface UpdateSettingsData {
  storeName?: string;
  cnpj?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  defaultMargin?: number;
  freeShippingMin?: number;
  deliveryFee?: number;
  deliveryDays?: number;
  businessHours?: Record<string, string>;
  notifyNewOrders?: boolean;
  notifyLowStock?: boolean;
  notifyWeeklyReports?: boolean;
  whatsappApiKey?: string | null;
  whatsappConnected?: boolean;
  correiosApiKey?: string | null;
  correiosConnected?: boolean;
  paymentGatewayKey?: string | null;
  paymentConnected?: boolean;
  googleAnalyticsId?: string | null;
  analyticsConnected?: boolean;
  pdfHeaderLogoUrl?: string | null;
  pdfHeaderHtml?: string;
  pdfFooterLogoUrl?: string | null;
  pdfFooterHtml?: string;
  pwaName?: string;
  pwaShortName?: string;
  pwaDescription?: string;
  pwaThemeColor?: string;
  pwaBackgroundColor?: string;
  pwaDisplay?: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  pwaIcon192Url?: string | null;
  pwaIcon512Url?: string | null;
  pwaDesktopIconUrl?: string | null;
  pwaAppleTouchIconUrl?: string | null;
  pwaMaskableIconUrl?: string | null;
  pwaAdminName?: string;
  pwaAdminShortName?: string;
  pwaAdminDescription?: string;
  pwaAdminThemeColor?: string;
  pwaAdminBackgroundColor?: string;
  pwaAdminDisplay?: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  pwaAdminIcon192Url?: string | null;
  pwaAdminIcon512Url?: string | null;
  pwaAdminDesktopIconUrl?: string | null;
  pwaAdminAppleTouchIconUrl?: string | null;
  pwaAdminMaskableIconUrl?: string | null;
  pwaMechanicName?: string;
  pwaMechanicShortName?: string;
  pwaMechanicDescription?: string;
  pwaMechanicThemeColor?: string;
  pwaMechanicBackgroundColor?: string;
  pwaMechanicDisplay?: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  pwaMechanicIcon192Url?: string | null;
  pwaMechanicIcon512Url?: string | null;
  pwaMechanicDesktopIconUrl?: string | null;
  pwaMechanicAppleTouchIconUrl?: string | null;
  pwaMechanicMaskableIconUrl?: string | null;
}

class SettingsService {
  /**
   * Busca as configurações da loja (requer autenticação admin)
   */
  async getSettings(): Promise<StoreSettings> {
    const response = await apiClient.get<{ success: boolean; data: StoreSettings }>('/settings');
    return response.data.data;
  }

  /**
   * Busca configurações públicas (sem autenticação)
   * Usado para exibir informações gerais da loja
   */
  async getPublicSettings(): Promise<Partial<StoreSettings>> {
    const response = await apiClient.get<{ success: boolean; data: Partial<StoreSettings> }>('/settings/public');
    return response.data.data;
  }

  /**
   * Atualiza as configurações da loja (requer autenticação admin)
   */
  async updateSettings(data: UpdateSettingsData): Promise<StoreSettings> {
    const response = await apiClient.put<{ success: boolean; data: StoreSettings }>('/settings', data);
    return response.data.data;
  }

  /**
   * Reseta as configurações para os valores padrão (requer autenticação admin)
   */
  async resetSettings(): Promise<StoreSettings> {
    const response = await apiClient.post<{ success: boolean; data: StoreSettings }>('/settings/reset');
    return response.data.data;
  }

  /**
   * Upload de logos/ativos visuais para o branding do PDF
   */
  async uploadPdfAsset(file: File, slot: 'header' | 'footer'): Promise<{ url: string; slot: 'header' | 'footer' }> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('slot', slot);

    const response = await apiClient.post<{
      success: boolean;
      data: { url: string; slot: 'header' | 'footer' };
    }>('/settings/assets/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  }

  async uploadPwaAsset(
    file: File,
    slot: 'icon-192' | 'icon-512' | 'desktop-icon' | 'apple-touch-icon' | 'maskable-icon'
  ): Promise<{ url: string; slot: 'icon-192' | 'icon-512' | 'desktop-icon' | 'apple-touch-icon' | 'maskable-icon' }> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('slot', slot);

    const response = await apiClient.post<{
      success: boolean;
      data: {
        url: string;
        slot: 'icon-192' | 'icon-512' | 'desktop-icon' | 'apple-touch-icon' | 'maskable-icon';
      };
    }>('/settings/pwa-assets/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  }

  /**
   * Testa conexão com WhatsApp API
   */
  async testWhatsAppConnection(apiKey: string): Promise<{ connected: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; connected: boolean; message: string }>(
      '/settings/test-whatsapp',
      { apiKey }
    );
    return { connected: response.data.connected, message: response.data.message };
  }

  /**
   * Testa conexão com Correios API
   */
  async testCorreiosConnection(apiKey: string): Promise<{ connected: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; connected: boolean; message: string }>(
      '/settings/test-correios',
      { apiKey }
    );
    return { connected: response.data.connected, message: response.data.message };
  }

  /**
   * Testa conexão com Gateway de Pagamento
   */
  async testPaymentConnection(apiKey: string): Promise<{ connected: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; connected: boolean; message: string }>(
      '/settings/test-payment',
      { apiKey }
    );
    return { connected: response.data.connected, message: response.data.message };
  }

  /**
   * Testa os tokens de consulta de placa. Tokens em branco fazem o servidor
   * usar os que já estão salvos.
   */
  async testPlateLookup(params: {
    bearerToken?: string;
    deviceToken?: string;
    plate?: string;
  }): Promise<{
    connected: boolean;
    message: string;
    sample?: {
      brand: string | null;
      model: string | null;
      year: number | null;
      color: string | null;
    };
  }> {
    const response = await apiClient.post<{
      success: boolean;
      connected: boolean;
      message: string;
      sample?: { brand: string | null; model: string | null; year: number | null; color: string | null };
    }>('/settings/test-plate-lookup', params);

    return {
      connected: response.data.connected,
      message: response.data.message,
      sample: response.data.sample,
    };
  }
}

export default new SettingsService();
