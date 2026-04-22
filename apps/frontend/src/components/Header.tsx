import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Gift, Menu, ShoppingCart, User, X } from 'lucide-react';
import { Link } from 'react-router-dom';

import couponService from '../api/couponService';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { LoginDialog } from './customer/LoginDialog';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useLandingPageConfig } from '@/hooks/useLandingPageConfig';
import { colorOrGradientToCSS } from '@/components/admin/LandingPageEditor/StyleControls';

type HeaderMenuEntry = {
  name: string;
  href: string;
  isLink: boolean;
};

interface HeaderMenuLinkProps {
  item: HeaderMenuEntry;
  textStyle: CSSProperties;
  hoverStyle: CSSProperties;
  onClick?: () => void;
}

function HeaderMenuLink({ item, textStyle, hoverStyle, onClick }: HeaderMenuLinkProps) {
  const [isHovered, setIsHovered] = useState(false);
  const style = isHovered ? { ...textStyle, ...hoverStyle } : textStyle;
  const commonProps = {
    className: 'transition-colors duration-300 font-medium',
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
    onClick,
    style,
  };

  if (item.isLink) {
    return (
      <Link to={item.href} {...commonProps}>
        {item.name}
      </Link>
    );
  }

  return (
    <a href={item.href} {...commonProps}>
      {item.name}
    </a>
  );
}

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [activeCouponCount, setActiveCouponCount] = useState(0);

  const { totalItems, openCart } = useCart();
  const { isAuthenticated, customer } = useAuth();
  const { config, loading } = useLandingPageConfig();

  useEffect(() => {
    const loadCouponCount = async () => {
      try {
        const count = await couponService.getActiveCouponCount();
        setActiveCouponCount(count);
      } catch (error) {
        console.error('Erro ao carregar contagem de cupons:', error);
      }
    };

    loadCouponCount();
    const interval = setInterval(loadCouponCount, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const menuItems = useMemo<HeaderMenuEntry[]>(() => {
    const fallbackItems: HeaderMenuEntry[] = [
      { name: 'Inicio', href: '#inicio', isLink: false },
      { name: 'Servicos', href: '#servicos', isLink: false },
      { name: 'Pecas', href: '#pecas', isLink: false },
      { name: 'Promocoes', href: '#promocoes', isLink: false },
      { name: 'Sobre', href: '/about', isLink: true },
      { name: 'Contato', href: '/contact', isLink: true },
    ];

    const sourceItems = loading
      ? fallbackItems
      : (config.header.menuItems || []).map((item) => ({
          name: item.label,
          href: item.href,
          isLink: item.isLink,
        }));

    if (loading) {
      return sourceItems;
    }

    return sourceItems.filter((item) => {
      const href = item.href.toLowerCase();

      if (href === '/about' || href.startsWith('/about?')) {
        return config.aboutPage.enabled;
      }

      if (href === '/contact' || href.startsWith('/contact?')) {
        return config.contactPage.enabled;
      }

      return true;
    });
  }, [config.aboutPage.enabled, config.contactPage.enabled, config.header.menuItems, loading]);

  if (!loading && !config.header.enabled) {
    return <LoginDialog open={showLoginDialog} onOpenChange={setShowLoginDialog} />;
  }

  const headerStyle = loading ? {} : colorOrGradientToCSS(config.header.backgroundColor);
  const menuTextStyle = loading
    ? { color: '#ffffff' }
    : colorOrGradientToCSS(config.header.textColor, { forText: true });
  const hoverTextStyle = loading
    ? { color: '#ff6933' }
    : colorOrGradientToCSS(config.header.hoverColor, { forText: true });

  const logoSrc = loading ? '' : config.header.logo.url || '';
  const logoAlt = loading
    ? 'M2 Center Auto'
    : config.header.logo.alt || 'M2 Center Auto';

  return (
    <>
      <header className="sticky top-0 z-50 shadow-lg" style={headerStyle}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-28">
            <div className="flex-shrink-0">
              <Link to="/">
                {logoSrc ? (
                  <img src={logoSrc} alt={logoAlt} className="h-20 w-auto" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-moria-orange to-rose-700 text-lg font-black tracking-[0.28em] text-white shadow-lg">
                    M2
                  </div>
                )}
              </Link>
            </div>

            <nav className="hidden md:flex space-x-8">
              {menuItems.map((item) => (
                <HeaderMenuLink
                  key={`${item.name}-${item.href}`}
                  item={item}
                  textStyle={menuTextStyle}
                  hoverStyle={hoverTextStyle}
                />
              ))}
            </nav>

            <div className="hidden md:flex items-center space-x-4">
              {activeCouponCount > 0 && (
                <Button
                  variant="ghost"
                  className="hover:text-moria-orange flex items-center gap-2 px-3"
                  onClick={() => {
                    if (isAuthenticated) {
                      window.location.href = '/customer?tab=coupons';
                    } else {
                      setShowLoginDialog(true);
                    }
                  }}
                >
                  <Gift className="h-5 w-5" />
                  <Badge variant="secondary" className="bg-moria-orange text-white hover:bg-moria-orange/90">
                    {activeCouponCount} {activeCouponCount === 1 ? 'cupom' : 'cupons'}
                  </Badge>
                </Button>
              )}

              {isAuthenticated && customer ? (
                <Button
                  variant="ghost"
                  className="hover:text-moria-orange flex items-center gap-2 px-3"
                  onClick={() => {
                    window.location.href = '/customer';
                  }}
                >
                  <User className="h-5 w-5" />
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium">{customer.name}</span>
                    <span className="text-xs text-moria-orange/80">{customer.email}</span>
                  </div>
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:text-moria-orange"
                  onClick={() => setShowLoginDialog(true)}
                >
                  <User className="h-5 w-5" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="hover:text-moria-orange relative"
                onClick={openCart}
              >
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-moria-orange text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </Button>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMenuOpen((prev) => !prev)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>

          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-moria-orange/30">
              <nav className="flex flex-col space-y-2">
                {menuItems.map((item) => (
                  <HeaderMenuLink
                    key={`${item.name}-${item.href}-mobile`}
                    item={item}
                    textStyle={menuTextStyle}
                    hoverStyle={hoverTextStyle}
                    onClick={() => setIsMenuOpen(false)}
                  />
                ))}
              </nav>

              <div className="flex flex-col items-center space-y-4 mt-4 pt-4 border-t border-moria-orange/30">
                {isAuthenticated && customer ? (
                  <Button
                    variant="ghost"
                    className="hover:text-moria-orange w-full flex items-center gap-2 px-3"
                    onClick={() => {
                      window.location.href = '/customer';
                    }}
                  >
                    <User className="h-5 w-5" />
                    <div className="flex flex-col items-start flex-1">
                      <span className="text-sm font-medium">{customer.name}</span>
                      <span className="text-xs text-moria-orange/80">{customer.email}</span>
                    </div>
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:text-moria-orange"
                    onClick={() => setShowLoginDialog(true)}
                  >
                    <User className="h-5 w-5" />
                  </Button>
                )}

                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:text-moria-orange relative"
                    onClick={openCart}
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {totalItems > 0 && (
                      <span className="absolute -top-1 -right-1 bg-moria-orange text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {totalItems}
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      <LoginDialog open={showLoginDialog} onOpenChange={setShowLoginDialog} />
    </>
  );
}
