import { useCallback, useEffect, useState } from "react";
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
  ShoppingBag,
  Calendar
} from "lucide-react";
import { formatCurrency } from '@/lib/format';
import { PanelPageHeader } from '../layout/PanelPageHeader';

interface CustomerDashboardProps {
  onTabChange: (tab: string) => void;
  onBrowseProducts: () => void;
}

export function CustomerDashboard({ onTabChange, onBrowseProducts }: CustomerDashboardProps) {
  const { customer, getOrders } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [couponsCount, setCouponsCount] = useState(0);
  const [loadError, setLoadError] = useState(false);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);

    const [ordersResult, favoritesResult, couponsResult] = await Promise.allSettled([
      getOrders(),
      favoriteService.getFavoriteCount(),
      couponService.getActiveCouponCount(),
    ]);

    let hasError = false;

    if (ordersResult.status === "fulfilled" && ordersResult.value.success) {
      setOrders((ordersResult.value.data || []).slice(0, 3));
    } else {
      hasError = true;
    }

    if (favoritesResult.status === "fulfilled") {
      setFavoritesCount(favoritesResult.value);
    } else {
      hasError = true;
    }

    if (couponsResult.status === "fulfilled") {
      setCouponsCount(couponsResult.value);
    } else {
      hasError = true;
    }

    setLoadError(hasError);
    setIsLoading(false);
  }, [getOrders]);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  if (!customer) return null;


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
      action: onBrowseProducts
    },
    {
      title: 'Rastrear Pedido',
      description: 'Acompanhar entrega',
      icon: Truck,
      color: 'bg-green-500',
      action: () => onTabChange('orders')
    },
    {
      title: 'Cuidar do Veículo',
      description: 'Agendar ou acompanhar revisão',
      icon: Calendar,
      color: 'bg-orange-500',
      action: () => onTabChange('revisions')
    }
  ];

  return (
    <div className="space-y-6">
      {loadError && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-medium">Algumas informações não puderam ser atualizadas</p>
              <p className="text-sm text-amber-800">Você ainda pode usar o painel normalmente ou tentar carregar novamente.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadDashboardData()}>
            Tentar novamente
          </Button>
        </div>
      )}
      <PanelPageHeader
        icon={ShoppingBag}
        title={`Olá, ${customer.name?.split(' ')[0] || 'Cliente'}!`}
        description="Bem-vindo ao seu painel do cliente"
        badge={<Badge variant="secondary" className="shrink-0 bg-moria-orange/10 text-moria-orange">
              Cliente {membership.current}
            </Badge>}
      />

      <Card className="border-moria-orange/20 bg-gradient-to-br from-white to-orange-50/50">
        <CardHeader>
          <CardTitle as="h2">O que você quer fazer?</CardTitle>
          <CardDescription>
            Escolha um objetivo. Você chega à ação principal em até três passos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.title}
                  type="button"
                  onClick={action.action}
                  className="group flex min-h-24 items-center gap-4 rounded-xl border bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-moria-orange/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moria-orange"
                >
                  <span className={`${action.color} rounded-xl p-3 text-white`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-gray-900">{action.title}</span>
                    <span className="block text-sm text-muted-foreground">{action.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <details className="group rounded-xl border bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-semibold marker:content-none sm:px-6">
          <span>Meu resumo e benefícios</span>
          <span className="text-sm font-normal text-muted-foreground group-open:hidden">Mostrar</span>
          <span className="hidden text-sm font-normal text-muted-foreground group-open:inline">Ocultar</span>
        </summary>
        <div className="space-y-6 border-t p-4 sm:p-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 nb:grid-cols-4">
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
              <Heart className="h-8 w-8 text-moria-orange" />
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

      <div className="grid grid-cols-1 gap-6">
        {/* Membership Progress */}
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="flex items-center">
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

      </div>
        </div>
      </details>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle as="h2" className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center">
              <Package className="mr-2 h-5 w-5" />
              Pedidos Recentes
            </span>
            <Button variant="outline" size="sm" onClick={() => onTabChange('orders')}>
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
              <Button variant="outline" className="mt-4" onClick={onBrowseProducts}>
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
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 h-auto"
                          onClick={() => onTabChange('orders')}
                        >
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
