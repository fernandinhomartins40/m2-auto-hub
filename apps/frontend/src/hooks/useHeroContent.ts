import { useState, useEffect } from 'react';
import cmsService, { HeroSection, UpdateHeroData } from '@/api/cmsService';
import { handleApiError } from '@/api';
import { useToast } from '@/hooks/use-toast';

interface UseHeroContentResult {
  hero: HeroSection | null;
  loading: boolean;
  error: string | null;
  updateLoading: boolean;
  fetchHero: () => Promise<void>;
  updateHero: (data: UpdateHeroData) => Promise<void>;
  resetHero: () => Promise<void>;
}

export const useHeroContent = (): UseHeroContentResult => {
  const [hero, setHero] = useState<HeroSection | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [updateLoading, setUpdateLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const fetchHero = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await cmsService.getHero();
      setHero(data);
    } catch (err) {
      const apiError = handleApiError(err);
      setError(apiError.message);
      toast({
        title: 'Erro ao carregar Hero',
        description: apiError.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateHero = async (data: UpdateHeroData) => {
    setUpdateLoading(true);

    try {
      const updated = await cmsService.updateHero(data);
      setHero(updated);
      toast({
        title: 'Hero atualizado',
        description: 'O conteúdo do Hero foi atualizado com sucesso.',
      });
    } catch (err) {
      const apiError = handleApiError(err);
      toast({
        title: 'Erro ao atualizar Hero',
        description: apiError.message,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setUpdateLoading(false);
    }
  };

  const resetHero = async () => {
    setUpdateLoading(true);

    try {
      const reset = await cmsService.resetHero();
      setHero(reset);
      toast({
        title: 'Hero resetado',
        description: 'O Hero foi restaurado para os valores padrão.',
      });
    } catch (err) {
      const apiError = handleApiError(err);
      toast({
        title: 'Erro ao resetar Hero',
        description: apiError.message,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setUpdateLoading(false);
    }
  };

  useEffect(() => {
    fetchHero();
  }, []);

  return {
    hero,
    loading,
    error,
    updateLoading,
    fetchHero,
    updateHero,
    resetHero,
  };
};
