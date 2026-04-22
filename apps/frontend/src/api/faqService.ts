import apiClient from './apiClient';

export interface FAQCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  items: FAQItem[];
}

export interface FAQItem {
  id: string;
  categoryId: string;
  question: string;
  answer: string;
  order: number;
  views: number;
  helpfulYes: number;
  helpfulNo: number;
  isActive: boolean;
  keywords?: string[];
  createdAt: string;
  updatedAt: string;
  category?: {
    id: string;
    name: string;
    icon?: string;
  };
}

export interface SupportConfig {
  contacts: {
    whatsapp: {
      number: string;
      message: string;
    };
    email: string;
    phone: string;
  };
  businessHours: {
    weekdays: {
      label: string;
      hours: string;
      start: string;
      end: string;
    };
    saturday: {
      label: string;
      hours: string;
      start: string;
      end: string;
    };
    sunday: {
      label: string;
      hours: string;
      start: null;
      end: null;
    };
  };
  sla: {
    responseTime: Record<string, string>;
    resolutionTime: Record<string, string>;
  };
  features: {
    attachments: boolean;
    maxAttachmentSize: number;
    allowedFileTypes: string[];
  };
  status: {
    isOnline: boolean;
    nextAvailable: string;
  };
}

export const faqService = {
  // Listar FAQ completo
  async getFAQCategories(): Promise<FAQCategory[]> {
    const response = await apiClient.get('/support/faq');
    return response.data.data;
  },

  // Buscar no FAQ
  async searchFAQ(query: string): Promise<FAQItem[]> {
    const response = await apiClient.get('/support/faq/search', {
      params: { q: query },
    });
    return response.data.data;
  },

  // Marcar como útil/não útil
  async markFAQHelpful(faqId: string, isHelpful: boolean): Promise<FAQItem> {
    const response = await apiClient.post(`/support/faq/${faqId}/helpful`, {
      isHelpful,
    });
    return response.data.data;
  },

  // Incrementar visualização
  async incrementFAQView(faqId: string): Promise<FAQItem> {
    const response = await apiClient.post(`/support/faq/${faqId}/view`);
    return response.data.data;
  },

  // Obter configurações
  async getSupportConfig(): Promise<SupportConfig> {
    const response = await apiClient.get('/support/config');
    return response.data.data;
  },
};
