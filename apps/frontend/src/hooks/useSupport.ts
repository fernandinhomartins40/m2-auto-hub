import { useState, useCallback } from 'react';
import { supportService, SupportTicket, CreateTicketDto, CreateMessageDto, RateTicketDto, TicketStatus, TicketCategory, SupportStats } from '../api/supportService';
import { useToast } from './use-toast';

export const useSupport = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [currentTicket, setCurrentTicket] = useState<SupportTicket | null>(null);
  const [stats, setStats] = useState<SupportStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Carregar tickets
  const loadTickets = useCallback(async (filters?: {
    status?: TicketStatus;
    category?: TicketCategory;
    limit?: number;
    offset?: number;
  }, options?: { silent?: boolean }) => {
    try {
      setLoading(true);
      setError(null);
      const result = await supportService.getCustomerTickets(filters);
      setTickets(result.data);
      return result;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Erro ao carregar tickets';
      setError(errorMsg);
      // Não mostrar toast se for silent (chamada automática)
      if (!options?.silent) {
        toast({
          title: 'Erro',
          description: errorMsg,
          variant: 'destructive',
        });
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Carregar ticket específico
  const loadTicket = useCallback(async (ticketId: string) => {
    try {
      setLoading(true);
      setError(null);
      const ticket = await supportService.getTicketById(ticketId);
      setCurrentTicket(ticket);
      return ticket;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Erro ao carregar ticket';
      setError(errorMsg);
      toast({
        title: 'Erro',
        description: errorMsg,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Criar ticket
  const createTicket = useCallback(async (data: CreateTicketDto) => {
    try {
      setLoading(true);
      setError(null);
      const ticket = await supportService.createTicket(data);
      setTickets(prev => [ticket, ...prev]);
      toast({
        title: 'Sucesso',
        description: 'Ticket criado com sucesso! Nossa equipe responderá em breve.',
      });
      return ticket;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Erro ao criar ticket';
      setError(errorMsg);
      toast({
        title: 'Erro',
        description: errorMsg,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Adicionar mensagem
  const addMessage = useCallback(async (ticketId: string, data: CreateMessageDto) => {
    try {
      setLoading(true);
      setError(null);
      const message = await supportService.addMessage(ticketId, data);

      // Atualizar ticket atual com nova mensagem
      if (currentTicket && currentTicket.id === ticketId) {
        setCurrentTicket(prev => prev ? {
          ...prev,
          messages: [...(prev.messages || []), message],
        } : null);
      }

      toast({
        title: 'Sucesso',
        description: 'Mensagem enviada com sucesso!',
      });
      return message;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Erro ao enviar mensagem';
      setError(errorMsg);
      toast({
        title: 'Erro',
        description: errorMsg,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentTicket, toast]);

  // Reabrir ticket
  const reopenTicket = useCallback(async (ticketId: string) => {
    try {
      setLoading(true);
      setError(null);
      const ticket = await supportService.reopenTicket(ticketId);
      setTickets(prev => prev.map(t => t.id === ticketId ? ticket : t));
      if (currentTicket?.id === ticketId) {
        setCurrentTicket(ticket);
      }
      toast({
        title: 'Sucesso',
        description: 'Ticket reaberto com sucesso!',
      });
      return ticket;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Erro ao reabrir ticket';
      setError(errorMsg);
      toast({
        title: 'Erro',
        description: errorMsg,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentTicket, toast]);

  // Fechar ticket
  const closeTicket = useCallback(async (ticketId: string) => {
    try {
      setLoading(true);
      setError(null);
      const ticket = await supportService.closeTicket(ticketId);
      setTickets(prev => prev.map(t => t.id === ticketId ? ticket : t));
      if (currentTicket?.id === ticketId) {
        setCurrentTicket(ticket);
      }
      toast({
        title: 'Sucesso',
        description: 'Ticket fechado com sucesso!',
      });
      return ticket;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Erro ao fechar ticket';
      setError(errorMsg);
      toast({
        title: 'Erro',
        description: errorMsg,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentTicket, toast]);

  // Avaliar ticket
  const rateTicket = useCallback(async (ticketId: string, data: RateTicketDto) => {
    try {
      setLoading(true);
      setError(null);
      const ticket = await supportService.rateTicket(ticketId, data);
      setTickets(prev => prev.map(t => t.id === ticketId ? ticket : t));
      if (currentTicket?.id === ticketId) {
        setCurrentTicket(ticket);
      }
      toast({
        title: 'Sucesso',
        description: 'Obrigado pela sua avaliação!',
      });
      return ticket;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Erro ao avaliar ticket';
      setError(errorMsg);
      toast({
        title: 'Erro',
        description: errorMsg,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentTicket, toast]);

  // Carregar estatísticas
  const loadStats = useCallback(async (options?: { silent?: boolean }) => {
    try {
      setLoading(true);
      setError(null);
      const statsData = await supportService.getStats();
      setStats(statsData);
      return statsData;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Erro ao carregar estatísticas';
      setError(errorMsg);
      // Não mostrar toast se for silent (chamada automática)
      if (!options?.silent) {
        toast({
          title: 'Erro',
          description: errorMsg,
          variant: 'destructive',
        });
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    tickets,
    currentTicket,
    stats,
    loading,
    error,
    loadTickets,
    loadTicket,
    createTicket,
    addMessage,
    reopenTicket,
    closeTicket,
    rateTicket,
    loadStats,
  };
};
