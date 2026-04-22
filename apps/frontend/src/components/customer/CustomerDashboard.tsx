import { useState, useEffect } from "react";
import { useAuth, Order } from "../../contexts/AuthContext";
import { favoriteService, couponService } from "../../api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { Progress } from "../ui/progress";
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  Heart,
  Gift,
  Star,
  TrendingUp,
  AlertCircle,
  MessageCircle,
  ShoppingBag,
  Calendar
} from "lucide-react";

export function CustomerDashboard() {
  const { customer, getOrders } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [couponsCount, setCouponsCount] = useState(0);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Load orders
        const result = await getOrders();
        setOrders((result.data || []).slice(0, 3)); // Show only last 3 orders

        // Load favorites count
        try {
          const favCount = await favoriteService.getFavoriteCount();
          setFavoritesCount(favCount);
        } catch (error) {
          console.error('Error loading favorites count:', error);
        }

        // Load coupons count
        try {
          const couponCount = await couponService.getActiveCouponCount();
          setCouponsCount(couponCount);
        } catch (error) {
          console.error('Error loading coupons count:', error);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (!customer) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusInfo = (status: string) => {
    const statusMap = {
      pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      confirmed: { label: 'Confirmado', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      preparing: { label: 'Preparando', color: 'bg-orange-100 text-orange-800', icon: Package },
      shipped: { label: 'Enviado', color: 'bg-purple-100 text-purple-800', icon: Truck },
      delivered: { label: 'Entregue', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: AlertCircle },
    };
    return statusMap[status as keyof typeof statusMap] || statusMap.pending;
  };

  const getMembershipProgress = () => {
    const levels = [
      { name: 'Bronze', min: 0, max: 500 },
      { name: 'Silver', min: 500, max: 2000 },
      { name: 'Gold', min: 2000, max: 5000 },
      { name: 'Platinum', min: 5000, max: 10000 },
    ];

    const currentLevel = levels.find(level => 
      customer.totalSpent >= level.min && customer.totalSpent < level.max
    ) || levels[levels.length - 1];

    const nextLevel = levels.find(level => level.min > customer.totalSpent);
    
    if (!nextLevel) {
      return { current: 'Platinum', progress: 100, remaining: 0 };
    }

    const progress = ((customer.totalSpent - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100;
    const remaining = nextLevel.min - customer.totalSpent;

    return { current: currentLevel.name, next: nextLevel.name, progress, remaining };
  };

  const membership = getMembershipProgress();

  const quickActions = [
    {
      title: 'Nova Compra',
      description: 'Explorar produtos',
      icon: ShoppingBag,
      color: 'bg-blue-500',
      action: () => window.location.hash = '#pecas'
    },
    {
      title: 'Rastrear Pedido',
      description: 'Acompanhar entrega',
      icon: Truck,
      color: 'bg-green-500',
      action: () => {} // Tab change to orders
    },
    {
      title: 'Suporte',
      description: 'Falar com atendente',
      icon: MessageCircle,
      color: 'bg-orange-500',
      action: () => {} // Tab change to support
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">
                Olá, {customer.name?.split(' ')[0] || 'Cliente'}! 👋
              </CardTitle>
              <CardDescription className="text-lg">
                Bem-vindo ao seu painel do cliente
              </CardDescription>
            </div>
            <Badge variant="secondary" className="bg-moria-orange/10 text-moria-orange">
              Cliente {membership.current}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total de Pedidos</p>
                <p className="text-2xl font-bold">{customer.totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Gasto</p>
                <p className="text-2xl font-bold">{formatCurrency(customer.totalSpent)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Heart className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Favoritos</p>
                <p className="text-2xl font-bold">{favoritesCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Gift className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Cupons Disponíveis</p>
                <p className="text-2xl font-bold">{couponsCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Membership Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Star className="mr-2 h-5 w-5 text-yellow-500" />
              Programa de Fidelidade
            </CardTitle>
            <CardDescription>
              Seu progresso para o próximo nível
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Nível Atual: {membership.current}</span>
              {membership.next && (
                <span className="text-sm text-muted-foreground">
                  Próximo: {membership.next}
                </span>
              )}
            </div>
            
            <Progress value={membership.progress} className="h-2" />
            
            {membership.remaining > 0 && (
              <p className="text-sm text-muted-foreground">
                Faltam {formatCurrency(membership.remaining)} para o próximo nível
              </p>
            )}

            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm font-medium">Benefícios do seu nível:</p>
              <ul className="text-sm text-muted-foreground mt-1">
                <li>• Desconto de 5% em todas as compras</li>
                <li>• Frete grátis acima de R$ 200</li>
                <li>• Atendimento prioritário</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>
              Acesso direto às principais funcionalidades
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={index}
                    variant="outline"
                    className="w-full justify-start h-auto p-4"
                    onClick={action.action}
                  >
                    <div className={`${action.color} p-2 rounded-lg mr-4`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">{action.title}</div>
                      <div className="text-sm text-muted-foreground">{action.description}</div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Package className="mr-2 h-5 w-5" />
              Pedidos Recentes
            </span>
            <Button variant="outline" size="sm">
              Ver Todos
            </Button>
          </CardTitle>
          <CardDescription>
            Seus últimos pedidos e atualizações
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando pedidos...
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2">Nenhum pedido encontrado</p>
              <Button variant="outline" className="mt-4">
                Fazer Primeiro Pedido
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const statusInfo = getStatusInfo(order.status);
                const StatusIcon = statusInfo.icon;
                
                return (
                  <div key={order.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <StatusIcon className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Pedido #{order.id}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <Badge className={statusInfo.color} variant="secondary">
                          {statusInfo.label}
                        </Badge>
                        <p className="text-sm font-medium mt-1">
                          {formatCurrency(order.total)}
                        </p>
                      </div>
                    </div>
                    
                    <Separator className="my-3" />
                    
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
                      </p>
                      
                      {order.trackingCode && (
                        <Button variant="link" size="sm" className="p-0 h-auto">
                          Rastrear: {order.trackingCode}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
