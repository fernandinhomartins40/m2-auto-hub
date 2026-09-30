import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BriefcaseBusiness,
  Home,
  LogOut,
  Menu,
  Settings,
  User,
  X,
} from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { PanelBrand } from "../layout/PanelBrand";

interface MechanicSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const menuItems = [
  { id: "work", label: "Minha fila", icon: BriefcaseBusiness },
  { id: "settings", label: "Perfil", icon: Settings },
];

export function MechanicSidebar({ activeTab, onTabChange }: MechanicSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { admin, logout } = useAdminAuth();

  return (
    <div
      className={cn(
        "panel-sidebar text-white transition-all duration-300 flex flex-col h-screen",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      <div className="border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className={cn("flex items-center space-x-3", isCollapsed && "justify-center")}>
            <PanelBrand eyebrow="M2 Center Auto" title="Painel Oficina" compact={isCollapsed} />
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-gray-400 hover:text-white hover:bg-gray-700"
          >
            {isCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {!isCollapsed && admin && (
        <div className="border-b border-white/10 p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-moria-orange rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{admin.name}</p>
              <p className="text-xs text-gray-400 truncate">Equipe Oficina</p>
            </div>
          </div>
        </div>
      )}

      {/* min-h-0: sem isso o flex-1 nao encolhe abaixo do conteudo e a lista
          estoura a altura da tela em notebook, escondendo os ultimos itens. */}
      <nav className="min-h-0 flex-1 overflow-y-auto p-4">
        {/* `ul/li` para o leitor anunciar tamanho e posicao do item (A-16). O
            `space-y-2` mudou do nav para a lista porque ele espaca filhos
            diretos, e agora o filho direto do nav e o proprio `ul`. */}
        <ul className="m-0 list-none space-y-2 p-0">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;

            return (
              <li key={item.id}>
                <button
                  onClick={() => onTabChange(item.id)}
                  /* Recolhida, a sidebar esconde o rotulo: sem isto o botao
                     chega sem nome no leitor de tela. */
                  aria-label={isCollapsed ? item.label : undefined}
                  title={isCollapsed ? item.label : undefined}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200 text-left",
                    isActive
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "text-slate-300 hover:bg-white/10 hover:text-white",
                    isCollapsed && "justify-center px-2"
                  )}
                >
                  <IconComponent className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && <span className="font-medium">{item.label}</span>}
                  {isActive && !isCollapsed && <div className="ml-auto w-2 h-2 bg-white rounded-full" />}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="space-y-2 border-t border-white/10 p-4">
        <Link to="/">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-gray-300 hover:bg-gray-700 hover:text-white",
              isCollapsed && "justify-center px-2"
            )}
          >
            <Home className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="ml-3">Voltar ao site</span>}
          </Button>
        </Link>

        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-gray-300 hover:bg-primary/10 hover:text-primary",
            isCollapsed && "justify-center px-2"
          )}
          onClick={logout}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && <span className="ml-3">Sair</span>}
        </Button>
      </div>
    </div>
  );
}
