import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  Loader2,
  Search,
  X,
} from 'lucide-react';

import checklistService, { type ChecklistCategory } from '@/api/checklistService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

const STATUS_OPCOES = [
  { valor: ItemStatus.OK, rotulo: 'Bom', cor: 'bg-green-600 hover:bg-green-700' },
  { valor: ItemStatus.ATTENTION, rotulo: 'Atenção', cor: 'bg-yellow-500 hover:bg-yellow-600' },
  { valor: ItemStatus.CRITICAL, rotulo: 'Crítico', cor: 'bg-red-600 hover:bg-red-700' },
] as const;

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
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Tela do painel: usa a rota de admin. A versão `/customer` exige sessão
    // de cliente e voltaria vazia aqui.
    checklistService
      .getChecklistStructureAdmin()
      .then((r) => setCategorias(r.categories || []))
      .catch(() => setCategorias([]))
      .finally(() => setCarregando(false));
  }, []);

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
    const termo = busca.trim().toLowerCase();
    if (!termo) return [];
    return todosItens
      .filter(
        (i) =>
          i.name.toLowerCase().includes(termo) || i.categoryName.toLowerCase().includes(termo)
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
    if (avaliado(item.id)) {
      setBusca('');
      return;
    }

    onChange([
      ...avaliacoes,
      {
        itemId: item.id,
        itemName: item.name,
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        status: ItemStatus.ATTENTION,
        notes: '',
      },
    ]);
    setBusca('');
    // Leva o mecanico direto ao card recem-criado.
    setTimeout(() => cardsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 80);
  };

  const atualizar = (itemId: string, campos: Partial<AvaliacaoItem>) =>
    onChange(avaliacoes.map((a) => (a.itemId === itemId ? { ...a, ...campos } : a)));

  const remover = (itemId: string) => onChange(avaliacoes.filter((a) => a.itemId !== itemId));

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
      <div>
        <h2 className="text-lg font-bold">O que você verificou?</h2>
        <p className="text-sm text-muted-foreground">
          Digite o que observou — por exemplo "freio" — e marque o estado. O que não for
          verificado fica registrado como tal.
        </p>
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

      {/* Cards do que foi avaliado */}
      <div ref={cardsRef} className="space-y-3">
        {avaliacoes.map((a) => (
          <div key={a.itemId} className="rounded-xl border bg-card p-4">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold">{a.itemName}</p>
                <p className="text-xs text-muted-foreground">{a.categoryName}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => remover(a.itemId)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mb-3 grid grid-cols-3 gap-2">
              {STATUS_OPCOES.map((op) => (
                <Button
                  key={op.valor}
                  type="button"
                  size="sm"
                  variant={a.status === op.valor ? 'default' : 'outline'}
                  className={cn('h-10', a.status === op.valor && op.cor)}
                  onClick={() => atualizar(a.itemId, { status: op.valor })}
                >
                  {op.rotulo}
                </Button>
              ))}
            </div>

            <Textarea
              value={a.notes}
              onChange={(e) => atualizar(a.itemId, { notes: e.target.value })}
              placeholder="Observação (opcional)"
              rows={2}
              className="text-sm"
            />
          </div>
        ))}

        {avaliacoes.length === 0 && !carregando && (
          <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            Nenhum item avaliado ainda. Use a busca acima.
          </p>
        )}
      </div>

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
