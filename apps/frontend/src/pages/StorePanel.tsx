import { useState } from "react";

import { AdminContent } from "../components/admin/AdminContent";
import {
  adminBottomNavItems,
  adminSidebarItems,
} from "../components/admin/adminNavigation";
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

  return (
    <ProtectedAdminRoute>
      <StoreLayout
        currentTab={activeTab}
        onTabChange={setActiveTab}
        bottomNavItems={adminBottomNavItems}
        drawerItems={adminSidebarItems}
        adminName={admin?.name}
        adminEmail={admin?.email}
        variant="admin"
        onLogout={logout}
      >
        <div className="lojista-header desktop-only min-w-0 max-w-full">
          <div>
            <h1 className="lojista-title">{getPageTitle(activeTab)}</h1>
            <p className="lojista-subtitle">{getPageDescription(activeTab)}</p>
          </div>
        </div>

        <div className="lojista-fade-in min-w-0 max-w-full overflow-x-hidden">
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
    support: "Central de Suporte",
    loyalty: "Programa de Fidelidade",
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
    support: "Atenda tickets, troque mensagens pelo painel e migre conversas para WhatsApp quando necessário",
    loyalty: "Configure pontuação, recompensas, resgates e operação do clube de fidelidade",
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
