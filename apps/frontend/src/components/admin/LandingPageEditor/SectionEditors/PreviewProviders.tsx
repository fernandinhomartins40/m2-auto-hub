import type { ReactNode } from 'react';

import { StorefrontContext, type StorefrontContextValue } from '@/context/StorefrontContext';
import { AuthContext, type AuthContextType } from '@/contexts/AuthContext';
import { CartContext, type CartContextType } from '@/contexts/CartContext';
import {
  fallbackLandingConfig,
  fallbackOffers,
  fallbackProducts,
  fallbackPromotions,
  fallbackPublicSettings,
  fallbackServices,
} from '@/lib/storefront-fallbacks';
import {
  buildAddressLines,
  buildMapEmbedUrl,
  buildWhatsAppHref,
  formatBusinessHoursLines,
  formatBusinessHoursSummary,
  getBrandShortName,
  normalizeMenuItems,
} from '@/lib/storefront-helpers';
import type { LandingPageConfig as EditorLandingPageConfig } from '@/types/landingPage';
import type { LandingPageConfig as StorefrontLandingPageConfig } from '@/types/storefront';

interface PreviewProvidersProps {
  children: ReactNode;
  config: Partial<EditorLandingPageConfig>;
}

const authValue: AuthContextType = {
  customer: null,
  isAuthenticated: false,
  isLoading: false,
  login: async () => ({ success: true }),
  register: async () => ({ success: true }),
  logout: () => undefined,
  updateProfile: async () => ({ success: true }),
  addAddress: async () => ({ success: true }),
  updateAddress: async () => ({ success: true }),
  deleteAddress: async () => ({ success: true }),
  getOrders: async () => ({ success: true, data: [] }),
  getFavorites: async () => ({ success: true, data: [] }),
  addToFavorites: async () => ({ success: true }),
  removeFromFavorites: async () => ({ success: true }),
};

const cartValue: CartContextType = {
  items: [],
  isOpen: false,
  totalItems: 0,
  totalPrice: 0,
  appliedCoupon: null,
  autoPromotions: [],
  promotionDiscount: 0,
  discountAmount: 0,
  totalWithDiscount: 0,
  addItem: () => undefined,
  removeItem: () => undefined,
  updateQuantity: () => undefined,
  clearCart: () => undefined,
  toggleCart: () => undefined,
  openCart: () => undefined,
  closeCart: () => undefined,
  applyCoupon: () => undefined,
  removeCoupon: () => undefined,
};

export function PreviewProviders({ children, config }: PreviewProvidersProps) {
  const landingConfig = {
    ...fallbackLandingConfig,
    ...(config as Partial<StorefrontLandingPageConfig>),
  } as StorefrontLandingPageConfig;

  const settings = fallbackPublicSettings;
  const services = fallbackServices;
  const products = fallbackProducts;
  const offers = fallbackOffers;
  const dailyOffers = offers.filter((offer) => offer.offerType === 'DIA');
  const weeklyOffers = offers.filter((offer) => offer.offerType === 'SEMANA');
  const monthlyOffers = offers.filter((offer) => offer.offerType === 'MES');
  const promotions = fallbackPromotions;
  const menuItems = normalizeMenuItems(landingConfig.header?.menuItems ?? []);
  const addressLines = buildAddressLines(settings, landingConfig.footer);
  const businessHoursLines = formatBusinessHoursLines(settings.businessHours);
  const businessHoursSummary = formatBusinessHoursSummary(settings.businessHours);
  const mapEmbedUrl = buildMapEmbedUrl(addressLines);
  const whatsappHref = buildWhatsAppHref(settings.whatsapp || settings.phone);
  const brandShortName = getBrandShortName(settings.storeName);

  const storefrontValue: StorefrontContextValue = {
    landingConfig,
    settings,
    services,
    servicesCount: services.length,
    products,
    productsCount: products.length,
    offers,
    dailyOffers,
    weeklyOffers,
    monthlyOffers,
    promotions,
    loading: false,
    usingFallback: true,
    errors: [],
    menuItems,
    contactServiceOptions:
      landingConfig.contactPage?.serviceTypes?.map((item) => item.name) ??
      services.map((service) => service.name),
    addressLines,
    businessHoursLines,
    businessHoursSummary,
    mapEmbedUrl,
    whatsappHref,
    brandShortName,
  };

  return (
    <AuthContext.Provider value={authValue}>
      <CartContext.Provider value={cartValue}>
        <StorefrontContext.Provider value={storefrontValue}>
          {children}
        </StorefrontContext.Provider>
      </CartContext.Provider>
    </AuthContext.Provider>
  );
}
