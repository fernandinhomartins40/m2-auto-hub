import { useCallback, useEffect, useState } from 'react';
import { CheckCheck, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import ellonService, { EllonPending } from '@/api/ellonService';
import { getErrorMessage } from '@/lib/errors';
import { formatCurrency } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const entityLabel = (type: string, id: string) => `${type === 'ORDER' ? 'Pedido' : 'OS'} ${id.slice(0, 8)}`;
const field = (metadata: Record<string, unknown> | null, key: string) => (metadata?.[key] ?? null) as Record<string, number> | string | null;

/** Itens que exigem ação humana porque a API Ellon não permite resolvê-los automaticamente. */
export function EllonPendingPanel() {
  const [pending, setPending] = useState<EllonPending | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    ellonService.getPending().then(setPending).catch(error => toast.error(getErrorMessage(error))).finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const acknowledge = async (id: string) => {
    try { await ellonService.acknowledgeDivergence(id); toast.success('Divergência marcada como conferida.'); load(); }
    catch (error) { toast.error(getErrorMessage(error)); }
  };

  if (loading && !pending) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando pendências...</div>;
  if (!pending) return null;

  const reservedUnits = pending.reservations.active.reduce((total, item) => total + item.quantity, 0);
  const total = pending.divergences.length + pending.cancellations.length + pending.reservations.expired.length + pending.customerConflicts.length + pending.parkedJobs.length;

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-muted-foreground">
        {total === 0 ? 'Nenhuma pendência.' : `${total} pendência(s) exigem conferência.`} {reservedUnits > 0 && `${reservedUnits} unidade(s) reservadas aguardando faturamento na Ellon.`}
      </p>
      <Button size="sm" variant="outline" onClick={load} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Atualizar</Button>
    </div>

    {pending.divergences.length > 0 && <Section title="Total diferente do aprovado no M2" hint="A Ellon recalcula preços pelo próprio cadastro. Ajuste o pré-pedido na Ellon antes de faturar e marque como conferido.">
      {pending.divergences.map(link => {
        const divergence = field(link.metadata, 'totalDivergence') as Record<string, number> | null;
        return <Row key={link.id} title={`${entityLabel(link.entityType, link.localId)} · pré-pedido ${link.externalId}`}
          detail={divergence ? `M2 ${formatCurrency(divergence.m2Total)} · Ellon ${formatCurrency(divergence.ellonTotal)} · diferença ${formatCurrency(divergence.difference)}` : ''}
          action={<Button size="sm" variant="outline" onClick={() => void acknowledge(link.id)}><CheckCheck className="mr-1 h-4 w-4" />Conferido</Button>} />;
      })}
    </Section>}

    {pending.cancellations.length > 0 && <Section title="Cancelamentos aguardando a Ellon" hint="Cancele estes pré-pedidos na Ellon. O M2 conclui o cancelamento sozinho na próxima sincronização.">
      {pending.cancellations.map(link => <Row key={link.id} title={`${entityLabel(link.entityType, link.localId)} · pré-pedido ${link.externalId}`}
        detail={`Solicitado em ${new Date(String(field(link.metadata, 'cancellationRequestedAt'))).toLocaleString('pt-BR')}`} />)}
    </Section>}

    {pending.reservations.expired.length > 0 && <Section title="Reservas de estoque vencidas" hint="Saídas do M2 sem faturamento identificado na Ellon dentro do prazo. Confira se foram faturadas ou se o estoque precisa de ajuste na Ellon.">
      {pending.reservations.expired.map(item => <Row key={`${item.sourceId}:${item.productId}`} title={`${item.label} · ${item.quantity}x ${item.productName}`}
        detail={`Desde ${new Date(item.since).toLocaleDateString('pt-BR')}${item.preOrder ? ` · pré-pedido ${item.preOrder}` : ' · não enviado à Ellon'}`} />)}
    </Section>}

    {pending.customerConflicts.length > 0 && <Section title="Clientes com cadastro divergente" hint="A Ellon respondeu com outro ID ao atualizar o cliente. Verifique duplicidade na Ellon.">
      {pending.customerConflicts.map(link => <Row key={link.id} title={`Cliente ${link.localId.slice(0, 8)}`}
        detail={`Vinculado ao ID Ellon ${link.externalId}; a Ellon respondeu ${String(field(link.metadata, 'conflictExternalId'))}`} />)}
    </Section>}

    {pending.parkedJobs.length > 0 && <Section title="Envios sem confirmação" hint="A comunicação caiu durante o envio. Confira na Ellon se o pré-pedido existe; se existir, a sincronização vincula sozinha. Se não existir, reenvie em Processamento recente.">
      {pending.parkedJobs.map(job => <Row key={job.id} title={`${job.type} · ${job.localEntityId?.slice(0, 8) ?? ''}`} detail={job.lastError ?? ''} />)}
    </Section>}

    {pending.reservations.active.length > 0 && <details className="rounded-lg border bg-background p-3 text-sm">
      <summary className="cursor-pointer font-medium">Reservas ativas ({pending.reservations.active.length})</summary>
      <div className="mt-2 max-h-60 space-y-1 overflow-auto text-xs">
        {pending.reservations.active.map(item => <p key={`${item.sourceId}:${item.productId}`}>{item.label} · {item.quantity}x {item.productName}{item.preOrder ? ` · pré-pedido ${item.preOrder}` : ''}</p>)}
      </div>
    </details>}
  </div>;
}

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/40 p-3">
    <div><p className="flex items-center gap-2 text-sm font-medium">{title}<Badge variant="outline">{Array.isArray(children) ? children.length : 1}</Badge></p><p className="text-xs text-muted-foreground">{hint}</p></div>
    <div className="space-y-1">{children}</div>
  </div>;
}

function Row({ title, detail, action }: { title: string; detail: string; action?: React.ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background p-2 text-sm">
    <div className="min-w-0"><p className="truncate font-medium">{title}</p>{detail && <p className="text-xs text-muted-foreground">{detail}</p>}</div>
    {action}
  </div>;
}
