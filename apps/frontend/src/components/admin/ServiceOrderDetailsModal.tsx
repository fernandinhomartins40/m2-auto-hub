import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ArrowLeft, Loader2, Play, CheckCircle2, XCircle, UserCog } from 'lucide-react';
import serviceOrderService, { ServiceOrder, ServiceOrderStatus } from '@/api/serviceOrderService';
import revisionService from '@/api/revisionService';
import { useToast } from '../ui/use-toast';
import { formatCurrency as money } from '@/lib/format';

interface Props {
  /** Pagina de tela cheia: montada condicionalmente pelo pai, sem "isOpen". */
  order: ServiceOrder | null;
  onClose: () => void;
  onChanged: () => void;
  restricted?: boolean;
}

const STATUS_META: Record<ServiceOrderStatus, { label: string; color: string }> = {
  OPEN: { label: 'Aberta', color: 'bg-yellow-100 text-yellow-800' },
  IN_PROGRESS: { label: 'Em andamento', color: 'bg-blue-100 text-blue-800' },
  COMPLETED: { label: 'Concluída', color: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Cancelada', color: 'bg-red-100 text-red-800' },
};

export function ServiceOrderDetailsModal({ order, onClose, onChanged, restricted = false }: Props) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [mechanics, setMechanics] = useState<Array<{ id: string; name: string }>>([]);
  const [assigning, setAssigning] = useState('');

  useEffect(() => {
    if (!restricted) {
      revisionService.getMechanicsWorkload().then(setMechanics).catch(() => undefined);
    }
  }, [restricted]);

  if (!order) return null;
  const meta = STATUS_META[order.status];

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true);
    try {
      await fn();
      toast({ title: okMsg });
      onChanged();
    } catch (err: any) {
      toast({ title: 'Não foi possível', description: err?.response?.data?.error, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const assign = async () => {
    if (!assigning) return;
    await run(() => serviceOrderService.assignMechanic(order.id, assigning), 'Mecânico atribuído');
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 py-4 sm:py-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="min-h-[40px] min-w-[40px] h-10 w-10 p-0 shrink-0"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          OS #{order.number}
          <Badge className={meta.color} variant="secondary">
            {meta.label}
          </Badge>
        </h2>
      </div>
      {order.revisionId && (
        <Badge variant="outline" className="w-fit border-moria-orange/40 text-moria-orange">
          Originada pela revisão #{order.revisionId.slice(0, 8)}
        </Badge>
      )}

      <div className="rounded-xl border bg-card p-4 space-y-3 text-sm shadow-sm">
          <div>
            <p className="font-medium">{order.customerName}</p>
            {order.customerPhone && <p className="text-gray-500">{order.customerPhone}</p>}
            {(order.vehicleLabel || order.vehiclePlate) && (
              <p className="text-gray-500">
                {order.vehicleLabel} {order.vehiclePlate ? `· ${order.vehiclePlate}` : ''}
                {order.mileage ? ` · ${order.mileage} km` : ''}
              </p>
            )}
          </div>

          {order.description && (
            <div>
              <p className="text-xs text-gray-500">Descrição</p>
              <p>{order.description}</p>
            </div>
          )}

          <Separator />

          <div className="space-y-1">
            <p className="text-xs text-gray-500">Itens</p>
            {order.items.length === 0 && <p className="text-gray-400">Sem itens.</p>}
            {order.items.map((it) => (
              <div key={it.id} className="flex justify-between">
                <span>
                  <Badge
                    variant="secondary"
                    className={`mr-2 ${it.type === 'SERVICE' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}
                  >
                    {it.type === 'SERVICE' ? 'Serviço' : 'Produto'}
                  </Badge>
                  {it.name} × {it.quantity}
                </span>
                <span>{money(it.subtotal)}</span>
              </div>
            ))}
          </div>

          <Separator />
          <div className="space-y-1">
            <div className="flex justify-between text-gray-600">
              <span>Mão de obra</span>
              <span>{money(order.laborTotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Produtos</span>
              <span>{money(order.partsTotal)}</span>
            </div>
            {Number(order.discount) > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Desconto</span>
                <span>- {money(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-base">
              <span>Total</span>
              <span className="text-moria-orange">{money(order.total)}</span>
            </div>
          </div>

          {order.mechanicName && (
            <p className="text-xs text-gray-500">Mecânico responsável: {order.mechanicName}</p>
          )}

          {/* Atribuição (apenas gestão) */}
          {!restricted && order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <UserCog className="h-3.5 w-3.5" /> Atribuir mecânico
                </p>
                <div className="flex gap-2">
                  <Select value={assigning} onValueChange={setAssigning}>
                    <SelectTrigger className="h-9 flex-1">
                      <SelectValue placeholder="Selecionar mecânico" />
                    </SelectTrigger>
                    <SelectContent>
                      {mechanics.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={assign} disabled={!assigning || busy}>
                    Atribuir
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>
          Voltar
        </Button>
        {order.status === 'OPEN' && (
          <Button variant="outline" disabled={busy} onClick={() => run(() => serviceOrderService.start(order.id), 'OS iniciada')}>
            <Play className="h-4 w-4 mr-1" /> Iniciar
          </Button>
        )}
        {(order.status === 'OPEN' || order.status === 'IN_PROGRESS') && (
          <Button className="bg-green-600 hover:bg-green-700" disabled={busy} onClick={() => run(() => serviceOrderService.complete(order.id), 'OS concluída')}>
            {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
            Concluir
          </Button>
        )}
        {!restricted && order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
          <Button variant="outline" className="text-red-600" disabled={busy} onClick={() => run(() => serviceOrderService.cancel(order.id), 'OS cancelada')}>
            <XCircle className="h-4 w-4 mr-1" /> Cancelar
          </Button>
        )}
      </div>
    </div>
  );
}
