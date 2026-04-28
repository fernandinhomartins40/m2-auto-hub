// src/modules/notifications/notifications.service.ts
import { prisma } from '@config/database.js';
import {
  LoyaltyRedemptionStatus,
  NotificationRecipientType,
  NotificationType,
  OrderStatus,
  QuoteStatus,
  RevisionAppointmentStatus,
} from '@prisma/client';

export interface CreateNotificationData {
  recipientType: NotificationRecipientType;
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
}

export interface AdminNotificationCenterItem {
  id: string;
  source: 'persisted' | 'alert';
  type:
    | 'order'
    | 'quote'
    | 'stock'
    | 'revision'
    | 'loyalty'
    | 'customer'
    | 'promotion'
    | 'coupon'
    | 'system';
  backendType?: NotificationType | string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  read: boolean;
  readAt: Date | null;
  createdAt: Date;
  actionLabel: string;
  actionUrl: string;
  actionTab: string;
  data?: any;
}

export interface AdminNotificationCenterSummary {
  unread: number;
  persisted: number;
  pendingOrders: number;
  pendingQuotes: number;
  stockAlerts: number;
  revisionAlerts: number;
  loyaltyAlerts: number;
  relationshipAlerts: number;
  customerAlerts: number;
  marketingAlerts: number;
}

export class NotificationsService {
  /**
   * Create a new notification
   */
  async createNotification(data: CreateNotificationData) {
    return await prisma.notification.create({
      data: {
        recipientType: data.recipientType,
        recipientId: data.recipientId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data || null,
      },
    });
  }

  /**
   * Create notification for all admins
   */
  async notifyAllAdmins(
    type: NotificationType,
    title: string,
    message: string,
    data?: any
  ) {
    const admins = await prisma.admin.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });

    const notifications = await Promise.all(
      admins.map((admin) =>
        this.createNotification({
          recipientType: 'ADMIN',
          recipientId: admin.id,
          type,
          title,
          message,
          data,
        })
      )
    );

    return notifications;
  }

  /**
   * Get notifications for a specific recipient
   */
  async getNotifications(params: {
    recipientType: NotificationRecipientType;
    recipientId: string;
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  }) {
    const { recipientType, recipientId, page = 1, limit = 50, unreadOnly = false } = params;
    const skip = (page - 1) * limit;

    const where = {
      recipientType,
      recipientId,
      ...(unreadOnly ? { read: false } : {}),
    };

    const [notifications, totalCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      notifications,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    };
  }

  async getAdminNotificationCenter(recipientId: string): Promise<{
    generatedAt: string;
    summary: AdminNotificationCenterSummary;
    notifications: AdminNotificationCenterItem[];
  }> {
    const now = new Date();
    const persistedResult = await this.getNotifications({
      recipientType: 'ADMIN',
      recipientId,
      page: 1,
      limit: 20,
    });

    const persisted = persistedResult.notifications.map((notification) =>
      this.mapPersistedNotificationToAdminItem(notification)
    );

    const [
      unread,
      pendingOrdersCount,
      latestPendingOrder,
      pendingQuotesCount,
      latestPendingQuote,
      lowStockProducts,
      requestedAppointments,
      availableRedemptions,
      allCustomersWithBirthDate,
      newCustomers,
      expiringCoupons,
      endingPromotions,
    ] = await Promise.all([
      this.getUnreadCount('ADMIN', recipientId),
      prisma.order.count({
        where: { status: OrderStatus.PENDING },
      }),
      prisma.order.findFirst({
        where: { status: OrderStatus.PENDING },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      prisma.order.count({
        where: {
          quoteStatus: {
            in: [QuoteStatus.PENDING, QuoteStatus.ANALYZING],
          },
        },
      }),
      prisma.order.findFirst({
        where: {
          quoteStatus: {
            in: [QuoteStatus.PENDING, QuoteStatus.ANALYZING],
          },
        },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
      prisma.product.findMany({
        where: {
          OR: [
            { stock: 0 },
            {
              AND: [{ stock: { gt: 0 } }, { stock: { lte: prisma.product.fields.minStock } }],
            },
          ],
        },
        orderBy: [{ stock: 'asc' }, { updatedAt: 'desc' }],
        take: 6,
        select: {
          id: true,
          name: true,
          stock: true,
          minStock: true,
          updatedAt: true,
        },
      }),
      (prisma as any).revisionAppointment.findMany({
        where: {
          status: {
            in: [RevisionAppointmentStatus.REQUESTED, RevisionAppointmentStatus.SCHEDULED],
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          status: true,
          preferredDate: true,
          scheduledAt: true,
          createdAt: true,
          customer: { select: { id: true, name: true } },
          vehicle: { select: { id: true, brand: true, model: true, plate: true } },
        },
      }),
      prisma.loyaltyRedemption.findMany({
        where: { status: LoyaltyRedemptionStatus.AVAILABLE },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          code: true,
          createdAt: true,
          expiresAt: true,
          customer: { select: { id: true, name: true } },
          reward: { select: { id: true, name: true } },
        },
      }),
      prisma.customer.findMany({
        where: {
          birthDate: { not: null },
          status: 'ACTIVE',
        },
        select: {
          id: true,
          name: true,
          birthDate: true,
        },
      }),
      prisma.customer.findMany({
        where: {
          createdAt: {
            gte: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          name: true,
          createdAt: true,
        },
      }),
      prisma.coupon.findMany({
        where: {
          isActive: true,
          expiresAt: {
            gte: now,
            lte: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { expiresAt: 'asc' },
        take: 6,
        select: {
          id: true,
          code: true,
          expiresAt: true,
          createdAt: true,
        },
      }),
      prisma.promotion.findMany({
        where: {
          isActive: true,
          endDate: {
            gte: now,
            lte: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { endDate: 'asc' },
        take: 6,
        select: {
          id: true,
          name: true,
          endDate: true,
          createdAt: true,
        },
      }),
    ]);

    const birthdays = allCustomersWithBirthDate
      .map((customer) => {
        const birthDate = customer.birthDate as Date | null;
        if (!birthDate) {
          return null;
        }

        const nextBirthday = new Date(now.getFullYear(), birthDate.getMonth(), birthDate.getDate());
        if (nextBirthday < now) {
          nextBirthday.setFullYear(now.getFullYear() + 1);
        }

        const daysUntil = Math.ceil((nextBirthday.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        if (daysUntil < 0 || daysUntil > 7) {
          return null;
        }

        return {
          id: customer.id,
          name: customer.name,
          nextBirthday,
          daysUntil,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (a!.daysUntil - b!.daysUntil))
      .slice(0, 6) as Array<{
      id: string;
      name: string;
      nextBirthday: Date;
      daysUntil: number;
    }>;

    const alerts: AdminNotificationCenterItem[] = [];

    if (pendingOrdersCount > 0) {
      alerts.push(
        this.createAlertItem({
          id: 'alert-pending-orders',
          type: 'order',
          title: 'Pedidos aguardando confirmação',
          message: `${pendingOrdersCount} pedido(s) aguardando ação do lojista no painel.`,
          priority: pendingOrdersCount >= 5 ? 'high' : 'medium',
          createdAt: latestPendingOrder?.createdAt ?? now,
          actionLabel: 'Abrir pedidos',
          actionUrl: '/orders',
          actionTab: 'orders',
          data: { count: pendingOrdersCount },
        })
      );
    }

    if (pendingQuotesCount > 0) {
      alerts.push(
        this.createAlertItem({
          id: 'alert-pending-quotes',
          type: 'quote',
          title: 'Orçamentos aguardando resposta',
          message: `${pendingQuotesCount} orçamento(s) precisam de retorno da equipe.`,
          priority: pendingQuotesCount >= 5 ? 'high' : 'medium',
          createdAt: latestPendingQuote?.updatedAt ?? now,
          actionLabel: 'Abrir orçamentos',
          actionUrl: '/quotes',
          actionTab: 'quotes',
          data: { count: pendingQuotesCount },
        })
      );
    }

    lowStockProducts.forEach((product) => {
      const isOutOfStock = product.stock === 0;
      alerts.push(
        this.createAlertItem({
          id: `alert-stock-${product.id}`,
          type: 'stock',
          title: isOutOfStock ? `Produto sem estoque: ${product.name}` : `Estoque baixo: ${product.name}`,
          message: isOutOfStock
            ? 'O produto está zerado e pode impactar vendas e atendimento.'
            : `Estoque atual: ${product.stock} unidade(s). Mínimo recomendado: ${product.minStock}.`,
          priority: isOutOfStock ? 'high' : 'medium',
          createdAt: product.updatedAt,
          actionLabel: 'Abrir produtos',
          actionUrl: '/products',
          actionTab: 'products',
          data: { productId: product.id, stock: product.stock, minStock: product.minStock },
        })
      );
    });

    requestedAppointments.forEach((appointment: any) => {
      const isRequested = appointment.status === RevisionAppointmentStatus.REQUESTED;
      const dateLabel = this.formatDateTime(isRequested ? appointment.preferredDate : appointment.scheduledAt);
      alerts.push(
        this.createAlertItem({
          id: `alert-revision-${appointment.id}`,
          type: 'revision',
          title: isRequested
            ? `Nova solicitação de revisão: ${appointment.customer.name}`
            : `Revisão agendada: ${appointment.customer.name}`,
          message: `${appointment.vehicle.brand} ${appointment.vehicle.model} (${appointment.vehicle.plate}) para ${dateLabel}.`,
          priority: isRequested ? 'high' : 'medium',
          createdAt: appointment.createdAt,
          actionLabel: 'Abrir revisões',
          actionUrl: '/revisions',
          actionTab: 'revisions',
          data: {
            appointmentId: appointment.id,
            customerId: appointment.customer.id,
            vehicleId: appointment.vehicle.id,
          },
        })
      );
    });

    availableRedemptions.forEach((redemption) => {
      alerts.push(
        this.createAlertItem({
          id: `alert-loyalty-${redemption.id}`,
          type: 'loyalty',
          title: `Resgate de fidelidade: ${redemption.customer.name}`,
          message: `${redemption.reward.name} pronto para conferência${redemption.expiresAt ? ` até ${this.formatDate(redemption.expiresAt)}` : ''}.`,
          priority: 'medium',
          createdAt: redemption.createdAt,
          actionLabel: 'Abrir fidelidade',
          actionUrl: '/loyalty',
          actionTab: 'loyalty',
          data: {
            redemptionId: redemption.id,
            redemptionCode: redemption.code,
            customerId: redemption.customer.id,
            rewardId: redemption.reward.id,
          },
        })
      );
    });

    birthdays.forEach((customer) => {
      alerts.push(
        this.createAlertItem({
          id: `alert-birthday-${customer.id}`,
          type: 'customer',
          title:
            customer.daysUntil === 0
              ? `Aniversário hoje: ${customer.name}`
              : `Aniversário próximo: ${customer.name}`,
          message:
            customer.daysUntil === 0
              ? 'Boa oportunidade para contato e pós-venda.'
              : `Faltam ${customer.daysUntil} dia(s) para o aniversário do cliente.`,
          priority: customer.daysUntil <= 1 ? 'medium' : 'low',
          createdAt: customer.nextBirthday,
          actionLabel: 'Abrir relacionamento',
          actionUrl: '/relationship',
          actionTab: 'relationship',
          data: { customerId: customer.id },
        })
      );
    });

    newCustomers.forEach((customer) => {
      alerts.push(
        this.createAlertItem({
          id: `alert-customer-${customer.id}`,
          type: 'customer',
          title: `Novo cliente cadastrado: ${customer.name}`,
          message: 'Cliente recente na base, útil para boas-vindas e acompanhamento inicial.',
          priority: 'low',
          createdAt: customer.createdAt,
          actionLabel: 'Abrir clientes',
          actionUrl: '/customers',
          actionTab: 'customers',
          data: { customerId: customer.id },
        })
      );
    });

    expiringCoupons.forEach((coupon) => {
      alerts.push(
        this.createAlertItem({
          id: `alert-coupon-${coupon.id}`,
          type: 'coupon',
          title: `Cupom próximo do vencimento: ${coupon.code}`,
          message: `Expira em ${this.formatDate(coupon.expiresAt)}.`,
          priority: 'low',
          createdAt: coupon.createdAt,
          actionLabel: 'Abrir cupons',
          actionUrl: '/coupons',
          actionTab: 'coupons',
          data: { couponId: coupon.id },
        })
      );
    });

    endingPromotions.forEach((promotion) => {
      alerts.push(
        this.createAlertItem({
          id: `alert-promotion-${promotion.id}`,
          type: 'promotion',
          title: `Promoção terminando: ${promotion.name}`,
          message: `A campanha encerra em ${this.formatDate(promotion.endDate)}.`,
          priority: 'low',
          createdAt: promotion.createdAt,
          actionLabel: 'Abrir promoções',
          actionUrl: '/promotions',
          actionTab: 'promotions',
          data: { promotionId: promotion.id },
        })
      );
    });

    const notifications = [...alerts, ...persisted]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 40);

    const summary: AdminNotificationCenterSummary = {
      unread,
      persisted: persisted.length,
      pendingOrders: pendingOrdersCount,
      pendingQuotes: pendingQuotesCount,
      stockAlerts: lowStockProducts.length,
      revisionAlerts: requestedAppointments.length,
      loyaltyAlerts: availableRedemptions.length,
      relationshipAlerts: birthdays.length,
      customerAlerts: newCustomers.length,
      marketingAlerts: expiringCoupons.length + endingPromotions.length,
    };

    return {
      generatedAt: now.toISOString(),
      summary,
      notifications,
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string, recipientId: string) {
    return await prisma.notification.update({
      where: {
        id,
        recipientId,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all notifications as read for a recipient
   */
  async markAllAsRead(recipientType: NotificationRecipientType, recipientId: string) {
    return await prisma.notification.updateMany({
      where: {
        recipientType,
        recipientId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Get unread count for a recipient
   */
  async getUnreadCount(recipientType: NotificationRecipientType, recipientId: string) {
    return await prisma.notification.count({
      where: {
        recipientType,
        recipientId,
        read: false,
      },
    });
  }

  /**
   * Delete old read notifications (cleanup)
   */
  async deleteOldNotifications(daysOld: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return await prisma.notification.deleteMany({
      where: {
        read: true,
        readAt: {
          lt: cutoffDate,
        },
      },
    });
  }

  /**
   * Notify admins about new order
   */
  async notifyNewOrder(orderId: string, customerName: string) {
    return await this.notifyAllAdmins(
      'ORDER_CREATED',
      'Novo Pedido Recebido',
      `Novo pedido de ${customerName}`,
      { orderId }
    );
  }

  /**
   * Notify admins about new quote request
   */
  async notifyNewQuoteRequest(quoteId: string, customerName: string) {
    return await this.notifyAllAdmins(
      'NEW_QUOTE_REQUEST',
      'Nova Solicitação de Orçamento',
      `${customerName} solicitou um orçamento`,
      { quoteId }
    );
  }

  /**
   * Notify customer about quote response
   */
  async notifyQuoteResponded(customerId: string, quoteId: string) {
    return await this.createNotification({
      recipientType: 'CUSTOMER',
      recipientId: customerId,
      type: 'QUOTE_RESPONDED',
      title: 'Orçamento Respondido',
      message: 'Seu orçamento foi respondido pela loja',
      data: { quoteId },
    });
  }

  /**
   * Notify admins about quote approval
   */
  async notifyQuoteApproved(quoteId: string, customerName: string) {
    return await this.notifyAllAdmins(
      'QUOTE_APPROVED',
      'Orçamento Aprovado',
      `${customerName} aprovou o orçamento`,
      { quoteId }
    );
  }

  /**
   * Notify admins about quote rejection
   */
  async notifyQuoteRejected(quoteId: string, customerName: string) {
    return await this.notifyAllAdmins(
      'QUOTE_REJECTED',
      'Orçamento Rejeitado',
      `${customerName} rejeitou o orçamento`,
      { quoteId }
    );
  }

  /**
   * Notify customer about order status update
   */
  async notifyOrderStatusUpdated(customerId: string, orderId: string, newStatus: string) {
    const statusMessages: Record<string, string> = {
      PENDING: 'Seu pedido está pendente de confirmação',
      CONFIRMED: 'Seu pedido foi confirmado',
      IN_PRODUCTION: 'Seu pedido entrou em produção',
      PROCESSING: 'Seu pedido está sendo processado',
      PREPARING: 'Seu pedido está em preparação para envio',
      SHIPPED: 'Seu pedido foi enviado',
      DELIVERED: 'Seu pedido foi entregue',
      CANCELLED: 'Seu pedido foi cancelado',
    };

    return await this.createNotification({
      recipientType: 'CUSTOMER',
      recipientId: customerId,
      type: 'ORDER_STATUS_UPDATED',
      title: 'Status do Pedido Atualizado',
      message: statusMessages[newStatus] || 'Status do pedido atualizado',
      data: { orderId, status: newStatus },
    });
  }

  private createAlertItem(
    input: Omit<AdminNotificationCenterItem, 'source' | 'read' | 'readAt'>
  ): AdminNotificationCenterItem {
    return {
      ...input,
      source: 'alert',
      read: false,
      readAt: null,
    };
  }

  private mapPersistedNotificationToAdminItem(notification: any): AdminNotificationCenterItem {
    const defaults = {
      type: 'system' as AdminNotificationCenterItem['type'],
      priority: 'medium' as AdminNotificationCenterItem['priority'],
      actionLabel: 'Abrir dashboard',
      actionUrl: '/dashboard',
      actionTab: 'dashboard',
    };

    const perType: Record<
      NotificationType,
      Pick<AdminNotificationCenterItem, 'type' | 'priority' | 'actionLabel' | 'actionUrl' | 'actionTab'>
    > = {
      NEW_QUOTE_REQUEST: {
        type: 'quote',
        priority: 'high',
        actionLabel: 'Abrir orçamentos',
        actionUrl: '/quotes',
        actionTab: 'quotes',
      },
      QUOTE_RESPONDED: {
        type: 'quote',
        priority: 'medium',
        actionLabel: 'Abrir orçamentos',
        actionUrl: '/quotes',
        actionTab: 'quotes',
      },
      QUOTE_APPROVED: {
        type: 'quote',
        priority: 'high',
        actionLabel: 'Abrir pedidos',
        actionUrl: '/orders',
        actionTab: 'orders',
      },
      QUOTE_REJECTED: {
        type: 'quote',
        priority: 'medium',
        actionLabel: 'Abrir orçamentos',
        actionUrl: '/quotes',
        actionTab: 'quotes',
      },
      ORDER_STATUS_UPDATED: {
        type: 'order',
        priority: 'medium',
        actionLabel: 'Abrir pedidos',
        actionUrl: '/orders',
        actionTab: 'orders',
      },
      ORDER_CREATED: {
        type: 'order',
        priority: 'high',
        actionLabel: 'Abrir pedidos',
        actionUrl: '/orders',
        actionTab: 'orders',
      },
    };

    const mapping = perType[notification.type as NotificationType] || defaults;

    return {
      id: notification.id,
      source: 'persisted',
      type: mapping.type,
      backendType: notification.type,
      title: notification.title,
      message: notification.message,
      priority: mapping.priority,
      read: notification.read,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
      actionLabel: mapping.actionLabel,
      actionUrl: mapping.actionUrl,
      actionTab: mapping.actionTab,
      data: notification.data || null,
    };
  }

  private formatDate(date: Date) {
    return new Intl.DateTimeFormat('pt-BR').format(date);
  }

  private formatDateTime(date?: Date | null) {
    if (!date) {
      return 'data não informada';
    }

    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  }
}

export default new NotificationsService();
