import apiClient from './apiClient';

export interface SupportTicket {
  id: string;
  customerId: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  orderId?: string;
  productId?: string;
  revisionId?: string;
  assignedToId?: string;
  assignedAt?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  rating?: number;
  feedback?: string;
  customer?: {
    id: string;
    name: string;
    email: string;
  };
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  };
  messages?: TicketMessage[];
  _count?: {
    messages: number;
  };
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderType: 'customer' | 'admin';
  message: string;
  attachments?: string[];
  isInternal: boolean;
  createdAt: string;
}

export enum TicketCategory {
  ORDER_ISSUE = 'ORDER_ISSUE',
  PRODUCT_QUESTION = 'PRODUCT_QUESTION',
  PAYMENT_ISSUE = 'PAYMENT_ISSUE',
  DELIVERY_ISSUE = 'DELIVERY_ISSUE',
  REVISION_QUESTION = 'REVISION_QUESTION',
  TECHNICAL_SUPPORT = 'TECHNICAL_SUPPORT',
  SUGGESTION = 'SUGGESTION',
  COMPLAINT = 'COMPLAINT',
  OTHER = 'OTHER',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_CUSTOMER = 'WAITING_CUSTOMER',
  WAITING_SUPPORT = 'WAITING_SUPPORT',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export interface CreateTicketDto {
  subject: string;
  category: TicketCategory;
  priority?: TicketPriority;
  message: string;
  orderId?: string;
  productId?: string;
  revisionId?: string;
}

export interface CreateMessageDto {
  message: string;
  attachments?: string[];
}

export interface RateTicketDto {
  rating: number;
  feedback?: string;
}

export interface SupportStats {
  total: number;
  open: number;
  resolved: number;
  closed: number;
  avgRating: number;
}

export const supportService = {
  // Criar ticket
  async createTicket(data: CreateTicketDto): Promise<SupportTicket> {
    const response = await apiClient.post('/support/tickets', data);
    return response.data.data;
  },

  // Listar tickets do cliente
  async getCustomerTickets(filters?: {
    status?: TicketStatus;
    category?: TicketCategory;
    limit?: number;
    offset?: number;
  }): Promise<{ data: SupportTicket[]; pagination: any }> {
    const response = await apiClient.get('/support/tickets', { params: filters });
    return response.data;
  },

  // Buscar ticket por ID
  async getTicketById(ticketId: string): Promise<SupportTicket> {
    const response = await apiClient.get(`/support/tickets/${ticketId}`);
    return response.data.data;
  },

  // Reabrir ticket
  async reopenTicket(ticketId: string): Promise<SupportTicket> {
    const response = await apiClient.patch(`/support/tickets/${ticketId}`, {
      status: TicketStatus.OPEN,
    });
    return response.data.data;
  },

  // Fechar ticket
  async closeTicket(ticketId: string): Promise<SupportTicket> {
    const response = await apiClient.delete(`/support/tickets/${ticketId}`);
    return response.data.data;
  },

  // Adicionar mensagem
  async addMessage(ticketId: string, data: CreateMessageDto): Promise<TicketMessage> {
    const response = await apiClient.post(`/support/tickets/${ticketId}/messages`, data);
    return response.data.data;
  },

  // Listar mensagens
  async getMessages(ticketId: string): Promise<TicketMessage[]> {
    const response = await apiClient.get(`/support/tickets/${ticketId}/messages`);
    return response.data.data;
  },

  // Avaliar ticket
  async rateTicket(ticketId: string, data: RateTicketDto): Promise<SupportTicket> {
    const response = await apiClient.post(`/support/tickets/${ticketId}/rating`, data);
    return response.data.data;
  },

  // Estatísticas
  async getStats(): Promise<SupportStats> {
    const response = await apiClient.get('/support/stats');
    return response.data.data;
  },
};
