import { Request, Response } from 'express';
import { SupportService } from './support.service.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { CreateMessageDto } from './dto/create-message.dto.js';
import { RateTicketDto } from './dto/rate-ticket.dto.js';
import { UpdateTicketDto } from './dto/update-ticket.dto.js';
import { validateDto } from '@shared/utils/validation.util.js';

const supportService = new SupportService();

export class SupportController {
  private getAuthenticatedCustomerId(req: Request, res: Response): string | null {
    const customerId = req.user?.customerId;

    if (!customerId) {
      res.status(401).json({
        success: false,
        error: 'Cliente não autenticado',
      });
      return null;
    }

    return customerId;
  }

  private getAuthenticatedAdminId(req: Request, res: Response): string | null {
    const adminId = req.admin?.adminId;

    if (!adminId) {
      res.status(401).json({
        success: false,
        error: 'Administrador não autenticado',
      });
      return null;
    }

    return adminId;
  }

  /**
   * POST /support/tickets - Criar ticket
   */
  async createTicket(req: Request, res: Response) {
    const customerId = this.getAuthenticatedCustomerId(req, res);
    if (!customerId) {
      return;
    }

    const dto = await validateDto(CreateTicketDto, req.body);
    const ticket = await supportService.createTicket(customerId, dto);

    res.status(201).json({
      success: true,
      data: ticket,
    });
  }

  /**
   * GET /support/tickets - Listar tickets do cliente
   */
  async getCustomerTickets(req: Request, res: Response) {
    const customerId = this.getAuthenticatedCustomerId(req, res);
    if (!customerId) {
      return;
    }

    const { status, category, limit, offset } = req.query;

    const result = await supportService.getCustomerTickets(customerId, {
      status: status as any,
      category: category as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    res.json({
      success: true,
      ...result,
    });
  }

  /**
   * GET /support/tickets/:id - Detalhes do ticket
   */
  async getTicketById(req: Request, res: Response) {
    const customerId = this.getAuthenticatedCustomerId(req, res);
    if (!customerId) {
      return;
    }

    const { id } = req.params;
    const ticket = await supportService.getTicketById(id, customerId);

    res.json({
      success: true,
      data: ticket,
    });
  }

  /**
   * PATCH /support/tickets/:id - Atualizar ticket (reabrir)
   */
  async updateTicket(req: Request, res: Response) {
    const customerId = this.getAuthenticatedCustomerId(req, res);
    if (!customerId) {
      return;
    }

    const { id } = req.params;
    const dto = await validateDto(UpdateTicketDto, req.body);
    const ticket = await supportService.updateTicket(id, customerId, dto);

    res.json({
      success: true,
      data: ticket,
    });
  }

  /**
   * DELETE /support/tickets/:id - Fechar ticket
   */
  async closeTicket(req: Request, res: Response) {
    const customerId = this.getAuthenticatedCustomerId(req, res);
    if (!customerId) {
      return;
    }

    const { id } = req.params;
    const ticket = await supportService.closeTicket(id, customerId);

    res.json({
      success: true,
      data: ticket,
    });
  }

  /**
   * POST /support/tickets/:id/messages - Adicionar mensagem
   */
  async addMessage(req: Request, res: Response) {
    const customerId = this.getAuthenticatedCustomerId(req, res);
    if (!customerId) {
      return;
    }

    const { id } = req.params;
    const dto = await validateDto(CreateMessageDto, req.body);
    const message = await supportService.addMessage(id, customerId, dto);

    res.status(201).json({
      success: true,
      data: message,
    });
  }

  /**
   * GET /support/tickets/:id/messages - Listar mensagens
   */
  async getMessages(req: Request, res: Response) {
    const customerId = this.getAuthenticatedCustomerId(req, res);
    if (!customerId) {
      return;
    }

    const { id } = req.params;
    const ticket = await supportService.getTicketById(id, customerId);

    res.json({
      success: true,
      data: ticket.messages,
    });
  }

  /**
   * POST /support/tickets/:id/rating - Avaliar ticket
   */
  async rateTicket(req: Request, res: Response) {
    const customerId = this.getAuthenticatedCustomerId(req, res);
    if (!customerId) {
      return;
    }

    const { id } = req.params;
    const dto = await validateDto(RateTicketDto, req.body);
    const ticket = await supportService.rateTicket(id, customerId, dto);

    res.json({
      success: true,
      data: ticket,
    });
  }

  /**
   * GET /support/stats - Estatísticas do cliente
   */
  async getCustomerStats(req: Request, res: Response) {
    const customerId = this.getAuthenticatedCustomerId(req, res);
    if (!customerId) {
      return;
    }

    const stats = await supportService.getCustomerStats(customerId);

    res.json({
      success: true,
      data: stats,
    });
  }

  /**
   * GET /support/admin/tickets
   */
  async getAdminTickets(req: Request, res: Response) {
    if (!this.getAuthenticatedAdminId(req, res)) {
      return;
    }

    const { status, priority, category, assignedToId, limit, offset } = req.query;

    const result = await supportService.getAllTickets({
      status: status as any,
      priority: priority as string,
      category: category as string,
      assignedToId: assignedToId as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    res.json({
      success: true,
      ...result,
    });
  }

  /**
   * GET /support/admin/tickets/:id
   */
  async getAdminTicketById(req: Request, res: Response) {
    if (!this.getAuthenticatedAdminId(req, res)) {
      return;
    }

    const ticket = await supportService.getAdminTicketById(req.params.id);

    res.json({
      success: true,
      data: ticket,
    });
  }

  /**
   * PATCH /support/admin/tickets/:id
   */
  async updateAdminTicket(req: Request, res: Response) {
    if (!this.getAuthenticatedAdminId(req, res)) {
      return;
    }

    const dto = await validateDto(UpdateTicketDto, req.body);
    const ticket = await supportService.adminUpdateTicket(req.params.id, dto);

    res.json({
      success: true,
      data: ticket,
    });
  }

  /**
   * POST /support/admin/tickets/:id/messages
   */
  async addAdminMessage(req: Request, res: Response) {
    const adminId = this.getAuthenticatedAdminId(req, res);
    if (!adminId) {
      return;
    }

    const dto = await validateDto(CreateMessageDto, req.body);
    const message = await supportService.adminAddMessage(req.params.id, adminId, dto);

    res.status(201).json({
      success: true,
      data: message,
    });
  }

  /**
   * GET /support/admin/stats
   */
  async getAdminStats(req: Request, res: Response) {
    if (!this.getAuthenticatedAdminId(req, res)) {
      return;
    }

    const stats = await supportService.getAdminStats();

    res.json({
      success: true,
      data: stats,
    });
  }
}
