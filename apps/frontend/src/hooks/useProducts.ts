// src/hooks/useProducts.ts
import { useState, useEffect } from 'react';
import { productService, handleApiError } from '@/api';
import { Product } from '@/api/productService';

interface UseProductsResult {
  products: Product[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  page: number;
  limit: number;
  fetchProducts: (params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
  }) => Promise<void>;
  refreshProducts: () => Promise<void>;
}

export const useProducts = (): UseProductsResult => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);

  const fetchProducts = async (params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
  }) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await productService.getProducts(params);
      setProducts(response.products);
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

  const refreshProducts = async () => {
    await fetchProducts({ page, limit });
  };

  return {
    products,
    loading,
    error,
    totalCount,
    page,
    limit,
    fetchProducts,
    refreshProducts,
  };
};