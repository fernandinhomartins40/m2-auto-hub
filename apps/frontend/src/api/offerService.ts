import apiClient from './apiClient';

export type OfferType = 'DIA' | 'SEMANA' | 'MES';

export interface Offer {
  id: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  sku: string;
  supplier: string;
  costPrice: number;
  salePrice: number;
  promoPrice: number;
  stock: number;
  minStock: number;
  images: string[];
  specifications?: Record<string, any>;
  status: string;
  offerType: OfferType;
  offerStartDate: string;
  offerEndDate: string;
  offerBadge?: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface OffersResponse {
  success: boolean;
  data: Offer[];
}

class OfferService {
  /**
   * Get all active offers (DIA, SEMANA, MES)
   */
  async getActiveOffers(): Promise<Offer[]> {
    const response = await apiClient.get<OffersResponse>('/products/offers/active');
    return response.data.data;
  }

  /**
   * Get active offers by type
   */
  async getOffersByType(type: OfferType): Promise<Offer[]> {
    const response = await apiClient.get<OffersResponse>('/products/offers/active', {
      params: { type }
    });
    return response.data.data;
  }

  /**
   * Calculate discount percentage
   */
  calculateDiscount(salePrice: number, promoPrice: number): number {
    return Math.round(((salePrice - promoPrice) / salePrice) * 100);
  }

  /**
   * Calculate savings amount
   */
  calculateSavings(salePrice: number, promoPrice: number): number {
    return salePrice - promoPrice;
  }
}

export const offerService = new OfferService();
export default offerService;
