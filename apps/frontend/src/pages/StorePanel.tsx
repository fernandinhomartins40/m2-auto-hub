import { useState } from "react";
import {
  BarChart3,
  ClipboardCheck,
  FileText,
  Gift,
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
    { id: "dashboard", label: "Inicio", icon: LayoutDashboard },
    { id: "orders", label: "Pedidos", icon: ShoppingBag },
    { id: "quotes", label: "Orcamentos", icon: FileText },
    { id: "products", label: "Produtos", icon: Package },
    { id: "menu", label: "Mais", icon: Menu },
  ];

  const drawerItems = [
    { id: "services", label: "Servicos", icon: Wrench },
    { id: "revisions", label: "Revisoes", icon: ClipboardCheck },
    { id: "customers", label: "Clientes", icon: Users },
    { id: "relationship", label: "Relacionamento", icon: HeartHandshake },
    { id: "loyalty", label: "Fidelidade", icon: Gift },
    { id: "coupons", label: "Cupons", icon: Tag },
    { id: "promotions", label: "Promocoes", icon: Percent },
    { id: "users", label: "Usuarios", icon: UserCog, requiresPermission: "canManageAdmins" },
    { id: "reports", label: "Relatorios", icon: BarChart3 },
    { id: "landing-page", label: "Landing Page", icon: Palette },
    { id: "pwa-settings", label: "PWA", icon: Smartphone },
    { id: "settings", label: "Configuracoes", icon: Settings },
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
    quotes: "Orcamentos",
    revisions: "Revisoes Veiculares",
    customers: "Clientes",
    relationship: "Relacionamento com Clientes",
    loyalty: "Programa de Fidelidade",
    products: "Produtos",
    services: "Servicos",
    coupons: "Cupons",
    promotions: "Promocoes",
    reports: "Relatorios",
    users: "Gestao de Usuarios",
    "landing-page": "Editor da Landing Page",
    "pwa-settings": "Configuracoes do PWA",
    settings: "Configuracoes",
  };

  return titles[tab] || "Dashboard";
}

function getPageDescription(tab: string): string {
  const descriptions: Record<string, string> = {
    dashboard: "Visao geral dos pedidos e metricas da loja",
    orders: "Gerencie todos os pedidos com produtos",
    quotes: "Gerencie todas as solicitacoes de orcamento para servicos",
    revisions: "Gerencie revisoes veiculares com checklist completo",
    customers: "Visualize os clientes cadastrados automaticamente",
    relationship: "Acompanhe aniversariantes, inatividade e oportunidades de pos-venda",
    loyalty: "Configure pontuacao, recompensas, resgates e operacao do clube de fidelidade",
    products: "Gerencie o catalogo e estoque de produtos",
    services: "Cadastre e gerencie os servicos oferecidos",
    coupons: "Crie e gerencie cupons de desconto para os clientes",
    promotions: "Configure ofertas especiais e campanhas",
    reports: "Relatorios de vendas e analises detalhadas",
    users: "Gerencie usuarios administrativos, mecanicos e permissoes do sistema",
    "landing-page": "Configure todos os elementos visuais da pagina inicial",
    "pwa-settings": "Gerencie manifesto, icones e instalacao do aplicativo",
    settings: "Configuracoes do sistema e preferencias gerais",
  };

  return descriptions[tab] || "Painel administrativo da M2 Center Auto";
}
