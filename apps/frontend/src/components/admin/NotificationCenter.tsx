import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import {
  Bell,
  CheckCircle,
  Gift,
  HeartHandshake,
  Package,
  Percent,
  RefreshCw,
  Tag,
  TriangleAlert,
  UserPlus,
  Wrench,
  X,
} from "lucide-react";
import adminService, {
  type AdminNotificationCenterItem,
  type AdminNotificationCenterSummary,
} from "../../api/adminService";
import { toast } from "../ui/use-toast";
import { useAdminAuth } from "../../contexts/AdminAuthContext";

type NotificationFilter =
  | "all"
  | "unread"
  | "order"
  | "quote"
  | "stock"
  | "revision"
  | "loyalty"
  | "customer"
  | "promotion"
  | "coupon"
  | "system";

interface NotificationCenterProps {
  pendingOrders?: number;
  pendingQuotes?: number;
  lowStockProducts?: number;
  onActionClick?: (notification: AdminNotificationCenterItem) => void;
  useRealNotifications?: boolean;
}

const EMPTY_SUMMARY: AdminNotificationCenterSummary = {
  unread: 0,
  persisted: 0,
  pendingOrders: 0,
  pendingQuotes: 0,
  stockAlerts: 0,
  revisionAlerts: 0,
  loyaltyAlerts: 0,
  relationshipAlerts: 0,
  customerAlerts: 0,
  marketingAlerts: 0,
};

export function NotificationCenter({
  pendingOrders = 0,
  pendingQuotes = 0,
  lowStockProducts = 0,
  onActionClick,
  useRealNotifications = false,
}: NotificationCenterProps) {
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth();
  const [notifications, setNotifications] = useState<AdminNotificationCenterItem[]>([]);
  const [summary, setSummary] = useState<AdminNotificationCenterSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>("all");

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (useRealNotifications) {
      if (!isAuthenticated) {
        setNotifications([]);
        setSummary(EMPTY_SUMMARY);
        return;
      }

      void loadRealNotificationCenter();
      const interval = setInterval(() => {
        void loadRealNotificationCenter();
      }, 60000);

      return () => clearInterval(interval);
    }

    generateNotifications();
  }, [useRealNotifications, isAuthenticated, authLoading, pendingOrders, pendingQuotes, lowStockProducts]);

  const loadRealNotificationCenter = async () => {
    try {
      setLoading(true);
      const response = await adminService.getNotificationCenter();
      setNotifications(response.notifications);
      setSummary(response.summary);
    } catch (_error: any) {
      // background fail silently
    } finally {
      setLoading(false);
    }
  };

  const generateNotifications = () => {
    const generated: AdminNotificationCenterItem[] = [];

    if (pendingOrders > 0) {
      generated.push({
        id: "mock-orders",
        source: "alert",
        type: "order",
        title: "Pedidos pendentes",
        message: `Você tem ${pendingOrders} pedido(s) aguardando confirmação.`,
        priority: pendingOrders >= 5 ? "high" : "medium",
        read: false,
        readAt: null,
        createdAt: new Date().toISOString(),
        actionLabel: "Abrir pedidos",
        actionUrl: "/orders",
        actionTab: "orders",
      });
    }

    if (pendingQuotes > 0) {
      generated.push({
        id: "mock-quotes",
        source: "alert",
        type: "quote",
        title: "Orçamentos pendentes",
        message: `${pendingQuotes} solicitação(ões) aguardando resposta da equipe.`,
        priority: pendingQuotes >= 5 ? "high" : "medium",
        read: false,
        readAt: null,
        createdAt: new Date().toISOString(),
        actionLabel: "Abrir orçamentos",
        actionUrl: "/quotes",
        actionTab: "quotes",
      });
    }

    if (lowStockProducts > 0) {
      generated.push({
        id: "mock-stock",
        source: "alert",
        type: "stock",
        title: "Alerta de estoque",
        message: `${lowStockProducts} produto(s) estão com estoque baixo.`,
        priority: "medium",
        read: false,
        readAt: null,
        createdAt: new Date().toISOString(),
        actionLabel: "Abrir produtos",
        actionUrl: "/products",
        actionTab: "products",
      });
    }

    setNotifications(generated);
    setSummary({
      ...EMPTY_SUMMARY,
      pendingOrders,
      pendingQuotes,
      stockAlerts: lowStockProducts,
    });
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      if (activeFilter === "all") {
        return true;
      }

      if (activeFilter === "unread") {
        return !notification.read;
      }

      return notification.type === activeFilter;
    });
  }, [notifications, activeFilter]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );

  const markAsRead = async (notification: AdminNotificationCenterItem) => {
    if (notification.source !== "persisted" || notification.read) {
      return;
    }

    try {
      await adminService.markNotificationAsRead(notification.id);
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, read: true, readAt: new Date().toISOString() }
            : item
        )
      );
    } catch (_error: any) {
      // non-critical
    }
  };

  const dismissNotification = async (notification: AdminNotificationCenterItem) => {
    if (notification.source === "persisted") {
      await markAsRead(notification);
      return;
    }

    setNotifications((current) => current.filter((item) => item.id !== notification.id));
  };

  const markAllAsRead = async () => {
    const hasPersistedUnread = notifications.some(
      (notification) => notification.source === "persisted" && !notification.read
    );

    if (!hasPersistedUnread) {
      return;
    }

    try {
      await adminService.markAllNotificationsAsRead();
      setNotifications((current) =>
        current.map((notification) =>
          notification.source === "persisted"
            ? { ...notification, read: true, readAt: new Date().toISOString() }
            : notification
        )
      );
      toast({
        title: "Notificações marcadas como lidas",
      });
    } catch (_error: any) {
      toast({
        title: "Erro ao marcar notificações",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  };

  const handleActionClick = async (notification: AdminNotificationCenterItem) => {
    await markAsRead(notification);
    onActionClick?.(notification);
  };

  const summaryCards = [
    {
      id: "pendingOrders",
      label: "Pedidos",
      value: summary.pendingOrders,
      filter: "order" as NotificationFilter,
    },
    {
      id: "pendingQuotes",
      label: "Orçamentos",
      value: summary.pendingQuotes,
      filter: "quote" as NotificationFilter,
    },
    {
      id: "stockAlerts",
      label: "Estoque",
      value: summary.stockAlerts,
      filter: "stock" as NotificationFilter,
    },
    {
      id: "revisionAlerts",
      label: "Revisões",
      value: summary.revisionAlerts,
      filter: "revision" as NotificationFilter,
    },
    {
      id: "loyaltyAlerts",
      label: "Fidelidade",
      value: summary.loyaltyAlerts,
      filter: "loyalty" as NotificationFilter,
    },
    {
      id: "relationshipAlerts",
      label: "Relacionamento",
      value: summary.relationshipAlerts,
      filter: "customer" as NotificationFilter,
    },
  ].filter((item) => item.value > 0);

  const filterButtons: Array<{ id: NotificationFilter; label: string }> = [
    { id: "all", label: "Tudo" },
    { id: "unread", label: "Não lidas" },
    { id: "order", label: "Pedidos" },
    { id: "quote", label: "Orçamentos" },
    { id: "stock", label: "Estoque" },
    { id: "revision", label: "Revisões" },
    { id: "loyalty", label: "Fidelidade" },
    { id: "customer", label: "Clientes" },
    { id: "promotion", label: "Promoções" },
    { id: "coupon", label: "Cupons" },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <CardTitle>Central de Notificações</CardTitle>
              {unreadCount > 0 ? <Badge variant="destructive">{unreadCount}</Badge> : null}
            </div>
            <CardDescription>
              Acompanhe eventos persistidos e alertas operacionais da loja, sempre com ação direta.
            </CardDescription>
          </div>

          <div className="flex flex-wrap gap-2">
            {unreadCount > 0 ? (
              <Button variant="outline" size="sm" onClick={markAllAsRead} disabled={loading}>
                Marcar persistidas como lidas
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => void loadRealNotificationCenter()} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {summaryCards.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {summaryCards.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => setActiveFilter(card.filter)}
                className="rounded-xl border bg-slate-50 p-3 text-left transition hover:border-moria-orange hover:bg-white"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{card.label}</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{card.value}</p>
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {filterButtons.map((filter) => (
            <Button
              key={filter.id}
              type="button"
              size="sm"
              variant={activeFilter === filter.id ? "default" : "outline"}
              onClick={() => setActiveFilter(filter.id)}
            >
              {filter.label}
            </Button>
          ))}
        </div>

        {loading && notifications.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <RefreshCw className="mx-auto mb-2 h-8 w-8 animate-spin text-moria-orange" />
            <p className="font-medium">Carregando notificações...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <CheckCircle className="mx-auto mb-2 h-12 w-12 text-green-300" />
            <p className="font-medium">Tudo em ordem</p>
            <p className="text-sm">Nenhuma notificação disponível para esse filtro.</p>
          </div>
        ) : (
          <ScrollArea className="h-[480px] pr-4">
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`rounded-xl border p-4 transition-all ${
                    notification.read ? "bg-slate-50" : "border-l-4 border-l-moria-orange bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="mt-1">{getNotificationIcon(notification.type)}</div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">{notification.title}</p>
                          <span className={getPriorityBadgeStyle(notification.priority)}>
                            {notification.priority === "high"
                              ? "Urgente"
                              : notification.priority === "medium"
                              ? "Média"
                              : "Baixa"}
                          </span>
                          <Badge variant="secondary" className="capitalize">
                            {notification.source === "persisted" ? "Evento" : "Alerta"}
                          </Badge>
                        </div>

                        <p className="mb-2 text-sm text-muted-foreground">{notification.message}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(notification.createdAt).toLocaleString("pt-BR")}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => void handleActionClick(notification)}>
                            {notification.actionLabel}
                          </Button>

                          {notification.source === "persisted" && !notification.read ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void markAsRead(notification)}
                            >
                              Marcar como lida
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void dismissNotification(notification)}
                      className="shrink-0"
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

const getNotificationIcon = (type: AdminNotificationCenterItem["type"]) => {
  switch (type) {
    case "order":
      return <Package className="h-5 w-5 text-blue-600" />;
    case "quote":
      return <Wrench className="h-5 w-5 text-orange-600" />;
    case "stock":
      return <TriangleAlert className="h-5 w-5 text-red-600" />;
    case "revision":
      return <Wrench className="h-5 w-5 text-indigo-600" />;
    case "loyalty":
      return <Gift className="h-5 w-5 text-pink-600" />;
    case "customer":
      return <HeartHandshake className="h-5 w-5 text-cyan-600" />;
    case "promotion":
      return <Percent className="h-5 w-5 text-violet-600" />;
    case "coupon":
      return <Tag className="h-5 w-5 text-emerald-600" />;
    case "system":
      return <UserPlus className="h-5 w-5 text-slate-600" />;
    default:
      return <Bell className="h-5 w-5 text-slate-600" />;
  }
};

const getPriorityBadgeStyle = (priority: AdminNotificationCenterItem["priority"]) => {
  const baseClasses = "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium";

  switch (priority) {
    case "high":
      return `${baseClasses} bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10`;
    case "medium":
      return `${baseClasses} bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/10`;
    case "low":
      return `${baseClasses} bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/10`;
    default:
      return `${baseClasses} bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-600/10`;
  }
};
