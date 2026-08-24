import { useState } from 'react';
import { AlertTriangle, Check, Loader2, Package, Plus, Trash2, Wrench } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ItemStatus } from '@/types/revisions';
import type { ServiceOrderItemInput } from '@/api/serviceOrderService';

import type { AvaliacaoItem } from './StepChecklist';
import { formatCurrency as dinheiro } from '@/lib/format';

export interface OrcamentoLinha extends ServiceOrderItemInput {
  /** Item do checklist que originou esta linha. */
  origemItemId: string;
}

interface StepBudgetProps {
  avaliacoes: AvaliacaoItem[];
  linhas: OrcamentoLinha[];
  onChange: (linhas: OrcamentoLinha[]) => void;
  onFinish: () => void;
  onBack: () => void;
  salvando: boolean;
}

/**
 * Passo 4: orcamento dos itens com problema.
 *
 * So aparecem os itens marcados como Atencao ou Critico - sao esses que geram
 * trabalho. Cada linha lancada aqui vira um item da OS criada ao concluir.
 */
export function StepBudget({
  avaliacoes,
  linhas,
  onChange,
  onFinish,
  onBack,
  salvando,
}: StepBudgetProps) {
  const [novo, setNovo] = useState<Record<string, { nome: string; valor: string }>>({});

  const problemas = avaliacoes.filter(
    (a) => a.status === ItemStatus.ATTENTION || a.status === ItemStatus.CRITICAL
  );

  const adicionar = (origemItemId: string, type: 'SERVICE' | 'PRODUCT') => {
    const entrada = novo[origemItemId];
    if (!entrada?.nome?.trim()) return;

    const valor = Number(String(entrada.valor).replace(',', '.')) || 0;

    onChange([
      ...linhas,
      {
        origemItemId,
        type,
        name: entrada.nome.trim(),
        unitPrice: valor,
        quantity: 1,
        productId: null,
        serviceId: null,
      },
    ]);

    setNovo((atual) => ({ ...atual, [origemItemId]: { nome: '', valor: '' } }));
  };

  const remover = (indice: number) => onChange(linhas.filter((_, i) => i !== indice));

  const total = linhas.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <div>
        <h2 className="text-lg font-bold">O que precisa ser feito?</h2>
        <p className="text-sm text-muted-foreground">
          Lance peças e mão de obra para cada problema encontrado. Uma ordem de serviço
          será criada com tudo isto.
        </p>
      </div>

      {problemas.length === 0 ? (
        <div className="rounded-xl border border-green-300 bg-green-50/70 p-6 text-center">
          <Check className="mx-auto mb-2 h-8 w-8 text-green-600" />
          <p className="font-semibold text-green-900">Nenhum problema encontrado</p>
          <p className="text-sm text-green-800">
            A revisão será concluída sem ordem de serviço.
          </p>
        </div>
      ) : (
        problemas.map((problema) => {
          const doItem = linhas
            .map((l, i) => ({ l, i }))
            .filter(({ l }) => l.origemItemId === problema.itemId);
          const entrada = novo[problema.itemId] || { nome: '', valor: '' };

          return (
            <div key={problema.itemId} className="rounded-xl border bg-card p-4">
              <div className="mb-3 flex items-start gap-2">
                <AlertTriangle
                  className={
                    problema.status === ItemStatus.CRITICAL
                      ? 'mt-0.5 h-5 w-5 shrink-0 text-red-600'
                      : 'mt-0.5 h-5 w-5 shrink-0 text-yellow-600'
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{problema.itemName}</p>
                  {problema.notes && (
                    <p className="text-sm text-muted-foreground">{problema.notes}</p>
                  )}
                </div>
                <Badge
                  variant="secondary"
                  className={
                    problema.status === ItemStatus.CRITICAL
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }
                >
                  {problema.status === ItemStatus.CRITICAL ? 'Crítico' : 'Atenção'}
                </Badge>
              </div>

              {doItem.length > 0 && (
                <div className="mb-3 space-y-1.5">
                  {doItem.map(({ l, i }) => (
                    <div
                      key={`${l.origemItemId}-${i}`}
                      className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm"
                    >
                      {l.type === 'SERVICE' ? (
                        <Wrench className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="min-w-0 flex-1 truncate">{l.name}</span>
                      <span className="font-medium">{dinheiro(l.unitPrice)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => remover(i)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  className="flex-1"
                  placeholder="Peça ou serviço"
                  value={entrada.nome}
                  onChange={(e) =>
                    setNovo((a) => ({
                      ...a,
                      [problema.itemId]: { ...entrada, nome: e.target.value },
                    }))
                  }
                />
                <Input
                  className="sm:w-32"
                  placeholder="0,00"
                  inputMode="decimal"
                  value={entrada.valor}
                  onChange={(e) =>
                    setNovo((a) => ({
                      ...a,
                      [problema.itemId]: { ...entrada, valor: e.target.value },
                    }))
                  }
                />
              </div>

              <div className="mt-2 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => adicionar(problema.itemId, 'SERVICE')}
                  disabled={!entrada.nome.trim()}
                >
                  <Wrench className="mr-1.5 h-3.5 w-3.5" />
                  Mão de obra
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => adicionar(problema.itemId, 'PRODUCT')}
                  disabled={!entrada.nome.trim()}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Peça
                </Button>
              </div>
            </div>
          );
        })
      )}

      <div className="sticky bottom-0 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-lg sm:border">
        {linhas.length > 0 && (
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total da OS</span>
            <span className="text-lg font-bold">{dinheiro(total)}</span>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" className="h-11" onClick={onBack} disabled={salvando}>
            Voltar
          </Button>
          <Button
            className="h-11 flex-1 bg-moria-orange hover:bg-moria-orange/90"
            onClick={onFinish}
            disabled={salvando}
          >
            {salvando ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                Salvando...
              </>
            ) : problemas.length > 0 ? (
              'Concluir e gerar OS'
            ) : (
              'Concluir revisão'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
