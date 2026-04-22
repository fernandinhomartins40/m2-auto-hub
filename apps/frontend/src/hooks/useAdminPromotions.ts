// apps/frontend/src/hooks/useAdminPromotions.ts
// Hook para gerenciamento de promoções no painel administrativo

import { useState, useEffect, useCallback } from 'react';
import promotionService from '@/api/promotionService';
import type { AdvancedPromotion } from '@/types/promotions';
import { toast } from 'sonner';

export interface UseAdminPromotionsReturn {
  // Dados
  promotions: AdvancedPromotion[];

  // Estados de carregamento
  loading: boolean;
  createLoading: boolean;
  updateLoading: boolean;
  deleteLoading: boolean;

  // Erro
  error: string | null;

  // Funções CRUD
  fetchPromotions: () => Promise<void>;
  createPromotion: (promotionData: Partial<AdvancedPromotion>) => Promise<void>;
  updatePromotion: (id: string, promotionData: Partial<AdvancedPromotion>) => Promise<void>;
  deletePromotion: (id: string) => Promise<void>;

  // Funções de controle
  togglePromotionStatus: (id: string, currentStatus: boolean) => Promise<void>;
  isPromotionActive: (promotion: AdvancedPromotion) => boolean;
}

export function useAdminPromotions(): UseAdminPromotionsReturn {
  const [promotions, setPromotions] = useState<AdvancedPromotion[]>([]);
  const [loading, setLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar todas as promoções
  const fetchPromotions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await promotionService.getPromotions({
        page: 1,
        limit: 100,
        active: undefined // Buscar todas (ativas e inativas)
      });

      setPromotions(response.promotions || []);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Erro ao carregar promoções';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Erro ao buscar promoções:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Criar nova promoção
  const createPromotion = useCallback(async (promotionData: Partial<AdvancedPromotion>) => {
    setCreateLoading(true);
    setError(null);

    try {
      await promotionService.createPromotion(promotionData as any);
      toast.success('Promoção criada com sucesso!');

      // Recarregar lista de promoções
      await fetchPromotions();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Erro ao criar promoção';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Erro ao criar promoção:', err);
      throw err;
    } finally {
      setCreateLoading(false);
    }
  }, [fetchPromotions]);

  // Atualizar promoção existente
  const updatePromotion = useCallback(async (id: string, promotionData: Partial<AdvancedPromotion>) => {
    setUpdateLoading(true);
    setError(null);

    try {
      await promotionService.updatePromotion(id, promotionData);
      toast.success('Promoção atualizada com sucesso!');

      // Recarregar lista de promoções
      await fetchPromotions();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Erro ao atualizar promoção';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Erro ao atualizar promoção:', err);
      throw err;
    } finally {
      setUpdateLoading(false);
    }
  }, [fetchPromotions]);

  // Deletar promoção
  const deletePromotion = useCallback(async (id: string) => {
    setDeleteLoading(true);
    setError(null);

    try {
      await promotionService.deletePromotion(id);
      toast.success('Promoção removida com sucesso!');

      // Recarregar lista de promoções
      await fetchPromotions();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Erro ao remover promoção';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Erro ao deletar promoção:', err);
      throw err;
    } finally {
      setDeleteLoading(false);
    }
  }, [fetchPromotions]);

  // Alternar status de uma promoção (ativar/desativar)
  const togglePromotionStatus = useCallback(async (id: string, currentStatus: boolean) => {
    setUpdateLoading(true);
    setError(null);

    try {
      if (currentStatus) {
        await promotionService.deactivatePromotion(id);
        toast.success('Promoção desativada!');
      } else {
        await promotionService.activatePromotion(id);
        toast.success('Promoção ativada!');
      }

      // Recarregar lista de promoções
      await fetchPromotions();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Erro ao alterar status da promoção';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Erro ao alternar status:', err);
      throw err;
    } finally {
      setUpdateLoading(false);
    }
  }, [fetchPromotions]);

  // Verificar se promoção está ativa
  const isPromotionActive = useCallback((promotion: AdvancedPromotion): boolean => {
    if (!promotion.isActive) return false;

    const now = new Date();
    const starts = promotion.schedule?.startDate ? new Date(promotion.schedule.startDate) : null;
    const ends = promotion.schedule?.endDate ? new Date(promotion.schedule.endDate) : null;

    // Se não estiver no período da promoção
    if (starts && now < starts) return false;
    if (ends && now > ends) return false;

    // Se atingiu o limite de uso
    if (promotion.usageLimit && promotion.usedCount >= promotion.usageLimit) return false;

    return true;
  }, []);

  // Carregar promoções ao montar o componente
  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  return {
    promotions,
    loading,
    createLoading,
    updateLoading,
    deleteLoading,
    error,
    fetchPromotions,
    createPromotion,
    updatePromotion,
    deletePromotion,
    togglePromotionStatus,
    isPromotionActive,
  };
}
