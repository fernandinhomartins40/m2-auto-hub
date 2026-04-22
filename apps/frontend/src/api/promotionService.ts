// src/api/promotionService.ts
import apiClient from './apiClient';
import {
  AdvancedPromotion,
  PromotionApplicationResult,
  PromotionContext,
  PromotionFilter,
  PromotionStats,
  PromotionTemplate,
  PromotionType,
  CustomerSegment
} from '@/types/promotions';

// Interface legada mantida para compatibilidade
export interface Promotion {
  id: string;
  name: string;
  description: string;
  type: 'PERCENTAGE' | 'FIXED' | 'BUY_ONE_GET_ONE';
  value: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  targetProducts: string;
  minValue?: number;
  usageLimit?: number;
  usedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PromotionListResponse {
  promotions: AdvancedPromotion[];
  totalCount: number;
  page: number;
  limit: number;
}

export interface PromotionCreateRequest {
  name: string;
  description: string;
  type: PromotionType;
  rewards: AdvancedPromotion['rewards'];
  schedule: AdvancedPromotion['schedule'];
  customerSegments: CustomerSegment[];
  rules: AdvancedPromotion['rules'];
  targetProductIds?: string[];
  targetCategories?: string[];
  code?: string;
  autoApply: boolean;
  canCombineWithOthers: boolean;
  priority: number;
  usageLimit?: number;
  usageLimitPerCustomer?: number;
}

class PromotionService {
  // Métodos básicos
  async getActivePromotions(): Promise<AdvancedPromotion[]> {
    const response = await apiClient.get<AdvancedPromotion[]>('/promotions/active');
    return response.data;
  }

  async getPromotions(filter?: PromotionFilter & {
    page?: number;
    limit?: number;
    active?: boolean;
  }): Promise<PromotionListResponse> {
    const response = await apiClient.get<{ success: boolean; data: AdvancedPromotion[]; meta: any }>('/promotions', { params: filter });
    // Backend retorna { success, data: [...], meta: {...} }
    return {
      promotions: response.data.data,
      totalCount: response.data.meta?.totalCount || 0,
      page: response.data.meta?.page || 1,
      limit: response.data.meta?.limit || 20
    };
  }

  async getPromotionById(id: string): Promise<AdvancedPromotion> {
    const response = await apiClient.get<{ success: boolean; data: AdvancedPromotion }>(`/promotions/${id}`);
    return response.data.data;
  }

  async createPromotion(promotion: PromotionCreateRequest): Promise<AdvancedPromotion> {
    const response = await apiClient.post<{ success: boolean; data: AdvancedPromotion }>('/promotions', promotion);
    return response.data.data;
  }

  async updatePromotion(id: string, promotion: Partial<AdvancedPromotion>): Promise<AdvancedPromotion> {
    const response = await apiClient.put<{ success: boolean; data: AdvancedPromotion }>(`/promotions/${id}`, promotion);
    return response.data.data;
  }

  async deletePromotion(id: string): Promise<void> {
    await apiClient.delete(`/promotions/${id}`);
  }

  async activatePromotion(id: string): Promise<AdvancedPromotion> {
    const response = await apiClient.post<{ success: boolean; data: AdvancedPromotion }>(`/promotions/${id}/activate`, {});
    return response.data.data;
  }

  async deactivatePromotion(id: string): Promise<AdvancedPromotion> {
    const response = await apiClient.post<{ success: boolean; data: AdvancedPromotion }>(`/promotions/${id}/deactivate`, {});
    return response.data.data;
  }

  // Métodos avançados para aplicação de promoções
  async evaluatePromotions(
    context: PromotionContext,
    promotionIds?: string[]
  ): Promise<PromotionApplicationResult[]> {
    const response = await apiClient.post<PromotionApplicationResult[]>('/promotions/evaluate', {
      context,
      promotionIds
    });
    return response.data;
  }

  async getApplicablePromotions(context: PromotionContext): Promise<AdvancedPromotion[]> {
    const response = await apiClient.post<AdvancedPromotion[]>('/promotions/applicable', context);
    return response.data;
  }

  async calculateBestCombination(
    context: PromotionContext
  ): Promise<PromotionApplicationResult[]> {
    const response = await apiClient.post<PromotionApplicationResult[]>('/promotions/best-combination', context);
    return response.data;
  }

  async validatePromotion(
    promotionId: string,
    context: PromotionContext
  ): Promise<{ valid: boolean; reasons: string[] }> {
    const response = await apiClient.post<{ valid: boolean; reasons: string[] }>(`/promotions/${promotionId}/validate`, context);
    return response.data;
  }

  async applyPromotionCode(
    code: string,
    context: PromotionContext
  ): Promise<PromotionApplicationResult> {
    const response = await apiClient.post<PromotionApplicationResult>('/promotions/apply-code', {
      code,
      context
    });
    return response.data;
  }

  // Analytics e relatórios
  async getPromotionStats(
    promotionId?: string,
    dateRange?: { startDate: string; endDate: string }
  ): Promise<PromotionStats> {
    const response = await apiClient.get<PromotionStats>('/promotions/stats', {
      params: { promotionId, ...dateRange }
    });
    return response.data;
  }

  async getPromotionAnalytics(
    promotionId: string,
    dateRange?: { startDate: string; endDate: string }
  ): Promise<AdvancedPromotion['analytics']> {
    const response = await apiClient.get<AdvancedPromotion['analytics']>(`/promotions/${promotionId}/analytics`, {
      params: dateRange
    });
    return response.data;
  }

  // Templates
  async getPromotionTemplates(): Promise<PromotionTemplate[]> {
    const response = await apiClient.get<PromotionTemplate[]>('/promotions/templates');
    return response.data;
  }

  async createFromTemplate(
    templateId: string,
    configuration: Record<string, unknown>
  ): Promise<AdvancedPromotion> {
    const response = await apiClient.post<AdvancedPromotion>(`/promotions/templates/${templateId}/create`, {
      configuration
    });
    return response.data;
  }

  // Duplicação e clonagem
  async duplicatePromotion(promotionId: string, newName: string): Promise<AdvancedPromotion> {
    const response = await apiClient.post<AdvancedPromotion>(`/promotions/${promotionId}/duplicate`, {
      name: newName
    });
    return response.data;
  }

  // Previsualização
  async previewPromotion(
    promotion: Partial<AdvancedPromotion>,
    context: PromotionContext
  ): Promise<PromotionApplicationResult> {
    const response = await apiClient.post<PromotionApplicationResult>('/promotions/preview', {
      promotion,
      context
    });
    return response.data;
  }

  // Testes A/B
  async createABTest(
    basePromotionId: string,
    variants: Partial<AdvancedPromotion>[]
  ): Promise<{ testId: string; promotions: AdvancedPromotion[] }> {
    const response = await apiClient.post<{ testId: string; promotions: AdvancedPromotion[] }>('/promotions/ab-test', {
      basePromotionId,
      variants
    });
    return response.data;
  }

  // Bulk operations
  async bulkActivate(promotionIds: string[]): Promise<AdvancedPromotion[]> {
    const response = await apiClient.patch<AdvancedPromotion[]>('/promotions/bulk/activate', {
      promotionIds
    });
    return response.data;
  }

  async bulkDeactivate(promotionIds: string[]): Promise<AdvancedPromotion[]> {
    const response = await apiClient.patch<AdvancedPromotion[]>('/promotions/bulk/deactivate', {
      promotionIds
    });
    return response.data;
  }

  async bulkDelete(promotionIds: string[]): Promise<void> {
    await apiClient.delete('/promotions/bulk', {
      data: { promotionIds }
    });
  }

  // Métodos legados para compatibilidade
  async getApplicablePromotionsLegacy(orderTotal: number, productIds?: string[]): Promise<Promotion[]> {
    const response = await apiClient.post<Promotion[]>('/promotions/applicable-legacy', {
      orderTotal,
      productIds
    });
    return response.data;
  }
}

export default new PromotionService();