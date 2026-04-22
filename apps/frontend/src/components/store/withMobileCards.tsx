import React from 'react';
import { useIsMobile } from '../../hooks/use-mobile';

/**
 * HOC para renderizar cards em mobile e tabela em desktop
 *
 * Uso:
 * ```tsx
 * const MobileAwareComponent = withMobileCards(
 *   () => <Table>...</Table>,      // Desktop component
 *   () => <CardList>...</CardList> // Mobile component
 * );
 * ```
 */
export function withMobileCards<P extends object>(
  DesktopComponent: React.ComponentType<P>,
  MobileComponent: React.ComponentType<P>
) {
  return function MobileAwareComponent(props: P) {
    const isMobile = useIsMobile();

    if (isMobile) {
      return <MobileComponent {...props} />;
    }

    return <DesktopComponent {...props} />;
  };
}

/**
 * Hook para detectar se deve renderizar cards (mobile) ou tabela (desktop)
 */
export function useMobileCards() {
  const isMobile = useIsMobile();
  return isMobile;
}

export default withMobileCards;
