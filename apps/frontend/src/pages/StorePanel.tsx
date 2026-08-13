import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { AdminContent } from "../components/admin/AdminContent";
import {
  adminBottomNavItems,
  adminSidebarItems,
  slugFromTab,
  tabFromSlug,
} from "../components/admin/adminNavigation";
import { ProtectedAdminRoute } from "../components/admin/ProtectedAdminRoute";
import { PlateLookupOverlay } from "../components/admin/PlateLookupOverlay";
import MechanicPanel from "../components/mechanic/MechanicPanel";
import StoreLayout from "../components/store/StoreLayout";
import { useAdminAuth } from "../contexts/AdminAuthContext";
import "../styles/lojista.css";
import "../styles/store.css";
import "../styles/store-mobile.css";
import "../styles/store-animations.css";

export default function StorePanel() {
  const navigate = useNavigate();
  const { tab: tabSlug } = useParams<{ tab: string }>();
  const [plateLookupOpen, setPlateLookupOpen] = useState(false);
  const { admin, logout } = useAdminAuth();

  // A URL é a fonte de verdade da aba: assim o voltar do celular funciona,
  // recarregar mantém a tela e cada seção pode ser compartilhada por link.
  const activeTab = tabFromSlug(tabSlug);

  // Slug desconhecido cai no dashboard, mas a URL precisa acompanhar - senão
  // fica uma rota inexistente na barra de endereços mostrando outra tela.
  useEffect(() => {
    if (tabSlug && slugFromTab(activeTab) !== tabSlug) {
      navigate(`/store-panel/${slugFromTab(activeTab)}`, { replace: true });
    }
  }, [tabSlug, activeTab, navigate]);

  const handleTabChange = useCallback(
    (tab: string) => {
      navigate(`/store-panel/${slugFromTab(tab)}`);
    },
    [navigate]
  );

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
        onTabChange={handleTabChange}
        bottomNavItems={adminBottomNavItems}
        drawerItems={adminSidebarItems}
        adminName={admin?.name}
        adminEmail={admin?.email}
        variant="admin"
        onLogout={logout}
        onPlateLookup={() => setPlateLookupOpen(true)}
      >
        <div className="lojista-header desktop-only min-w-0 max-w-full">
          <div>
            <h1 className="lojista-title">{getPageTitle(activeTab)}</h1>
            <p className="lojista-subtitle">{getPageDescription(activeTab)}</p>
          </div>
        </div>

        <div className="lojista-fade-in min-w-0 max-w-full overflow-x-hidden">
          <AdminContent activeTab={activeTab} onTabChange={handleTabChange} />
        </div>
      </StoreLayout>

      <PlateLookupOverlay isOpen={plateLookupOpen} onClose={() => setPlateLookupOpen(false)} />
    </ProtectedAdminRoute>
  );
}

function getPageTitle(tab: string): string {
  const titles: Record<string, string> = {
    dashboard: "Dashboard",
    orders: "Pedidos",
    quotes: "Orçamentos",
    "service-orders": "Ordens de Serviço",
    revisions: "Revisões Veiculares",
    customers: "Clientes",
    relationship: "Relacionamento com Clientes",
    support: "Central de Suporte",
    loyalty: "Programa de Fidelidade",
    products: "Produtos",
    services: "Serviços",
    marketplaces: "Marketplaces",
    coupons: "Cupons",
    promotions: "Promoções",
    account: "Minha Conta",
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
    "service-orders": "Acompanhe as ordens de serviço da oficina",
    revisions: "Gerencie revisões veiculares com checklist completo",
    customers: "Visualize os clientes cadastrados automaticamente",
    relationship: "Acompanhe aniversariantes, inatividade e oportunidades de pós-venda",
    support: "Atenda tickets, troque mensagens pelo painel e migre conversas para WhatsApp quando necessário",
    loyalty: "Configure pontuação, recompensas, resgates e operação do clube de fidelidade",
    products: "Gerencie o catálogo e estoque de produtos",
    services: "Cadastre e gerencie os serviços oferecidos",
    marketplaces: "Integre o catálogo com marketplaces e acompanhe os anúncios",
    coupons: "Crie e gerencie cupons de desconto para os clientes",
    promotions: "Configure ofertas especiais e campanhas",
    account: "Gerencie seus dados pessoais, senha e preferências",
    reports: "Relatórios de vendas e análises detalhadas",
    users: "Gerencie usuários administrativos, mecânicos e permissões do sistema",
    "landing-page": "Configure todos os elementos visuais da página inicial",
    "pwa-settings": "Gerencie manifesto, ícones e instalação do aplicativo",
    settings: "Configurações do sistema e preferências gerais",
  };

  return descriptions[tab] || "Painel administrativo da M2 Center Auto";
}
