import React, { useEffect, useState } from 'react';
import { useIsMobile } from '../../hooks/use-mobile';
import { useStandaloneMode } from '../../hooks/useStandaloneMode';
import StoreBottomNavigation from './StoreBottomNavigation';
import StoreMobileDrawer from './StoreMobileDrawer';
import StoreHeader from './StoreHeader';
import { Sidebar } from '../admin/Sidebar';
import { MechanicSidebar } from '../mechanic/MechanicSidebar';
import { cn } from '../../lib/utils';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresPermission?: string;
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
          'store-layout store-mobile-layout mobile relative isolate bg-gray-50',
          isDrawerOpen && 'drawer-open'
        )}
      >
        <div className="store-mobile-viewport">
          <StoreHeader
            title={variant === 'admin' ? 'M2 Center Auto' : 'M2 Oficina'}
            variant={variant}
          />

          <div className="store-mobile-scroll">
            <div className="px-4 py-4 pb-24">
              {children}
            </div>
          </div>
        </div>

        <StoreBottomNavigation
          items={bottomNavItems}
          currentTab={currentTab}
          onTabChange={onTabChange}
          onMenuClick={handleMenuClick}
          onLogout={onLogout}
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
    <div className="store-layout lojista-layout">
      {variant === 'mechanic' ? (
        <MechanicSidebar
          activeTab={currentTab}
          onTabChange={onTabChange}
        />
      ) : (
        <Sidebar
          activeTab={currentTab}
          onTabChange={onTabChange}
        />
      )}
      <main className="lojista-content">
        {children}
      </main>
    </div>
  );
}
