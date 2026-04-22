import React from 'react';
import { cn } from '../../lib/utils';
import type { NavItem } from './StoreLayout';

interface StoreBottomNavigationProps {
  items: NavItem[];
  currentTab: string;
  onTabChange: (tab: string) => void;
  onMenuClick: () => void;
  onLogout?: () => void;
}

export default function StoreBottomNavigation({
  items,
  currentTab,
  onTabChange,
  onMenuClick,
  onLogout,
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
      <div
        className="grid h-16"
        style={{ gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
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
          );
        })}
      </div>

      <div className="h-safe-area-inset-bottom bg-white" />
    </nav>
  );
}
