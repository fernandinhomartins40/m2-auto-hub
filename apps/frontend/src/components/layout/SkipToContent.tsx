/**
 * Primeiro elemento focavel da pagina: leva o teclado direto ao `<main>`,
 * pulando a navegacao. Fica fora da tela ate receber foco (A-05: 22 tabulacoes
 * ate o conteudo nos paineis).
 *
 * O alvo precisa ser um `<main id={...} tabIndex={-1}>` na mesma pagina —
 * `tabIndex={-1}` para que o foco realmente va para la, e nao so o scroll.
 */
export const MAIN_CONTENT_ID = "conteudo";

interface SkipToContentProps {
  /** Id do `<main>` de destino. Default: {@link MAIN_CONTENT_ID}. */
  targetId?: string;
}

export function SkipToContent({ targetId = MAIN_CONTENT_ID }: SkipToContentProps) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only rounded-md bg-moria-orange px-4 py-2 text-sm font-semibold text-white shadow-lg outline-none focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:ring-2 focus:ring-white"
      onClick={(event) => {
        // O href sozinho move o scroll mas nem sempre o foco (o alvo nao e
        // focavel por natureza). Focar na mao mantem o Tab seguinte dentro do
        // conteudo em vez de voltar para o topo da navegacao.
        const target = document.getElementById(targetId);
        if (target) {
          event.preventDefault();
          target.focus();
          target.scrollIntoView();
        }
      }}
    >
      Pular para o conteúdo
    </a>
  );
}
