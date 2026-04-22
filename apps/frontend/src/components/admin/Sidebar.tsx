import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  TrendingUp,
  BarChart3,
  Settings,
  LogOut,
  Home,
  FileText,
  Wrench,
  Gift,
  ClipboardCheck,
  User,
  UserCog,
  Palette
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
  { id: "users", label: "Usuários", icon: UserCog, requiresPermission: 'canManageAdmins' },
  { id: "landing-page", label: "Landing Page", icon: Palette },
  { id: "settings", label: "Configurações", icon: Settings },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { admin, logout } = useAdminAuth();
  const permissions = useAdminPermissions();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="bg-moria-black text-white flex flex-col fixed md:relative bottom-0 left-0 right-0 md:h-screen md:w-64 z-50 border-t md:border-t-0 border-gray-700">
      {/* Header - Hidden on Mobile */}
      <div className="hidden md:block p-4 border-b border-gray-700">
        <div className="flex flex-col items-center space-y-2">
          <img
            src="/logo_moria.png"
            alt="Moria"
            className="h-12 w-auto"
          />
          <h2 className="font-bold text-lg">Painel Lojista</h2>
        </div>
      </div>

      {/* Admin Info - Hidden on Mobile */}
      {admin && (
        <div className="hidden md:block p-4 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-moria-orange rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{admin.name}</p>
              <p className="text-xs text-gray-400 truncate">{admin.role.replace(/_/g, " ")}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation - Horizontal on Mobile, Vertical on Desktop */}
      <nav className="flex md:flex-1 overflow-x-auto md:overflow-y-auto md:overflow-x-visible p-2 md:p-4 md:space-y-2 sidebar-scrollbar">
        <div className="flex md:flex-col gap-1 md:gap-2 w-full">
          {menuItems.map((item) => {
            // Filter menu items by permissions
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
                  "flex flex-col md:flex-row items-center justify-center md:justify-start space-y-1 md:space-y-0 md:space-x-3 px-2 md:px-3 py-2 md:py-3 rounded-lg transition-all duration-200 text-center md:text-left min-w-[60px] md:min-w-0",
                  isActive
                    ? "bg-moria-orange text-white shadow-lg"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                )}
              >
                <IconComponent className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium text-[10px] md:text-sm">{item.label}</span>
                {isActive && (
                  <div className="hidden md:block ml-auto w-2 h-2 bg-white rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer Actions - Hidden on Mobile */}
      <div className="hidden md:block p-4 border-t border-gray-700 space-y-2">
        <Link to="/">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            <Home className="h-5 w-5 flex-shrink-0" />
            <span className="ml-3">Voltar ao Site</span>
          </Button>
        </Link>

        <Button
          variant="ghost"
          className="w-full justify-start text-gray-300 hover:bg-gray-700 hover:text-red-400"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          <span className="ml-3">Sair</span>
        </Button>
      </div>
    </div>
  );
}
