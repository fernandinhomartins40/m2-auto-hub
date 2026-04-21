// src/modules/notifications/notifications.routes.ts
import { Router } from 'express';
import notificationsController from './notifications.controller.js';
import { AdminAuthMiddleware } from '@middlewares/admin-auth.middleware.js';
import { AuthMiddleware } from '@middlewares/auth.middleware.js';

const router = Router();

// ==================== ADMIN ROUTES ====================

/**
 * @route   GET /admin/notifications
 * @desc    Get all notifications for admin
 * @access  Admin only
 */
router.get('/admin/notifications', AdminAuthMiddleware.authenticate, (req, res) =>
  notificationsController.getAdminNotifications(req, res)
);

/**
 * @route   GET /admin/notifications/unread-count
 * @desc    Get unread count for admin
 * @access  Admin only
 */
router.get('/admin/notifications/unread-count', AdminAuthMiddleware.authenticate, (req, res) =>
  notificationsController.getAdminUnreadCount(req, res)
);

/**
 * @route   PATCH /admin/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Admin only
 */
router.patch('/admin/notifications/:id/read', AdminAuthMiddleware.authenticate, (req, res) =>
  notificationsController.markAsRead(req, res)
);

/**
 * @route   PATCH /admin/notifications/mark-all-read
 * @desc    Mark all notifications as read
 * @access  Admin only
 */
router.patch('/admin/notifications/mark-all-read', AdminAuthMiddleware.authenticate, (req, res) =>
  notificationsController.markAllAsRead(req, res)
);

// ==================== CUSTOMER ROUTES ====================

/**
 * @route   GET /customer/notifications
 * @desc    Get all notifications for customer
 * @access  Customer only
 */
router.get('/customer/notifications', AuthMiddleware.authenticate, (req, res) =>
  notificationsController.getCustomerNotifications(req, res)
);

/**
 * @route   GET /customer/notifications/unread-count
 * @desc    Get unread count for customer
 * @access  Customer only
 */
router.get('/customer/notifications/unread-count', AuthMiddleware.authenticate, (req, res) =>
  notificationsController.getCustomerUnreadCount(req, res)
);

/**
 * @route   PATCH /customer/notifications/:id/read
 * @desc    Mark customer notification as read
 * @access  Customer only
 */
router.patch('/customer/notifications/:id/read', AuthMiddleware.authenticate, (req, res) =>
  notificationsController.markCustomerNotificationAsRead(req, res)
);

/**
 * @route   PATCH /customer/notifications/mark-all-read
 * @desc    Mark all customer notifications as read
 * @access  Customer only
 */
router.patch('/customer/notifications/mark-all-read', AuthMiddleware.authenticate, (req, res) =>
  notificationsController.markAllCustomerNotificationsAsRead(req, res)
);

export default router;
