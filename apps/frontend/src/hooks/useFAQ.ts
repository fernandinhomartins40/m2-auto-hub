import { useState, useEffect, useCallback } from 'react';
import { faqService, FAQCategory, FAQItem, SupportConfig } from '../api/faqService';
import { useToast } from './use-toast';

export const useFAQ = () => {
  const [categories, setCategories] = useState<FAQCategory[]>([]);
  const [searchResults, setSearchResults] = useState<FAQItem[]>([]);
  const [config, setConfig] = useState<SupportConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Carregar categorias FAQ
  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await faqService.getFAQCategories();
      setCategories(data);
      return data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Erro ao carregar FAQ';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar no FAQ
  const searchFAQ = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return [];
    }

    try {
      setLoading(true);
      setError(null);
      const results = await faqService.searchFAQ(query);
      setSearchResults(results);
      return results;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Erro ao buscar no FAQ';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Marcar FAQ como útil/não útil
  const markFAQHelpful = useCallback(async (faqId: string, isHelpful: boolean) => {
    try {
      await faqService.markFAQHelpful(faqId, isHelpful);

      // Atualizar localmente
      setCategories(prev => prev.map(cat => ({
        ...cat,
        items: cat.items.map(item =>
          item.id === faqId
            ? {
                ...item,
                helpfulYes: isHelpful ? item.helpfulYes + 1 : item.helpfulYes,
                helpfulNo: !isHelpful ? item.helpfulNo + 1 : item.helpfulNo,
              }
            : item
        ),
      })));

      toast({
        title: 'Obrigado!',
        description: 'Sua avaliação foi registrada.',
      });
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Erro ao avaliar FAQ';
      toast({
        title: 'Erro',
        description: errorMsg,
        variant: 'destructive',
      });
      throw err;
    }
  }, [toast]);

  // Incrementar visualização
  const incrementView = useCallback(async (faqId: string) => {
    try {
      await faqService.incrementFAQView(faqId);
    } catch (err) {
      // Silencioso - não precisa notificar usuário
      console.error('Erro ao incrementar visualização:', err);
    }
  }, []);

  // Carregar configurações
  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const configData = await faqService.getSupportConfig();
      setConfig(configData);
      return configData;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Erro ao carregar configurações';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load na montagem
  useEffect(() => {
    loadCategories();
    loadConfig();
  }, [loadCategories, loadConfig]);

  return {
    categories,
    searchResults,
    config,
    loading,
    error,
    loadCategories,
    searchFAQ,
    markFAQHelpful,
    incrementView,
    loadConfig,
  };
};
