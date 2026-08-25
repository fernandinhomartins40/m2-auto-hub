import { useEffect, useState } from 'react';
import { AlertTriangle, Check, Loader2, Package, Search, Trash2, Wrench } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ItemStatus } from '@/types/revisions';
import type { ServiceOrderItemInput } from '@/api/serviceOrderService';
import productService, { type Product } from '@/api/productService';

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
  const [produtos, setProdutos] = useState<Product[]>([]);
  const [buscaProduto, setBuscaProduto] = useState<Record<string, string>>({});
  const [carregandoProdutos, setCarregandoProdutos] = useState(true);

  useEffect(() => {
    productService
      .getProducts({ page: 1, limit: 100 })
      .then((response) =>
        setProdutos(
          (response.products || []).filter(
            (produto) => produto.status === 'ACTIVE' || produto.isActive
          )
        )
      )
      .catch(() => setProdutos([]))
      .finally(() => setCarregandoProdutos(false));
  }, []);

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

  const adicionarProduto = (origemItemId: string, produto: Product) => {
    const preco = Number(produto.promoPrice ?? produto.salePrice) || 0;
    onChange([
      ...linhas,
      {
        origemItemId,
        type: 'PRODUCT',
        productId: produto.id,
        serviceId: null,
        name: produto.name,
        unitPrice: preco,
        quantity: 1,
      },
    ]);
    setBuscaProduto((atual) => ({ ...atual, [origemItemId]: '' }));
  };

  const remover = (indice: number) => onChange(linhas.filter((_, i) => i !== indice));
  const atualizar = (indice: number, patch: Partial<OrcamentoLinha>) =>
    onChange(linhas.map((linha, i) => (i === indice ? { ...linha, ...patch } : linha)));

  const total = linhas.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

  return (
    <div className="w-full space-y-5">
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
            A ordem de serviço será criada sem itens de orçamento e poderá ser complementada depois.
          </p>
        </div>
      ) : (
        problemas.map((problema) => {
          const doItem = linhas
            .map((l, i) => ({ l, i }))
            .filter(({ l }) => l.origemItemId === problema.itemId);
          const entrada = novo[problema.itemId] || { nome: '', valor: '' };
          const termoProduto = (buscaProduto[problema.itemId] || '').toLowerCase().trim();
          const produtosFiltrados = termoProduto
            ? produtos
                .filter(
                  (produto) =>
                    produto.name.toLowerCase().includes(termoProduto) ||
                    produto.category.toLowerCase().includes(termoProduto) ||
                    produto.sku.toLowerCase().includes(termoProduto)
                )
                .slice(0, 8)
            : [];

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
                      <Input
                        aria-label={`Valor de ${l.name}`}
                        type="number"
                        min={0}
                        step="0.01"
                        className="h-8 w-28 text-right"
                        value={l.unitPrice}
                        onChange={(event) =>
                          atualizar(i, { unitPrice: Number(event.target.value) || 0 })
                        }
                      />
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

              <div className="mb-3 rounded-lg border bg-muted/20 p-3">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Package className="h-3.5 w-3.5" />
                  Produto do catálogo
                </p>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder={carregandoProdutos ? 'Carregando produtos...' : 'Buscar por nome, categoria ou SKU'}
                    value={buscaProduto[problema.itemId] || ''}
                    onChange={(event) =>
                      setBuscaProduto((atual) => ({
                        ...atual,
                        [problema.itemId]: event.target.value,
                      }))
                    }
                    disabled={carregandoProdutos}
                  />
                </div>
                {produtosFiltrados.length > 0 && (
                  <div className="mt-2 divide-y overflow-hidden rounded-md border bg-background">
                    {produtosFiltrados.map((produto) => (
                      <button
                        key={produto.id}
                        type="button"
                        onClick={() => adicionarProduto(problema.itemId, produto)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{produto.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            SKU {produto.sku} · estoque {produto.stock}
                          </span>
                        </span>
                        <span className="shrink-0 font-semibold">
                          {dinheiro(Number(produto.promoPrice ?? produto.salePrice) || 0)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Item manual ou mão de obra
              </p>
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
                  <Package className="mr-1.5 h-3.5 w-3.5" />
                  Peça manual
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
            ) : (
              'Concluir e gerar OS'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
