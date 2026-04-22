/**
 * Valores padrao da Landing Page da M2
 * Baseado no design atual, ajustado para a identidade visual da M2
 */

import { LandingPageConfig } from '@/types/landingPage';

export const getDefaultConfig = (): LandingPageConfig => ({
  version: '1.0.0',
  lastModified: new Date().toISOString(),

  // ============================================================================
  // HEADER
  // ============================================================================
  header: {
    enabled: true,
    logo: {
      url: '',
      alt: 'M2 Center Auto',
    },
    menuItems: [
      { id: '1', label: 'Início', href: '#inicio', isLink: false },
      { id: '2', label: 'Serviços', href: '#servicos', isLink: false },
      { id: '3', label: 'Peças', href: '#pecas', isLink: false },
      { id: '4', label: 'Promoções', href: '#promocoes', isLink: false },
      { id: '5', label: 'Sobre', href: '/about', isLink: true },
      { id: '6', label: 'Contato', href: '/contact', isLink: true },
    ],
    backgroundColor: '#171b22',
    textColor: '#ffffff',
    hoverColor: '#c62828',
  },

  // ============================================================================
  // HERO
  // ============================================================================
  hero: {
    enabled: true,
    title: 'M2',
    subtitle: 'Center Auto',
    description:
      'Especialistas em peças automotivas e serviços de qualidade. Mais de 15 anos cuidando do seu veículo com excelência.',
    features: [
      { id: '1', icon: 'Shield', text: 'Qualidade Garantida' },
      { id: '2', icon: 'Clock', text: 'Entrega Rápida' },
      { id: '3', icon: 'Wrench', text: 'Serviços Especializados' },
      { id: '4', icon: 'Star', text: '15+ Anos no Mercado' },
    ],
    buttons: [
      {
        id: '1',
        text: 'Ver Promoções',
        href: '#promocoes',
        variant: 'hero',
        enabled: true,
      },
      {
        id: '2',
        text: 'Solicitar Orçamento',
        href: '#servicos',
        variant: 'premium',
        enabled: true,
      },
      {
        id: '3',
        text: 'Falar no WhatsApp',
        href: 'https://wa.me/5511999999999',
        variant: 'outline',
        enabled: true,
      },
    ],
    backgroundImage: {
      url: '/assets/hero-garage.jpg',
      alt: 'Oficina M2',
    },
    overlayOpacity: 70, // 70% de opacidade preta
  },

  // ============================================================================
  // MARQUEE
  // ============================================================================
  marquee: {
    enabled: true,
    items: [
      { id: '1', icon: '🔧', text: 'PEÇAS ORIGINAIS COM ATÉ 30% DE DESCONTO' },
      { id: '2', icon: '⚡', text: 'SERVIÇOS ESPECIALIZADOS - ORÇAMENTO GRÁTIS' },
      { id: '3', icon: '🚗', text: 'ENTREGA RÁPIDA EM TODA A CIDADE' },
      { id: '4', icon: '🛠️', text: 'QUALIDADE GARANTIDA - ESPECIALISTAS HÁ MAIS DE 15 ANOS' },
      { id: '5', icon: '💰', text: 'PROMOÇÕES IMPERDÍVEIS - CONFIRA NOSSAS OFERTAS' },
    ],
    speed: 30, // 30 segundos para completar o loop
    backgroundColor: 'linear-gradient(90deg, #c62828 0%, #ffa600 100%)', // gradient-marquee (Vermelho → Dourado)
    textColor: '#ffffff',
  },

  // ============================================================================
  // ABOUT (Seção "Nossos Serviços")
  // ============================================================================
  about: {
    enabled: true,
    title: 'Nossos Serviços',
    subtitle:
      'Oferecemos uma gama completa de serviços automotivos com qualidade profissional e preços justos. Sua tranquilidade é nossa prioridade.',
    trustIndicators: [
      {
        id: '1',
        icon: 'Shield',
        iconBackground: 'linear-gradient(135deg, #ffd900 0%, #ffa600 50%, #ab8617 100%)', // Dourado Premium
        title: 'Garantia',
        description: '6 meses em todos os serviços',
      },
      {
        id: '2',
        icon: 'Clock',
        iconBackground: 'linear-gradient(135deg, #ffd900 0%, #ffa600 50%, #ab8617 100%)', // Dourado Premium
        title: 'Agilidade',
        description: 'Atendimento rápido e eficiente',
      },
      {
        id: '3',
        icon: 'Wrench',
        iconBackground: '#c62828',
        title: 'Expertise',
        description: '15+ anos de experiência',
      },
      {
        id: '4',
        icon: 'Zap',
        iconBackground: '#c62828',
        title: 'Tecnologia',
        description: 'Equipamentos modernos',
      },
    ],
  },

  // ============================================================================
  // PRODUCTS (Seção "Peças Originais")
  // ============================================================================
  products: {
    enabled: true,
    title: 'Peças Originais',
    subtitle: 'Temos as melhores peças para o seu veículo com preços competitivos e qualidade garantida.',
  },

  // ============================================================================
  // SERVICES (Seção "Promoções" - nome mantido do schema)
  // ============================================================================
  services: {
    enabled: true,
    title: 'Promoções Especiais',
    subtitle: 'Aproveite nossas ofertas exclusivas em peças e serviços. Economize mantendo seu veículo em dia!',
  },

  // ============================================================================
  // CONTACT PAGE
  // ============================================================================
  contactPage: {
    enabled: true,
    heroBadge: 'Fale Conosco',
    heroTitle: 'Entre em Contato',
    heroSubtitle: 'Estamos prontos para ajudar com suas necessidades automotivas. Entre em contato e receba atendimento personalizado.',
    contactInfoCards: [
      {
        id: '1',
        icon: 'MapPin',
        title: 'Endereço',
        content: ['Rua das Oficinas, 123', 'Centro - São Paulo/SP', 'CEP: 01234-567'],
        color: { type: 'solid', solid: '#2563eb' }, // text-blue-600
      },
      {
        id: '2',
        icon: 'Phone',
        title: 'Telefone',
        content: ['(11) 99999-9999', 'WhatsApp disponível'],
        color: { type: 'solid', solid: '#16a34a' }, // text-green-600
      },
      {
        id: '3',
        icon: 'Mail',
        title: 'E-mail',
        content: ['contato@m2centerauto.com.br', 'Resposta em até 24h'],
        color: { type: 'solid', solid: '#dc2626' }, // text-red-600
      },
      {
        id: '4',
        icon: 'Clock',
        title: 'Horário',
        content: ['Seg a Sex: 8h às 18h', 'Sábado: 8h às 12h', 'Domingo: Fechado'],
        color: { type: 'solid', solid: '#9333ea' }, // text-purple-600
      },
    ],
    formTitle: 'Envie sua Mensagem',
    formSubtitle: 'Preencha o formulário abaixo e entraremos em contato o mais breve possível.',
    serviceTypes: [
      { id: '1', name: 'Manutenção Preventiva' },
      { id: '2', name: 'Diagnóstico de Problemas' },
      { id: '3', name: 'Troca de Peças' },
      { id: '4', name: 'Orçamento Geral' },
      { id: '5', name: 'Urgência/Emergência' },
      { id: '6', name: 'Outros' },
    ],
    mapTitle: 'Nossa Localização',
    mapSubtitle: 'Visite nossa oficina para um atendimento presencial personalizado.',
    quickInfoEnabled: true,
    ctaTitle: 'Precisa de Ajuda Imediata?',
    ctaSubtitle: 'Entre em contato via WhatsApp para atendimento prioritário',
  },

  // ============================================================================
  // ABOUT PAGE
  // ============================================================================
  aboutPage: {
    enabled: true,
    heroBadge: 'Sobre Nós',
    heroTitle: 'Mais de 15 Anos',
    heroHighlight: 'Cuidando do Seu Veículo',
    heroSubtitle: 'Especialistas em peças automotivas e serviços de qualidade. Nossa missão é garantir que seu veículo esteja sempre em perfeitas condições.',
    stats: [
      { id: '1', number: '15+', label: 'Anos de Experiência' },
      { id: '2', number: '10k+', label: 'Peças em Estoque' },
      { id: '3', number: '5k+', label: 'Clientes Satisfeitos' },
      { id: '4', number: '50k+', label: 'Serviços Realizados' },
    ],
    historyTitle: 'Nossa História',
    historySubtitle: 'Uma jornada de dedicação, crescimento e compromisso com a excelência no setor automotivo.',
    milestones: [
      { id: '1', year: '2009', title: 'Fundacao', description: 'Inicio da M2 Center Auto' },
      { id: '2', year: '2012', title: 'Expansão', description: 'Ampliação do estoque e serviços' },
      { id: '3', year: '2015', title: 'Modernização', description: 'Investimento em equipamentos de diagnóstico' },
      { id: '4', year: '2018', title: 'Certificação', description: 'Certificação ISO 9001' },
      { id: '5', year: '2021', title: 'Digital', description: 'Lançamento da plataforma online' },
      { id: '6', year: '2024', title: 'Presente', description: 'Mais de 15 anos servindo com excelência' },
    ],
    valuesTitle: 'Nossos Valores',
    valuesSubtitle: 'Os princípios que guiam nossa empresa e nosso compromisso com cada cliente.',
    values: [
      {
        id: '1',
        icon: 'Shield',
        title: 'Qualidade',
        description: 'Compromisso com peças originais e serviços de alta qualidade',
        color: { type: 'solid', solid: '#2563eb' }, // text-blue-600
      },
      {
        id: '2',
        icon: 'Heart',
        title: 'Confiança',
        description: 'Relacionamento baseado na transparência e honestidade',
        color: { type: 'solid', solid: '#dc2626' }, // text-red-600
      },
      {
        id: '3',
        icon: 'Target',
        title: 'Excelência',
        description: 'Busca constante pela melhoria contínua dos nossos serviços',
        color: { type: 'solid', solid: '#16a34a' }, // text-green-600
      },
      {
        id: '4',
        icon: 'Users',
        title: 'Relacionamento',
        description: 'Foco no atendimento personalizado e duradouro',
        color: { type: 'solid', solid: '#9333ea' }, // text-purple-600
      },
    ],
    servicesTitle: 'Nossos Serviços',
    servicesSubtitle: 'Oferecemos uma ampla gama de serviços especializados para manter seu veículo em perfeitas condições.',
    services: [
      { id: '1', name: 'Manutenção Preventiva e Corretiva' },
      { id: '2', name: 'Diagnóstico Eletrônico Completo' },
      { id: '3', name: 'Troca de Óleo e Filtros' },
      { id: '4', name: 'Sistema de Freios e ABS' },
      { id: '5', name: 'Suspensão e Amortecedores' },
      { id: '6', name: 'Sistema Elétrico e Eletrônico' },
      { id: '7', name: 'Ar Condicionado Automotivo' },
      { id: '8', name: 'Injeção Eletrônica' },
      { id: '9', name: 'Sistema de Ignição' },
      { id: '10', name: 'Alinhamento e Balanceamento' },
    ],
    commitmentTitle: 'Nosso Compromisso',
    commitmentText: 'Garantir que cada cliente tenha a melhor experiência possível, com serviços de qualidade superior, atendimento personalizado e preços justos. Sua satisfação é nossa maior conquista.',
    commitmentYears: '15+ Anos de Excelência',
  },

  // ============================================================================
  // CONTACT (placeholder - não usado)
  // ============================================================================
  contact: {},

  // ============================================================================
  // FOOTER
  // ============================================================================
  footer: {
    enabled: true,
    logo: {
      url: '',
      alt: 'M2 Center Auto',
    },
    description:
      'Especialistas em peças automotivas e serviços de qualidade há mais de 15 anos. Sua tranquilidade é nossa prioridade.',
    contactInfo: {
      address: {
        street: 'Rua das Oficinas, 123',
        city: 'Centro - São Paulo/SP',
        zipCode: 'CEP: 01234-567',
      },
      phone: '(11) 99999-9999',
      email: 'contato@m2centerauto.com.br',
    },
    businessHours: {
      weekdays: 'Segunda a Sexta:\n8:00h às 18:00h',
      saturday: 'Sábado:\n8:00h às 12:00h',
      sunday: 'Domingo:\nFechado',
    },
    services: [
      { id: '1', name: 'Manutenção Preventiva' },
      { id: '2', name: 'Troca de Óleo' },
      { id: '3', name: 'Diagnóstico Eletrônico' },
      { id: '4', name: 'Freios e Suspensão' },
      { id: '5', name: 'Ar Condicionado' },
      { id: '6', name: 'Sistema Elétrico' },
    ],
    socialLinks: [
      { id: '1', platform: 'facebook', url: 'https://facebook.com/m2centerauto', enabled: true },
      { id: '2', platform: 'instagram', url: 'https://instagram.com/m2centerauto', enabled: true },
    ],
    certifications: [
      {
        id: '1',
        icon: 'Wrench',
        iconBackground: 'linear-gradient(135deg, #ffd900 0%, #ffa600 50%, #ab8617 100%)', // Dourado Premium
        title: 'Garantia de 6 Meses',
        description: 'Em todos os serviços realizados',
      },
      {
        id: '2',
        icon: 'Clock',
        iconBackground: '#c62828',
        title: 'Atendimento Rápido',
        description: 'Diagnóstico em até 30 minutos',
      },
      {
        id: '3',
        icon: 'MapPin',
        iconBackground: 'linear-gradient(135deg, #ffd900 0%, #ffa600 50%, #ab8617 100%)', // Dourado Premium
        title: 'Entrega na Região',
        description: 'Peças entregues em até 24h',
      },
    ],
    copyright: '© 2026 M2 Center Auto. Todos os direitos reservados.',
    bottomLinks: [
      { id: '1', text: 'Política de Privacidade', href: '#' },
      { id: '2', text: 'Termos de Uso', href: '#' },
      { id: '3', text: 'Garantia', href: '#' },
    ],
  },
});
