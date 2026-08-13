import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  Frown,
  Loader2,
  Meh,
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
  onNext: () => void;
  onBack: () => void;
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
  const [categorias, setCategorias] = useState<ChecklistCategory[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [abertas, setAbertas] = useState<Set<string>>(new Set());
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

  const sugestoes = useMemo(() => {
    const termo = semAcento(busca);
    if (!termo) return [];
    return todosItens
      .filter(
        (i) => semAcento(i.name).includes(termo) || semAcento(i.categoryName).includes(termo)
      )
      .slice(0, 8);
  }, [busca, todosItens]);

  const avaliado = (itemId: string) => avaliacoes.find((a) => a.itemId === itemId);

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

  const comProblema = avaliacoes.filter(
    (a) => a.status === ItemStatus.ATTENTION || a.status === ItemStatus.CRITICAL
  ).length;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold">O que você verificou?</h2>
          <p className="text-sm text-muted-foreground">
            Digite o que observou — por exemplo "freio" — e marque o estado. O que não for
            verificado fica registrado como tal.
          </p>
        </div>
        {/* Criar/desabilitar itens do checklist: vivia no fluxo antigo e
            precisa continuar ao alcance de quem monta a revisão. */}
        <ChecklistManager onChanged={recarregarCategorias} />
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
        <Input
          className="h-12 pl-10"
          placeholder="Buscar item: freio, óleo, pneu..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          disabled={carregando}
        />

        {sugestoes.length > 0 && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border bg-background shadow-lg">
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

          {/* Carinhas: tocar já define o estado e confirma o item. */}
          <div className="grid grid-cols-3 gap-2">
            {STATUS_OPCOES.map(({ valor, rotulo, Icone, ativo, leve }) => (
              <button
                key={valor}
                type="button"
                onClick={() => confirmar(valor)}
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

          <input
            value={emEdicao.notes}
            onChange={(e) => setEmEdicao({ ...emEdicao, notes: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && confirmar(emEdicao.status)}
            placeholder="Observação (opcional)"
            className="mt-2 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-moria-orange"
          />
        </div>
      )}

      {/* Confirmados: uma linha por item, para caber muitos na tela. */}
      {avaliacoes.length > 0 && (
        <div className="divide-y overflow-hidden rounded-lg border">
          {avaliacoes.map((a) => {
            const estilo = estiloDoStatus(a.status);
            const Icone = estilo?.Icone ?? Smile;

            return (
              <div key={a.itemId} className="flex items-center gap-2.5 px-3 py-2">
                <span className={cn('rounded-full p-1', estilo?.ponto)}>
                  <Icone className="h-3.5 w-3.5 text-white" />
                </span>
                <button
                  type="button"
                  onClick={() => reabrir(a)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-sm font-medium">{a.itemName}</span>
                  {a.notes && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {a.notes}
                    </span>
                  )}
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

      {avaliacoes.length === 0 && !emEdicao && !carregando && (
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

      <div className="sticky bottom-0 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-lg sm:border">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {avaliacoes.length} {avaliacoes.length === 1 ? 'item avaliado' : 'itens avaliados'}
          </span>
          {comProblema > 0 && (
            <span className="flex items-center gap-1 font-medium text-amber-700">
              <AlertTriangle className="h-4 w-4" />
              {comProblema} com problema
            </span>
          )}
        </div>

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
      </div>
    </div>
  );
}
