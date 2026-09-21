import React, { useEffect, useState } from 'react';
import { useIsMobile } from '../../hooks/use-mobile';
import { useStandaloneMode } from '../../hooks/useStandaloneMode';
import StoreBottomNavigation from './StoreBottomNavigation';
import StoreMobileDrawer from './StoreMobileDrawer';
import StoreHeader from './StoreHeader';
import { Sidebar } from '../admin/Sidebar';
import { MechanicSidebar } from '../mechanic/MechanicSidebar';
import { cn } from '../../lib/utils';
import { MAIN_CONTENT_ID, SkipToContent } from '../layout/SkipToContent';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresPermission?: string;
  section?: string;
}

interface StoreLayoutProps {
  children: React.ReactNode;
  currentTab: string;
  onTabChange: (tab: string) => void;
  bottomNavItems: NavItem[];
  drawerItems: NavItem[];
  adminName?: string;
  adminEmail?: string;
  variant?: 'admin' | 'mechanic';
  onLogout?: () => void;
  /** Abre a Consulta por Placa (botão central mobile + item na sidebar desktop). */
  onPlateLookup?: () => void;
}

export default function StoreLayout({
  children,
  currentTab,
  onTabChange,
  bottomNavItems,
  drawerItems,
  adminName,
  adminEmail,
  variant = 'admin',
  onLogout,
  onPlateLookup,
}: StoreLayoutProps) {
  const isMobile = useIsMobile();
  const { isStandalone } = useStandaloneMode();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    document.body.classList.add('store-page');
    document.documentElement.classList.add('store-page');

    return () => {
      document.body.classList.remove('store-page');
      document.documentElement.classList.remove('store-page');
    };
  }, []);

  // Usa layout mobile se for PWA instalado OU tela pequena
  const useMobileLayout = isStandalone || isMobile;

  const handleMenuClick = () => {
    setIsDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
  };

  const handleDrawerItemClick = (tabId: string) => {
    onTabChange(tabId);
    setIsDrawerOpen(false);
  };

  // Layout Mobile
  if (useMobileLayout) {
    return (
      <div
        className={cn(
          'store-layout store-mobile-layout mobile relative isolate max-w-full overflow-x-hidden bg-gray-50',
          isDrawerOpen && 'drawer-open'
        )}
      >
        <SkipToContent />
        <div className="store-mobile-viewport">
          <StoreHeader
            title={variant === 'admin' ? 'M2 Center Auto' : 'M2 Oficina'}
            variant={variant}
          />

          <div className="store-mobile-scroll">
            <main
              id={MAIN_CONTENT_ID}
              tabIndex={-1}
              className="min-w-0 w-full max-w-full overflow-x-hidden px-4 py-4 pb-24 outline-none"
            >
              {children}
            </main>
          </div>
        </div>

        <StoreBottomNavigation
          items={bottomNavItems}
          currentTab={currentTab}
          onTabChange={onTabChange}
          onMenuClick={handleMenuClick}
          onLogout={onLogout}
          onPlateLookup={variant === 'admin' ? onPlateLookup : undefined}
        />

        <StoreMobileDrawer
          open={isDrawerOpen}
          onClose={handleDrawerClose}
          items={drawerItems}
          currentTab={currentTab}
          onTabChange={handleDrawerItemClick}
          adminName={adminName}
          adminEmail={adminEmail}
          variant={variant}
          onLogout={onLogout}
        />
      </div>
    );
  }

  // Layout Desktop (mantem o layout original)
  return (
    <div className="store-layout lojista-layout min-w-0 max-w-full">
      <SkipToContent />
      {variant === 'mechanic' ? (
        <MechanicSidebar
          activeTab={currentTab}
          onTabChange={onTabChange}
        />
      ) : (
        <Sidebar
          activeTab={currentTab}
          onTabChange={onTabChange}
          onPlateLookup={onPlateLookup}
        />
      )}
      <main
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        className="lojista-content min-w-0 max-w-full overflow-x-hidden outline-none"
      >
        <div className="min-w-0 w-full max-w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
