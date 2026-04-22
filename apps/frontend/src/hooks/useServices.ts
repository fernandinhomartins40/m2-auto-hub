// src/hooks/useServices.ts
import { useState, useEffect } from 'react';
import { serviceService, handleApiError } from '@/api';
import { Service } from '@/api/serviceService';

interface UseServicesResult {
  services: Service[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  page: number;
  limit: number;
  fetchServices: (params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    status?: string;
  }) => Promise<void>;
  refreshServices: () => Promise<void>;
}

export const useServices = (): UseServicesResult => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);

  const fetchServices = async (params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    status?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await serviceService.getServices(params);
      setServices(response.services);
      setTotalCount(response.totalCount);
      setPage(response.page);
      setLimit(response.limit);
    } catch (err) {
      const apiError = handleApiError(err);
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshServices = async () => {
    await fetchServices({ page, limit });
  };

  return {
    services,
    loading,
    error,
    totalCount,
    page,
    limit,
    fetchServices,
    refreshServices,
  };
};