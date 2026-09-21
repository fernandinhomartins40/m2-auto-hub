import React from 'react';
import { Camera } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { NavItem } from './StoreLayout';

interface StoreBottomNavigationProps {
  items: NavItem[];
  currentTab: string;
  onTabChange: (tab: string) => void;
  onMenuClick: () => void;
  onLogout?: () => void;
  /** Quando definido, exibe o botão central de Consulta por Placa. */
  onPlateLookup?: () => void;
}

export default function StoreBottomNavigation({
  items,
  currentTab,
  onTabChange,
  onMenuClick,
  onLogout,
  onPlateLookup,
}: StoreBottomNavigationProps) {
  const handleClick = (itemId: string) => {
    if (itemId === 'menu') {
      onMenuClick();
      return;
    }

    if (itemId === 'logout') {
      onLogout?.();
      return;
    }

    onTabChange(itemId);
  };

  return (
    <nav
      className="store-bottom-nav fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom"
      style={{ zIndex: 45 }}
    >
      {/* Botão central destacado: Consulta por Placa */}
      {onPlateLookup && (
        <button
          type="button"
          onClick={onPlateLookup}
          aria-label="Consulta por placa"
          className="absolute left-1/2 -top-6 -translate-x-1/2 flex h-14 w-14 items-center justify-center rounded-full bg-moria-orange text-white shadow-lg shadow-orange-500/30 ring-4 ring-white active:scale-95 transition-transform"
        >
          <Camera className="h-6 w-6" />
        </button>
      )}

      {/* `ul/li` para o leitor anunciar tamanho e posicao (A-16). O `li` usa
          `contents` para nao entrar como faixa extra na grid de colunas. */}
      <ul
        className="m-0 grid h-16 list-none p-0"
        style={{ gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <li key={item.id} className="contents">
            <button
              type="button"
              onClick={() => handleClick(item.id)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 transition-colors touch-manipulation',
                'min-h-[44px] min-w-[44px]',
                isActive
                  ? 'text-moria-orange'
                  : 'text-gray-500 hover:text-gray-700 active:text-gray-900'
              )}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                className={cn(
                  'w-5 h-5 transition-all',
                  isActive && 'stroke-[2.5]'
                )}
              />
              <span
                className={cn(
                  'text-xs font-medium transition-all',
                  isActive && 'font-semibold'
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
