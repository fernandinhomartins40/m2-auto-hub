export interface BusinessHours {
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
  sunday?: string;
  [key: string]: string | undefined;
}

export interface PublicSettings {
  id?: string;
  storeName?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  businessHours?: BusinessHours;
  freeShippingMin?: number;
  deliveryFee?: number;
  deliveryDays?: number;
  whatsappConnected?: boolean;
  correiosConnected?: boolean;
  paymentConnected?: boolean;
}

export interface LandingImage {
  url?: string;
  alt?: string;
}

export interface LandingMenuItem {
  id: string;
  label: string;
  href: string;
  isLink?: boolean;
}

export interface LandingHeroButton {
  id: string;
  text: string;
  href: string;
  variant?: string;
  enabled?: boolean;
  background?: string | LandingColorValue;
  textColor?: string | LandingColorValue;
}

export interface LandingFeatureItem {
  id: string;
  icon?: string;
  text?: string;
}

export interface LandingGradientValue {
  type: "linear" | "radial";
  angle?: number;
  direction?: string;
  colors?: string[];
}

export interface LandingColorValue {
  type: "solid" | "gradient";
  solid?: string;
  gradient?: LandingGradientValue;
}

export interface LandingTrustIndicator {
  id: string;
  icon?: string;
  iconBackground?: string | LandingColorValue;
  title?: string;
  description?: string;
}

export interface LandingStatItem {
  id: string;
  number?: string;
  label?: string;
}

export interface LandingDecorativeSquareConfig {
  enabled?: boolean;
  size?: number;
  borderWidth?: number;
  borderRadius?: number;
  borderColor?: string;
  backgroundColor?: string;
  backgroundOpacity?: number;
  offsetX?: number;
  offsetY?: number;
}

export interface LandingListItem {
  id: string;
  name: string;
}

export interface LandingMarqueeItem {
  id: string;
  icon?: string;
  text: string;
}

export interface LandingSectionHeader {
  enabled?: boolean;
  title?: string;
  subtitle?: string;
}

export interface LandingHeaderConfig {
  enabled?: boolean;
  logo?: LandingImage;
  menuItems?: LandingMenuItem[];
  backgroundColor?: string | LandingColorValue;
  textColor?: string | LandingColorValue;
  hoverColor?: string | LandingColorValue;
}

export interface LandingHeroConfig {
  enabled?: boolean;
  title?: string;
  subtitle?: string;
  description?: string;
  features?: LandingFeatureItem[];
  buttons?: LandingHeroButton[];
  backgroundImage?: LandingImage;
  overlayOpacity?: number;
}

export interface LandingAboutConfig extends LandingSectionHeader {
  trustIndicators?: LandingTrustIndicator[];
}

export interface LandingMarqueeConfig {
  enabled?: boolean;
  items?: LandingMarqueeItem[];
  speed?: number;
  backgroundColor?: string | LandingColorValue;
  textColor?: string | LandingColorValue;
}

export interface LandingContactInfoCard {
  id: string;
  icon?: string;
  title?: string;
  content?: string[];
  color?: string | LandingColorValue;
}

export type LandingHighlightValueType =
  | "products"
  | "services"
  | "promotions"
  | "whatsapp"
  | "custom";

export interface LandingHighlightItem {
  id: string;
  icon?: string;
  title?: string;
  valueType?: LandingHighlightValueType;
  customValue?: string;
}

export interface LandingHighlightsConfig {
  enabled?: boolean;
  items?: LandingHighlightItem[];
}

export interface LandingContactPageConfig {
  enabled?: boolean;
  heroBadge?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  contactInfoCards?: LandingContactInfoCard[];
  formTitle?: string;
  formSubtitle?: string;
  serviceTypes?: LandingListItem[];
  mapTitle?: string;
  mapSubtitle?: string;
  quickInfoEnabled?: boolean;
  ctaTitle?: string;
  ctaSubtitle?: string;
}

export interface LandingAboutPageConfig {
  enabled?: boolean;
  heroBadge?: string;
  heroTitle?: string;
  heroHighlight?: string;
  heroSubtitle?: string;
  sectionImage?: LandingImage & {
    objectFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
  };
  decorativeSquare?: LandingDecorativeSquareConfig;
  stats?: LandingStatItem[];
  historyTitle?: string;
  historySubtitle?: string;
  valuesTitle?: string;
  valuesSubtitle?: string;
  commitmentTitle?: string;
  commitmentText?: string;
  commitmentYears?: string;
}

export interface FooterContactInfo {
  address?: {
    street?: string;
    city?: string;
    zipCode?: string;
  };
  phone?: string;
  email?: string;
}

export interface FooterBusinessHours {
  weekdays?: string;
  saturday?: string;
  sunday?: string;
}

export interface FooterSocialLink {
  id: string;
  platform?: string;
  url?: string;
  enabled?: boolean;
}

export interface LandingFooterConfig {
  enabled?: boolean;
  logo?: LandingImage;
  description?: string;
  contactInfo?: FooterContactInfo;
  businessHours?: FooterBusinessHours;
  services?: LandingListItem[];
  socialLinks?: FooterSocialLink[];
  certifications?: LandingTrustIndicator[];
  copyright?: string;
  bottomLinks?: Array<{
    id: string;
    text: string;
    href: string;
  }>;
}

export interface LandingPageConfig {
  header?: LandingHeaderConfig;
  hero?: LandingHeroConfig;
  marquee?: LandingMarqueeConfig;
  about?: LandingAboutConfig;
  products?: LandingSectionHeader;
  services?: LandingSectionHeader;
  contact?: LandingHighlightsConfig;
  contactPage?: LandingContactPageConfig;
  aboutPage?: LandingAboutPageConfig;
  footer?: LandingFooterConfig;
}

export interface StorefrontService {
  id: string;
  name: string;
  description: string;
  category: string;
  estimatedTime?: string;
  basePrice?: number;
  status?: string;
}

export interface StorefrontProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  salePrice?: number;
  promoPrice?: number | null;
  images?: string[];
  stock?: number;
  status?: string;
}

export type StorefrontOfferType = "DIA" | "SEMANA" | "MES";

export interface StorefrontOffer {
  id: string;
  name: string;
  description: string;
  category: string;
  promoPrice: number;
  salePrice: number;
  images?: string[];
  offerType: StorefrontOfferType;
  offerStartDate: string;
  offerEndDate: string;
  offerBadge?: string | null;
  slug?: string;
}

export interface StorefrontPromotion {
  id: string;
  name: string;
  description: string;
  shortDescription?: string | null;
  badgeText?: string | null;
  bannerImage?: string | null;
  code?: string | null;
  type?: string;
  startDate?: string;
  endDate?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}
