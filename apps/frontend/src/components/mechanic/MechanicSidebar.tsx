import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardCheck,
  ClipboardList,
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

interface MechanicSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const menuItems = [
  { id: "revisions", label: "Minhas Revisoes", icon: ClipboardCheck },
  { id: "service-orders", label: "Minhas OS", icon: ClipboardList },
  { id: "settings", label: "Perfil", icon: Settings },
];

export function MechanicSidebar({ activeTab, onTabChange }: MechanicSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { admin, logout } = useAdminAuth();

  return (
    <div
      className={cn(
        "bg-moria-black text-white transition-all duration-300 flex flex-col h-screen",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className={cn("flex items-center space-x-3", isCollapsed && "justify-center")}>
            {!isCollapsed ? (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-hover text-sm font-black tracking-[0.22em] text-white shadow-lg">
                  M2
                </div>
                <div>
                  <h2 className="font-bold text-lg">Painel Oficina</h2>
                  <p className="text-xs uppercase tracking-[0.26em] text-gray-400">M2 Center Auto</p>
                </div>
              </>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-hover text-sm font-black tracking-[0.22em] text-white shadow-lg">
                M2
              </div>
            )}
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
        <div className="p-4 border-b border-gray-700">
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

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200 text-left",
                isActive
                  ? "bg-moria-orange text-white shadow-lg"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white",
                isCollapsed && "justify-center px-2"
              )}
            >
              <IconComponent className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span className="font-medium">{item.label}</span>}
              {isActive && !isCollapsed && <div className="ml-auto w-2 h-2 bg-white rounded-full" />}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-700 space-y-2">
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
