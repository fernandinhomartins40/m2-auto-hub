import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ArrowLeft, Loader2, Play, CheckCircle2, XCircle, UserCog, Send, UserPlus } from 'lucide-react';
import { Input } from '../ui/input';
import ellonService from '@/api/ellonService';
import serviceOrderService, { ServiceOrder, ServiceOrderStatus } from '@/api/serviceOrderService';
import revisionService from '@/api/revisionService';
import { useToast } from '../ui/use-toast';
import { formatCurrency as money } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';

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
  const [registering, setRegistering] = useState(false);
  const [customerForm, setCustomerForm] = useState({ name: '', document: '', phone: '', email: '' });

  useEffect(() => {
    if (!restricted) {
      revisionService.getMechanicsWorkload().then((items) => setMechanics(items.map(({ id, name }) => ({ id, name })))).catch(() => undefined);
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
    } catch (err: unknown) {
      toast({ title: 'Não foi possível', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const assign = async () => {
    if (!assigning) return;
    await run(() => serviceOrderService.assignMechanic(order.id, assigning), 'Mecânico atribuído');
  };

  const exportToEllon = async () => {
    setBusy(true);
    try {
      const check = await serviceOrderService.ellonPreflight(order.id);
      if (!check.ready) {
        const details = [
          ...check.missingConfig.map(item => `Configuração: ${item}`),
          ...check.unmappedItems.map(item => `Sem vínculo Ellon: ${item.name}${item.localId ? '' : ' — item sem cadastro'}`),
          ...check.fiscalIssues.map(item => item.message),
          ...(check.customerProblem ? [check.customerProblem] : []),
        ];
        throw new Error(details.join(' · ') || 'A OS ainda não está pronta para envio.');
      }
      await serviceOrderService.exportToEllon(order.id);
      toast({
        title: 'Envio para a Ellon enfileirado',
        description: [
          check.customerMode === 'default' ? 'Será usado o cliente consumidor final.' : '',
          ...check.warnings,
          'A Ellon recalcula os preços; os valores aprovados seguem na observação para conferência.',
        ].filter(Boolean).join(' '),
      });
    } catch (err: unknown) {
      toast({ title: 'Não foi possível enviar à Ellon', description: getErrorMessage(err), variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const cancelOrder = async () => {
    setBusy(true);
    try {
      await serviceOrderService.cancel(order.id);
      toast({ title: 'OS cancelada' });
      onChanged();
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      if (!/Solicitar cancelamento na Ellon/.test(message)) {
        toast({ title: 'Não foi possível cancelar', description: message, variant: 'destructive' });
        return;
      }
      // A API Ellon não cancela pré-pedidos: registra a solicitação e a OS é cancelada quando a Ellon cancelar.
      try {
        const result = await ellonService.requestCancellation('service-order', order.id);
        toast(result.status === 'CANCELLED'
          ? { title: 'OS cancelada', description: `O pré-pedido ${result.preOrder} já estava cancelado na Ellon.` }
          : { title: 'Cancelamento solicitado', description: `Cancele o pré-pedido ${result.preOrder} na Ellon. A OS será cancelada automaticamente na próxima sincronização.` });
        onChanged();
      } catch (requestErr: unknown) {
        toast({ title: 'Não foi possível solicitar o cancelamento', description: getErrorMessage(requestErr), variant: 'destructive' });
      }
    } finally { setBusy(false); }
  };

  const registerCustomer = async () => {
    await run(async () => {
      await serviceOrderService.registerCustomer(order.id, { ...customerForm, email: customerForm.email || undefined });
      setRegistering(false);
    }, 'Cliente cadastrado e vinculado à OS');
  };

  return (
    <div className="flex min-h-full w-full flex-col gap-4 bg-background px-4 py-4 sm:px-6 sm:py-6">
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

      <div className="mx-auto w-full max-w-3xl rounded-xl border bg-card p-4 space-y-3 text-sm shadow-sm">
          <div>
            <p className="font-medium">{order.customerName}</p>
            {order.customerPhone && <p className="text-gray-500">{order.customerPhone}</p>}
            {!order.customerId && order.status !== 'CANCELLED' && !restricted && !registering && (
              <Button size="sm" variant="outline" className="mt-2" onClick={() => {
                setCustomerForm({ name: order.customerName, document: '', phone: order.customerPhone ?? '', email: '' });
                setRegistering(true);
              }}>
                <UserPlus className="mr-1 h-4 w-4" /> Cadastrar cliente (necessário para faturar)
              </Button>
            )}
            {registering && (
              <div className="mt-3 grid gap-2 rounded-lg border p-3 sm:grid-cols-2">
                <Input aria-label="Nome" placeholder="Nome completo" value={customerForm.name} onChange={e => setCustomerForm(current => ({ ...current, name: e.target.value }))} />
                <Input aria-label="CPF/CNPJ" placeholder="CPF ou CNPJ" inputMode="numeric" value={customerForm.document} onChange={e => setCustomerForm(current => ({ ...current, document: e.target.value }))} />
                <Input aria-label="Telefone" placeholder="Telefone" inputMode="tel" value={customerForm.phone} onChange={e => setCustomerForm(current => ({ ...current, phone: e.target.value }))} />
                <Input aria-label="E-mail" type="email" placeholder="E-mail (opcional)" value={customerForm.email} onChange={e => setCustomerForm(current => ({ ...current, email: e.target.value }))} />
                <div className="flex gap-2 sm:col-span-2">
                  <Button size="sm" disabled={busy || !customerForm.name || !customerForm.document || !customerForm.phone} onClick={() => void registerCustomer()}>Salvar cliente</Button>
                  <Button size="sm" variant="ghost" onClick={() => setRegistering(false)}>Cancelar</Button>
                </div>
              </div>
            )}
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

      <div className="mx-auto flex w-full max-w-3xl flex-wrap gap-2 pt-2">
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
        {!restricted && order.status === 'COMPLETED' && (
          <Button variant="outline" className="text-red-600" disabled={busy} onClick={() => void cancelOrder()}>
            <XCircle className="h-4 w-4 mr-1" /> Cancelar OS
          </Button>
        )}
        {!restricted && order.status === 'COMPLETED' && (
          <Button disabled={busy} onClick={() => void exportToEllon()}>
            {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
            Gerar pedido na Ellon
          </Button>
        )}
      </div>
    </div>
  );
}
