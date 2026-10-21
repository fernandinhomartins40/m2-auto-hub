import { useCallback, useEffect, useState } from 'react';
import { Loader2, Store } from 'lucide-react';
import ellonService, { type PurchaseEntry } from '@/api/ellonService';
import { getErrorMessage } from '@/lib/errors';
import { formatCurrency } from '@/lib/format';
import { Badge } from '@/components/ui/badge';

const ORIGIN_LABEL: Record<PurchaseEntry['origin'], string> = { site: 'Site', oficina: 'Oficina', loja: 'Loja' };
const KIND_LABEL: Record<PurchaseEntry['kind'], string> = { SALE: 'Venda faturada', PRE_ORDER: 'Pedido' };

interface Props {
  load: () => Promise<{ linked: boolean; purchases: PurchaseEntry[] }>;
  /** Texto quando o cliente ainda não tem cadastro vinculado à Ellon. */
  emptyHint: string;
}

/** Compras do cliente no site, na oficina e no balcão, vindas da Ellon. */
export function PurchaseHistory({ load, emptyHint }: Props) {
  const [data, setData] = useState<{ linked: boolean; purchases: PurchaseEntry[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    load().then(value => { if (active) setData(value); }).catch(err => { if (active) setError(getErrorMessage(err)); });
    return () => { active = false; };
  }, [load]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando compras...</div>;
  if (!data.linked || !data.purchases.length) return <p className="text-sm text-muted-foreground">{data.linked ? 'Nenhuma compra registrada.' : emptyHint}</p>;

  return <div className="space-y-2">
    {data.purchases.map(purchase => <details key={`${purchase.kind}:${purchase.id}`} className="rounded-lg border bg-background p-3 text-sm">
      <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
        <span className="flex flex-wrap items-center gap-2">
          <Store className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="font-medium">{KIND_LABEL[purchase.kind]} {purchase.id.startsWith('h') ? '' : `nº ${purchase.id}`}</span>
          <Badge variant="outline">{ORIGIN_LABEL[purchase.origin]}</Badge>
          {purchase.cancelled && <Badge variant="destructive">Cancelada</Badge>}
        </span>
        <span className="flex items-center gap-3 text-muted-foreground">
          {purchase.date && <span>{new Date(purchase.date).toLocaleDateString('pt-BR')}</span>}
          <span className="font-semibold text-foreground">{formatCurrency(purchase.total)}</span>
        </span>
      </summary>
      {purchase.items.length > 0
        ? <ul className="mt-2 space-y-1 border-t pt-2">{purchase.items.map((item, index) => <li key={index} className="flex justify-between gap-2">
          <span className="min-w-0 truncate">{item.quantity}x {item.name}</span><span className="shrink-0">{formatCurrency(item.total)}</span>
        </li>)}</ul>
        : <p className="mt-2 border-t pt-2 text-muted-foreground">Itens não informados.{purchase.status ? ` Situação: ${purchase.status}.` : ''}</p>}
    </details>)}
  </div>;
}

/** Admin: compras do cliente registradas na Ellon. */
export function CustomerStorePurchases({ customerId }: { customerId: string }) {
  const load = useCallback(() => ellonService.customerHistory(customerId), [customerId]);
  return <PurchaseHistory load={load} emptyHint="Cliente sem cadastro vinculado na Ellon." />;
}

/** Área do cliente: as próprias compras no site, na oficina e no balcão. */
export function MyStorePurchases() {
  const load = useCallback(() => ellonService.myStorePurchases(), []);
  return <PurchaseHistory load={load} emptyHint="Suas compras feitas na loja aparecerão aqui assim que seu cadastro for identificado." />;
}
