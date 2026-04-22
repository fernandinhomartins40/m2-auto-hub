import api from './apiClient';

export interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  estimatedTime: string;
  basePrice?: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  salePrice: number;
  promoPrice?: number;
  images: string[];
  stock: number;
}

export interface ProductCategory {
  name: string;
  count: number;
}

export interface Promotion {
  id: string;
  name: string;
  description: string;
  shortDescription?: string;
  bannerImage?: string;
  badgeText?: string;
  type: string;
  startDate: Date;
  endDate: Date;
  code?: string;
  products: Product[];
}

export const landingApi = {
  // Services - busca todos os serviços ativos do banco
  getServices: async (): Promise<Service[]> => {
    const response = await api.get<Service[]>('/landing/services');
    return response.data;
  },

  // Products - busca produtos ativos com estoque
  getProducts: async (category?: string): Promise<Product[]> => {
    const params = category ? { category } : {};
    const response = await api.get<Product[]>('/landing/products', { params });
    return response.data;
  },

  // Product Categories - busca categorias disponíveis
  getProductCategories: async (): Promise<ProductCategory[]> => {
    const response = await api.get<ProductCategory[]>('/landing/products/categories');
    return response.data;
  },

  // Promotions - busca promoções ativas
  getPromotions: async (): Promise<Promotion[]> => {
    const response = await api.get<Promotion[]>('/landing/promotions');
    return response.data;
  },

  // Promotional Products - busca produtos com promoPrice
  getPromotionalProducts: async (): Promise<Product[]> => {
    const response = await api.get<Product[]>('/landing/promotions/products');
    return response.data;
  },
};
