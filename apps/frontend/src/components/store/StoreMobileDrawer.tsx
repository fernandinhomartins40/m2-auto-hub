import React from 'react';
import { X, LogOut } from 'lucide-react';

import { useAdminPermissions } from '@/hooks/useAdminPermissions';

import { cn } from '../../lib/utils';
import type { NavItem } from './StoreLayout';

interface StoreMobileDrawerProps {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
  currentTab: string;
  onTabChange: (tab: string) => void;
  adminName?: string;
  adminEmail?: string;
  variant?: 'admin' | 'mechanic';
  onLogout?: () => void;
}

export default function StoreMobileDrawer({
  open,
  onClose,
  items,
  currentTab,
  onTabChange,
  adminName = 'Administrador',
  adminEmail = '',
  variant = 'admin',
  onLogout,
}: StoreMobileDrawerProps) {
  const permissions = useAdminPermissions();

  const handleItemClick = (itemId: string) => {
    onTabChange(itemId);
  };

  const handleLogout = () => {
    onClose();
    if (onLogout) {
      onLogout();
    }
  };

  const visibleItems = items.filter(
    (item) => !item.requiresPermission || (permissions as any)[item.requiresPermission]
  );

  const groupedItems = visibleItems.reduce<Record<string, NavItem[]>>((acc, item) => {
    const section = item.section || 'Navegação';
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(item);
    return acc;
  }, {});

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  return (
    <>
      <div
        className={cn(
          'absolute inset-0 z-40 bg-black/50 transition-opacity duration-300',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={cn(
          'drawer-content absolute right-0 top-0 z-50 flex h-full w-80 max-w-[85vw] flex-col bg-white shadow-2xl',
          'transition-transform duration-300 ease-out',
          open ? 'translate-x-0 pointer-events-auto' : 'translate-x-full pointer-events-none'
        )}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        aria-label="Menu de navegação"
      >
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Navegação</h2>
            <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Painel do Lojista</p>
          </div>
          <button
            onClick={onClose}
            className="touch-manipulation rounded-lg p-2 transition-colors hover:bg-gray-100"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="border-b border-gray-200 bg-gradient-to-r from-primary/10 via-blue-50 to-stone-100 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-hover text-white shadow-sm">
              {getInitials(adminName)}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-gray-900">{adminName}</p>
              {adminEmail ? <p className="truncate text-sm text-gray-600">{adminEmail}</p> : null}
              <span className="mt-1 inline-block rounded bg-moria-orange/15 px-2 py-0.5 text-xs font-medium text-moria-orange">
                {variant === 'admin' ? 'Lojista M2' : 'Oficina M2'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-3 touch-pan-y">
          <nav>
            {/* `ul/li` para o leitor anunciar tamanho e posicao (A-16). O
                `space-y-*` acompanha a lista porque espaca filhos diretos. */}
            <ul className="m-0 list-none space-y-4 p-0">
              {Object.entries(groupedItems).map(([section, sectionItems]) => (
                <li key={section} className="rounded-2xl border border-gray-200 bg-gray-50/80 p-2">
                  <div className="px-2 pb-2 pt-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                      {section}
                    </p>
                  </div>

                  <ul className="m-0 list-none space-y-1 p-0">
                    {sectionItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentTab === item.id;

                      return (
                        <li key={item.id}>
                          <button
                            onClick={() => handleItemClick(item.id)}
                            aria-current={isActive ? 'page' : undefined}
                            className={cn(
                              'flex min-h-[44px] w-full touch-manipulation items-center gap-3 rounded-xl px-4 py-3 transition-all',
                              isActive
                                ? 'bg-moria-orange font-medium text-white shadow-sm'
                                : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                            )}
                          >
                            <Icon className="h-5 w-5 flex-shrink-0" />
                            <span className="text-sm">{item.label}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="border-t border-gray-200 p-4">
          <button
            onClick={handleLogout}
            className={cn(
              'flex min-h-[44px] w-full touch-manipulation items-center justify-center gap-2 rounded-lg bg-primary/10 px-4 py-3 font-medium text-primary transition-colors',
              'hover:bg-primary/15 active:bg-primary/20'
            )}
          >
            <LogOut className="h-5 w-5" />
            <span>Sair</span>
          </button>
        </div>

        <div className="h-safe-area-inset-bottom bg-white" />
      </div>
    </>
  );
}
