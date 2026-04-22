// src/api/productService.ts
import apiClient from './apiClient';

export type ProductStatus = 'ACTIVE' | 'OUT_OF_STOCK' | 'DISCONTINUED';

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  sku: string;
  supplier: string;
  costPrice: number;
  salePrice: number;
  promoPrice?: number;
  stock: number;
  minStock: number;
  images: string[];  // Corrigido: array de strings
  specifications?: Record<string, string> | null;  // Corrigido: objeto ou null
  vehicleCompatibility?: string[];  // Corrigido: array opcional
  status: ProductStatus;  // Adicionado: status do produto
  slug: string;  // Adicionado: slug para SEO
  metaDescription?: string | null;
  metaKeywords?: string | null;
  isActive?: boolean;  // Mantido para compatibilidade
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface ProductListResponse {
  products: Product[];
  totalCount: number;
  page: number;
  limit: number;
}

export interface CategoryResponse {
  id: string;
  name: string;
  category: string;
  createdAt?: string;
  updatedAt?: string;
  count: number;
}

class ProductService {
  // Métodos públicos para a loja
  async getPublicProducts(params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<Product>> {
    const response = await apiClient.get('/products', { params });
    return response.data;
  }

  async getProductById(id: string): Promise<{ success: boolean; data: Product }> {
    const response = await apiClient.get(`/products/${id}`);
    return response.data;
  }

  async getProductBySlug(slug: string): Promise<{ success: boolean; data: Product }> {
    const response = await apiClient.get(`/products/slug/${slug}`);
    return response.data;
  }

  async getProductBySku(sku: string): Promise<{ success: boolean; data: Product }> {
    const response = await apiClient.get(`/products/sku/${sku}`);
    return response.data;
  }

  async getProductsByCategory(category: string, limit?: number): Promise<{ success: boolean; data: Product[] }> {
    const response = await apiClient.get(`/products/category/${category}`, {
      params: { limit }
    });
    return response.data;
  }

  async getCategories(): Promise<{ success: boolean; data: CategoryResponse[] }> {
    const response = await apiClient.get('/products/categories/list');
    return response.data;
  }

  async getAdminCategories(): Promise<{ success: boolean; data: CategoryResponse[] }> {
    const response = await apiClient.get('/products/categories');
    return response.data;
  }

  async createCategory(name: string): Promise<{ success: boolean; data: CategoryResponse }> {
    const response = await apiClient.post('/products/categories', { name });
    return response.data;
  }

  async updateCategory(id: string, name: string): Promise<{ success: boolean; data: CategoryResponse }> {
    const response = await apiClient.patch(`/products/categories/${id}`, { name });
    return response.data;
  }

  // Métodos admin (com autenticação)
  async getProducts(params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
  }): Promise<ProductListResponse> {
    const response = await apiClient.get('/products', { params });
    // Mapear resposta da API para o formato esperado
    const apiResponse = response.data;
    return {
      products: apiResponse.data || [],
      totalCount: apiResponse.meta?.totalCount || 0,
      page: apiResponse.meta?.page || 1,
      limit: apiResponse.meta?.limit || 10
    };
  }

  async createProduct(productData: Partial<Product>): Promise<{ success: boolean; data: Product }> {
    const response = await apiClient.post('/products', productData);
    return response.data;
  }

  async updateProduct(id: string, productData: Partial<Product>): Promise<{ success: boolean; data: Product }> {
    const response = await apiClient.put(`/products/${id}`, productData);
    return response.data;
  }

  async deleteProduct(id: string): Promise<void> {
    await apiClient.delete(`/products/${id}`);
  }

  async updateStock(id: string, quantity: number): Promise<{ success: boolean; data: Product }> {
    const response = await apiClient.patch(`/products/${id}/stock`, { quantity });
    return response.data;
  }

  async getLowStockProducts(): Promise<{ success: boolean; data: Product[] }> {
    const response = await apiClient.get('/products/stock/low');
    return response.data;
  }

  // Métodos legados (manter para compatibilidade)
  async getFeaturedProducts(limit?: number): Promise<Product[]> {
    const response = await this.getPublicProducts({
      limit: limit || 10,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
    return response.data;
  }

  async searchProducts(query: string): Promise<Product[]> {
    const response = await this.getPublicProducts({
      search: query,
      limit: 50
    });
    return response.data;
  }

  async getProductsByIds(productIds: string[]): Promise<Product[]> {
    const response = await apiClient.post<{ success: boolean; data: Product[] }>('/products/bulk', {
      productIds
    });
    return response.data.data;
  }
}

export default new ProductService();
