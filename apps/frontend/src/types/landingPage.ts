/**
 * Sistema de Tipos para Landing Page da Moria
 * Baseado no padrão Ferraco, adaptado para Moria Peças & Serviços
 */

// ============================================================================
// TIPOS AUXILIARES
// ============================================================================

export interface ImageConfig {
  url: string;
  alt: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  width?: number;  // Largura recomendada em pixels
  height?: number; // Altura recomendada em pixels
  aspectRatio?: number | null; // Proporção (ex: 16/9, 1, null=livre)
}

export interface StyleConfig {
  backgroundColor?: string;
  textColor?: string;
  overlayOpacity?: number;
}

export interface GradientConfig {
  type: 'linear' | 'radial';
  angle?: number; // Para gradientes lineares (ex: 45, 90, 180)
  direction?: string; // Para gradientes com direção (ex: 'to-br', 'to-r')
  colors: string[]; // Array de cores hex
}

// ============================================================================
// 1. HEADER CONFIG
// ============================================================================

export interface HeaderMenuItem {
  id: string;
  label: string;
  href: string;
  isLink: boolean; // true para <Link>, false para <a>
}

export interface HeaderConfig {
  enabled: boolean;
  logo: ImageConfig;
  menuItems: HeaderMenuItem[];
  backgroundColor: ColorOrGradientValue;
  textColor: ColorOrGradientValue;
  hoverColor: ColorOrGradientValue;
}

// ============================================================================
// 2. MARQUEE CONFIG
// ============================================================================

export interface MarqueeItem {
  id: string;
  icon: string; // emoji ou ícone
  text: string;
}

export interface MarqueeConfig {
  enabled: boolean;
  items: MarqueeItem[];
  speed: number; // velocidade em segundos
  backgroundColor: ColorOrGradientValue;
  textColor: ColorOrGradientValue;
}

// ============================================================================
// 3. HERO CONFIG
// ============================================================================

export interface HeroFeature {
  id: string;
  icon: string; // nome do ícone Lucide (Shield, Clock, Wrench, Star)
  text: string;
}

export interface ColorOrGradientValue {
  type: 'solid' | 'gradient';
  solid?: string;
  gradient?: GradientConfig;
}

export interface HeroButton {
  id: string;
  text: string;
  href: string;
  variant: 'hero' | 'premium' | 'outline' | 'default';
  enabled: boolean;
  // Personalização de cores (opcional)
  background?: ColorOrGradientValue;
  textColor?: ColorOrGradientValue;
}

export interface HeroConfig {
  enabled: boolean;
  title: string; // "MORIA"
  subtitle: string; // "Peças & Serviços"
  description: string;
  features: HeroFeature[]; // 4 features
  buttons: HeroButton[]; // 3 botões
  backgroundImage: ImageConfig;
  overlayOpacity: number; // 0-100
  // Gradientes
  titleGradient?: GradientConfig; // Gradiente do título (gold-metallic)
  overlayGradient?: GradientConfig; // Gradiente de overlay (orange overlay)
}

// ============================================================================
// 4. SERVICES SECTION CONFIG
// ============================================================================

export interface TrustIndicator {
  id: string;
  icon: string; // nome do ícone Lucide
  iconBackground: ColorOrGradientValue; // Cor de fundo do ícone
  title: string;
  description: string;
}

export interface ServicesSectionConfig {
  enabled: boolean;
  title: string; // "Nossos Serviços"
  subtitle: string;
  trustIndicators: TrustIndicator[]; // 4 indicadores
}

// ============================================================================
// 5. PRODUCTS SECTION CONFIG
// ============================================================================

export interface ProductsSectionConfig {
  enabled: boolean;
  title: string; // "Peças Originais"
  subtitle: string;
}

// ============================================================================
// 6. PROMOTIONS SECTION CONFIG
// ============================================================================

export interface PromotionsSectionConfig {
  enabled: boolean;
  title: string;
  subtitle: string;
}

// ============================================================================
// 7. HOME HIGHLIGHTS CONFIG
// ============================================================================

export type HighlightValueType =
  | 'products'
  | 'services'
  | 'promotions'
  | 'whatsapp'
  | 'custom';

export interface HighlightItem {
  id: string;
  icon: string;
  title: string;
  valueType: HighlightValueType;
  customValue?: string;
}

export interface HighlightsConfig {
  enabled: boolean;
  items: HighlightItem[];
}

// ============================================================================
// 8. CONTACT PAGE CONFIG
// ============================================================================

export interface ContactInfoCard {
  id: string;
  icon: string; // nome do ícone Lucide (MapPin, Phone, Mail, Clock)
  title: string;
  content: string[]; // Array de linhas de texto
  color: ColorOrGradientValue;
}

export interface ContactServiceType {
  id: string;
  name: string;
}

export interface ContactConfig {
  enabled: boolean;
  // Hero Section
  heroTitle: string; // "Entre em Contato"
  heroSubtitle: string;
  heroBadge: string; // "Fale Conosco"
  heroBackgroundColor?: ColorOrGradientValue; // Cor de fundo do hero
  // Contact Info Cards
  contactInfoCards: ContactInfoCard[];
  cardsBackgroundColor?: ColorOrGradientValue; // Cor de fundo da seção de cards
  // Form Section
  formTitle: string; // "Envie sua Mensagem"
  formSubtitle: string;
  serviceTypes: ContactServiceType[];
  formBackgroundColor?: ColorOrGradientValue; // Cor de fundo da seção do formulário
  // Map Section
  mapTitle: string; // "Nossa Localização"
  mapSubtitle: string;
  // Quick Info Cards (below map)
  quickInfoEnabled: boolean;
  // CTA Section
  ctaTitle: string;
  ctaSubtitle: string;
  ctaBackgroundColor?: ColorOrGradientValue; // Cor de fundo do CTA
}

// ============================================================================
// 9. ABOUT PAGE CONFIG
// ============================================================================

export interface AboutMilestone {
  id: string;
  year: string;
  title: string;
  description: string;
}

export interface AboutValue {
  id: string;
  icon: string; // nome do ícone Lucide
  title: string;
  description: string;
  color: ColorOrGradientValue;
}

export interface AboutStat {
  id: string;
  number: string; // "15+"
  label: string; // "Anos de Experiência"
}

export interface AboutDecorativeSquareConfig {
  enabled: boolean;
  size: number;
  borderWidth: number;
  borderRadius: number;
  borderColor: string;
  backgroundColor: string;
  backgroundOpacity: number;
  offsetX: number;
  offsetY: number;
}

export interface AboutService {
  id: string;
  name: string;
}

export interface AboutConfig {
  enabled: boolean;
  // Hero Section
  heroTitle: string; // "Mais de 15 Anos"
  heroHighlight: string; // "Cuidando do Seu Veículo" (parte em dourado)
  heroSubtitle: string;
  heroBadge: string; // "Sobre Nós"
  heroBackgroundColor?: ColorOrGradientValue; // Cor de fundo do hero
  sectionImage: ImageConfig;
  decorativeSquare: AboutDecorativeSquareConfig;
  // Stats
  stats: AboutStat[];
  statsBackgroundColor?: ColorOrGradientValue; // Cor de fundo da seção de stats
  // História
  historyTitle: string; // "Nossa História"
  historySubtitle: string;
  milestones: AboutMilestone[];
  historyBackgroundColor?: ColorOrGradientValue; // Cor de fundo da seção de história
  timelineColor?: ColorOrGradientValue; // Cor da linha do tempo
  // Valores
  valuesTitle: string; // "Nossos Valores"
  valuesSubtitle: string;
  values: AboutValue[];
  valuesBackgroundColor?: ColorOrGradientValue; // Cor de fundo da seção de valores
  // Serviços
  servicesTitle: string; // "Nossos Serviços"
  servicesSubtitle: string;
  services: AboutService[];
  servicesBackgroundColor?: ColorOrGradientValue; // Cor de fundo da seção de serviços
  // Compromisso
  commitmentTitle: string; // "Nosso Compromisso"
  commitmentText: string;
  commitmentYears: string; // "15+ Anos de Excelência"
  commitmentBackgroundColor?: ColorOrGradientValue; // Cor de fundo da seção de compromisso
}

// ============================================================================
// 10. FOOTER CONFIG
// ============================================================================

export interface FooterContactInfo {
  address: {
    street: string;
    city: string;
    zipCode: string;
  };
  phone: string;
  email: string;
}

export interface FooterBusinessHours {
  weekdays: string; // "Segunda a Sexta:\n8:00h às 18:00h"
  saturday: string; // "Sábado:\n8:00h às 12:00h"
  sunday: string; // "Domingo:\nFechado"
}

export interface FooterService {
  id: string;
  name: string;
}

export interface FooterSocialLink {
  id: string;
  platform: 'facebook' | 'instagram';
  url: string;
  enabled: boolean;
}

export interface FooterCertification {
  id: string;
  icon: string; // nome do ícone Lucide
  iconBackground: string; // Cor de fundo do ícone (hex, rgb, etc)
  title: string;
  description: string;
}

export interface FooterBottomLink {
  id: string;
  text: string;
  href: string;
}

export interface FooterConfig {
  enabled: boolean;
  logo: ImageConfig;
  description: string;
  contactInfo: FooterContactInfo;
  businessHours: FooterBusinessHours;
  services: FooterService[]; // lista de serviços
  socialLinks: FooterSocialLink[];
  certifications: FooterCertification[]; // 3 certificações
  copyright: string;
  bottomLinks: FooterBottomLink[]; // Política, Termos, Garantia
}

// ============================================================================
// CONFIGURAÇÃO PRINCIPAL
// ============================================================================

export interface LandingPageConfig {
  version: string;
  lastModified: string;
  header: HeaderConfig;
  hero: HeroConfig;
  marquee: MarqueeConfig;
  about: ServicesSectionConfig; // Seção "Nossos Serviços"
  products: ProductsSectionConfig; // Seção "Peças Originais"
  services: PromotionsSectionConfig; // Seção "Promoções" (mantém nome 'services' do schema)
  contact: HighlightsConfig; // Seção "Destaques" da home (mantém chave 'contact' do schema)
  contactPage: ContactConfig; // Página de Contato
  aboutPage: AboutConfig; // Página Sobre Nós
  footer: FooterConfig;
}

// ============================================================================
// TIPOS PARA O EDITOR
// ============================================================================

export type SectionKey =
  | 'header'
  | 'hero'
  | 'marquee'
  | 'about'
  | 'products'
  | 'services'
  | 'contact'
  | 'contactPage'
  | 'aboutPage'
  | 'footer';

export interface EditorState {
  config: LandingPageConfig;
  currentSection: SectionKey;
  isDirty: boolean;
  isSaving: boolean;
  previewMode: 'desktop' | 'tablet' | 'mobile';
  showPreview: boolean;
}

export interface EditorAction {
  type: 'UPDATE_SECTION' | 'RESET_CONFIG' | 'LOAD_CONFIG' | 'SET_SECTION' | 'SET_PREVIEW_MODE' | 'TOGGLE_PREVIEW';
  payload?: any;
}
