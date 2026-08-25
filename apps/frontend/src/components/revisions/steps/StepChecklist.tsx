import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Frown,
  Loader2,
  Meh,
  MessageSquareText,
  Search,
  Smile,
  X,
} from 'lucide-react';

import checklistService, { type ChecklistCategory } from '@/api/checklistService';
import { ChecklistManager } from '@/components/revisions/ChecklistManager';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ItemStatus } from '@/types/revisions';
import { cn } from '@/lib/utils';

export interface AvaliacaoItem {
  itemId: string;
  itemName: string;
  categoryId: string;
  categoryName: string;
  status: ItemStatus;
  notes: string;
}

interface StepChecklistProps {
  avaliacoes: AvaliacaoItem[];
  onChange: (avaliacoes: AvaliacaoItem[]) => void;
  /**
   * Navegação do assistente. Omitidas quando o checklist é embutido em outra
   * tela (continuar revisão), que tem os próprios botões de salvar.
   */
  onNext?: () => void;
  onBack?: () => void;
}

/**
 * Carinhas em vez de rótulos: o mecânico está com o celular na mão, muitas
 * vezes de luva, e reconhece a cor/expressão mais rápido do que lê a palavra.
 */
const STATUS_OPCOES = [
  {
    valor: ItemStatus.OK,
    rotulo: 'Bom',
    Icone: Smile,
    ativo: 'bg-green-600 text-white border-green-600',
    leve: 'text-green-700 border-green-300 bg-green-50',
    ponto: 'bg-green-600',
  },
  {
    valor: ItemStatus.ATTENTION,
    rotulo: 'Atenção',
    Icone: Meh,
    ativo: 'bg-amber-500 text-white border-amber-500',
    leve: 'text-amber-700 border-amber-300 bg-amber-50',
    ponto: 'bg-amber-500',
  },
  {
    valor: ItemStatus.CRITICAL,
    rotulo: 'Crítico',
    Icone: Frown,
    ativo: 'bg-red-600 text-white border-red-600',
    leve: 'text-red-700 border-red-300 bg-red-50',
    ponto: 'bg-red-600',
  },
] as const;

const estiloDoStatus = (status: ItemStatus) =>
  STATUS_OPCOES.find((o) => o.valor === status);

/**
 * Normaliza para busca: quem digita "óleo" precisa achar "Oleo do motor", e o
 * cadastro do checklist nem sempre usa acento.
 */
// Range dos acentos combinantes (U+0300–U+036F). Montado por código porque o
// caractere literal é invisível e se perde se o arquivo for normalizado.
const ACENTOS = new RegExp(`[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`, 'g');

const semAcento = (texto: string) =>
  texto.normalize('NFD').replace(ACENTOS, '').toLowerCase().trim();

/**
 * Passo 3: checklist orientado por busca.
 *
 * O mecanico digita o que observou ("freio") e marca so o que precisa. Os itens
 * nao tocados ficam como NOT_CHECKED - nem toda revisao passa por tudo, e exigir
 * o checklist inteiro so faria o atendimento demorar.
 */
export function StepChecklist({ avaliacoes, onChange, onNext, onBack }: StepChecklistProps) {
  const comNavegacao = Boolean(onNext || onBack);
  const [categorias, setCategorias] = useState<ChecklistCategory[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [abertas, setAbertas] = useState<Set<string>>(new Set());
  const [avaliadosAbertos, setAvaliadosAbertos] = useState(false);
  // Um item por vez em edicao: o mecanico avalia, confirma e o card some.
  const [emEdicao, setEmEdicao] = useState<AvaliacaoItem | null>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  // Tela do painel: usa a rota de admin. A versão `/customer` exige sessão de
  // cliente e voltaria vazia aqui.
  const recarregarCategorias = useCallback(() => {
    setCarregando(true);
    checklistService
      .getChecklistStructureAdmin()
      .then((r) => setCategorias(r.categories || []))
      .catch(() => setCategorias([]))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => {
    recarregarCategorias();
  }, [recarregarCategorias]);

  const todosItens = useMemo(
    () =>
      categorias.flatMap((c) =>
        (c.items || []).map((i) => ({
          id: i.id,
          name: i.name,
          categoryId: c.id,
          categoryName: c.name,
        }))
      ),
    [categorias]
  );

  // Sem `.slice(0, 8)`: o corte em oito sugestoes escondia itens que casavam
  // com a busca e nao havia como chegar neles — "freio" sozinho ja passa de
  // oito. A lista rola em vez de truncar.
  const sugestoes = useMemo(() => {
    const termo = semAcento(busca);
    if (!termo) return [];
    return todosItens.filter(
      (i) => semAcento(i.name).includes(termo) || semAcento(i.categoryName).includes(termo)
    );
  }, [busca, todosItens]);

  const avaliado = (itemId: string) =>
    avaliacoes.find((a) => a.itemId === itemId && a.status !== ItemStatus.NOT_CHECKED);

  const itensAvaliados = useMemo(
    () => avaliacoes.filter((item) => item.status !== ItemStatus.NOT_CHECKED),
    [avaliacoes]
  );

  const adicionar = (item: {
    id: string;
    name: string;
    categoryId: string;
    categoryName: string;
  }) => {
    setBusca('');

    const jaAvaliado = avaliado(item.id);

    // Reabrir um item ja respondido em vez de duplicar a linha.
    setEmEdicao(
      jaAvaliado ?? {
        itemId: item.id,
        itemName: item.name,
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        status: ItemStatus.ATTENTION,
        notes: '',
      }
    );

    setTimeout(() => cardsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
  };

  /** Grava o item avaliado e fecha o card - um toque resolve tudo. */
  const confirmar = (status: ItemStatus) => {
    if (!emEdicao) return;

    const item = { ...emEdicao, status };
    const existente = avaliacoes.some((a) => a.itemId === item.itemId);

    onChange(
      existente
        ? avaliacoes.map((a) => (a.itemId === item.itemId ? item : a))
        : [...avaliacoes, item]
    );

    setEmEdicao(null);
  };

  const reabrir = (item: AvaliacaoItem) => {
    setEmEdicao(item);
    setTimeout(() => cardsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
  };

  const cancelarEdicao = () => setEmEdicao(null);

  const remover = (itemId: string) => {
    onChange(avaliacoes.filter((a) => a.itemId !== itemId));
    setEmEdicao((atual) => (atual?.itemId === itemId ? null : atual));
  };

  const alternarCategoria = (id: string) =>
    setAbertas((atual) => {
      const nova = new Set(atual);
      nova.has(id) ? nova.delete(id) : nova.add(id);
      return nova;
    });

  const comProblema = itensAvaliados.filter(
    (a) => a.status === ItemStatus.ATTENTION || a.status === ItemStatus.CRITICAL
  ).length;

  // Sem limite de largura: esta etapa agora ocupa a pagina, nao um modal.
  return (
    <div className="w-full space-y-5">
      {/* flex-wrap + shrink-0 no botao: em largura apertada o titulo empurrava
          o "Gerenciar Checklist" para cima do proprio texto. */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-[16rem] flex-1">
          <h2 className="text-lg font-bold">O que você verificou?</h2>
          <p className="text-sm text-muted-foreground">
            Digite o que observou — por exemplo "freio" — e marque o estado. O que não for
            verificado fica registrado como tal.
          </p>
        </div>
        {/* Criar/desabilitar itens do checklist: vivia no fluxo antigo e
            precisa continuar ao alcance de quem monta a revisão. */}
        <div className="shrink-0">
          <ChecklistManager onChanged={recarregarCategorias} />
        </div>
      </div>

      {/* Busca */}
      <div className="rounded-2xl border-2 border-moria-orange/40 bg-moria-orange/5 p-3 shadow-sm sm:p-4">
        <label htmlFor="revision-item-search" className="mb-2 block text-sm font-bold sm:text-base">
          Buscar item para avaliar
        </label>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-moria-orange" />
          <Input
            id="revision-item-search"
            className="h-14 border-2 bg-background pl-12 pr-4 text-base shadow-sm focus-visible:ring-moria-orange sm:h-16 sm:text-lg"
            placeholder="Buscar item: freio, óleo, pneu..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            disabled={carregando}
          />

          {sugestoes.length > 0 && (
            <div className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border bg-background shadow-xl">
              {sugestoes.map((item) => {
                const jaTem = Boolean(avaliado(item.id));
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => adicionar(item)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{item.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {item.categoryName}
                      </span>
                    </span>
                    {jaTem && <Check className="h-4 w-4 shrink-0 text-green-600" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Digite o nome do componente ou da categoria para localizar rapidamente.
        </p>
      </div>

      {/* Card em edição: só um por vez, some assim que o item é confirmado. */}
      {emEdicao && (
        <div ref={cardsRef} className="rounded-xl border-2 border-moria-orange/40 bg-card p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold leading-tight">{emEdicao.itemName}</p>
              <p className="truncate text-xs text-muted-foreground">{emEdicao.categoryName}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={cancelarEdicao}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* O status fica selecionado enquanto a observacao e preenchida. */}
          <div className="grid grid-cols-3 gap-2">
            {STATUS_OPCOES.map(({ valor, rotulo, Icone, ativo, leve }) => (
              <button
                key={valor}
                type="button"
                onClick={() => setEmEdicao({ ...emEdicao, status: valor })}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-lg border-2 py-2 transition-colors',
                  emEdicao.status === valor ? ativo : leve
                )}
              >
                <Icone className="h-6 w-6" />
                <span className="text-xs font-medium">{rotulo}</span>
              </button>
            ))}
          </div>

          <div className="mt-3 rounded-lg border bg-muted/30 p-2.5">
            <label
              htmlFor={`item-note-${emEdicao.itemId}`}
              className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold"
            >
              <MessageSquareText className="h-3.5 w-3.5 text-moria-orange" />
              Observação do item <span className="font-normal text-muted-foreground">(opcional)</span>
            </label>
            <input
              id={`item-note-${emEdicao.itemId}`}
              value={emEdicao.notes}
              onChange={(e) => setEmEdicao({ ...emEdicao, notes: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && confirmar(emEdicao.status)}
              placeholder="Ex.: desgaste irregular, troca recomendada..."
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-moria-orange"
            />
          </div>
          <Button
            type="button"
            onClick={() => confirmar(emEdicao.status)}
            className="mt-3 h-10 w-full bg-moria-orange hover:bg-moria-orange/90"
          >
            <Check className="mr-2 h-4 w-4" />
            Confirmar avaliação
          </Button>
        </div>
      )}

      {/* Confirmados: somente itens efetivamente avaliados, em painel recolhível. */}
      {itensAvaliados.length > 0 && (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <button
            type="button"
            onClick={() => setAvaliadosAbertos((value) => !value)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40"
            aria-expanded={avaliadosAbertos}
          >
            <span>
              <span className="block text-sm font-bold">Itens já avaliados</span>
              <span className="block text-xs text-muted-foreground">
                {itensAvaliados.length} {itensAvaliados.length === 1 ? 'item' : 'itens'} ·
                clique para {avaliadosAbertos ? 'recolher' : 'expandir'}
              </span>
            </span>
            {avaliadosAbertos ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </button>
          {avaliadosAbertos && (
            <div className="divide-y border-t">
              {itensAvaliados.map((a) => {
                const estilo = estiloDoStatus(a.status);
                const Icone = estilo?.Icone ?? Smile;

                return (
                  <div key={a.itemId} className="flex items-start gap-3 px-3 py-3 sm:px-4">
                    <span className={cn('rounded-full p-1', estilo?.ponto)}>
                      <Icone className="h-3.5 w-3.5 text-white" />
                    </span>
                    <button
                      type="button"
                      onClick={() => reabrir(a)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-sm font-semibold">{a.itemName}</span>
                        <span
                          className={cn(
                            'rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                            estilo?.leve
                          )}
                        >
                          {estilo?.rotulo}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {a.categoryName}
                      </span>
                      <span
                        className={cn(
                          'mt-2 flex items-start gap-1.5 rounded-md px-2 py-1.5 text-xs',
                          a.notes
                            ? 'bg-amber-50 text-amber-900'
                            : 'bg-muted/50 text-muted-foreground'
                        )}
                      >
                        <MessageSquareText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>
                          <strong className="font-semibold">Observação:</strong>{' '}
                          {a.notes || 'Sem observação'}
                        </span>
                      </span>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => remover(a.itemId)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {itensAvaliados.length === 0 && !emEdicao && !carregando && (
        <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
          Nenhum item avaliado ainda. Use a busca acima.
        </p>
      )}

      {/* Lista completa, fechada por padrao */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Todos os itens
        </p>

        {carregando ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          categorias.map((cat) => {
            const aberta = abertas.has(cat.id);
            const marcados = (cat.items || []).filter((i) => avaliado(i.id)).length;

            return (
              <div key={cat.id} className="overflow-hidden rounded-lg border">
                <button
                  type="button"
                  onClick={() => alternarCategoria(cat.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50"
                >
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{cat.name}</span>
                    {marcados > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {marcados}
                      </Badge>
                    )}
                  </span>
                  <ChevronDown
                    className={cn('h-4 w-4 transition-transform', aberta && 'rotate-180')}
                  />
                </button>

                {aberta && (
                  <div className="divide-y border-t">
                    {(cat.items || []).map((item) => {
                      const jaTem = Boolean(avaliado(item.id));
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            adicionar({
                              id: item.id,
                              name: item.name,
                              categoryId: cat.id,
                              categoryName: cat.name,
                            })
                          }
                          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-muted/50"
                        >
                          <span className="min-w-0 truncate">{item.name}</span>
                          {jaTem && <Check className="h-4 w-4 shrink-0 text-green-600" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Sem `-mx-4`: a margem negativa so ficava alinhada se o pai tivesse
          exatamente px-4, e vazava para fora nas telas que usam outro padding.

          Fundo opaco (`bg-background`, sem o /95 nem o backdrop-blur): sendo
          `sticky`, a barra passa por cima da lista, e com fundo translucido o
          item que ficava atras vazava atraves do texto do resumo. O `z-10`
          garante que ela fique acima dos cards. */}
      <div className="sticky bottom-0 z-10 border-t bg-background px-4 py-3 sm:rounded-lg sm:border">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {itensAvaliados.length} {itensAvaliados.length === 1 ? 'item avaliado' : 'itens avaliados'}
          </span>
          {comProblema > 0 && (
            <span className="flex items-center gap-1 font-medium text-amber-700">
              <AlertTriangle className="h-4 w-4" />
              {comProblema} com problema
            </span>
          )}
        </div>

        {comNavegacao && (
          <div className="flex gap-2">
            <Button variant="outline" className="h-11" onClick={onBack}>
              Voltar
            </Button>
            <Button
              className="h-11 flex-1 bg-moria-orange hover:bg-moria-orange/90"
              onClick={onNext}
            >
              Continuar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
