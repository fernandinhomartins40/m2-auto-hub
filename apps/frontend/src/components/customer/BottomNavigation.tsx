import { Home, Package, FileText, ClipboardCheck, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

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
    { id: "dashboard", label: "Inicio", icon: Home },
    { id: "quotes", label: "Orcamentos", icon: FileText },
    { id: "orders", label: "Pedidos", icon: Package },
    { id: "revisions", label: "Revisoes", icon: ClipboardCheck },
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
          const isActive = currentTab === item.id;

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
