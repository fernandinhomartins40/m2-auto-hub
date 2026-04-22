import { useState, useEffect } from 'react';
import cmsService, {
  MarqueeMessage,
  CreateMarqueeMessageData,
  UpdateMarqueeMessageData,
} from '@/api/cmsService';
import { handleApiError } from '@/api';
import { useToast } from '@/hooks/use-toast';

interface UseMarqueeMessagesResult {
  messages: MarqueeMessage[];
  loading: boolean;
  error: string | null;
  actionLoading: boolean;
  fetchMessages: (activeOnly?: boolean) => Promise<void>;
  createMessage: (data: CreateMarqueeMessageData) => Promise<void>;
  updateMessage: (id: string, data: UpdateMarqueeMessageData) => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
  reorderMessages: (ids: string[]) => Promise<void>;
}

export const useMarqueeMessages = (autoFetch: boolean = true): UseMarqueeMessagesResult => {
  const [messages, setMessages] = useState<MarqueeMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const fetchMessages = async (activeOnly: boolean = false) => {
    setLoading(true);
    setError(null);

    try {
      const data = await cmsService.getMarqueeMessages(activeOnly);
      setMessages(data);
    } catch (err) {
      const apiError = handleApiError(err);
      setError(apiError.message);
      // Não mostrar toast de erro durante carregamento inicial
      // Para evitar poluir a UI se a API ainda não tiver dados
      console.warn('Erro ao carregar mensagens do marquee:', apiError.message);
    } finally {
      setLoading(false);
    }
  };

  const createMessage = async (data: CreateMarqueeMessageData) => {
    setActionLoading(true);

    try {
      const created = await cmsService.createMarqueeMessage(data);
      setMessages(prev => [...prev, created]);
      toast({
        title: 'Mensagem criada',
        description: 'A mensagem foi criada com sucesso.',
      });
      await fetchMessages();
    } catch (err) {
      const apiError = handleApiError(err);
      toast({
        title: 'Erro ao criar mensagem',
        description: apiError.message,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const updateMessage = async (id: string, data: UpdateMarqueeMessageData) => {
    setActionLoading(true);

    try {
      const updated = await cmsService.updateMarqueeMessage(id, data);
      setMessages(prev => prev.map(msg => (msg.id === id ? updated : msg)));
      toast({
        title: 'Mensagem atualizada',
        description: 'A mensagem foi atualizada com sucesso.',
      });
    } catch (err) {
      const apiError = handleApiError(err);
      toast({
        title: 'Erro ao atualizar mensagem',
        description: apiError.message,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const deleteMessage = async (id: string) => {
    setActionLoading(true);

    try {
      await cmsService.deleteMarqueeMessage(id);
      setMessages(prev => prev.filter(msg => msg.id !== id));
      toast({
        title: 'Mensagem excluída',
        description: 'A mensagem foi excluída com sucesso.',
      });
    } catch (err) {
      const apiError = handleApiError(err);
      toast({
        title: 'Erro ao excluir mensagem',
        description: apiError.message,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const reorderMessages = async (ids: string[]) => {
    setActionLoading(true);

    try {
      await cmsService.reorderMarqueeMessages(ids);
      // Reordenar localmente
      const reordered = ids.map(id => messages.find(msg => msg.id === id)!).filter(Boolean);
      setMessages(reordered);
      toast({
        title: 'Mensagens reordenadas',
        description: 'A ordem das mensagens foi atualizada.',
      });
    } catch (err) {
      const apiError = handleApiError(err);
      toast({
        title: 'Erro ao reordenar mensagens',
        description: apiError.message,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetch) {
      fetchMessages();
    }
  }, [autoFetch]);

  return {
    messages,
    loading,
    error,
    actionLoading,
    fetchMessages,
    createMessage,
    updateMessage,
    deleteMessage,
    reorderMessages,
  };
};
