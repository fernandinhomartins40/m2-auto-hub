import {
  BarChart3,
  BriefcaseBusiness,
  LayoutDashboard,
  Menu,
  Package,
  Percent,
  Settings,
  Users,
} from "lucide-react";

export type AdminNavSection =
  | "Operação"
  | "Catálogo"
  | "Clientes"
  | "Marketing"
  | "Gestão";

export type AdminNavItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  section?: AdminNavSection;
  requiresPermission?: string;
  activeTabs?: string[];
};

export const adminSidebarItems: AdminNavItem[] = [
  { id: "dashboard", label: "Início", icon: LayoutDashboard, section: "Operação" },
  { id: "service-center", label: "Atendimentos", icon: BriefcaseBusiness, section: "Operação", activeTabs: ["service-center", "orders", "quotes", "service-orders", "revisions"] },

  { id: "products", label: "Catálogo", icon: Package, section: "Operação", activeTabs: ["products", "services", "marketplaces"] },

  { id: "customers", label: "Clientes", icon: Users, section: "Operação", activeTabs: ["customers", "relationship", "support", "loyalty"] },

  { id: "promotions", label: "Vendas", icon: Percent, section: "Marketing", activeTabs: ["promotions", "coupons", "landing-page"] },

  { id: "reports", label: "Relatórios", icon: BarChart3, section: "Gestão" },
  { id: "settings", label: "Configurações", icon: Settings, section: "Gestão", activeTabs: ["settings", "account", "pwa-settings", "users", "privacy-governance"] },
];

/**
 * Slug de URL de cada tela do painel.
 *
 * O `id` continua sendo a chave interna (usada pelo switch de conteúdo e pela
 * navegação); o slug é só o que aparece na barra de endereços. Manter os dois
 * separados evita ter de renomear ids por toda a base para deixar a URL legível.
 */
export const adminTabSlugs: Record<string, string> = {
  dashboard: "dashboard",
  "service-center": "atendimentos",
  orders: "pedidos",
  quotes: "orcamentos",
  "service-orders": "ordens-de-servico",
  revisions: "revisoes",
  products: "produtos",
  services: "servicos",
  marketplaces: "marketplaces",
  customers: "clientes",
  relationship: "relacionamento",
  support: "suporte",
  loyalty: "fidelidade",
  coupons: "cupons",
  promotions: "promocoes",
  "landing-page": "landing-page",
  account: "minha-conta",
  reports: "relatorios",
  "pwa-settings": "pwa",
  settings: "configuracoes",
  users: "usuarios",
  "privacy-governance": "seguranca-lgpd",
};

const slugToTab: Record<string, string> = Object.fromEntries(
  Object.entries(adminTabSlugs).map(([tab, slug]) => [slug, tab])
);

/** Slug da URL para o id interno da aba. `dashboard` quando não reconhecido. */
export function tabFromSlug(slug: string | undefined): string {
  if (!slug) return "dashboard";
  return slugToTab[slug] ?? "dashboard";
}

/** Id interno da aba para o slug da URL. */
export function slugFromTab(tab: string): string {
  return adminTabSlugs[tab] ?? "dashboard";
}

// "Produtos" fica no menu "Mais" (drawer) para liberar o centro da barra,
// onde fica o botão de Consulta por Placa.
export const adminBottomNavItems: AdminNavItem[] = [
  { id: "dashboard", label: "Início", icon: LayoutDashboard },
  { id: "service-center", label: "Atender", icon: BriefcaseBusiness },
  { id: "customers", label: "Clientes", icon: Users },
  { id: "menu", label: "Mais", icon: Menu },
];
