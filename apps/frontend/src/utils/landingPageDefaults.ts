import { fallbackLandingConfig } from '@/lib/storefront-fallbacks';
import { LandingPageConfig } from '@/types/landingPage';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export const getDefaultConfig = (): LandingPageConfig => ({
  version: '1.0.0',
  lastModified: new Date().toISOString(),
  header: clone(fallbackLandingConfig.header as LandingPageConfig['header']),
  hero: clone(fallbackLandingConfig.hero as LandingPageConfig['hero']),
  marquee: clone(fallbackLandingConfig.marquee as LandingPageConfig['marquee']),
  about: clone(fallbackLandingConfig.about as LandingPageConfig['about']),
  products: clone(fallbackLandingConfig.products as LandingPageConfig['products']),
  services: clone(fallbackLandingConfig.services as LandingPageConfig['services']),
  contact: clone(fallbackLandingConfig.contact as LandingPageConfig['contact']),
  contactPage: clone(fallbackLandingConfig.contactPage as LandingPageConfig['contactPage']),
  aboutPage: clone(fallbackLandingConfig.aboutPage as LandingPageConfig['aboutPage']),
  footer: clone(fallbackLandingConfig.footer as LandingPageConfig['footer']),
});
