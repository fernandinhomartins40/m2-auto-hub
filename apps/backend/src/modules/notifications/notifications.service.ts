// src/modules/notifications/notifications.service.ts
import { prisma } from '@config/database.js';
import { NotificationType, NotificationRecipientType } from '@prisma/client';

export interface CreateNotificationData {
  recipientType: NotificationRecipientType;
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
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
    // Get all active admins
    const admins = await prisma.admin.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });

    // Create notification for each admin
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

  /**
   * Mark notification as read
   */
  async markAsRead(id: string, recipientId: string) {
    return await prisma.notification.update({
      where: {
        id,
        recipientId, // Ensure user can only mark their own notifications
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

  // ==================== NOTIFICATION CREATORS ====================

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
  async notifyOrderStatusUpdated(
    customerId: string,
    orderId: string,
    newStatus: string
  ) {
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
}

export default new NotificationsService();
