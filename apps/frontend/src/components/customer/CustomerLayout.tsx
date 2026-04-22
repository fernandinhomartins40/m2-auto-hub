import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useCart } from "../../contexts/CartContext";
import { useStandaloneMode } from "../../hooks/useStandaloneMode";
import { useIsMobile } from "../../hooks/use-mobile";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Separator } from "../ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { BottomNavigation } from "./BottomNavigation";
import { MobileDrawer } from "./MobileDrawer";
import {
  User,
  Package,
  Heart,
  Home,
  LogOut,
  Gift,
  MessageCircle,
  ShoppingBag,
  TrendingUp,
  Calendar,
  ClipboardCheck,
  Car,
  ShoppingCart,
  FileText,
} from "lucide-react";

interface CustomerLayoutProps {
  children: React.ReactNode;
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export function CustomerLayout({
  children,
  currentTab,
  onTabChange,
}: CustomerLayoutProps) {
  const { customer, logout } = useAuth();
  const { totalItems, openCart } = useCart();
  const { isStandalone } = useStandaloneMode();
  const isMobile = useIsMobile();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  if (!customer) return null;

  // Detectar se deve usar layout mobile: standalone mode OU tela pequena
  const useMobileLayout = isStandalone || isMobile;

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: Home,
      description: "Visão geral da conta",
    },
    {
      id: "profile",
      label: "Meu Perfil",
      icon: User,
      description: "Dados pessoais e endereços",
    },
    {
      id: "orders",
      label: "Meus Pedidos",
      icon: Package,
      description: "Histórico e acompanhamento",
    },
    {
      id: "quotes",
      label: "Meus Orcamentos",
      icon: FileText,
      description: "Solicitacoes e aprovacoes",
    },
    {
      id: "vehicles",
      label: "Meus Veículos",
      icon: Car,
      description: "Gerencie seus veículos",
    },
    {
      id: "revisions",
      label: "Minhas Revisões",
      icon: ClipboardCheck,
      description: "Histórico de revisões veiculares",
    },
    {
      id: "favorites",
      label: "Favoritos",
      icon: Heart,
      description: "Produtos salvos",
    },
    {
      id: "coupons",
      label: "Cupons",
      icon: Gift,
      description: "Descontos disponíveis",
    },
    {
      id: "support",
      label: "Suporte",
      icon: MessageCircle,
      description: "Atendimento ao cliente",
    },
  ];

  const getInitials = (name?: string) => {
    if (!name) return "CL";
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getMembershipLevel = (totalSpent: number) => {
    if (totalSpent >= 5000)
      return { level: "Platinum", color: "bg-purple-100 text-purple-800" };
    if (totalSpent >= 2000)
      return { level: "Gold", color: "bg-yellow-100 text-yellow-800" };
    if (totalSpent >= 500)
      return { level: "Silver", color: "bg-gray-100 text-gray-800" };
    return { level: "Bronze", color: "bg-orange-100 text-orange-800" };
  };

  const membership = getMembershipLevel(customer.totalSpent);

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  // MOBILE LAYOUT
  if (useMobileLayout) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        {/* Banner de instalação PWA - só mostra se não estiver instalado */}

        {/* Header Mobile Compacto */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-bold text-gray-800">
                Moria Cliente
              </h1>

              <Button
                variant="ghost"
                size="icon"
                onClick={openCart}
                className="relative hover:text-moria-orange"
                title="Ver carrinho"
              >
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-moria-orange text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                    {totalItems}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Mobile */}
        <div className="px-4 py-4">{children}</div>

        {/* Bottom Navigation */}
        <BottomNavigation
          currentTab={currentTab}
          onTabChange={onTabChange}
          onMenuClick={() => setIsDrawerOpen(true)}
        />

        {/* Mobile Drawer */}
        <MobileDrawer
          open={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          customer={customer}
          currentTab={currentTab}
          onTabChange={onTabChange}
          onLogout={handleLogout}
        />
      </div>
    );
  }

  // DESKTOP LAYOUT (Original)
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner de instalação PWA - só mostra se não estiver instalado */}

      {/* Header com carrinho */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-800">
              Painel do Cliente
            </h1>

            <Button
              variant="ghost"
              size="icon"
              onClick={openCart}
              className="relative hover:text-moria-orange"
              title="Ver carrinho"
            >
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-moria-orange text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                  {totalItems}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Desktop */}
          <div className="lg:col-span-1">
            <div className="space-y-4">
              {/* Customer Info Card */}
              <Card>
                <CardHeader className="text-center pb-4">
                  <Avatar className="mx-auto w-20 h-20">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-moria-orange text-white text-xl font-bold">
                      {getInitials(customer.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <CardTitle className="text-lg">{customer.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {customer.email}
                    </CardDescription>
                    <Badge
                      className={`text-xs ${membership.color}`}
                      variant="secondary"
                    >
                      Cliente {membership.level}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="flex items-center justify-center text-moria-orange">
                        <ShoppingBag className="w-4 h-4 mr-1" />
                        <span className="text-lg font-bold">
                          {customer.totalOrders}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">Pedidos</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center text-green-600">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        <span className="text-lg font-bold">
                          {formatCurrency(customer.totalSpent)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Gasto Total
                      </p>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4 mr-2" />
                    Cliente desde{" "}
                    {new Date(customer.createdAt).toLocaleDateString("pt-BR", {
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Navigation Menu */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Menu</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <nav className="space-y-1">
                    {menuItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentTab === item.id;

                      return (
                        <Button
                          key={item.id}
                          variant={isActive ? "secondary" : "ghost"}
                          className={`w-full justify-start h-auto p-4 ${
                            isActive
                              ? "bg-moria-orange/10 text-moria-orange border-r-2 border-moria-orange"
                              : "hover:bg-moria-orange/5"
                          }`}
                          onClick={() => onTabChange(item.id)}
                        >
                          <Icon className="w-4 h-4 mr-3" />
                          <div className="text-left">
                            <div className="font-medium">{item.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.description}
                            </div>
                          </div>
                        </Button>
                      );
                    })}
                  </nav>

                  <Separator className="my-2" />

                  <div className="p-4">
                    <Button
                      variant="outline"
                      className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sair da Conta
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Content Desktop */}
          <div className="lg:col-span-3">{children}</div>
        </div>
      </div>
    </div>
  );
}
