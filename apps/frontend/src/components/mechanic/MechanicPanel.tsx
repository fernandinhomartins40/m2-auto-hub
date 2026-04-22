import { useState } from "react";
import { ClipboardCheck, LogOut, User } from "lucide-react";
import { MechanicContent } from "./MechanicContent";
import StoreLayout from "../store/StoreLayout";
import { useAdminAuth } from "../../contexts/AdminAuthContext";
import "../../styles/lojista.css";
import "../../styles/store.css";
import "../../styles/store-mobile.css";
import "../../styles/store-animations.css";

export default function MechanicPanel() {
  const [activeTab, setActiveTab] = useState("revisions");
  const { admin, logout } = useAdminAuth();

  const bottomNavItems = [
    { id: "revisions", label: "Revisoes", icon: ClipboardCheck },
    { id: "settings", label: "Perfil", icon: User },
    { id: "logout", label: "Sair", icon: LogOut },
  ];

  const drawerItems = [];

  return (
    <StoreLayout
      currentTab={activeTab}
      onTabChange={setActiveTab}
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

      <div className="lojista-fade-in">
        <MechanicContent activeTab={activeTab} />
      </div>
    </StoreLayout>
  );
}

function getPageTitle(tab: string): string {
  const titles: Record<string, string> = {
    revisions: "Minhas Revisoes",
    settings: "Perfil",
  };

  return titles[tab] || "Minhas Revisoes";
}

function getPageDescription(tab: string): string {
  const descriptions: Record<string, string> = {
    revisions: "Gerencie suas revisoes atribuidas e acompanhe o progresso",
    settings: "Gerencie seu perfil, seguranca e preferencias",
  };

  return descriptions[tab] || "Painel da oficina M2 Center Auto";
}
