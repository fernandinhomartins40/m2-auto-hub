// src/modules/notifications/notifications.controller.ts
import { Request, Response } from 'express';
import notificationsService from './notifications.service.js';
import { NotificationRecipientType } from '@prisma/client';

export class NotificationsController {
  /**
   * Get notifications for admin
   * GET /admin/notifications
   */
  async getAdminNotifications(req: Request, res: Response) {
    try {
      const adminId = req.admin?.adminId;
      if (!adminId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const unreadOnly = req.query.unreadOnly === 'true';

      const result = await notificationsService.getNotifications({
        recipientType: 'ADMIN' as NotificationRecipientType,
        recipientId: adminId,
        page,
        limit,
        unreadOnly,
      });

      return res.json(result.notifications);
    } catch (error: any) {
      console.error('Error fetching admin notifications:', error);
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  }

  /**
   * Get unread count for admin
   * GET /admin/notifications/unread-count
   */
  async getAdminUnreadCount(req: Request, res: Response) {
    try {
      const adminId = req.admin?.adminId;
      if (!adminId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const count = await notificationsService.getUnreadCount('ADMIN', adminId);

      return res.json({ count });
    } catch (error: any) {
      console.error('Error fetching unread count:', error);
      return res.status(500).json({ error: 'Failed to fetch unread count' });
    }
  }

  /**
   * Mark notification as read
   * PATCH /admin/notifications/:id/read
   */
  async markAsRead(req: Request, res: Response) {
    try {
      const adminId = req.admin?.adminId;
      if (!adminId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { id } = req.params;

      const notification = await notificationsService.markAsRead(id, adminId);

      return res.json(notification);
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      return res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  }

  /**
   * Mark all notifications as read
   * PATCH /admin/notifications/mark-all-read
   */
  async markAllAsRead(req: Request, res: Response) {
    try {
      const adminId = req.admin?.adminId;
      if (!adminId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const result = await notificationsService.markAllAsRead('ADMIN', adminId);

      return res.json({ message: 'All notifications marked as read', count: result.count });
    } catch (error: any) {
      console.error('Error marking all notifications as read:', error);
      return res.status(500).json({ error: 'Failed to mark all as read' });
    }
  }

  /**
   * Get notifications for customer
   * GET /customer/notifications
   */
  async getCustomerNotifications(req: Request, res: Response) {
    try {
      const customerId = req.user?.customerId;
      if (!customerId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const unreadOnly = req.query.unreadOnly === 'true';

      const result = await notificationsService.getNotifications({
        recipientType: 'CUSTOMER' as NotificationRecipientType,
        recipientId: customerId,
        page,
        limit,
        unreadOnly,
      });

      return res.json(result.notifications);
    } catch (error: any) {
      console.error('Error fetching customer notifications:', error);
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  }

  /**
   * Get unread count for customer
   * GET /customer/notifications/unread-count
   */
  async getCustomerUnreadCount(req: Request, res: Response) {
    try {
      const customerId = req.user?.customerId;
      if (!customerId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const count = await notificationsService.getUnreadCount('CUSTOMER', customerId);

      return res.json({ count });
    } catch (error: any) {
      console.error('Error fetching unread count:', error);
      return res.status(500).json({ error: 'Failed to fetch unread count' });
    }
  }

  /**
   * Mark customer notification as read
   * PATCH /customer/notifications/:id/read
   */
  async markCustomerNotificationAsRead(req: Request, res: Response) {
    try {
      const customerId = req.user?.customerId;
      if (!customerId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { id } = req.params;

      const notification = await notificationsService.markAsRead(id, customerId);

      return res.json(notification);
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      return res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  }

  /**
   * Mark all customer notifications as read
   * PATCH /customer/notifications/mark-all-read
   */
  async markAllCustomerNotificationsAsRead(req: Request, res: Response) {
    try {
      const customerId = req.user?.customerId;
      if (!customerId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const result = await notificationsService.markAllAsRead('CUSTOMER', customerId);

      return res.json({ message: 'All notifications marked as read', count: result.count });
    } catch (error: any) {
      console.error('Error marking all notifications as read:', error);
      return res.status(500).json({ error: 'Failed to mark all as read' });
    }
  }
}

export default new NotificationsController();
