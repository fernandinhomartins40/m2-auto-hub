import { Home, Package, Car, MessageCircle, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { isCustomerNavigationActive } from './customerNavigation';

export interface BottomNavItem {
  id: string;
  label: string;
  icon: typeof Home;
}

interface BottomNavigationProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onMenuClick: () => void;
}

export function BottomNavigation({
  currentTab,
  onTabChange,
  onMenuClick,
}: BottomNavigationProps) {
  const navItems: BottomNavItem[] = [
    { id: "dashboard", label: "Início", icon: Home },
    { id: "orders", label: "Compras", icon: Package },
    { id: "vehicles", label: "Veículo", icon: Car },
    { id: "support", label: "Ajuda", icon: MessageCircle },
    { id: "menu", label: "Mais", icon: Menu },
  ];

  const handleClick = (itemId: string) => {
    if (itemId === "menu") {
      onMenuClick();
    } else {
      onTabChange(itemId);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
      {/* `ul/li` para o leitor anunciar tamanho e posicao (A-16). O `li` usa
          `contents` para nao entrar como faixa extra na grid de 5 colunas. */}
      <ul className="m-0 grid h-16 list-none grid-cols-5 p-0">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id !== 'menu' && isCustomerNavigationActive(item.id, currentTab);

          return (
            <li key={item.id} className="contents">
            <button
              onClick={() => handleClick(item.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors touch-manipulation",
                isActive
                  ? "text-moria-orange"
                  : "text-gray-500 hover:text-gray-700 active:bg-gray-50"
              )}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className={cn("w-5 h-5", isActive && "stroke-[2.5]")} />
              <span
                className={cn(
                  "text-xs font-medium",
                  isActive && "font-semibold"
                )}
              >
                {item.label}
              </span>
            </button>
            </li>
          );
        })}
      </ul>

      <div className="h-safe-area-inset-bottom bg-white" />
    </nav>
  );
}
