import { useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ClipboardCheck, ClipboardList, LogOut, User } from "lucide-react";
import { MechanicContent } from "./MechanicContent";
import { mechanicSlugFromTab, mechanicTabFromSlug } from "./mechanicNavigation";
import StoreLayout from "../store/StoreLayout";
import { useAdminAuth } from "../../contexts/AdminAuthContext";
import "../../styles/lojista.css";
import "../../styles/store.css";
import "../../styles/store-mobile.css";
import "../../styles/store-animations.css";

export default function MechanicPanel() {
  const navigate = useNavigate();
  const { tab: tabSlug } = useParams<{ tab: string }>();
  const { admin, logout } = useAdminAuth();

  // A URL é a fonte de verdade da aba, para o voltar do celular funcionar e a
  // tela sobreviver a um recarregamento.
  const activeTab = mechanicTabFromSlug(tabSlug);

  const handleTabChange = useCallback(
    (tab: string) => {
      navigate(`/mechanic-panel/${mechanicSlugFromTab(tab)}`);
    },
    [navigate]
  );

  useEffect(() => {
    if (tabSlug && mechanicSlugFromTab(activeTab) !== tabSlug) {
      navigate(`/mechanic-panel/${mechanicSlugFromTab(activeTab)}`, { replace: true });
    }
  }, [tabSlug, activeTab, navigate]);

  // "Minhas OS" existia na sidebar do desktop mas ficava de fora da barra
  // inferior, deixando a tela inacessivel no celular.
  const bottomNavItems = [
    { id: "revisions", label: "Revisoes", icon: ClipboardCheck },
    { id: "service-orders", label: "Minhas OS", icon: ClipboardList },
    { id: "settings", label: "Perfil", icon: User },
    { id: "logout", label: "Sair", icon: LogOut },
  ];

  const drawerItems = [];

  return (
    <StoreLayout
      currentTab={activeTab}
      onTabChange={handleTabChange}
      bottomNavItems={bottomNavItems}
      drawerItems={drawerItems}
      adminName={admin?.name}
      adminEmail={admin?.email}
      variant="mechanic"
      onLogout={logout}
    >
      <div className="lojista-header desktop-only">
        <div>
          <h1 className="lojista-title">
            {getPageTitle(activeTab)}
          </h1>
          <p className="lojista-subtitle">
            {getPageDescription(activeTab)}
          </p>
        </div>
      </div>

      {/* No mobile o cabecalho acima sai por CSS (`desktop-only`, max-width
          768px) e o header do shell passou a ser so a marca, entao a rota
          ficava sem h1 (A-06). Este h1 nao aparece na tela — repetiria o
          titulo ja visivel — mas da a ancora de topo para navegacao por
          headings. O `md:hidden` casa com o mesmo limiar de 768px, para nunca
          existirem dois h1 ao mesmo tempo. */}
      <h1 className="sr-only md:hidden">{getPageTitle(activeTab)}</h1>

      <div className="lojista-fade-in">
        <MechanicContent activeTab={activeTab} />
      </div>
    </StoreLayout>
  );
}

function getPageTitle(tab: string): string {
  const titles: Record<string, string> = {
    revisions: "Minhas Revisoes",
    "service-orders": "Minhas Ordens de Servico",
    settings: "Perfil",
  };

  return titles[tab] || "Minhas Revisoes";
}

function getPageDescription(tab: string): string {
  const descriptions: Record<string, string> = {
    revisions: "Gerencie suas revisoes atribuidas e acompanhe o progresso",
    "service-orders": "Acompanhe as ordens de servico atribuidas a voce",
    settings: "Gerencie seu perfil, seguranca e preferencias",
  };

  return descriptions[tab] || "Painel da oficina M2 Center Auto";
}
