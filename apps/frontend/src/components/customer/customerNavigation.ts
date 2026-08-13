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
};

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
