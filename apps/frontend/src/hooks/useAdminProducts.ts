// src/hooks/useAdminProducts.ts
import { useState, useEffect } from 'react';
import productService, { Product } from '@/api/productService';
import { handleApiError } from '@/api';
import { useToast } from '@/hooks/use-toast';

interface UseAdminProductsResult {
  products: Product[];
  loading: boolean;
  error: string | null;
  createLoading: boolean;
  updateLoading: boolean;
  deleteLoading: boolean;
  fetchProducts: () => Promise<void>;
  createProduct: (data: Partial<Product>) => Promise<void>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  toggleProductStatus: (id: string, currentStatus: boolean) => Promise<void>;
}

export const useAdminProducts = (): UseAdminProductsResult => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState<boolean>(false);
  const [updateLoading, setUpdateLoading] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await productService.getProducts({ limit: 100 });
      setProducts(response.products);
    } catch (err) {
      const apiError = handleApiError(err);
      setError(apiError.message);
      toast({
        title: 'Erro ao carregar produtos',
        description: apiError.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createProduct = async (data: Partial<Product>) => {
    setCreateLoading(true);

    try {
      const result = await productService.createProduct(data);
      setProducts(prev => [result.data, ...prev]);
      toast({
        title: 'Produto criado',
        description: `O produto "${result.data.name}" foi criado com sucesso.`,
      });
      await fetchProducts(); // Recarregar lista
    } catch (err) {
      const apiError = handleApiError(err);
      toast({
        title: 'Erro ao criar produto',
        description: apiError.message,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setCreateLoading(false);
    }
  };

  const updateProduct = async (id: string, data: Partial<Product>) => {
    setUpdateLoading(true);

    try {
      const result = await productService.updateProduct(id, data);
      setProducts(prev => prev.map(product =>
        product.id === id ? result.data : product
      ));
      toast({
        title: 'Produto atualizado',
        description: `O produto "${result.data.name}" foi atualizado com sucesso.`,
      });
      await fetchProducts(); // Recarregar lista
    } catch (err) {
      const apiError = handleApiError(err);
      toast({
        title: 'Erro ao atualizar produto',
        description: apiError.message,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setUpdateLoading(false);
    }
  };

  const deleteProduct = async (id: string) => {
    setDeleteLoading(true);

    try {
      await productService.deleteProduct(id);
      setProducts(prev => prev.filter(product => product.id !== id));
      toast({
        title: 'Produto excluído',
        description: 'O produto foi excluído com sucesso.',
      });
    } catch (err) {
      const apiError = handleApiError(err);
      toast({
        title: 'Erro ao excluir produto',
        description: apiError.message,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setDeleteLoading(false);
    }
  };

  const toggleProductStatus = async (id: string, currentStatus: boolean) => {
    setUpdateLoading(true);

    try {
      const newStatus = currentStatus ? 'DISCONTINUED' : 'ACTIVE';
      const result = await productService.updateProduct(id, { status: newStatus });
      setProducts(prev => prev.map(product =>
        product.id === id ? result.data : product
      ));
      toast({
        title: 'Status atualizado',
        description: `O produto foi ${result.data.status === 'ACTIVE' ? 'ativado' : 'desativado'} com sucesso.`,
      });
    } catch (err) {
      const apiError = handleApiError(err);
      toast({
        title: 'Erro ao atualizar status',
        description: apiError.message,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setUpdateLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return {
    products,
    loading,
    error,
    createLoading,
    updateLoading,
    deleteLoading,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    toggleProductStatus,
  };
};
