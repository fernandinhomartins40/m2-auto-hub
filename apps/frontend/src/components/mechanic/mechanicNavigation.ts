/**
 * Slug de URL de cada tela do painel do mecânico.
 *
 * Mesmo padrão do painel do lojista: o `id` continua sendo a chave interna e o
 * slug é só o que aparece na barra de endereços.
 */
export const mechanicTabSlugs: Record<string, string> = {
  revisions: "revisoes",
  "service-orders": "ordens-de-servico",
  settings: "perfil",
};

const slugToTab: Record<string, string> = Object.fromEntries(
  Object.entries(mechanicTabSlugs).map(([tab, slug]) => [slug, tab])
);

/** Slug da URL para o id interno da aba. `revisions` quando não reconhecido. */
export function mechanicTabFromSlug(slug: string | undefined): string {
  if (!slug) return "revisions";
  return slugToTab[slug] ?? "revisions";
}

/** Id interno da aba para o slug da URL. */
export function mechanicSlugFromTab(tab: string): string {
  return mechanicTabSlugs[tab] ?? "revisoes";
}
