/**
 * Slug de URL de cada tela do painel do cliente.
 *
 * Mesmo padrão dos painéis do lojista e do mecânico: o `id` continua sendo a
 * chave interna e o slug é só o que aparece na barra de endereços.
 */
export const customerTabSlugs: Record<string, string> = {
  dashboard: "inicio",
  profile: "perfil",
  quotes: "orcamentos",
  orders: "pedidos",
  vehicles: "veiculos",
  revisions: "revisoes",
  favorites: "favoritos",
  coupons: "cupons",
  support: "suporte",
  notifications: "notificacoes",
};

export const customerWorkspaces = [
  { label: 'Compras', tabs: [{ id: 'orders', label: 'Pedidos' }, { id: 'quotes', label: 'Orçamentos' }] },
  { label: 'Meu veículo', tabs: [{ id: 'vehicles', label: 'Veículos' }, { id: 'revisions', label: 'Revisões' }] },
  { label: 'Benefícios', tabs: [{ id: 'favorites', label: 'Favoritos' }, { id: 'coupons', label: 'Cupons' }] },
  { label: 'Conta', tabs: [{ id: 'profile', label: 'Perfil e endereços' }, { id: 'notifications', label: 'Notificações' }] },
] as const;

export const customerPrimaryNavigation = [
  { id: 'dashboard', label: 'Início', activeTabs: ['dashboard'] },
  { id: 'orders', label: 'Compras', activeTabs: ['orders', 'quotes'] },
  { id: 'vehicles', label: 'Meu veículo', activeTabs: ['vehicles', 'revisions'] },
  { id: 'favorites', label: 'Benefícios', activeTabs: ['favorites', 'coupons'] },
  { id: 'support', label: 'Ajuda', activeTabs: ['support'] },
  { id: 'profile', label: 'Conta', activeTabs: ['profile', 'notifications'] },
] as const;

export function isCustomerNavigationActive(target: string, currentTab: string): boolean {
  const item = customerPrimaryNavigation.find((entry) => entry.id === target);
  return item ? (item.activeTabs as readonly string[]).includes(currentTab) : false;
}

const slugToTab: Record<string, string> = Object.fromEntries(
  Object.entries(customerTabSlugs).map(([tab, slug]) => [slug, tab])
);

/** Slug da URL para o id interno da aba. `dashboard` quando não reconhecido. */
export function customerTabFromSlug(slug: string | undefined): string {
  if (!slug) return "dashboard";
  return slugToTab[slug] ?? "dashboard";
}

/** Id interno da aba para o slug da URL. */
export function customerSlugFromTab(tab: string): string {
  return customerTabSlugs[tab] ?? "inicio";
}
