import { prisma } from '@config/database.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { CreateMessageDto } from './dto/create-message.dto.js';
import { RateTicketDto } from './dto/rate-ticket.dto.js';
import { UpdateTicketDto, TicketStatus } from './dto/update-ticket.dto.js';
import { ApiError } from '@shared/utils/error.util.js';

export class SupportService {
  /**
   * Criar novo ticket
   */
  async createTicket(customerId: string, data: CreateTicketDto) {
    const { message, ...ticketData } = data;

    // Criar ticket
    const ticket = await prisma.supportTicket.create({
      data: {
        ...ticketData,
        customerId,
        priority: data.priority || 'MEDIUM',
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Criar primeira mensagem
    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: customerId,
        senderType: 'customer',
        message,
      },
    });

    // TODO: Enviar notificação para admins
    // TODO: Enviar email de confirmação

    return ticket;
  }

  /**
   * Listar tickets do cliente
   */
  async getCustomerTickets(
    customerId: string,
    filters?: {
      status?: TicketStatus;
      category?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    const { status, category, limit = 20, offset = 0 } = filters || {};

    const where: any = { customerId };
    if (status) where.status = status;
    if (category) where.category = category;

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
        orderBy: [
          { status: 'asc' }, // OPEN primeiro
          { priority: 'desc' }, // URGENT primeiro
          { createdAt: 'desc' },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.supportTicket.count({ where }),
    ]);

    return {
      data: tickets,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  /**
   * Buscar ticket por ID
   */
  async getTicketById(ticketId: string, customerId: string) {
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        customerId,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!ticket) {
      throw ApiError.notFound('Ticket não encontrado');
    }

    return ticket;
  }

  /**
   * Adicionar mensagem ao ticket
   */
  async addMessage(ticketId: string, customerId: string, data: CreateMessageDto) {
    // Verificar se o ticket pertence ao cliente
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        customerId,
      },
    });

    if (!ticket) {
      throw ApiError.notFound('Ticket não encontrado');
    }

    if (ticket.status === 'CLOSED') {
      throw ApiError.badRequest('Não é possível adicionar mensagens a um ticket fechado');
    }

    // Criar mensagem
    const message = await prisma.ticketMessage.create({
      data: {
        ticketId,
        senderId: customerId,
        senderType: 'customer',
        message: data.message,
        attachments: data.attachments,
        isInternal: false,
      },
    });

    // Atualizar status do ticket se necessário
    if (ticket.status === 'WAITING_CUSTOMER') {
      await prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          status: 'WAITING_SUPPORT',
          updatedAt: new Date(),
        },
      });
    }

    // TODO: Notificar admin responsável
    // TODO: Enviar email

    return message;
  }

  /**
   * Atualizar ticket (reabrir)
   */
  async updateTicket(ticketId: string, customerId: string, data: UpdateTicketDto) {
    // Verificar se o ticket pertence ao cliente
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        customerId,
      },
    });

    if (!ticket) {
      throw ApiError.notFound('Ticket não encontrado');
    }

    // Cliente só pode reabrir tickets RESOLVED
    if (data.status && data.status !== 'OPEN') {
      if (ticket.status !== 'RESOLVED') {
        throw ApiError.badRequest('Você só pode reabrir tickets resolvidos');
      }
    }

    const updated = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: data.status,
        updatedAt: new Date(),
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return updated;
  }

  /**
   * Fechar ticket
   */
  async closeTicket(ticketId: string, customerId: string) {
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        customerId,
      },
    });

    if (!ticket) {
      throw ApiError.notFound('Ticket não encontrado');
    }

    if (ticket.status === 'CLOSED') {
      throw ApiError.badRequest('Ticket já está fechado');
    }

    const closed = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return closed;
  }

  /**
   * Avaliar ticket
   */
  async rateTicket(ticketId: string, customerId: string, data: RateTicketDto) {
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        customerId,
      },
    });

    if (!ticket) {
      throw ApiError.notFound('Ticket não encontrado');
    }

    if (ticket.status !== 'CLOSED' && ticket.status !== 'RESOLVED') {
      throw ApiError.badRequest('Só é possível avaliar tickets resolvidos ou fechados');
    }

    if (ticket.rating) {
      throw ApiError.badRequest('Este ticket já foi avaliado');
    }

    const rated = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        rating: data.rating,
        feedback: data.feedback,
        updatedAt: new Date(),
      },
    });

    return rated;
  }

  /**
   * Estatísticas do cliente
   */
  async getCustomerStats(customerId: string) {
    const [total, open, resolved, closed, avgRating] = await Promise.all([
      prisma.supportTicket.count({
        where: { customerId },
      }),
      prisma.supportTicket.count({
        where: { customerId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      }),
      prisma.supportTicket.count({
        where: { customerId, status: 'RESOLVED' },
      }),
      prisma.supportTicket.count({
        where: { customerId, status: 'CLOSED' },
      }),
      prisma.supportTicket.aggregate({
        where: { customerId, rating: { not: null } },
        _avg: { rating: true },
      }),
    ]);

    return {
      total,
      open,
      resolved,
      closed,
      avgRating: avgRating._avg.rating || 0,
    };
  }

  /**
   * Admin: Listar todos os tickets
   */
  async getAllTickets(filters?: {
    status?: TicketStatus;
    priority?: string;
    category?: string;
    assignedToId?: string;
    limit?: number;
    offset?: number;
  }) {
    const { status, priority, category, assignedToId, limit = 50, offset = 0 } = filters || {};

    const where: any = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;
    if (assignedToId) where.assignedToId = assignedToId;

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
        orderBy: [
          { priority: 'desc' },
          { status: 'asc' },
          { createdAt: 'desc' },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.supportTicket.count({ where }),
    ]);

    return {
      data: tickets,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  /**
   * Admin: Atualizar ticket (atribuir, mudar status, etc)
   */
  async adminUpdateTicket(ticketId: string, data: UpdateTicketDto) {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw ApiError.notFound('Ticket não encontrado');
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.status) {
      updateData.status = data.status;
      if (data.status === 'RESOLVED') {
        updateData.resolvedAt = new Date();
      }
      if (data.status === 'CLOSED') {
        updateData.closedAt = new Date();
      }
    }

    if (data.priority) {
      updateData.priority = data.priority;
    }

    if (data.assignedToId !== undefined) {
      updateData.assignedToId = data.assignedToId;
      if (data.assignedToId) {
        updateData.assignedAt = new Date();
      }
    }

    const updated = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: updateData,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return updated;
  }

  /**
   * Admin: Adicionar mensagem (incluindo internas)
   */
  async adminAddMessage(ticketId: string, adminId: string, data: CreateMessageDto) {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw ApiError.notFound('Ticket não encontrado');
    }

    const message = await prisma.ticketMessage.create({
      data: {
        ticketId,
        senderId: adminId,
        senderType: 'admin',
        message: data.message,
        attachments: data.attachments,
        isInternal: data.isInternal || false,
      },
    });

    // Atualizar status do ticket se necessário
    if (!data.isInternal && ticket.status === 'WAITING_SUPPORT') {
      await prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          status: 'WAITING_CUSTOMER',
          updatedAt: new Date(),
        },
      });
    }

    return message;
  }

  /**
   * Admin: Estatísticas gerais
   */
  async getAdminStats() {
    const [total, open, unassigned, avgResponseTime, byCategory, byPriority] = await Promise.all([
      prisma.supportTicket.count(),
      prisma.supportTicket.count({
        where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
      }),
      prisma.supportTicket.count({
        where: { assignedToId: null, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      }),
      // TODO: Calcular tempo médio de resposta
      Promise.resolve(0),
      prisma.supportTicket.groupBy({
        by: ['category'],
        _count: true,
      }),
      prisma.supportTicket.groupBy({
        by: ['priority'],
        _count: true,
      }),
    ]);

    return {
      total,
      open,
      unassigned,
      avgResponseTime,
      byCategory,
      byPriority,
    };
  }
}
