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
        {/* O título da seção vem do AdminPageHeader de cada tela — todas as 17
            têm o seu. Um cabeçalho aqui duplicava o texto na tela. */}
        <div className="lojista-fade-in min-w-0 max-w-full overflow-x-hidden">
          <AdminContent activeTab={activeTab} onTabChange={handleTabChange} />
        </div>
      </StoreLayout>

      <PlateLookupOverlay isOpen={plateLookupOpen} onClose={() => setPlateLookupOpen(false)} />
    </ProtectedAdminRoute>
  );
}
