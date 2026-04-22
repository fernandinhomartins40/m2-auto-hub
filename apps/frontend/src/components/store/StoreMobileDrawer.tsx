import React from 'react';
import { X, LogOut, User } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { NavItem } from './StoreLayout';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';

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

  // Iniciais do nome
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-black/50 z-40 transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={cn(
          'absolute top-0 right-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl z-50',
          'transition-transform duration-300 ease-out',
          'flex flex-col',
          'drawer-content',
          open ? 'translate-x-0 pointer-events-auto' : 'translate-x-full pointer-events-none'
        )}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        aria-label="Menu de navegação"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Admin/Mechanic Info */}
        <div className="p-4 bg-gradient-to-r from-moria-orange/10 to-moria-orange/5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div
              className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold',
                variant === 'admin'
                  ? 'bg-moria-orange'
                  : 'bg-blue-500'
              )}
            >
              {getInitials(adminName)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">
                {adminName}
              </p>
              {adminEmail && (
                <p className="text-sm text-gray-600 truncate">
                  {adminEmail}
                </p>
              )}
              <span
                className={cn(
                  'inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded',
                  variant === 'admin'
                    ? 'bg-moria-orange/20 text-moria-orange'
                    : 'bg-blue-100 text-blue-700'
                )}
              >
                {variant === 'admin' ? 'Administrador' : 'Mecânico'}
              </span>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-2 touch-pan-y">
          <nav className="space-y-1">
            {items.map((item) => {
              if (item.requiresPermission && !(permissions as any)[item.requiresPermission]) {
                return null;
              }

              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-lg',
                    'transition-all touch-manipulation',
                    'min-h-[44px]',
                    isActive
                      ? 'bg-moria-orange text-white font-medium shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-4 py-3',
              'bg-red-50 text-red-600 rounded-lg font-medium',
              'hover:bg-red-100 active:bg-red-200',
              'transition-colors touch-manipulation',
              'min-h-[44px]'
            )}
          >
            <LogOut className="w-5 h-5" />
            <span>Sair</span>
          </button>
        </div>

        {/* Safe area for iOS */}
        <div className="h-safe-area-inset-bottom bg-white" />
      </div>
    </>
  );
}
