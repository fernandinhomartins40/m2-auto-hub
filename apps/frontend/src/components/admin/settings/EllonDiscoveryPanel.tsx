import { useCallback, useEffect, useState } from 'react';
import { FileSearch, Loader2, RefreshCw, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import ellonService, { EllonContract, PreOrderState } from '@/api/ellonService';
import { getErrorMessage } from '@/lib/errors';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

const STATE_LABEL: Record<PreOrderState, string> = { OPEN: 'Em aberto', INVOICED: 'Faturado', CANCELLED: 'Cancelado' };

interface Props {
  serviceItemTypes: string[];
  onServiceItemTypes: (types: string[]) => void;
  statusMap: Record<string, PreOrderState>;
  onStatusMap: (map: Record<string, PreOrderState>) => void;
  defaultCustomerCode: number | null;
  onDefaultCustomer: (code: number) => void;
  stockIncludesPreOrders: boolean;
  onStockIncludesPreOrders: (value: boolean) => void;
  customerUpdatesEnabled: boolean;
  onCustomerUpdatesEnabled: (value: boolean) => void;
}

/**
 * A Ellon não muda nem documenta a API além do Swagger: o M2 descobre o contrato pelo Swagger
 * publicado e pelos dados reais, e as decisões ficam aqui (salvas com "Salvar Ellon").
 */
export function EllonDiscoveryPanel(props: Props) {
  const [contract, setContract] = useState<EllonContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    ellonService.getContract().then(setContract).catch(error => toast.error(getErrorMessage(error))).finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const refresh = async () => {
    setRefreshing(true);
    try { await ellonService.refreshContract(); toast.success('Contrato da Ellon lido do Swagger.'); load(); }
    catch (error) { toast.error(getErrorMessage(error)); }
    finally { setRefreshing(false); }
  };
  const createConsumer = async () => {
    try {
      const { defaultCustomerCode } = await ellonService.createDefaultCustomer();
      props.onDefaultCustomer(defaultCustomerCode);
      toast.success(`Consumidor final criado na Ellon (ID ${defaultCustomerCode}).`);
    } catch (error) { toast.error(getErrorMessage(error)); }
  };
  const toggleType = (type: string) => {
    const upper = props.serviceItemTypes.map(value => value.toUpperCase());
    props.onServiceItemTypes(upper.includes(type.toUpperCase())
      ? props.serviceItemTypes.filter(value => value.toUpperCase() !== type.toUpperCase())
      : [...props.serviceItemTypes, type]);
  };
  const setStatus = (status: string, value: string) => {
    const next = { ...props.statusMap };
    if (value) next[status] = value as PreOrderState; else delete next[status];
    props.onStatusMap(next);
  };

  if (loading && !contract) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Analisando dados da Ellon...</div>;
  if (!contract) return null;
  const { observed, swagger } = contract;
  const evidence = observed.stockEvidence;
  const selectedTypes = props.serviceItemTypes.map(value => value.toUpperCase());

  return <div className="space-y-4 text-sm">
    <Block title="Contrato publicado (Swagger)" hint="Lido direto do servidor da Ellon. Mostra os campos que cada operação aceita e devolve.">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground">{swagger ? `${swagger.version ?? 'Swagger'} · lido em ${new Date(swagger.fetchedAt).toLocaleString('pt-BR')} · ${swagger.operations.length} operações` : 'Ainda não lido.'}</span>
        <Button size="sm" variant="outline" onClick={() => void refresh()} disabled={refreshing}>{refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSearch className="mr-2 h-4 w-4" />}Ler agora</Button>
      </div>
      {swagger && <div className="max-h-72 space-y-1 overflow-auto">{swagger.operations.map(operation => <details key={`${operation.method}:${operation.path}`} className="rounded border bg-background p-2">
        <summary className="cursor-pointer"><span className="font-mono text-xs">{operation.method} {operation.path}</span> <span className="text-xs text-muted-foreground">{operation.summary}</span></summary>
        {operation.parameters.length > 0 && <p className="mt-1 text-xs">Parâmetros: {operation.parameters.join(', ')}</p>}
        {operation.body != null && <pre className="mt-1 overflow-auto bg-muted/40 p-2 text-xs">Envio: {JSON.stringify(operation.body, null, 2)}</pre>}
        {operation.response != null && <pre className="mt-1 overflow-auto bg-muted/40 p-2 text-xs">Retorno: {JSON.stringify(operation.response, null, 2)}</pre>}
      </details>)}</div>}
    </Block>

    <Block title="Tipos de item na Ellon (campo “tipo”)" hint="Marque os tipos que representam serviço. Mão de obra só pode ser vinculada e faturada com estes tipos. Confirme com o contador.">
      {!observed.productTypes.length ? <p className="text-muted-foreground">Sincronize os produtos para ver os tipos.</p> : <div className="flex flex-wrap gap-2">{observed.productTypes.map(row => {
        const type = row.type ?? '';
        const active = Boolean(type) && selectedTypes.includes(type.toUpperCase());
        return <button key={type || 'vazio'} type="button" disabled={!type} onClick={() => toggleType(type)} title={row.examples.join(', ')}
          className={`rounded-md border px-3 py-1.5 text-left text-xs disabled:opacity-60 ${active ? 'border-sky-600 bg-sky-50' : 'bg-background'}`}>
          <span className="font-medium">{type || '(sem tipo)'}</span> · {row.total} itens{active ? ' · serviço' : ''}
          <span className="block max-w-56 truncate text-muted-foreground">{row.examples.join(', ')}</span>
        </button>;
      })}</div>}
    </Block>

    <Block title="Status dos pré-pedidos" hint="Valores reais recebidos da Ellon. Defina o que cada um significa; sem definição, o M2 deduz pelo texto.">
      {!observed.preOrderStatuses.length ? <p className="text-muted-foreground">Nenhum pré-pedido recebido ainda.</p> : <div className="space-y-1">{observed.preOrderStatuses.map(row => <div key={row.status} className="flex flex-wrap items-center gap-2">
        <span className="w-32 truncate font-mono text-xs">{row.status}</span>
        <span className="w-20 text-xs text-muted-foreground">{row.total} pedidos</span>
        <select aria-label={`Significado do status ${row.status}`} className="h-8 rounded-md border bg-background px-2 text-xs" value={props.statusMap[row.status] ?? ''} onChange={event => setStatus(row.status, event.target.value)}>
          <option value="">Automático ({STATE_LABEL[row.detected]})</option>
          {(Object.keys(STATE_LABEL) as PreOrderState[]).map(state => <option key={state} value={state}>{STATE_LABEL[state]}</option>)}
        </select>
      </div>)}</div>}
    </Block>

    <Block title="Reserva de estoque no pré-pedido" hint="Medido nos pré-pedidos enviados e ainda não faturados: a quantidade da Ellon caiu logo após o envio?">
      <p>{evidence.measured < 3 ? `Amostra insuficiente (${evidence.measured} medição(ões)); continue com a chave desligada, que é o modo seguro.` : `${evidence.dropped} de ${evidence.measured} medições baixaram o estoque antes do faturamento.`}</p>
      {evidence.suggestion !== 'INCONCLUSIVE' && <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{evidence.suggestion === 'INCLUDES' ? 'A Ellon reserva no pré-pedido' : 'A Ellon só baixa ao faturar'}</Badge>
        {(evidence.suggestion === 'INCLUDES') !== props.stockIncludesPreOrders && <Button size="sm" variant="outline" onClick={() => props.onStockIncludesPreOrders(evidence.suggestion === 'INCLUDES')}>Aplicar</Button>}
      </div>}
    </Block>

    <Block title="Cliente consumidor final" hint="Usado em OS avulsa e cliente sem CPF/CNPJ. Pode ser um cadastro existente na Ellon ou criado agora pela API.">
      <div className="flex flex-wrap items-center gap-2">
        <span>{props.defaultCustomerCode ? `Atual: ID ${props.defaultCustomerCode}` : 'Não definido.'}</span>
        {observed.consumerCandidates.map(item => <Button key={item.externalId} size="sm" variant="outline" onClick={() => props.onDefaultCustomer(Number(item.externalId))}>Usar {item.externalId} — {item.name}</Button>)}
        {!props.defaultCustomerCode && <Button size="sm" variant="outline" onClick={() => void createConsumer()}><UserPlus className="mr-1 h-4 w-4" />Criar na Ellon</Button>}
      </div>
    </Block>

    <Block title="Proteções automáticas" hint="Ajustes feitos pelo próprio M2 a partir das respostas da Ellon.">
      <p>Limite da observação do pré-pedido: {observed.settings.observationLimit} caracteres (reduzido sozinho se a Ellon recusar).</p>
      <div className="flex items-center justify-between gap-3 rounded-md border bg-background p-2">
        <span>Enviar atualizações de clientes já existentes na Ellon {!props.customerUpdatesEnabled && <span className="text-red-600">— desligado por duplicidade detectada</span>}</span>
        <Switch checked={props.customerUpdatesEnabled} onCheckedChange={props.onCustomerUpdatesEnabled} />
      </div>
    </Block>

    <details className="rounded-lg border bg-background p-3">
      <summary className="cursor-pointer font-medium">Campos realmente recebidos</summary>
      <div className="mt-2 grid gap-3 md:grid-cols-2">{Object.entries(observed.fieldsByType).map(([type, fields]) => <div key={type}>
        <p className="text-xs font-medium">{type}</p>
        <p className="text-xs text-muted-foreground">{fields.map(field => field.key).join(', ')}</p>
      </div>)}</div>
    </details>
    <Button size="sm" variant="ghost" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Atualizar análise</Button>
  </div>;
}

function Block({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return <div className="space-y-2 rounded-lg border bg-background/60 p-3">
    <div><p className="font-medium">{title}</p><p className="text-xs text-muted-foreground">{hint}</p></div>
    {children}
  </div>;
}
