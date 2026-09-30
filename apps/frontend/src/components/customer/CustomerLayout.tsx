import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
import { MAIN_CONTENT_ID, SkipToContent } from "../layout/SkipToContent";
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
  Bell,
} from "lucide-react";
import { formatCurrency } from '@/lib/format';
import { customerPrimaryNavigation, isCustomerNavigationActive } from './customerNavigation';
import { PanelBrand } from '../layout/PanelBrand';

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
  const location = useLocation();
  const navigate = useNavigate();
  const { totalItems, openCart } = useCart();
  const { isStandalone } = useStandaloneMode();
  const isMobile = useIsMobile();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  if (!customer) return null;

  // Detectar se deve usar layout mobile: standalone mode OU tela pequena
  const useMobileLayout = isStandalone || isMobile;

  const legacyMenuItems = [
    {
      id: "dashboard",
      label: "Início",
      icon: Home,
      description: "Próximas ações",
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
    {
      id: "notifications",
      label: "Notificações",
      icon: Bell,
      description: "Atualizações importantes",
    },
    {
      id: "profile",
      label: "Meu Perfil",
      icon: User,
      description: "Dados pessoais e endereços",
    },
  ];
  const menuItems = customerPrimaryNavigation.map((navigation) => {
    const legacy = legacyMenuItems.find((item) => item.id === navigation.id)!;
    return { ...legacy, label: navigation.label };
  });

  const getInitials = (name?: string) => {
    if (!name) return "CL";
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
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

  const handleLogout = async () => {
    const source = new URLSearchParams(location.search).get("source");
    const isPwaSession = isStandalone || source?.startsWith("pwa");

    await logout();

    navigate(isPwaSession ? "/customer-login/?source=pwa-customer&redirect=%2Fcustomer" : "/", {
      replace: true,
    });
  };

  // MOBILE LAYOUT
  if (useMobileLayout) {
    return (
      <div className="panel-shell min-h-screen pb-20">
        {/* Banner de instalação PWA - só mostra se não estiver instalado */}

        <SkipToContent />

        {/* Header Mobile Compacto */}
        <header className="sticky top-0 z-10 border-b border-white/70 bg-white/85 shadow-sm backdrop-blur-xl">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <PanelBrand eyebrow="Sua garagem" title="M2 Cliente" className="[&_p:last-child]:!text-slate-900" />

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
        </header>

        {/* Main Content Mobile */}
        <main id={MAIN_CONTENT_ID} tabIndex={-1} className="panel-content px-4 py-5 outline-none">
          {children}
        </main>

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
    <div className="panel-shell min-h-screen">
      {/* Banner de instalação PWA - só mostra se não estiver instalado */}

      <SkipToContent />

      {/* Header com carrinho */}
      <header className="sticky top-0 z-10 border-b border-white/70 bg-white/80 shadow-sm backdrop-blur-xl">
        <div className="panel-content px-6 py-3">
          <div className="flex items-center justify-between">
            <PanelBrand eyebrow="M2 Center Auto" title="Painel do Cliente" className="[&_p:last-child]:!text-slate-900" />

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
      </header>

      <div className="panel-content px-4 py-6 lg:px-6 lg:py-8">
        {/* O layout mobile sai em 768px (useIsMobile), mas esta grid so
            dividia em `lg` (1024). Entre 768 e 1024 sobrava uma coluna so: o
            cartao de perfil e os 9 itens de menu ocupavam a tela inteira e o
            conteudo ficava abaixo de tudo. Dividir em `md` fecha essa faixa. */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[240px_minmax(0,1fr)] lg:grid-cols-[264px_minmax(0,1fr)] lg:gap-7">
          {/* Sidebar Desktop */}
          {/* `aside` em vez de `div`: o cartao de perfil e o menu ficavam fora
              de qualquer landmark, e o axe reportava cada no como `region`
              (A-02). `aside` e a regiao correta para conteudo complementar. */}
          <aside aria-label="Resumo da conta e menu" className="md:col-span-1">
            <div className="space-y-4">
              {/* Customer Info Card */}
              <Card className="overflow-hidden rounded-2xl border-white/80 bg-white/85 shadow-sm">
                <CardHeader className="bg-gradient-to-br from-slate-950 to-slate-800 pb-4 text-center text-white">
                  <Avatar className="mx-auto h-16 w-16 ring-4 ring-white/10">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-moria-orange text-white text-xl font-bold">
                      {getInitials(customer.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <CardTitle className="text-lg">{customer.name}</CardTitle>
                    <CardDescription className="text-sm text-slate-300">
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
                  <details className="group">
                    <summary className="cursor-pointer list-none rounded-md py-2 text-center text-sm font-medium text-muted-foreground hover:text-foreground">
                      <span className="group-open:hidden">Ver resumo da conta</span>
                      <span className="hidden group-open:inline">Ocultar resumo da conta</span>
                    </summary>
                    <div className="grid grid-cols-2 gap-4 pt-3 text-center">
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
                  </details>
                </CardContent>
              </Card>

              {/* Navigation Menu */}
              <Card className="rounded-2xl border-white/80 bg-white/85 shadow-sm">
                <CardHeader className="px-4 pb-2 pt-4">
                  <CardTitle className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Navegação</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <nav>
                    {/* `ul/li` para o leitor anunciar tamanho e posicao do item
                        (A-16); o `space-y-1` acompanha a lista, que passou a
                        ser o filho direto do nav. */}
                    <ul className="m-0 list-none space-y-1 p-0">
                      {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = isCustomerNavigationActive(item.id, currentTab);

                        return (
                          <li key={item.id}>
                            <Button
                              variant={isActive ? "secondary" : "ghost"}
                              aria-current={isActive ? "page" : undefined}
                            className={`h-11 w-full justify-start rounded-xl px-4 ${
                                isActive
                                  ? "bg-slate-950 text-white shadow-sm hover:bg-slate-900 hover:text-white"
                                  : "text-slate-600 hover:bg-primary/10 hover:text-primary"
                              }`}
                              onClick={() => onTabChange(item.id)}
                            >
                              <Icon className="mr-3 h-4 w-4 shrink-0" />
                              <span className="truncate font-medium">{item.label}</span>
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  </nav>

                  <Separator className="my-2" />

                  <div className="p-4">
                    <Button
                      variant="outline"
                      className="w-full border-primary/20 text-primary hover:text-primary-hover hover:bg-primary/10"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      Sair da Conta
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </aside>

          {/* Main Content Desktop */}
          <main
            id={MAIN_CONTENT_ID}
            tabIndex={-1}
            className="min-w-0 outline-none"
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
