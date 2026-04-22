// src/api/serviceService.ts
import apiClient from './apiClient';

export interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  estimatedTime: string;
  basePrice?: number;
  specifications?: Record<string, any>;
  isActive: boolean;
  status?: string;
  slug?: string;
  createdAt: string;
  updatedAt: string;
}

interface RawService extends Omit<Service, 'basePrice' | 'specifications' | 'isActive'> {
  basePrice?: number | string | null;
  specifications?: Record<string, any> | null;
}

export interface ServiceListResponse {
  services: Service[];
  totalCount: number;
  page: number;
  limit: number;
}

export interface CreateServiceDto {
  name: string;
  description: string;
  category: string;
  estimatedTime: string;
  basePrice?: number;
  specifications?: Record<string, any>;
  status?: string;
}

export interface UpdateServiceDto {
  name?: string;
  description?: string;
  category?: string;
  estimatedTime?: string;
  basePrice?: number;
  specifications?: Record<string, any>;
  status?: string;
}

export interface ServiceCategoryResponse {
  id: string;
  name: string;
  category: string;
  createdAt?: string;
  updatedAt?: string;
  count: number;
}

class ServiceService {
  private normalizeDecimal(value: number | string | null | undefined): number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private normalizeService(service: RawService): Service {
    return {
      ...service,
      description: service.description || '',
      estimatedTime: service.estimatedTime || '',
      basePrice: this.normalizeDecimal(service.basePrice),
      specifications:
        service.specifications && typeof service.specifications === 'object'
          ? service.specifications
          : {},
      isActive: service.status === 'ACTIVE',
    };
  }

  private sanitizePayload<T extends CreateServiceDto | UpdateServiceDto>(data: T): T {
    const sanitized: Record<string, unknown> = { ...data };

    if ('name' in sanitized && typeof sanitized.name === 'string') {
      sanitized.name = sanitized.name.trim();
    }

    if ('description' in sanitized && typeof sanitized.description === 'string') {
      sanitized.description = sanitized.description.trim();
    }

    if ('category' in sanitized && typeof sanitized.category === 'string') {
      sanitized.category = sanitized.category.trim();
    }

    if ('estimatedTime' in sanitized && typeof sanitized.estimatedTime === 'string') {
      sanitized.estimatedTime = sanitized.estimatedTime.trim();
    }

    if ('basePrice' in sanitized) {
      sanitized.basePrice = this.normalizeDecimal(sanitized.basePrice as number | string | null | undefined);
    }

    return sanitized as T;
  }

  async getServices(params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    status?: string;
  }): Promise<ServiceListResponse> {
    const response = await apiClient.get<{
      success: boolean;
      data: RawService[];
      meta: {
        page: number;
        limit: number;
        totalCount: number;
        totalPages: number;
      };
    }>('/services', { params });

    // Mapear a resposta do backend para o formato esperado pelo frontend
    return {
      services: response.data.data.map((service) => this.normalizeService(service)),
      totalCount: response.data.meta.totalCount,
      page: response.data.meta.page,
      limit: response.data.meta.limit,
    };
  }

  async getServiceById(id: string): Promise<Service> {
    const response = await apiClient.get<{ success: boolean; data: RawService }>(`/services/${id}`);
    return this.normalizeService(response.data.data);
  }

  async getFeaturedServices(limit?: number): Promise<Service[]> {
    const response = await apiClient.get<{ success: boolean; data: RawService[] }>('/services/featured', {
      params: { limit }
    });
    return response.data.data.map((service) => this.normalizeService(service));
  }

  async searchServices(query: string): Promise<Service[]> {
    const response = await apiClient.get<{ success: boolean; data: RawService[] }>('/services/search', {
      params: { q: query }
    });
    return response.data.data.map((service) => this.normalizeService(service));
  }

  async createService(data: CreateServiceDto): Promise<Service> {
    const response = await apiClient.post<{ success: boolean; data: RawService }>(
      '/services',
      this.sanitizePayload(data)
    );
    return this.normalizeService(response.data.data);
  }

  async updateService(id: string, data: UpdateServiceDto): Promise<Service> {
    const response = await apiClient.put<{ success: boolean; data: RawService }>(
      `/services/${id}`,
      this.sanitizePayload(data)
    );
    return this.normalizeService(response.data.data);
  }

  async deleteService(id: string): Promise<void> {
    await apiClient.delete(`/services/${id}`);
  }

  async toggleServiceStatus(id: string, isActive: boolean): Promise<Service> {
    const status = isActive ? 'INACTIVE' : 'ACTIVE';
    const response = await apiClient.put<{ success: boolean; data: RawService }>(`/services/${id}`, { status });
    return this.normalizeService(response.data.data);
  }

  async getCategories(): Promise<ServiceCategoryResponse[]> {
    const response = await apiClient.get<{ success: boolean; data: ServiceCategoryResponse[] }>('/services/categories/list');
    return response.data.data;
  }

  async getAdminCategories(): Promise<ServiceCategoryResponse[]> {
    const response = await apiClient.get<{ success: boolean; data: ServiceCategoryResponse[] }>('/services/categories');
    return response.data.data;
  }

  async createCategory(name: string): Promise<ServiceCategoryResponse> {
    const response = await apiClient.post<{ success: boolean; data: ServiceCategoryResponse }>('/services/categories', { name });
    return response.data.data;
  }

  async updateCategory(id: string, name: string): Promise<ServiceCategoryResponse> {
    const response = await apiClient.patch<{ success: boolean; data: ServiceCategoryResponse }>(`/services/categories/${id}`, { name });
    return response.data.data;
  }
}

export default new ServiceService();
