// src/hooks/usePromotions.ts - Hook avançado para gerenciamento de promoções

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import promotionService from '@/api/promotionService';
import {
  AdvancedPromotion,
  PromotionApplicationResult,
  PromotionContext,
  PromotionFilter,
  PromotionStats,
  PromotionTemplate,
  CustomerSegment
} from '@/types/promotions';
import { useAuth, Customer } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';

export interface UsePromotionsOptions {
  autoEvaluate?: boolean;
  includeInactive?: boolean;
  customerSegment?: CustomerSegment;
  filter?: PromotionFilter;
}

export interface UsePromotionsResult {
  // Dados básicos
  promotions: AdvancedPromotion[];
  activePromotions: AdvancedPromotion[];
  applicablePromotions: AdvancedPromotion[];

  // Estados de carregamento
  isLoading: boolean;
  isEvaluating: boolean;
  isApplying: boolean;
  error: Error | null;

  // Resultados de aplicação
  applicationResults: PromotionApplicationResult[];
  bestCombination: PromotionApplicationResult[];
  totalDiscount: number;
  totalSavings: number;

  // Ações básicas
  createPromotion: (promotion: Omit<AdvancedPromotion, 'id' | 'createdAt' | 'updatedAt'>) => Promise<AdvancedPromotion>;
  updatePromotion: (id: string, promotion: Partial<AdvancedPromotion>) => Promise<AdvancedPromotion>;
  deletePromotion: (id: string) => Promise<void>;
  duplicatePromotion: (id: string, newName: string) => Promise<AdvancedPromotion>;

  // Ações de estado
  activatePromotion: (id: string) => Promise<void>;
  deactivatePromotion: (id: string) => Promise<void>;
  bulkActivate: (ids: string[]) => Promise<void>;
  bulkDeactivate: (ids: string[]) => Promise<void>;
  bulkDelete: (ids: string[]) => Promise<void>;

  // Avaliação e aplicação
  evaluatePromotions: (context?: PromotionContext) => Promise<void>;
  applyPromotionCode: (code: string) => Promise<PromotionApplicationResult>;
  validatePromotion: (promotionId: string, context?: PromotionContext) => Promise<{ valid: boolean; reasons: string[] }>;
  calculateBestCombination: (context?: PromotionContext) => Promise<void>;
  previewPromotion: (promotion: Partial<AdvancedPromotion>, context?: PromotionContext) => Promise<PromotionApplicationResult>;

  // Filtros e busca
  setFilter: (filter: PromotionFilter) => void;
  clearFilters: () => void;
  searchPromotions: (searchTerm: string) => void;

  // Utilitários
  getPromotionById: (id: string) => AdvancedPromotion | undefined;
  isPromotionActive: (promotion: AdvancedPromotion) => boolean;
  isPromotionApplicable: (promotion: AdvancedPromotion) => boolean;
  formatDiscount: (result: PromotionApplicationResult) => string;

  // Analytics
  analytics: PromotionStats | undefined;
  refreshAnalytics: () => void;

  // Templates
  templates: PromotionTemplate[];
  createFromTemplate: (templateId: string, configuration: Record<string, unknown>) => Promise<AdvancedPromotion>;

  // Context atual
  currentContext: PromotionContext;
  updateContext: (updates: Partial<PromotionContext>) => void;
}

// Helper functions defined outside the hook
const determineCustomerSegment = (customer: Customer | null): CustomerSegment => {
  if (!customer) return 'ALL';
  // Map customer levels to promotion segments
  if (customer.level === 'PLATINUM') return 'VIP';
  if (customer.level === 'GOLD' || customer.level === 'SILVER') return 'REGULAR';
  return 'NEW_CUSTOMER';
};

const determineDeviceType = (): 'MOBILE' | 'DESKTOP' | 'TABLET' => {
  const width = window.innerWidth;
  if (width < 768) return 'MOBILE';
  if (width < 1024) return 'TABLET';
  return 'DESKTOP';
};

export function usePromotions(options: UsePromotionsOptions = {}): UsePromotionsResult {
  const queryClient = useQueryClient();
  const { customer } = useAuth();
  const { items: cartItems, totalPrice: cartTotal } = useCart();

  const [filter, setFilter] = useState<PromotionFilter>(options.filter || {});
  const [searchTerm, setSearchTerm] = useState('');
  const [applicationResults, setApplicationResults] = useState<PromotionApplicationResult[]>([]);
  const [bestCombination, setBestCombination] = useState<PromotionApplicationResult[]>([]);

  // Contexto atual para avaliação de promoções
  const currentContext = useMemo((): PromotionContext => {
    return {
      customerId: customer?.id,
      customerSegment: options.customerSegment || determineCustomerSegment(customer),
      cartItems: cartItems
        .filter(item => item.id && item.price)
        .map(item => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.price,
          category: item.category || 'Unknown',
          brand: 'Unknown' // CartItem não tem supplier/brand
        })),
      cartTotal,
      orderHistory: customer ? {
        totalOrders: 0, // Seria obtido do backend
        totalSpent: 0,
        avgOrderValue: 0,
        lastOrderDate: undefined
      } : undefined,
      currentDate: new Date().toISOString().split('T')[0],
      currentTime: new Date().toTimeString().split(' ')[0],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      deviceType: determineDeviceType(),
      loyaltyPoints: customer?.level === 'PLATINUM' ? 1000 : customer?.level === 'GOLD' ? 500 : customer?.level === 'SILVER' ? 250 : 0
    };
  }, [customer, cartItems, cartTotal, options.customerSegment]);

  // Query para promoções (usa rota pública /active se não incluir inativas)
  const {
    data: promotions = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['promotions', filter, searchTerm, options.includeInactive],
    queryFn: async () => {
      try {
        // Se incluir apenas ativas, usa rota pública
        if (!options.includeInactive && !searchTerm && Object.keys(filter).length === 0) {
          return await promotionService.getActivePromotions();
        }
        // Caso contrário, tenta rota admin (pode falhar se não autenticado)
        const response = await promotionService.getPromotions({
          ...filter,
          searchTerm: searchTerm || undefined,
          active: !options.includeInactive ? true : undefined
        });
        return response.promotions || [];
      } catch (error) {
        console.error('Error fetching promotions:', error);
        // Fallback para rota pública em caso de erro
        try {
          return await promotionService.getActivePromotions();
        } catch {
          return [];
        }
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });

  // Query para promoções ativas
  const {
    data: activePromotions = [],
    isLoading: isLoadingActive
  } = useQuery({
    queryKey: ['promotions', 'active'],
    queryFn: async () => {
      try {
        const result = await promotionService.getActivePromotions();
        return result || [];
      } catch (error) {
        console.error('Error fetching active promotions:', error);
        return [];
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    enabled: !!options.autoEvaluate
  });

  // Query para promoções aplicáveis
  const {
    data: applicablePromotions = []
  } = useQuery({
    queryKey: ['promotions', 'applicable', currentContext],
    queryFn: async () => {
      try {
        const result = await promotionService.getApplicablePromotions(currentContext);
        return result || [];
      } catch (error) {
        console.error('Error fetching applicable promotions:', error);
        return [];
      }
    },
    staleTime: 30 * 1000, // 30 segundos
    enabled: !!options.autoEvaluate && cartItems.length > 0
  });

  // Query para templates (desabilitado até implementação backend)
  const { data: templates = [] } = useQuery({
    queryKey: ['promotions', 'templates'],
    queryFn: () => promotionService.getPromotionTemplates(),
    staleTime: 30 * 60 * 1000, // 30 minutos
    enabled: false, // Desabilitado - endpoint não implementado
  });

  // Query para analytics (desabilitado até implementação backend)
  const { data: analytics, refetch: refreshAnalytics } = useQuery({
    queryKey: ['promotions', 'analytics'],
    queryFn: () => promotionService.getPromotionStats(),
    staleTime: 5 * 60 * 1000, // 5 minutos
    enabled: false, // Desabilitado - endpoint não implementado
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: promotionService.createPromotion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast.success('Promoção criada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar promoção: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, promotion }: { id: string; promotion: Partial<AdvancedPromotion> }) =>
      promotionService.updatePromotion(id, promotion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast.success('Promoção atualizada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar promoção: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: promotionService.deletePromotion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast.success('Promoção removida com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover promoção: ${error.message}`);
    }
  });

  const activateMutation = useMutation({
    mutationFn: promotionService.activatePromotion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast.success('Promoção ativada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao ativar promoção: ${error.message}`);
    }
  });

  const deactivateMutation = useMutation({
    mutationFn: promotionService.deactivatePromotion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast.success('Promoção desativada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao desativar promoção: ${error.message}`);
    }
  });

  const evaluateMutation = useMutation({
    mutationFn: (context: PromotionContext) =>
      promotionService.evaluatePromotions(context),
    onSuccess: (results) => {
      setApplicationResults(results);
    }
  });

  const calculateBestMutation = useMutation({
    mutationFn: (context: PromotionContext) =>
      promotionService.calculateBestCombination(context),
    onSuccess: (results) => {
      setBestCombination(results);
    }
  });

  const applyCodeMutation = useMutation({
    mutationFn: (code: string) =>
      promotionService.applyPromotionCode(code, currentContext),
    onSuccess: (result) => {
      toast.success(`Código aplicado! Desconto: ${formatDiscount(result)}`);
      setApplicationResults(prev => [...prev, result]);
    },
    onError: (error: Error) => {
      toast.error(`Código inválido: ${error.message}`);
    }
  });

  // Avaliação automática quando o contexto muda
  useEffect(() => {
    if (options.autoEvaluate && cartItems.length > 0) {
      evaluateMutation.mutate(currentContext);
      calculateBestMutation.mutate(currentContext);
    }
  }, [currentContext, options.autoEvaluate, cartItems.length]);

  // Cálculos derivados
  const totalDiscount = useMemo(() => {
    return bestCombination.reduce((total, result) => total + result.discountAmount, 0);
  }, [bestCombination]);

  const totalSavings = useMemo(() => {
    return bestCombination.reduce((total, result) => total + (result.originalAmount - result.finalAmount), 0);
  }, [bestCombination]);

  const getPromotionById = useCallback((id: string) => {
    return promotions.find(p => p.id === id);
  }, [promotions]);

  const isPromotionActive = useCallback((promotion: AdvancedPromotion) => {
    const now = new Date();
    const start = new Date(promotion.schedule.startDate);
    const end = new Date(promotion.schedule.endDate);

    return promotion.isActive && now >= start && now <= end && !promotion.isExpired;
  }, []);

  const isPromotionApplicable = useCallback((promotion: AdvancedPromotion) => {
    if (!isPromotionActive(promotion)) return false;

    // Verificações básicas de segmento
    if (promotion.customerSegments.length > 0 &&
        !promotion.customerSegments.includes(currentContext.customerSegment!)) {
      return false;
    }

    return true;
  }, [isPromotionActive, currentContext.customerSegment]);

  const formatDiscount = useCallback((result: PromotionApplicationResult): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(result.discountAmount);
  }, []);

  const updateContext = useCallback((_updates: Partial<PromotionContext>) => {
    // Este contexto é recalculado automaticamente via useMemo
    // Mas poderia ter lógica adicional se necessário
  }, []);

  // Funções principais
  const evaluatePromotions = useCallback(async (context?: PromotionContext) => {
    await evaluateMutation.mutateAsync(context || currentContext);
  }, [evaluateMutation, currentContext]);

  const calculateBestCombination = useCallback(async (context?: PromotionContext) => {
    await calculateBestMutation.mutateAsync(context || currentContext);
  }, [calculateBestMutation, currentContext]);

  const applyPromotionCode = useCallback(async (code: string) => {
    return await applyCodeMutation.mutateAsync(code);
  }, [applyCodeMutation]);

  const validatePromotion = useCallback(async (promotionId: string, context?: PromotionContext) => {
    return await promotionService.validatePromotion(promotionId, context || currentContext);
  }, [currentContext]);

  const previewPromotion = useCallback(async (promotion: Partial<AdvancedPromotion>, context?: PromotionContext) => {
    return await promotionService.previewPromotion(promotion, context || currentContext);
  }, [currentContext]);

  const searchPromotions = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  const clearFilters = useCallback(() => {
    setFilter({});
    setSearchTerm('');
  }, []);

  const createFromTemplate = useCallback(async (templateId: string, configuration: Record<string, unknown>) => {
    const result = await promotionService.createFromTemplate(templateId, configuration);
    queryClient.invalidateQueries({ queryKey: ['promotions'] });
    toast.success('Promoção criada a partir do template!');
    return result;
  }, [queryClient]);

  // Bulk operations
  const bulkActivate = useCallback(async (ids: string[]) => {
    await promotionService.bulkActivate(ids);
    queryClient.invalidateQueries({ queryKey: ['promotions'] });
    toast.success(`${ids.length} promoções ativadas!`);
  }, [queryClient]);

  const bulkDeactivate = useCallback(async (ids: string[]) => {
    await promotionService.bulkDeactivate(ids);
    queryClient.invalidateQueries({ queryKey: ['promotions'] });
    toast.success(`${ids.length} promoções desativadas!`);
  }, [queryClient]);

  const bulkDelete = useCallback(async (ids: string[]) => {
    await promotionService.bulkDelete(ids);
    queryClient.invalidateQueries({ queryKey: ['promotions'] });
    toast.success(`${ids.length} promoções removidas!`);
  }, [queryClient]);

  return {
    // Dados básicos
    promotions,
    activePromotions,
    applicablePromotions,

    // Estados de carregamento
    isLoading: isLoading || isLoadingActive,
    isEvaluating: evaluateMutation.isPending,
    isApplying: applyCodeMutation.isPending,
    error: error as Error | null,

    // Resultados de aplicação
    applicationResults,
    bestCombination,
    totalDiscount,
    totalSavings,

    // Ações básicas
    createPromotion: createMutation.mutateAsync,
    updatePromotion: (id: string, promotion: Partial<AdvancedPromotion>) =>
      updateMutation.mutateAsync({ id, promotion }),
    deletePromotion: deleteMutation.mutateAsync,
    duplicatePromotion: promotionService.duplicatePromotion,

    // Ações de estado
    activatePromotion: async (id: string) => { await activateMutation.mutateAsync(id); },
    deactivatePromotion: async (id: string) => { await deactivateMutation.mutateAsync(id); },
    bulkActivate,
    bulkDeactivate,
    bulkDelete,

    // Avaliação e aplicação
    evaluatePromotions,
    applyPromotionCode,
    validatePromotion,
    calculateBestCombination,
    previewPromotion,

    // Filtros e busca
    setFilter,
    clearFilters,
    searchPromotions,

    // Utilitários
    getPromotionById,
    isPromotionActive,
    isPromotionApplicable,
    formatDiscount,

    // Analytics
    analytics,
    refreshAnalytics,

    // Templates
    templates,
    createFromTemplate,

    // Context atual
    currentContext,
    updateContext
  };
}