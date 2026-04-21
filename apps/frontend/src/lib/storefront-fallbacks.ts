import type {
  LandingPageConfig,
  PublicSettings,
  StorefrontProduct,
  StorefrontPromotion,
  StorefrontService,
} from "@/types/storefront";

export const fallbackPublicSettings: PublicSettings = {
  storeName: "M2 Auto Pecas & Auto Center",
  phone: "(42) 3657-1420",
  whatsapp: "5542991215515",
  email: "",
  address: "Rua Maximiliano Vicentin, 153",
  city: "Palmital",
  state: "PR",
  zipCode: "",
  businessHours: {
    monday: "08:00-18:00",
    tuesday: "08:00-18:00",
    wednesday: "08:00-18:00",
    thursday: "08:00-18:00",
    friday: "08:00-18:00",
    saturday: "08:00-12:00",
    sunday: "Fechado",
  },
};

export const fallbackLandingConfig: LandingPageConfig = {
  header: {
    enabled: true,
    menuItems: [
      { id: "inicio", label: "Inicio", href: "#inicio" },
      { id: "sobre", label: "Sobre", href: "#sobre" },
      { id: "servicos", label: "Servicos", href: "#servicos" },
      { id: "produtos", label: "Produtos", href: "#produtos" },
      { id: "promocoes", label: "Promocoes", href: "#promocoes" },
      { id: "contato", label: "Contato", href: "#contato" },
    ],
  },
  hero: {
    enabled: true,
    title: "Tudo que seu carro precisa,",
    subtitle: "voce encontra aqui.",
    description:
      "Auto Pecas + Auto Center em Palmital/PR. Atendimento especializado em mecanica leve, pesada e diesel.",
    features: [
      { id: "1", icon: "Wrench", text: "Mecanica Especializada" },
      { id: "2", icon: "Droplets", text: "Oleos e Lubrificantes" },
      { id: "3", icon: "Truck", text: "Linha Diesel" },
      { id: "4", icon: "Shield", text: "Pecas de Qualidade" },
    ],
    buttons: [
      { id: "1", text: "Agendar Servico", href: "#contato", variant: "hero", enabled: true },
      { id: "2", text: "Ver Servicos", href: "#servicos", variant: "outline", enabled: true },
      {
        id: "3",
        text: "Fale no WhatsApp",
        href: "https://wa.me/5542991215515",
        variant: "premium",
        enabled: true,
      },
    ],
  },
  marquee: {
    enabled: true,
    items: [
      { id: "1", icon: "*", text: "Promocoes validas enquanto durarem os estoques" },
      { id: "2", icon: "|", text: "Entre em contato para conferir disponibilidade" },
      { id: "3", icon: "WhatsApp", text: "(42) 9 9121-5515" },
    ],
  },
  about: {
    enabled: true,
    title: "Nossos Servicos",
    subtitle:
      "Atendimento tecnico especializado para mecanica leve, pesada e diesel, com foco em agilidade e confianca.",
    trustIndicators: [
      { id: "1", icon: "Shield", title: "Seguranca", description: "Servico confiavel" },
      { id: "2", icon: "Clock", title: "Agilidade", description: "Atendimento rapido" },
      { id: "3", icon: "Wrench", title: "Experiencia", description: "Equipe especializada" },
      { id: "4", icon: "Truck", title: "Diesel", description: "Linha pesada e utilitarios" },
    ],
  },
  products: {
    enabled: true,
    title: "Nossos Produtos",
    subtitle:
      "Trabalhamos com as melhores marcas do mercado para garantir qualidade e durabilidade para o seu veiculo.",
  },
  services: {
    enabled: true,
    title: "Promocoes da Semana",
    subtitle: "Aproveite nossas ofertas especiais por tempo limitado.",
  },
  contactPage: {
    enabled: true,
    heroBadge: "Entre em Contato",
    heroTitle: "Fale com a M2",
    heroSubtitle:
      "Atendimento rapido para orcamentos, agendamentos e duvidas sobre pecas e servicos.",
    formTitle: "Envie sua Solicitacao",
    formSubtitle: "Conte o que voce precisa e seguimos com o atendimento pelo WhatsApp.",
    serviceTypes: [
      { id: "1", name: "Mecanica Geral" },
      { id: "2", name: "Especialidade Diesel" },
      { id: "3", name: "Troca de Oleo" },
      { id: "4", name: "Escapamentos" },
      { id: "5", name: "Instalacao de Acessorios" },
      { id: "6", name: "Suspensao e Freios" },
      { id: "7", name: "Outro" },
    ],
    mapTitle: "Nossa Localizacao",
    mapSubtitle: "Visite a loja para atendimento presencial.",
  },
  aboutPage: {
    enabled: true,
    heroTitle: "Mais de 14 anos",
    heroHighlight: "cuidando do seu veiculo",
    heroSubtitle:
      "A M2 Auto Center nasceu em Palmital com um proposito claro: oferecer pecas de qualidade e servicos confiaveis em um so lugar.",
    stats: [
      { id: "1", number: "14+", label: "Anos de Experiencia" },
      { id: "2", number: "1000+", label: "Clientes Atendidos" },
      { id: "3", number: "Leve", label: "Mecanica" },
      { id: "4", number: "Diesel", label: "Especialidade" },
    ],
  },
  footer: {
    enabled: true,
    description: "Tudo que seu carro precisa, voce encontra aqui.",
    contactInfo: {
      address: {
        street: "Rua Maximiliano Vicentin, 153",
        city: "Palmital - PR",
      },
      phone: "(42) 3657-1420",
      email: "",
    },
    socialLinks: [
      {
        id: "1",
        platform: "instagram",
        url: "https://instagram.com/m2autocenterpalmital",
        enabled: true,
      },
      {
        id: "2",
        platform: "whatsapp",
        url: "https://wa.me/5542991215515",
        enabled: true,
      },
    ],
    copyright: "(c) 2026 M2 Auto Center. Todos os direitos reservados.",
  },
};

export const fallbackServices: StorefrontService[] = [
  {
    id: "m2-service-1",
    name: "Mecanica Geral",
    description: "Manutencao preventiva e corretiva para o seu veiculo.",
    category: "Mecanica",
    estimatedTime: "Sob consulta",
  },
  {
    id: "m2-service-2",
    name: "Especialidade Diesel",
    description: "Servicos completos para caminhonetes e veiculos de carga.",
    category: "Diesel",
    estimatedTime: "Sob consulta",
  },
  {
    id: "m2-service-3",
    name: "Troca de Oleo",
    description: "Oleos minerais e sinteticos com filtros de qualidade.",
    category: "Lubrificacao",
    estimatedTime: "A partir de 30 min",
  },
  {
    id: "m2-service-4",
    name: "Escapamentos",
    description: "Instalacao e substituicao de sistemas de exaustao.",
    category: "Escapamentos",
    estimatedTime: "Sob consulta",
  },
  {
    id: "m2-service-5",
    name: "Instalacao de Acessorios",
    description: "Montagem das pecas adquiridas na loja.",
    category: "Acessorios",
    estimatedTime: "Sob consulta",
  },
  {
    id: "m2-service-6",
    name: "Suspensao e Freios",
    description: "Diagnostico e reparo de sistemas essenciais de seguranca.",
    category: "Freios",
    estimatedTime: "Sob consulta",
  },
];

export const fallbackProducts: StorefrontProduct[] = [
  {
    id: "m2-product-1",
    name: "Oleos e Lubrificantes",
    description: "Linha completa de oleos minerais, semissinteticos e sinteticos.",
    category: "Lubrificacao",
  },
  {
    id: "m2-product-2",
    name: "Escapamentos e Silenciosos",
    description: "Sistemas de exaustao para veiculos leves e pesados.",
    category: "Escapamento",
  },
  {
    id: "m2-product-3",
    name: "Filtros",
    description: "Filtros de oleo, ar, combustivel e cabine.",
    category: "Filtros",
  },
  {
    id: "m2-product-4",
    name: "Pecas para Motor",
    description: "Componentes originais e alternativos para motores gasolina e diesel.",
    category: "Motor",
  },
  {
    id: "m2-product-5",
    name: "Suspensao e Direcao",
    description: "Amortecedores, buchas, terminais e componentes de direcao.",
    category: "Suspensao",
  },
  {
    id: "m2-product-6",
    name: "Linha Diesel",
    description: "Pecas e acessorios especificos para veiculos diesel e frotas.",
    category: "Diesel",
  },
  {
    id: "m2-product-7",
    name: "Freios",
    description: "Pastilhas, discos, lonas e fluidos de freio.",
    category: "Freios",
  },
  {
    id: "m2-product-8",
    name: "Eletrica Automotiva",
    description: "Baterias, alternadores, velas e componentes do sistema eletrico.",
    category: "Eletrica",
  },
];

export const fallbackPromotions: StorefrontPromotion[] = [
  {
    id: "m2-promo-1",
    name: "Troca de Oleo + Filtro",
    description: "Oleo sintetico + filtro de oleo + mao de obra incluida.",
    shortDescription: "Consulte condicoes da promocao",
    badgeText: "OFERTA",
  },
  {
    id: "m2-promo-2",
    name: "Revisao Preventiva Completa",
    description: "Verificacao de freios, suspensao, fluidos e sistema eletrico.",
    shortDescription: "Agende agora e garanta sua vaga",
    badgeText: "DESTAQUE",
  },
  {
    id: "m2-promo-3",
    name: "Escapamento com Instalacao",
    description: "Compre seu escapamento e ganhe a instalacao por nossa equipe.",
    shortDescription: "Instalacao inclusa na compra",
    badgeText: "ECONOMIA",
  },
];
