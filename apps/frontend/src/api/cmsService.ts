import apiClient from './apiClient';

// ============================================================================
// TYPES
// ============================================================================

export interface HeroFeature {
  icon: string;
  text: string;
}

export interface HeroSection {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  features: HeroFeature[];
  cta1Text: string;
  cta1Link: string;
  cta1Enabled: boolean;
  cta2Text: string;
  cta2Link: string;
  cta2Enabled: boolean;
  cta3Text: string;
  cta3Link: string;
  cta3Enabled: boolean;
  active: boolean;
  updatedAt: string;
}

export interface MarqueeMessage {
  id: string;
  message: string;
  order: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FooterContent {
  id: string;
  description: string;
  services: string[];
  socialLinks: Record<string, string>;
  certifications: string[];
  footerLinks: Record<string, string>;
  updatedAt: string;
}

export interface UpdateHeroData {
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  features?: HeroFeature[];
  cta1Text?: string;
  cta1Link?: string;
  cta1Enabled?: boolean;
  cta2Text?: string;
  cta2Link?: string;
  cta2Enabled?: boolean;
  cta3Text?: string;
  cta3Link?: string;
  cta3Enabled?: boolean;
  active?: boolean;
}

export interface CreateMarqueeMessageData {
  message: string;
  order?: number;
  active?: boolean;
}

export interface UpdateMarqueeMessageData {
  message?: string;
  order?: number;
  active?: boolean;
}

export interface UpdateFooterData {
  description?: string;
  services?: string[];
  socialLinks?: Record<string, string>;
  certifications?: string[];
  footerLinks?: Record<string, string>;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class CmsService {
  // ==========================================================================
  // HERO SECTION
  // ==========================================================================

  /**
   * Busca o conteúdo do Hero
   * Agora usa landing-page API
   */
  async getHero(): Promise<HeroSection> {
    const response = await apiClient.get<{
      success: boolean;
      data: { hero: HeroSection }
    }>('/landing-page/config');
    return response.data.data.hero;
  }

  /**
   * Atualiza o conteúdo do Hero
   * Agora usa landing-page API
   */
  async updateHero(data: UpdateHeroData): Promise<HeroSection> {
    const response = await apiClient.put<{
      success: boolean;
      data: { hero: HeroSection }
    }>('/landing-page/config', { hero: data });
    return response.data.data.hero;
  }

  /**
   * Reseta o Hero para valores padrão
   * NOTA: Não há endpoint específico, retorna hero atual
   */
  async resetHero(): Promise<HeroSection> {
    // Buscar config atual e retornar hero
    const response = await apiClient.get<{
      success: boolean;
      data: { hero: HeroSection }
    }>('/landing-page/config');
    return response.data.data.hero;
  }

  // ==========================================================================
  // MARQUEE MESSAGES
  // ==========================================================================

  /**
   * Busca todas as mensagens do marquee
   * Agora usa landing-page API
   */
  async getMarqueeMessages(activeOnly: boolean = false): Promise<MarqueeMessage[]> {
    const response = await apiClient.get<{
      success: boolean;
      data: { marquee: { messages: MarqueeMessage[] } }
    }>('/landing-page/config');

    const messages = response.data.data.marquee.messages || [];

    if (activeOnly) {
      return messages.filter(msg => msg.active);
    }

    return messages;
  }

  /**
   * Busca uma mensagem específica
   */
  async getMarqueeMessageById(id: string): Promise<MarqueeMessage> {
    const messages = await this.getMarqueeMessages(false);
    const message = messages.find(msg => msg.id === id);

    if (!message) {
      throw new Error('Mensagem não encontrada');
    }

    return message;
  }

  /**
   * Cria uma nova mensagem do marquee
   */
  async createMarqueeMessage(data: CreateMarqueeMessageData): Promise<MarqueeMessage> {
    // Buscar config atual
    const configResponse = await apiClient.get<{
      success: boolean;
      data: any
    }>('/landing-page/config');

    const currentConfig = configResponse.data.data;
    const currentMessages = currentConfig.marquee?.messages || [];

    // Criar nova mensagem
    const newMessage: MarqueeMessage = {
      id: crypto.randomUUID(),
      message: data.message,
      order: data.order ?? currentMessages.length,
      active: data.active ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Atualizar config com nova mensagem
    await apiClient.put<{ success: boolean; data: any }>(
      '/landing-page/config',
      {
        marquee: {
          ...currentConfig.marquee,
          messages: [...currentMessages, newMessage],
        },
      }
    );

    return newMessage;
  }

  /**
   * Atualiza uma mensagem do marquee
   */
  async updateMarqueeMessage(id: string, data: UpdateMarqueeMessageData): Promise<MarqueeMessage> {
    // Buscar config atual
    const configResponse = await apiClient.get<{
      success: boolean;
      data: any
    }>('/landing-page/config');

    const currentConfig = configResponse.data.data;
    const currentMessages = currentConfig.marquee?.messages || [];

    // Atualizar mensagem
    const updatedMessages = currentMessages.map((msg: MarqueeMessage) =>
      msg.id === id
        ? { ...msg, ...data, updatedAt: new Date().toISOString() }
        : msg
    );

    const updatedMessage = updatedMessages.find((msg: MarqueeMessage) => msg.id === id);

    if (!updatedMessage) {
      throw new Error('Mensagem não encontrada');
    }

    // Atualizar config
    await apiClient.put<{ success: boolean; data: any }>(
      '/landing-page/config',
      {
        marquee: {
          ...currentConfig.marquee,
          messages: updatedMessages,
        },
      }
    );

    return updatedMessage;
  }

  /**
   * Deleta uma mensagem do marquee
   */
  async deleteMarqueeMessage(id: string): Promise<void> {
    // Buscar config atual
    const configResponse = await apiClient.get<{
      success: boolean;
      data: any
    }>('/landing-page/config');

    const currentConfig = configResponse.data.data;
    const currentMessages = currentConfig.marquee?.messages || [];

    // Remover mensagem
    const updatedMessages = currentMessages.filter((msg: MarqueeMessage) => msg.id !== id);

    // Atualizar config
    await apiClient.put<{ success: boolean; data: any }>(
      '/landing-page/config',
      {
        marquee: {
          ...currentConfig.marquee,
          messages: updatedMessages,
        },
      }
    );
  }

  /**
   * Reordena as mensagens do marquee
   */
  async reorderMarqueeMessages(ids: string[]): Promise<void> {
    // Buscar config atual
    const configResponse = await apiClient.get<{
      success: boolean;
      data: any
    }>('/landing-page/config');

    const currentConfig = configResponse.data.data;
    const currentMessages = currentConfig.marquee?.messages || [];

    // Reordenar mensagens
    const reorderedMessages = ids.map((id, index) => {
      const msg = currentMessages.find((m: MarqueeMessage) => m.id === id);
      return msg ? { ...msg, order: index } : null;
    }).filter(Boolean);

    // Atualizar config
    await apiClient.put<{ success: boolean; data: any }>(
      '/landing-page/config',
      {
        marquee: {
          ...currentConfig.marquee,
          messages: reorderedMessages,
        },
      }
    );
  }

  // ==========================================================================
  // FOOTER CONTENT
  // ==========================================================================

  /**
   * Busca o conteúdo do Footer
   * Agora usa landing-page API
   */
  async getFooter(): Promise<FooterContent> {
    const response = await apiClient.get<{
      success: boolean;
      data: { footer: FooterContent }
    }>('/landing-page/config');
    return response.data.data.footer;
  }

  /**
   * Atualiza o conteúdo do Footer
   * Agora usa landing-page API
   */
  async updateFooter(data: UpdateFooterData): Promise<FooterContent> {
    const response = await apiClient.put<{
      success: boolean;
      data: { footer: FooterContent }
    }>('/landing-page/config', { footer: data });
    return response.data.data.footer;
  }

  /**
   * Reseta o Footer para valores padrão
   * NOTA: Não há endpoint específico, retorna footer atual
   */
  async resetFooter(): Promise<FooterContent> {
    // Buscar config atual e retornar footer
    const response = await apiClient.get<{
      success: boolean;
      data: { footer: FooterContent }
    }>('/landing-page/config');
    return response.data.data.footer;
  }
}

export default new CmsService();
