import { useCallback, useEffect, useState } from 'react';
import { DatabaseZap, Loader2, RefreshCw } from 'lucide-react';
import ellonService, { EllonOrderStatus } from '@/api/ellonService';
import { getErrorMessage } from '@/lib/errors';
import { formatCurrency } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/** Situação do pedido/OS na Ellon, com consulta imediata (sem esperar a sincronização). */
export function EllonOrderStatusCard({ entity, id }: { entity: 'order' | 'service-order'; id: string }) {
  const [status, setStatus] = useState<EllonOrderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    ellonService.orderStatus(entity, id).then(setStatus).catch(() => setStatus(null)).finally(() => setLoading(false));
  }, [entity, id]);
  useEffect(load, [load]);

  const refresh = async () => {
    setRefreshing(true);
    setMessage(null);
    try {
      const result = await ellonService.refreshOrder(entity, id);
      setStatus(result);
      setMessage(result.found ? 'Consultado na Ellon agora.' : 'A Ellon não retornou este pré-pedido.');
    } catch (error) { setMessage(getErrorMessage(error)); }
    finally { setRefreshing(false); }
  };

  if (loading) return null;
  if (!status || (!status.exported && !status.job)) return null;

  const state = status.cancelled ? 'Cancelado na Ellon' : status.invoiced ? 'Faturado' : status.exported ? 'Pré-pedido em aberto' : 'Aguardando envio';
  return <div className="space-y-2 rounded-xl border bg-card p-4 text-sm shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="flex items-center gap-2 font-medium"><DatabaseZap className="h-4 w-4 text-sky-700" aria-hidden="true" />Ellon</p>
      {status.exported && <Button size="sm" variant="outline" onClick={() => void refresh()} disabled={refreshing}>
        {refreshing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}Atualizar agora
      </Button>}
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={status.cancelled ? 'destructive' : 'outline'}>{state}</Badge>
      {status.preOrder && <span>Pré-pedido nº {status.preOrder}</span>}
      {status.status && <span className="text-muted-foreground">Situação Ellon: {status.status}</span>}
    </div>
    {status.nfe && <p>NF-e nº {status.nfe.number}{status.nfe.series ? ` série ${status.nfe.series}` : ''} · <span className="break-all font-mono text-xs">{status.nfe.key}</span></p>}
    {status.delivery && <p className="text-muted-foreground">Entrega: {[status.delivery.status, status.delivery.carrier, status.delivery.tracking && `rastreio ${status.delivery.tracking}`].filter(Boolean).join(' · ')}</p>}
    {status.divergence && <p className="text-amber-700">Total na Ellon {formatCurrency(status.divergence.ellonTotal)} difere do aprovado no M2 ({formatCurrency(status.divergence.m2Total)}).</p>}
    {status.cancellationRequestedAt && !status.cancelled && <p className="text-amber-700">Cancelamento solicitado: cancele o pré-pedido na Ellon.</p>}
    {status.job && !status.exported && <p className="text-muted-foreground">Envio: {status.job.status}{status.job.lastError ? ` — ${status.job.lastError}` : ''}</p>}
    {message && <p className="text-xs text-muted-foreground">{message}</p>}
  </div>;
}
