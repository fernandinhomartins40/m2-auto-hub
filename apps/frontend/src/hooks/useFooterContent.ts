import { useState, useEffect } from 'react';
import cmsService, { FooterContent, UpdateFooterData } from '@/api/cmsService';
import { handleApiError } from '@/api';
import { useToast } from '@/hooks/use-toast';

interface UseFooterContentResult {
  footer: FooterContent | null;
  loading: boolean;
  error: string | null;
  updateLoading: boolean;
  fetchFooter: () => Promise<void>;
  updateFooter: (data: UpdateFooterData) => Promise<void>;
  resetFooter: () => Promise<void>;
}

export const useFooterContent = (): UseFooterContentResult => {
  const [footer, setFooter] = useState<FooterContent | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [updateLoading, setUpdateLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const fetchFooter = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await cmsService.getFooter();
      setFooter(data);
    } catch (err) {
      const apiError = handleApiError(err);
      setError(apiError.message);
      toast({
        title: 'Erro ao carregar Footer',
        description: apiError.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateFooter = async (data: UpdateFooterData) => {
    setUpdateLoading(true);

    try {
      const updated = await cmsService.updateFooter(data);
      setFooter(updated);
      toast({
        title: 'Footer atualizado',
        description: 'O conteúdo do Footer foi atualizado com sucesso.',
      });
    } catch (err) {
      const apiError = handleApiError(err);
      toast({
        title: 'Erro ao atualizar Footer',
        description: apiError.message,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setUpdateLoading(false);
    }
  };

  const resetFooter = async () => {
    setUpdateLoading(true);

    try {
      const reset = await cmsService.resetFooter();
      setFooter(reset);
      toast({
        title: 'Footer resetado',
        description: 'O Footer foi restaurado para os valores padrão.',
      });
    } catch (err) {
      const apiError = handleApiError(err);
      toast({
        title: 'Erro ao resetar Footer',
        description: apiError.message,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setUpdateLoading(false);
    }
  };

  useEffect(() => {
    fetchFooter();
  }, []);

  return {
    footer,
    loading,
    error,
    updateLoading,
    fetchFooter,
    updateFooter,
    resetFooter,
  };
};
