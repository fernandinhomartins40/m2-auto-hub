import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  getActivePromotions,
  getLandingPageConfig,
  getPublicSettings,
  getStorefrontProducts,
  getStorefrontServices,
} from "@/lib/storefront-client";
import {
  buildAddressLines,
  buildMapEmbedUrl,
  buildWhatsAppHref,
  formatBusinessHoursLines,
  formatBusinessHoursSummary,
  getBrandShortName,
  normalizeMenuItems,
} from "@/lib/storefront-helpers";
import {
  fallbackLandingConfig,
  fallbackProducts,
  fallbackPromotions,
  fallbackPublicSettings,
  fallbackServices,
} from "@/lib/storefront-fallbacks";
import type {
  LandingPageConfig,
  LandingMenuItem,
  PublicSettings,
  StorefrontProduct,
  StorefrontPromotion,
  StorefrontService,
} from "@/types/storefront";

interface StorefrontContextValue {
  landingConfig: LandingPageConfig;
  settings: PublicSettings;
  services: StorefrontService[];
  servicesCount: number;
  products: StorefrontProduct[];
  productsCount: number;
  promotions: StorefrontPromotion[];
  loading: boolean;
  usingFallback: boolean;
  errors: string[];
  menuItems: LandingMenuItem[];
  contactServiceOptions: string[];
  addressLines: string[];
  businessHoursLines: string[];
  businessHoursSummary: string;
  mapEmbedUrl: string;
  whatsappHref: string;
  brandShortName: string;
}

const StorefrontContext = createContext<StorefrontContextValue | null>(null);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function mergeDeep<T>(base: T, incoming?: Partial<T> | null): T {
  if (!incoming) {
    return base;
  }

  const output: Record<string, unknown> = { ...(base as Record<string, unknown>) };

  Object.keys(incoming as Record<string, unknown>).forEach((key) => {
    const sourceValue = (incoming as Record<string, unknown>)[key];

    if (sourceValue === undefined || sourceValue === null) {
      return;
    }

    const currentValue = (base as Record<string, unknown>)[key];

    if (Array.isArray(sourceValue)) {
      output[key] = sourceValue;
      return;
    }

    if (isPlainObject(sourceValue) && isPlainObject(currentValue)) {
      output[key] = mergeDeep(currentValue, sourceValue);
      return;
    }

    output[key] = sourceValue;
  });

  return output as T;
}

export function StorefrontProvider({ children }: { children: ReactNode }) {
  const landingQuery = useQuery({
    queryKey: ["storefront", "landing-config"],
    queryFn: getLandingPageConfig,
    retry: false,
  });

  const settingsQuery = useQuery({
    queryKey: ["storefront", "settings-public"],
    queryFn: getPublicSettings,
    retry: false,
  });

  const servicesQuery = useQuery({
    queryKey: ["storefront", "services"],
    queryFn: () => getStorefrontServices(6),
    retry: false,
  });

  const productsQuery = useQuery({
    queryKey: ["storefront", "products"],
    queryFn: () => getStorefrontProducts(8),
    retry: false,
  });

  const promotionsQuery = useQuery({
    queryKey: ["storefront", "promotions"],
    queryFn: getActivePromotions,
    retry: false,
  });

  const landingConfig = landingQuery.data
    ? mergeDeep(fallbackLandingConfig, landingQuery.data)
    : fallbackLandingConfig;
  const settings = settingsQuery.data
    ? {
        ...fallbackPublicSettings,
        ...settingsQuery.data,
        businessHours: settingsQuery.data.businessHours ?? fallbackPublicSettings.businessHours,
      }
    : fallbackPublicSettings;
  const services = servicesQuery.data ? servicesQuery.data.data : fallbackServices;
  const products = productsQuery.data ? productsQuery.data.data : fallbackProducts;
  const promotions = promotionsQuery.data ?? fallbackPromotions;

  const menuItems = normalizeMenuItems(
    landingConfig.header?.menuItems ?? fallbackLandingConfig.header?.menuItems
  );
  const contactServiceOptions =
    landingConfig.contactPage?.serviceTypes?.map((item) => item.name) ??
    services.map((service) => service.name);
  const addressLines = buildAddressLines(settings, landingConfig.footer);
  const businessHoursLines = formatBusinessHoursLines(settings.businessHours);
  const businessHoursSummary = formatBusinessHoursSummary(settings.businessHours);
  const mapEmbedUrl = buildMapEmbedUrl(addressLines);
  const whatsappHref = buildWhatsAppHref(settings.whatsapp || settings.phone);
  const brandShortName = getBrandShortName(settings.storeName);

  const errors = [
    landingQuery.error instanceof Error ? landingQuery.error.message : null,
    settingsQuery.error instanceof Error ? settingsQuery.error.message : null,
    servicesQuery.error instanceof Error ? servicesQuery.error.message : null,
    productsQuery.error instanceof Error ? productsQuery.error.message : null,
    promotionsQuery.error instanceof Error ? promotionsQuery.error.message : null,
  ].filter(Boolean) as string[];

  const value: StorefrontContextValue = {
    landingConfig,
    settings,
    services,
    servicesCount: servicesQuery.data ? servicesQuery.data.meta.totalCount : fallbackServices.length,
    products,
    productsCount: productsQuery.data ? productsQuery.data.meta.totalCount : fallbackProducts.length,
    promotions,
    loading:
      landingQuery.isLoading ||
      settingsQuery.isLoading ||
      servicesQuery.isLoading ||
      productsQuery.isLoading ||
      promotionsQuery.isLoading,
    usingFallback: errors.length > 0 || !landingQuery.data || !settingsQuery.data,
    errors,
    menuItems,
    contactServiceOptions,
    addressLines,
    businessHoursLines,
    businessHoursSummary,
    mapEmbedUrl,
    whatsappHref,
    brandShortName,
  };

  return <StorefrontContext.Provider value={value}>{children}</StorefrontContext.Provider>;
}

export function useStorefront() {
  const context = useContext(StorefrontContext);

  if (!context) {
    throw new Error("useStorefront must be used inside StorefrontProvider");
  }

  return context;
}
