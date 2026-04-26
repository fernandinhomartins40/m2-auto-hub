import { fallbackLandingConfig } from '@/lib/storefront-fallbacks';
import { LandingPageConfig } from '@/types/landingPage';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const deepMerge = (target: any, source: any): any => {
  if (!source) {
    return target;
  }

  if (!target) {
    return source;
  }

  const output = { ...target };

  for (const key in source) {
    if (source[key] === null || source[key] === undefined) {
      continue;
    }

    if (Array.isArray(source[key])) {
      output[key] = [...source[key]];
      continue;
    }

    if (typeof source[key] === 'object') {
      output[key] = deepMerge(target[key] || {}, source[key]);
      continue;
    }

    output[key] = source[key];
  }

  return output;
};

const buildSafeBaseConfig = (): LandingPageConfig => ({
  version: '1.0.0',
  lastModified: new Date().toISOString(),
  header: {
    enabled: true,
    logo: {
      url: '',
      alt: 'M2 Center Auto',
    },
    menuItems: [],
    backgroundColor: '#171b22',
    textColor: '#ffffff',
    hoverColor: '#2563eb',
  },
  hero: {
    enabled: true,
    title: '',
    subtitle: '',
    description: '',
    features: [],
    buttons: [],
    backgroundImage: {
      url: '',
      alt: 'Hero',
    },
    overlayOpacity: 70,
  },
  marquee: {
    enabled: true,
    items: [],
    speed: 30,
    backgroundColor: '#2563eb',
    textColor: '#ffffff',
  },
  about: {
    enabled: true,
    title: '',
    subtitle: '',
    trustIndicators: [],
  },
  products: {
    enabled: true,
    title: '',
    subtitle: '',
  },
  services: {
    enabled: true,
    title: '',
    subtitle: '',
  },
  contact: {
    enabled: true,
    items: [],
  },
  contactPage: {
    enabled: true,
    heroTitle: '',
    heroSubtitle: '',
    heroBadge: '',
    contactInfoCards: [],
    formTitle: '',
    formSubtitle: '',
    serviceTypes: [],
    mapTitle: '',
    mapSubtitle: '',
    quickInfoEnabled: true,
    ctaTitle: '',
    ctaSubtitle: '',
  },
  aboutPage: {
    enabled: true,
    heroTitle: '',
    heroHighlight: '',
    heroSubtitle: '',
    heroBadge: '',
    sectionImage: {
      url: '',
      alt: 'Equipe trabalhando na oficina',
      objectFit: 'cover',
    },
    decorativeSquare: {
      enabled: true,
      size: 96,
      borderWidth: 4,
      borderRadius: 12,
      borderColor: '#2563eb',
      backgroundColor: '#ffffff',
      backgroundOpacity: 100,
      offsetX: -16,
      offsetY: -16,
    },
    stats: [],
    historyTitle: '',
    historySubtitle: '',
    milestones: [],
    valuesTitle: '',
    valuesSubtitle: '',
    values: [],
    servicesTitle: '',
    servicesSubtitle: '',
    services: [],
    commitmentTitle: '',
    commitmentText: '',
    commitmentYears: '',
  },
  footer: {
    enabled: true,
    logo: {
      url: '',
      alt: 'M2 Center Auto',
    },
    description: '',
    contactInfo: {
      address: {
        street: '',
        city: '',
        zipCode: '',
      },
      phone: '',
      email: '',
    },
    businessHours: {
      weekdays: '',
      saturday: '',
      sunday: '',
    },
    services: [],
    socialLinks: [],
    certifications: [],
    copyright: '',
    bottomLinks: [],
  },
});

export const getDefaultConfig = (): LandingPageConfig => {
  const safeBase = buildSafeBaseConfig();

  return {
    ...deepMerge(safeBase, clone(fallbackLandingConfig)),
    version: '1.0.0',
    lastModified: new Date().toISOString(),
  };
};
