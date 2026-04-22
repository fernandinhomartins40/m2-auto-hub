import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { CustomerLayout } from "../components/customer/CustomerLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  FileText,
  Package,
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";
import customerService, {
  CustomerQuote,
  CustomerOrder,
  CustomerNotification
} from "../api/customerService";
import { toast } from "../components/ui/use-toast";
import "../styles/cliente.css";

// ==================== QUOTE STATUS HELPERS ====================

function getQuoteStatusBadge(status: string) {
  const statusConfig = {
    PENDING: { label: "Pendente", variant: "secondary" as const, icon: Clock },
    ANALYZING: { label: "Analisando", variant: "default" as const, icon: AlertCircle },
    QUOTED: { label: "Orçado", variant: "default" as const, icon: FileText },
    APPROVED: { label: "Aprovado", variant: "default" as const, icon: CheckCircle },
    REJECTED: { label: "Rejeitado", variant: "destructive" as const, icon: XCircle },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}

// ==================== ORDER STATUS HELPERS ====================

function getOrderStatusBadge(status: string) {
  const statusConfig = {
    PENDING: { label: "Pendente", variant: "secondary" as const },
    CONFIRMED: { label: "Confirmado", variant: "default" as const },
    IN_PRODUCTION: { label: "Em Produção", variant: "default" as const },
    PREPARING: { label: "Preparando", variant: "default" as const },
    SHIPPED: { label: "Enviado", variant: "default" as const },
    DELIVERED: { label: "Entregue", variant: "default" as const },
    CANCELLED: { label: "Cancelado", variant: "destructive" as const },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// ==================== QUOTES TAB ====================

function CustomerQuotes() {
  const [quotes, setQuotes] = useState<CustomerQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("all");

  useEffect(() => {
    loadQuotes();
  }, [selectedStatus]);

  const loadQuotes = async () => {
    try {
      setLoading(true);
      const data = await customerService.getMyQuotes(selectedStatus);
      setQuotes(data);
    } catch (error: any) {
      console.error("Erro ao carregar orçamentos:", error);
      toast({
        title: "Erro ao carregar orçamentos",
        description: error.response?.data?.error || "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (quoteId: string) => {
    try {
      const result = await customerService.approveQuote(quoteId);
      toast({
        title: "Orçamento aprovado!",
        description: result.message,
      });
      loadQuotes(); // Reload to update status
    } catch (error: any) {
      console.error("Erro ao aprovar orçamento:", error);
      toast({
        title: "Erro ao aprovar orçamento",
        description: error.response?.data?.error || "Tente novamente mais tarde",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (quoteId: string) => {
    try {
      const result = await customerService.rejectQuote(quoteId);
      toast({
        title: "Orçamento rejeitado",
        description: result.message,
      });
      loadQuotes(); // Reload to update status
    } catch (error: any) {
      console.error("Erro ao rejeitar orçamento:", error);
      toast({
        title: "Erro ao rejeitar orçamento",
        description: error.response?.data?.error || "Tente novamente mais tarde",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-moria-orange"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Meus Orçamentos</h1>
          <p className="text-muted-foreground">Acompanhe seus pedidos de orçamento</p>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        {["all", "PENDING", "ANALYZING", "QUOTED", "APPROVED", "REJECTED"].map((status) => (
          <Button
            key={status}
            variant={selectedStatus === status ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedStatus(status)}
          >
            {status === "all" ? "Todos" : getQuoteStatusBadge(status).props.children[1]}
          </Button>
        ))}
      </div>

      {/* Quotes List */}
      <div className="space-y-4">
        {quotes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum orçamento encontrado
            </CardContent>
          </Card>
        ) : (
          quotes.map((quote) => (
            <Card key={quote.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      Orçamento #{quote.id.slice(0, 8).toUpperCase()}
                    </CardTitle>
                    <CardDescription>
                      Criado em {new Date(quote.createdAt).toLocaleDateString("pt-BR")}
                    </CardDescription>
                  </div>
                  {getQuoteStatusBadge(quote.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Items */}
                  <div>
                    <h4 className="font-semibold mb-2">Itens:</h4>
                    <div className="space-y-2">
                      {quote.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>
                            {item.quantity}x {item.name}
                          </span>
                          <div className="flex gap-2">
                            {item.quotedPrice !== null ? (
                              <>
                                <span className="text-muted-foreground line-through">
                                  R$ {item.price.toFixed(2)}
                                </span>
                                <span className="font-medium">
                                  R$ {item.quotedPrice.toFixed(2)}
                                </span>
                              </>
                            ) : (
                              <span className="text-muted-foreground">Aguardando orçamento</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Total */}
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-semibold">Total:</span>
                    <span className="text-lg font-bold">R$ {quote.total.toFixed(2)}</span>
                  </div>

                  {/* Observations */}
                  {quote.observations && (
                    <div className="pt-2 border-t">
                      <h4 className="font-semibold mb-1 text-sm">Observações:</h4>
                      <p className="text-sm text-muted-foreground">{quote.observations}</p>
                    </div>
                  )}

                  {/* Actions */}
                  {quote.status === "QUOTED" && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        className="flex-1"
                        onClick={() => handleApprove(quote.id)}
                      >
                        <ThumbsUp className="w-4 h-4 mr-2" />
                        Aprovar Orçamento
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleReject(quote.id)}
                      >
                        <ThumbsDown className="w-4 h-4 mr-2" />
                        Recusar
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// ==================== ORDERS TAB ====================

function CustomerOrdersTab() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await customerService.getMyOrders();
      setOrders(data);
    } catch (error: any) {
      console.error("Erro ao carregar pedidos:", error);
      toast({
        title: "Erro ao carregar pedidos",
        description: error.response?.data?.error || "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-moria-orange"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Meus Pedidos</h1>
        <p className="text-muted-foreground">Acompanhe o status dos seus pedidos</p>
      </div>

      <div className="space-y-4">
        {orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum pedido encontrado
            </CardContent>
          </Card>
        ) : (
          orders.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      Pedido #{order.id.slice(0, 8).toUpperCase()}
                    </CardTitle>
                    <CardDescription>
                      Criado em {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                    </CardDescription>
                  </div>
                  {getOrderStatusBadge(order.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Items */}
                  <div>
                    <h4 className="font-semibold mb-2">Itens:</h4>
                    <div className="space-y-2">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>
                            {item.quantity}x {item.name}
                          </span>
                          <span className="font-medium">R$ {item.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Total */}
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-semibold">Total:</span>
                    <span className="text-lg font-bold">R$ {order.total.toFixed(2)}</span>
                  </div>

                  {/* Type Badges */}
                  <div className="flex gap-2">
                    {order.hasProducts && <Badge variant="outline">Produtos</Badge>}
                    {order.hasServices && <Badge variant="outline">Serviços</Badge>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// ==================== NOTIFICATIONS TAB ====================

function CustomerNotificationsTab() {
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await customerService.getMyNotifications();
      setNotifications(data);
    } catch (error: any) {
      console.error("Erro ao carregar notificações:", error);
      toast({
        title: "Erro ao carregar notificações",
        description: error.response?.data?.error || "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await customerService.markNotificationAsRead(notificationId);
      loadNotifications(); // Reload to update status
    } catch (error: any) {
      console.error("Erro ao marcar notificação como lida:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await customerService.markAllNotificationsAsRead();
      toast({
        title: "Notificações marcadas como lidas",
      });
      loadNotifications();
    } catch (error: any) {
      console.error("Erro ao marcar todas como lidas:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-moria-orange"></div>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Minhas Notificações</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0
              ? `Você tem ${unreadCount} notificação${unreadCount > 1 ? 'ões' : ''} não lida${unreadCount > 1 ? 's' : ''}`
              : "Todas as notificações foram lidas"
            }
          </p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={handleMarkAllAsRead} variant="outline">
            Marcar todas como lidas
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhuma notificação encontrada
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card
              key={notification.id}
              className={notification.read ? "opacity-60" : "border-l-4 border-l-moria-orange"}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{notification.title}</CardTitle>
                    <CardDescription className="mt-1">{notification.message}</CardDescription>
                  </div>
                  {!notification.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  {new Date(notification.createdAt).toLocaleString("pt-BR")}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// ==================== LOGIN COMPONENT ====================

function CustomerLogin() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Minha Conta</CardTitle>
          <CardDescription>
            Você precisa estar logado para acessar esta página
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Clique no ícone de usuário no cabeçalho para fazer login ou criar uma conta.
          </p>
          <Button
            className="w-full"
            onClick={() => (window.location.href = "/")}
          >
            Voltar para a Página Inicial
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

void CustomerLogin;

export default function MyAccount() {
  const { customer, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState("quotes");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-moria-orange mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return <Navigate to="/customer-login/?redirect=%2Fmy-account" replace />;
  }

  return (
    <CustomerLayout currentTab="account" onTabChange={setCurrentTab}>
      <div className="space-y-6">
        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="quotes" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Orçamentos
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Pedidos
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notificações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quotes">
            <CustomerQuotes />
          </TabsContent>

          <TabsContent value="orders">
            <CustomerOrdersTab />
          </TabsContent>

          <TabsContent value="notifications">
            <CustomerNotificationsTab />
          </TabsContent>
        </Tabs>
      </div>
    </CustomerLayout>
  );
}
