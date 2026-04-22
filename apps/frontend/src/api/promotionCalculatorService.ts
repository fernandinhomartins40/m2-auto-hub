import apiClient from './apiClient';

export interface PromotionCalculationItem {
  productId?: string;
  serviceId?: string;
  quantity: number;
  price: number;
  category?: string;
}

export interface ApplicablePromotion {
  promotionId: string;
  promotionName: string;
  promotionType: string;
  discountAmount: number;
  originalAmount: number;
  finalAmount: number;
  affectedItems: string[];
  description: string;
}

export interface PromotionCalculationResult {
  applicablePromotions: ApplicablePromotion[];
  totalDiscount: number;
  finalTotal: number;
}

class PromotionCalculatorService {
  /**
   * Calculate applicable promotions for current cart
   */
  async calculateForCart(
    items: PromotionCalculationItem[],
    totalAmount: number
  ): Promise<PromotionCalculationResult> {
    try {
      const response = await apiClient.post<{ success: boolean; data: PromotionCalculationResult }>(
        '/promotions/calculate',
        {
          items,
          totalAmount,
        }
      );

      return response.data.data;
    } catch (error) {
      console.error('Error calculating promotions:', error);
      // Return empty result on error
      return {
        applicablePromotions: [],
        totalDiscount: 0,
        finalTotal: totalAmount,
      };
    }
  }
}

export default new PromotionCalculatorService();
