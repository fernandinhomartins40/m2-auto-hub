import { useState } from "react";
import {
  BarChart3,
  ClipboardCheck,
  FileText,
  HeartHandshake,
  LayoutDashboard,
  Menu,
  Package,
  Palette,
  Percent,
  Settings,
  ShoppingBag,
  Smartphone,
  Tag,
  UserCog,
  Users,
  Wrench,
} from "lucide-react";
import { AdminContent } from "../components/admin/AdminContent";
import { ProtectedAdminRoute } from "../components/admin/ProtectedAdminRoute";
import MechanicPanel from "../components/mechanic/MechanicPanel";
import StoreLayout from "../components/store/StoreLayout";
import { useAdminAuth } from "../contexts/AdminAuthContext";
import "../styles/lojista.css";
import "../styles/store.css";
import "../styles/store-mobile.css";
import "../styles/store-animations.css";

export default function StorePanel() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { admin, logout } = useAdminAuth();

  if (admin?.role === "STAFF") {
    return (
      <ProtectedAdminRoute>
        <MechanicPanel />
      </ProtectedAdminRoute>
    );
  }

  const bottomNavItems = [
    { id: "dashboard", label: "Início", icon: LayoutDashboard },
    { id: "orders", label: "Pedidos", icon: ShoppingBag },
    { id: "quotes", label: "Orçamentos", icon: FileText },
    { id: "products", label: "Produtos", icon: Package },
    { id: "menu", label: "Mais", icon: Menu },
  ];

  const drawerItems = [
    { id: "services", label: "Serviços", icon: Wrench },
    { id: "revisions", label: "Revisões", icon: ClipboardCheck },
    { id: "customers", label: "Clientes", icon: Users },
    { id: "relationship", label: "Relacionamento", icon: HeartHandshake },
    { id: "coupons", label: "Cupons", icon: Tag },
    { id: "promotions", label: "Promoções", icon: Percent },
    { id: "users", label: "Usuários", icon: UserCog, requiresPermission: "canManageAdmins" },
    { id: "reports", label: "Relatórios", icon: BarChart3 },
    { id: "landing-page", label: "Landing Page", icon: Palette },
    { id: "pwa-settings", label: "PWA", icon: Smartphone },
    { id: "settings", label: "Configurações", icon: Settings },
  ];

  return (
    <ProtectedAdminRoute>
      <StoreLayout
        currentTab={activeTab}
        onTabChange={setActiveTab}
        bottomNavItems={bottomNavItems}
        drawerItems={drawerItems}
        adminName={admin?.name}
        adminEmail={admin?.email}
        variant="admin"
        onLogout={logout}
      >
        <div className="lojista-header desktop-only">
          <div>
            <h1 className="lojista-title">{getPageTitle(activeTab)}</h1>
            <p className="lojista-subtitle">{getPageDescription(activeTab)}</p>
          </div>
        </div>

        <div className="lojista-fade-in">
          <AdminContent activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </StoreLayout>
    </ProtectedAdminRoute>
  );
}

function getPageTitle(tab: string): string {
  const titles: Record<string, string> = {
    dashboard: "Dashboard",
    orders: "Pedidos",
    quotes: "Orçamentos",
    revisions: "Revisões Veiculares",
    customers: "Clientes",
    relationship: "Relacionamento com Clientes",
    products: "Produtos",
    services: "Serviços",
    coupons: "Cupons",
    promotions: "Promoções",
    reports: "Relatórios",
    users: "Gestão de Usuários",
    "landing-page": "Editor da Landing Page",
    "pwa-settings": "Configurações do PWA",
    settings: "Configurações",
  };

  return titles[tab] || "Dashboard";
}

function getPageDescription(tab: string): string {
  const descriptions: Record<string, string> = {
    dashboard: "Visão geral dos pedidos e métricas da loja",
    orders: "Gerencie todos os pedidos com produtos",
    quotes: "Gerencie todas as solicitações de orçamento para serviços",
    revisions: "Gerencie revisões veiculares com checklist completo",
    customers: "Visualize os clientes cadastrados automaticamente",
    relationship: "Acompanhe aniversariantes, inatividade e oportunidades de pós-venda",
    products: "Gerencie o catálogo e estoque de produtos",
    services: "Cadastre e gerencie os serviços oferecidos",
    coupons: "Crie e gerencie cupons de desconto para os clientes",
    promotions: "Configure ofertas especiais e campanhas",
    reports: "Relatórios de vendas e análises detalhadas",
    users: "Gerencie usuários administrativos, mecânicos e permissões do sistema",
    "landing-page": "Configure todos os elementos visuais da página inicial",
    "pwa-settings": "Gerencie manifesto, ícones e instalação do aplicativo",
    settings: "Configurações do sistema e preferências gerais",
  };

  return descriptions[tab] || "Painel administrativo da M2 Center Auto";
}
