import type { ReactNode } from "react";

import { cn } from "../../lib/utils";

/**
 * Primitivos de layout do painel.
 *
 * Existem para que a regra de breakpoint viva em UM lugar so. O painel tem uma
 * particularidade que nenhuma tela deveria precisar lembrar sozinha:
 *
 *   em 768px a sidebar fixa de 288px entra na tela e a area de conteudo
 *   ENCOLHE de 768px para 532px.
 *
 * Por isso nenhuma grid daqui aumenta o numero de colunas em `md:` — seria
 * pedir mais colunas exatamente no pixel em que sobra menos espaco. O salto
 * para 4 colunas acontece em `nb` (1180px), que e a menor largura medida em
 * que o texto de um card de KPI para de ser cortado.
 *
 * Medicoes em RESPONSIVE-UX-AUDIT.md, secao 3.
 */

type DivProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Container de uma secao do painel: largura, respiro vertical e a garantia de
 * `min-w-0` (sem ele, um filho flex/grid com conteudo largo recusa encolher e
 * gera scroll horizontal na pagina inteira).
 */
export function PageContainer({ children, className }: DivProps) {
  return (
    <div className={cn("flex min-w-0 max-w-full flex-col gap-4 sm:gap-6", className)}>
      {children}
    </div>
  );
}

/**
 * Grid de cards de metrica (KPI).
 *
 * 2 colunas ja no celular — um KPI e um numero curto, cabe. Some para 4 so em
 * `nb`. Nunca passa por `md:`.
 */
export function StatGrid({ children, className }: DivProps) {
  return (
    <div className={cn("grid min-w-0 grid-cols-2 gap-3 sm:gap-4 nb:grid-cols-4", className)}>
      {children}
    </div>
  );
}

/**
 * Grid de cards de conteudo (produto, servico, cupom, promocao).
 *
 * Cards de conteudo tem texto longo e acoes, entao sobem mais devagar que os
 * KPIs: 1 -> 2 (sm) -> 3 (nb).
 */
export function CardGrid({ children, className }: DivProps) {
  return (
    <div
      className={cn(
        "grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 nb:grid-cols-3",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Linha de acoes de um card.
 *
 * Empilha no estreito e vira linha no largo. Com `flex-wrap` porque tres
 * botoes de rotulo variavel ("Desativar", "Editar", "Excluir") nao cabem lado
 * a lado num card de 145px — e ai eles vazavam para fora do card.
 */
export function ActionRow({ children, className }: DivProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end",
        className
      )}
    >
      {children}
    </div>
  );
}
