import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import {
  Bell,
  Package,
  Wrench,
  AlertTriangle,
  CheckCircle,
  X,
  RefreshCw
} from "lucide-react";
import adminService from "../../api/adminService";
import { toast } from "../ui/use-toast";
import { useAdminAuth } from "../../contexts/AdminAuthContext";

// API Notification Types
type NotificationType =
  | 'NEW_QUOTE_REQUEST'
  | 'QUOTE_RESPONDED'
  | 'QUOTE_APPROVED'
  | 'QUOTE_REJECTED'
  | 'ORDER_STATUS_UPDATED'
  | 'ORDER_CREATED';

interface ApiNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Notification {
  id: string;
  type: 'order' | 'quote' | 'stock' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority?: 'low' | 'medium' | 'high';
  actionUrl?: string;
  actionLabel?: string;
  data?: any;
}

interface NotificationCenterProps {
  pendingOrders?: number;
  pendingQuotes?: number;
  lowStockProducts?: number;
  onActionClick?: (notification: Notification) => void;
  useRealNotifications?: boolean; // Flag to use real API notifications
}

export function NotificationCenter({
  pendingOrders = 0,
  pendingQuotes = 0,
  lowStockProducts = 0,
  onActionClick,
  useRealNotifications = false
}: NotificationCenterProps) {
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Wait for auth to finish loading before doing anything
    if (authLoading) {
      return;
    }

    // Only proceed if we're using real notifications
    if (useRealNotifications) {
      // CRITICAL: Block all API calls if not authenticated
      if (!isAuthenticated) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      // User is authenticated - safe to load notifications
      loadRealNotifications();

      // Poll for new notifications every 60 seconds (reduced from 30s)
      const interval = setInterval(loadRealNotifications, 60000);
      return () => {
        clearInterval(interval);
      };
    } else {
      // Using mock notifications
      generateNotifications();
    }
  }, [useRealNotifications, isAuthenticated, authLoading]);

  // Load notifications from API
  const loadRealNotifications = async () => {
    try {
      setLoading(true);
      const apiNotifications = await adminService.getNotifications();
      const mappedNotifications = apiNotifications.map(mapApiNotificationToNotification);
      setNotifications(mappedNotifications);
      setUnreadCount(mappedNotifications.filter(n => !n.read).length);
    } catch (error: any) {
      // Don't log or show error toast on background polls to avoid annoying the user
      // Error is silently ignored as this is a background operation
    } finally {
      setLoading(false);
    }
  };

  // Map API notification to internal notification format
  const mapApiNotificationToNotification = (apiNotif: ApiNotification): Notification => {
    let type: Notification['type'] = 'system';
    let priority: Notification['priority'] = 'medium';
    let actionUrl: string | undefined;
    let actionLabel: string | undefined;

    // Determine type, priority, and actions based on notification type
    switch (apiNotif.type) {
      case 'NEW_QUOTE_REQUEST':
        type = 'quote';
        priority = 'high';
        actionUrl = '/quotes';
        actionLabel = 'Ver Orçamento';
        break;
      case 'QUOTE_RESPONDED':
        type = 'quote';
        priority = 'medium';
        actionUrl = '/quotes';
        actionLabel = 'Ver Orçamento';
        break;
      case 'QUOTE_APPROVED':
        type = 'quote';
        priority = 'high';
        actionUrl = '/orders';
        actionLabel = 'Ver Pedido';
        break;
      case 'QUOTE_REJECTED':
        type = 'quote';
        priority = 'low';
        actionUrl = '/quotes';
        actionLabel = 'Ver Orçamento';
        break;
      case 'ORDER_CREATED':
        type = 'order';
        priority = 'high';
        actionUrl = '/orders';
        actionLabel = 'Ver Pedido';
        break;
      case 'ORDER_STATUS_UPDATED':
        type = 'order';
        priority = 'medium';
        actionUrl = '/orders';
        actionLabel = 'Ver Pedido';
        break;
    }

    return {
      id: apiNotif.id,
      type,
      title: apiNotif.title,
      message: apiNotif.message,
      timestamp: new Date(apiNotif.createdAt),
      read: apiNotif.read,
      priority,
      actionUrl,
      actionLabel,
      data: apiNotif.data,
    };
  };

  const generateNotifications = () => {
    const newNotifications: Notification[] = [];

    // Pedidos pendentes
    if (pendingOrders > 0) {
      newNotifications.push({
        id: `order-${Date.now()}`,
        type: 'order',
        title: 'Pedidos Pendentes',
        message: `Você tem ${pendingOrders} pedido(s) aguardando confirmação`,
        timestamp: new Date(),
        read: false,
        priority: 'high',
        actionLabel: 'Ver Pedidos',
        actionUrl: '/orders'
      });
    }

    // Orçamentos pendentes
    if (pendingQuotes > 0) {
      newNotifications.push({
        id: `quote-${Date.now()}`,
        type: 'quote',
        title: 'Orçamentos Pendentes',
        message: `${pendingQuotes} solicitação(ões) de orçamento aguardando resposta`,
        timestamp: new Date(),
        read: false,
        priority: 'high',
        actionLabel: 'Ver Orçamentos',
        actionUrl: '/quotes'
      });
    }

    // Estoque baixo
    if (lowStockProducts > 0) {
      newNotifications.push({
        id: `stock-${Date.now()}`,
        type: 'stock',
        title: 'Alerta de Estoque',
        message: `${lowStockProducts} produto(s) com estoque baixo`,
        timestamp: new Date(),
        read: false,
        priority: 'medium',
        actionLabel: 'Ver Produtos',
        actionUrl: '/products'
      });
    }

    setNotifications(newNotifications);
    setUnreadCount(newNotifications.filter(n => !n.read).length);
  };

  const markAsRead = async (id: string) => {
    if (useRealNotifications) {
      try {
        await adminService.markNotificationAsRead(id);
        setNotifications(notifications.map(n =>
          n.id === id ? { ...n, read: true } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error: any) {
        // Silently fail - this is not a critical operation
      }
    } else {
      setNotifications(notifications.map(n =>
        n.id === id ? { ...n, read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const dismissNotification = (id: string) => {
    // For real notifications, just mark as read (don't delete)
    if (useRealNotifications) {
      markAsRead(id);
    } else {
      setNotifications(notifications.filter(n => n.id !== id));
      const notification = notifications.find(n => n.id === id);
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    }
  };

  const markAllAsRead = async () => {
    if (useRealNotifications) {
      try {
        await adminService.markAllNotificationsAsRead();
        setNotifications(notifications.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
        toast({
          title: "Notificações marcadas como lidas",
        });
      } catch (error: any) {
        toast({
          title: "Erro ao marcar notificações",
          description: "Tente novamente mais tarde",
          variant: "destructive",
        });
      }
    } else {
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <Package className="h-5 w-5 text-blue-600" />;
      case 'quote':
        return <Wrench className="h-5 w-5 text-orange-600" />;
      case 'stock':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const getPriorityBadgeStyle = (priority?: 'low' | 'medium' | 'high') => {
    const baseClasses = 'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium';

    switch (priority) {
      case 'high':
        return `${baseClasses} bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10`;
      case 'medium':
        return `${baseClasses} bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/10`;
      case 'low':
        return `${baseClasses} bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/10`;
      default:
        return `${baseClasses} bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/10`;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Central de Notificações</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              disabled={loading}
            >
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <CardDescription>
          {useRealNotifications
            ? "Acompanhe as atividades importantes da sua loja"
            : "Resumo das atividades recentes"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading && notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-moria-orange mb-2" />
            <p className="font-medium">Carregando notificações...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="mx-auto h-12 w-12 text-green-300 mb-2" />
            <p className="font-medium">Tudo em ordem!</p>
            <p className="text-sm">Nenhuma notificação pendente</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border rounded-lg transition-all ${
                    notification.read ? 'bg-gray-50' : 'bg-white border-l-4 border-l-moria-orange'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-sm">
                            {notification.title}
                          </p>
                          <span className={getPriorityBadgeStyle(notification.priority)}>
                            {notification.priority === 'high' ? 'Urgente' :
                             notification.priority === 'medium' ? 'Média' :
                             notification.priority === 'low' ? 'Baixa' : 'Normal'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400">
                          {notification.timestamp.toLocaleString('pt-BR')}
                        </p>
                        {notification.actionLabel && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2"
                            onClick={() => {
                              markAsRead(notification.id);
                              onActionClick?.(notification);
                            }}
                          >
                            {notification.actionLabel}
                          </Button>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dismissNotification(notification.id)}
                      className="ml-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
