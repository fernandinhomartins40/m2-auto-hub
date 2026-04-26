import { Link } from "react-router-dom";
import {
  BarChart3,
  ClipboardCheck,
  FileText,
  Gift,
  Home,
  LayoutDashboard,
  LogOut,
  Package,
  Palette,
  Settings,
  ShoppingCart,
  Smartphone,
  TrendingUp,
  User,
  UserCog,
  Users,
  Wrench,
} from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "orders", label: "Pedidos", icon: ShoppingCart },
  { id: "quotes", label: "Orçamentos", icon: FileText },
  { id: "revisions", label: "Revisões", icon: ClipboardCheck },
  { id: "customers", label: "Clientes", icon: Users },
  { id: "products", label: "Produtos", icon: Package },
  { id: "services", label: "Serviços", icon: Wrench },
  { id: "coupons", label: "Cupons", icon: Gift },
  { id: "promotions", label: "Promoções", icon: TrendingUp },
  { id: "reports", label: "Relatórios", icon: BarChart3 },
  { id: "users", label: "Usuários", icon: UserCog, requiresPermission: "canManageAdmins" },
  { id: "landing-page", label: "Landing Page", icon: Palette },
  { id: "pwa-settings", label: "PWA", icon: Smartphone },
  { id: "settings", label: "Configurações", icon: Settings },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { admin, logout } = useAdminAuth();
  const permissions = useAdminPermissions();

  return (
    <div className="bg-moria-black fixed bottom-0 left-0 right-0 z-50 flex flex-col border-t border-gray-700 text-white md:relative md:h-screen md:w-64 md:border-t-0">
      <div className="hidden border-b border-gray-700 p-4 md:block">
        <h2 className="text-lg font-bold leading-tight">Painel do Lojista</h2>
      </div>

      <nav className="sidebar-scrollbar flex overflow-x-auto p-2 md:flex-1 md:overflow-x-visible md:overflow-y-auto md:p-4">
        <div className="flex w-full gap-1 md:flex-col md:gap-2">
          {menuItems.map((item) => {
            if (item.requiresPermission && !(permissions as any)[item.requiresPermission]) {
              return null;
            }

            const IconComponent = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "flex min-w-[60px] flex-col items-center justify-center space-y-1 rounded-lg px-2 py-2 text-center transition-all duration-200 md:min-w-0 md:flex-row md:justify-start md:space-x-3 md:space-y-0 md:px-3 md:py-3 md:text-left",
                  isActive
                    ? "bg-moria-orange text-white shadow-lg"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                )}
              >
                <IconComponent className="h-5 w-5 flex-shrink-0" />
                <span className="text-[10px] font-medium md:text-sm">{item.label}</span>
                {isActive ? <div className="ml-auto hidden h-2 w-2 rounded-full bg-white md:block" /> : null}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="hidden space-y-2 border-t border-gray-700 p-4 md:block">
        {admin ? (
          <div className="mb-4 rounded-xl border border-gray-700 bg-gray-800/40 p-3">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-moria-orange">
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{admin.name}</p>
                <p className="truncate text-xs text-gray-400">{admin.role.replace(/_/g, " ")}</p>
              </div>
            </div>
          </div>
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
