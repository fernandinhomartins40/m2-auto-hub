import { Link } from "react-router-dom";
import { Camera, Home, LogOut, User } from "lucide-react";

import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";

import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { adminSidebarItems } from "./adminNavigation";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onPlateLookup?: () => void;
}

export function Sidebar({ activeTab, onTabChange, onPlateLookup }: SidebarProps) {
  const { admin, logout } = useAdminAuth();
  const permissions = useAdminPermissions();

  const visibleItems = adminSidebarItems.filter(
    (item) => !item.requiresPermission || (permissions as any)[item.requiresPermission]
  );

  const groupedItems = visibleItems.reduce<Record<string, typeof visibleItems>>((acc, item) => {
    const section = item.section || "Outros";
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(item);
    return acc;
  }, {});

  return (
    <div className="bg-moria-black fixed bottom-0 left-0 right-0 z-50 flex flex-col border-t border-gray-700 text-white md:relative md:h-screen md:w-72 md:border-t-0">
      <div className="hidden border-b border-gray-700 px-5 py-5 md:block">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
          Gestão da Loja
        </p>
        <h2 className="mt-2 text-lg font-bold leading-tight text-white">Painel do Lojista</h2>
      </div>

      <nav className="sidebar-scrollbar flex overflow-x-auto p-2 md:flex-1 md:overflow-x-visible md:overflow-y-auto md:px-3 md:py-4">
        <div className="flex w-full gap-1 md:flex-col md:gap-3">
          {onPlateLookup && (
            <button
              onClick={onPlateLookup}
              className="flex min-w-[64px] flex-col items-center justify-center space-y-1 rounded-xl border border-moria-orange/40 bg-moria-orange/10 px-2 py-2 text-center text-moria-orange transition-all duration-200 hover:bg-moria-orange hover:text-white md:flex-row md:justify-start md:space-x-3 md:space-y-0 md:px-3 md:py-3 md:text-left"
            >
              <Camera className="h-5 w-5 flex-shrink-0" />
              <span className="text-[10px] font-semibold md:text-sm">Consulta por Placa</span>
            </button>
          )}

          {Object.entries(groupedItems).map(([section, items]) => (
            <div
              key={section}
              className="md:rounded-2xl md:border md:border-gray-800 md:bg-gray-900/35 md:p-2"
            >
              <div className="mb-2 hidden px-2 pt-1 md:block">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                  {section}
                </p>
              </div>

              <div className="flex w-full gap-1 md:flex-col md:gap-1">
                {items.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => onTabChange(item.id)}
                      className={cn(
                        "flex min-w-[64px] flex-col items-center justify-center space-y-1 rounded-xl px-2 py-2 text-center transition-all duration-200 md:min-w-0 md:flex-row md:justify-start md:space-x-3 md:space-y-0 md:px-3 md:py-3 md:text-left",
                        isActive
                          ? "bg-moria-orange text-white shadow-lg shadow-orange-500/15"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white"
                      )}
                    >
                      <IconComponent className="h-5 w-5 flex-shrink-0" />
                      <span className="text-[10px] font-medium md:text-sm">{item.label}</span>
                      {isActive ? (
                        <div className="ml-auto hidden h-2 w-2 rounded-full bg-white md:block" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      <div className="hidden space-y-2 border-t border-gray-700 p-4 md:block">
        {admin ? (
          <button
            type="button"
            onClick={() => onTabChange("account")}
            className="mb-4 w-full rounded-xl border border-gray-700 bg-gray-800/40 p-3 text-left transition-colors hover:border-moria-orange/40 hover:bg-gray-800"
          >
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-moria-orange">
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{admin.name}</p>
                <p className="truncate text-xs text-gray-400">{admin.role.replace(/_/g, " ")}</p>
              </div>
            </div>
          </button>
        ) : null}

        <Link to="/">
          <Button variant="ghost" className="w-full justify-start text-gray-300 hover:bg-gray-700 hover:text-white">
            <Home className="h-5 w-5 flex-shrink-0" />
            <span className="ml-3">Voltar ao Site</span>
          </Button>
        </Link>

        <Button
          variant="ghost"
          className="w-full justify-start text-gray-300 hover:bg-primary/10 hover:text-primary"
          onClick={logout}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          <span className="ml-3">Sair</span>
        </Button>
      </div>
    </div>
  );
}
