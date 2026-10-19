import { useEffect, useState } from 'react';
import { AlertTriangle, DatabaseZap, Loader2, PlugZap, RefreshCw, Save } from 'lucide-react';
import { toast } from 'sonner';
import ellonService, { EllonConfig, EllonJob, EllonPaymentMethods, EllonSyncSummary, EllonSyncTarget, OrderSource } from '@/api/ellonService';
import { EllonDataExplorer } from './EllonDataExplorer';
import { EllonPendingPanel } from './EllonPendingPanel';
import { EllonServiceMapping } from './EllonServiceMapping';
import { getErrorMessage } from '@/lib/errors';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

type Form = Pick<EllonConfig, 'enabled' | 'baseUrl' | 'companyCode' | 'transactionCode' | 'costCenterCode' | 'sellerCode' | 'warehouseCode' | 'paymentMethodCode' | 'carrierCode' | 'syncProducts' | 'syncCustomers' | 'syncOrders' | 'exportOrderSources' | 'stockIncludesPreOrders' | 'reservationTtlDays' | 'defaultCustomerCode'> & {
  serviceItemTypes: string;
  paymentMethodMap: Record<string, number>;
  integrationCode: string;
  username: string;
  password: string;
  accessHash: string;
};

const emptyForm: Form = {
  enabled: false,
  baseUrl: 'http://fvendas.ellon.inf.br:9047',
  companyCode: 2,
  transactionCode: null,
  costCenterCode: 1,
  sellerCode: null,
  warehouseCode: 1,
  paymentMethodCode: null,
  carrierCode: null,
  username: '', integrationCode: '', password: '', accessHash: '',
  syncProducts: true, syncCustomers: true, syncOrders: true,
  exportOrderSources: ['WEB', 'APP', 'PHONE'], stockIncludesPreOrders: false, reservationTtlDays: 15,
  defaultCustomerCode: null, serviceItemTypes: '', paymentMethodMap: {},
};

const SOURCES: Array<[OrderSource, string]> = [['WEB', 'Site'], ['APP', 'App'], ['PHONE', 'Telefone/balcão'], ['MERCADO_LIVRE', 'Mercado Livre'], ['SHOPEE', 'Shopee']];

export function EllonIntegrationSection() {
  const [config, setConfig] = useState<EllonConfig | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [busy, setBusy] = useState<'load' | 'save' | 'test' | null>('load');
  const [paymentMethods, setPaymentMethods] = useState<EllonPaymentMethods | null>(null);
  const [jobs, setJobs] = useState<EllonJob[]>([]);
  const [summary, setSummary] = useState<EllonSyncSummary | null>(null);

  const loadOperations = () => Promise.all([ellonService.listJobs(), ellonService.getSummary(), ellonService.listPaymentMethods()]).then(([nextJobs, nextSummary, nextPayments]) => { setJobs(nextJobs); setSummary(nextSummary); setPaymentMethods(nextPayments); });

  useEffect(() => {
    ellonService.getConfig().then(value => {
      setConfig(value);
      setForm(current => ({ ...current, ...value, serviceItemTypes: value.serviceItemTypes.join(', '), paymentMethodMap: value.paymentMethodMap ?? {}, username: '', integrationCode: '', password: '', accessHash: '' }));
      void loadOperations();
    }).catch(error => toast.error(getErrorMessage(error))).finally(() => setBusy(null));
  }, []);

  const number = (key: keyof Form, value: string) => setForm(current => ({ ...current, [key]: value ? Number(value) : null }));
  const save = async () => {
    setBusy('save');
    try {
      const payload: Record<string, unknown> = {
        ...form,
        serviceItemTypes: form.serviceItemTypes.split(',').map(value => value.trim()).filter(Boolean),
        paymentMethodMap: Object.keys(form.paymentMethodMap).length ? form.paymentMethodMap : null,
      };
      if (!form.integrationCode) delete payload.integrationCode;
      if (!form.username) delete payload.username;
      if (!form.password) delete payload.password;
      if (!form.accessHash) delete payload.accessHash;
      const updated = await ellonService.updateConfig(payload);
      setConfig(updated);
      setForm(current => ({ ...current, username: '', integrationCode: '', password: '', accessHash: '' }));
      void loadOperations();
      toast.success('Configuração Ellon salva com segurança.');
    } catch (error) { toast.error(getErrorMessage(error)); } finally { setBusy(null); }
  };
  const test = async () => {
    setBusy('test');
    try { await ellonService.test(); toast.success('Autenticação Ellon validada.'); setConfig(await ellonService.getConfig()); }
    catch (error) { toast.error(getErrorMessage(error)); } finally { setBusy(null); }
  };
  const toggleSource = (source: OrderSource, checked: boolean) => setForm(current => ({
    ...current,
    exportOrderSources: checked ? [...new Set([...current.exportOrderSources, source])] : current.exportOrderSources.filter(item => item !== source),
  }));
  const setPayment = (method: string, code: string) => setForm(current => {
    const next = { ...current.paymentMethodMap };
    if (code) next[method] = Number(code); else delete next[method];
    return { ...current, paymentMethodMap: next };
  });
  const retry = async (id: string) => {
    try { await ellonService.retryJob(id); await loadOperations(); toast.success('Job reenfileirado após confirmação manual.'); }
    catch (error) { toast.error(getErrorMessage(error)); }
  };
  const syncNow = async (target: EllonSyncTarget) => {
    try {
      await ellonService.syncNow(target);
      await loadOperations();
      toast.success('Sincronização colocada na fila.');
    } catch (error) { toast.error(getErrorMessage(error)); }
  };
  const formatDate = (value: string | null | undefined) => value ? new Date(value).toLocaleString('pt-BR') : 'nunca';
  const snapshotCounts = Object.fromEntries((summary?.snapshots ?? []).map(item => [item.type, item._count._all]));

  if (busy === 'load') return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando integração Ellon...</div>;

  const numericFields: Array<[keyof Form, string, string]> = [
    ['companyCode', 'Empresa', '2'], ['transactionCode', 'Transação', 'Definir com o responsável fiscal'],
    ['costCenterCode', 'Centro de custo', '1'], ['sellerCode', 'Vendedor', 'Código do vendedor'],
    ['warehouseCode', 'Depósito', '1'], ['paymentMethodCode', 'Forma de pagamento', 'Código padrão'],
    ['carrierCode', 'Transportadora', 'Opcional'],
  ];

  return <Card className="border-sky-200/80 bg-sky-50/30">
    <CardHeader>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><CardTitle className="flex items-center gap-2"><DatabaseZap className="h-5 w-5 text-sky-700" /> Ellon ERP</CardTitle><CardDescription>Catálogo, clientes e conversão comercial de ordens de serviço.</CardDescription></div>
        <Badge variant={config?.status === 'CONNECTED' ? 'default' : 'outline'}>{config?.status ?? 'DISABLED'}</Badge>
      </div>
    </CardHeader>
    <CardContent className="space-y-5">
      <div className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><p>A API do fornecedor usa HTTP. A conexão ocorre somente no backend; segredos nunca são enviados ao navegador. O risco residual deve ser aceito antes da ativação.</p></div>
      <div className="flex items-center justify-between rounded-lg border p-3"><div><Label>Habilitar integração</Label><p className="text-xs text-muted-foreground">Mantenha desligada até concluir os códigos comerciais.</p></div><Switch checked={form.enabled} onCheckedChange={enabled => setForm(current => ({ ...current, enabled }))} /></div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2"><Label>URL Ellon</Label><Input value={form.baseUrl} onChange={e => setForm(current => ({ ...current, baseUrl: e.target.value }))} /></div>
        {numericFields.map(([key, label, placeholder]) => <div key={key}><Label>{label}</Label><Input type="number" min="1" value={String(form[key] ?? '')} placeholder={placeholder} onChange={e => number(key, e.target.value)} /></div>)}
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <div><Label>Usuário Ellon/API</Label><Input type="text" autoComplete="username" placeholder={config?.usernameMasked ?? 'Usuário fornecido pela Ellon'} value={form.username} onChange={e => setForm(current => ({ ...current, username: e.target.value }))} /></div>
        <div><Label>Código do integrador</Label><Input type="password" autoComplete="new-password" placeholder={config?.integrationCodeMasked ?? 'Código fornecido pela Ellon'} value={form.integrationCode} onChange={e => setForm(current => ({ ...current, integrationCode: e.target.value }))} /></div>
        <div><Label>Senha da integração</Label><Input type="password" autoComplete="new-password" placeholder={config?.hasPassword ? 'Senha já configurada' : 'Informar senha'} value={form.password} onChange={e => setForm(current => ({ ...current, password: e.target.value }))} /></div>
        <div><Label>Token de acesso fornecido</Label><Input type="password" autoComplete="new-password" placeholder={config?.accessHashMasked ?? 'Token fornecido pela Ellon'} value={form.accessHash} onChange={e => setForm(current => ({ ...current, accessHash: e.target.value }))} /></div>
        <p className="md:col-span-4 text-xs text-muted-foreground">O HASH enviado à API é calculado no backend como MD5(código do integrador:token de acesso), conforme o Swagger da Ellon.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">{([['syncProducts','Produtos, preços e estoque'],['syncCustomers','Clientes'],['syncOrders','Pedidos e faturamento']] as Array<[keyof Form,string]>).map(([key,label]) => <div key={key} className="flex items-center justify-between rounded-lg border bg-background p-3"><Label>{label}</Label><Switch checked={Boolean(form[key])} onCheckedChange={checked => setForm(current => ({ ...current, [key]: checked }))} /></div>)}</div>
      <div className="space-y-4 rounded-lg border bg-background p-4">
        <div><h3 className="font-medium">Regras de negócio</h3><p className="text-xs text-muted-foreground">Contornos para o que a API Ellon não oferece. Confirme os valores com a Ellon e com o contador.</p></div>
        <div>
          <Label>Pedidos enviados à Ellon como pré-pedido</Label>
          <div className="mt-2 flex flex-wrap gap-3">{SOURCES.map(([source, label]) => <label key={source} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.exportOrderSources.includes(source)} onChange={event => toggleSource(source, event.target.checked)} />{label}</label>)}</div>
          <p className="mt-1 text-xs text-muted-foreground">Marketplaces emitem nota própria; enviá-los pode duplicar o faturamento.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div><Label>Cliente consumidor final (ID Ellon)</Label><Input type="number" min="1" placeholder="Opcional" value={String(form.defaultCustomerCode ?? '')} onChange={e => number('defaultCustomerCode', e.target.value)} /><p className="mt-1 text-xs text-muted-foreground">Usado para OS avulsa ou cliente sem CPF/CNPJ.</p></div>
          <div><Label>Tipos fiscais de serviço (campo "tipo")</Label><Input placeholder="Ex.: S" value={form.serviceItemTypes} onChange={e => setForm(current => ({ ...current, serviceItemTypes: e.target.value }))} /><p className="mt-1 text-xs text-muted-foreground">Separados por vírgula. Mão de obra só pode ir com estes tipos.</p></div>
          <div><Label>Prazo da reserva de estoque (dias)</Label><Input type="number" min="1" max="90" value={String(form.reservationTtlDays)} onChange={e => setForm(current => ({ ...current, reservationTtlDays: Number(e.target.value) || 15 }))} /><p className="mt-1 text-xs text-muted-foreground">Após o prazo sem faturamento, a reserva vai para conferência.</p></div>
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3"><div><Label>A quantidade da Ellon já desconta pré-pedidos em aberto</Label><p className="text-xs text-muted-foreground">Ative somente se a Ellon confirmar; evita descontar a mesma saída duas vezes.</p></div><Switch checked={form.stockIncludesPreOrders} onCheckedChange={checked => setForm(current => ({ ...current, stockIncludesPreOrders: checked }))} /></div>
        <div>
          <Label>Formas de pagamento (M2 → Ellon)</Label>
          {!paymentMethods?.m2.length ? <p className="text-xs text-muted-foreground">Nenhum pedido registrado ainda.</p> : <div className="mt-2 grid gap-2 md:grid-cols-2">{paymentMethods.m2.map(method => <div key={method.value} className="flex items-center gap-2 text-sm">
            <span className="w-40 truncate" title={method.value}>{method.value} <span className="text-xs text-muted-foreground">({method.orders})</span></span>
            <select aria-label={`Forma Ellon para ${method.value}`} className="h-9 flex-1 rounded-md border bg-background px-2 text-sm" value={String(form.paymentMethodMap[method.value] ?? '')} onChange={event => setPayment(method.value, event.target.value)}>
              <option value="">Padrão ({form.paymentMethodCode ?? 'não definido'})</option>
              {paymentMethods.ellon.map(item => <option key={item.externalId} value={item.externalId}>{item.externalId} — {item.name}</option>)}
            </select>
          </div>)}</div>}
        </div>
      </div>
      {summary && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-background p-3"><p className="text-xs text-muted-foreground">Produtos vinculados</p><p className="text-2xl font-semibold">{summary.products}</p></div>
        <div className="rounded-lg border bg-background p-3"><p className="text-xs text-muted-foreground">Clientes vinculados</p><p className="text-2xl font-semibold">{summary.customers}</p></div>
        <div className="rounded-lg border bg-background p-3"><p className="text-xs text-muted-foreground">Cadastros espelhados</p><p className="text-2xl font-semibold">{summary.snapshots.reduce((total, item) => total + item._count._all, 0)}</p></div>
        <div className="rounded-lg border bg-background p-3"><p className="text-xs text-muted-foreground">Sincronização</p><p className="text-sm font-medium">Automática e contínua</p></div>
      </div>}
      {config?.enabled && <div className="grid gap-1 rounded-lg border bg-background p-3 text-xs text-muted-foreground sm:grid-cols-2">
        <span>Produtos (incremental): {formatDate(config.lastProductSyncAt)}</span>
        <span>Produtos (carga completa): {formatDate(config.lastFullProductSyncAt)}</span>
        <span>Clientes: {formatDate(config.lastCustomerSyncAt)}</span>
        <span>Pedidos, vendas e NF-e: {formatDate(config.lastOrderSyncAt)}</span>
      </div>}
      {config?.lastError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{config.lastError}</p>}
      <div className="flex flex-wrap gap-2"><Button onClick={() => void save()} disabled={Boolean(busy)}>{busy === 'save' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Salvar Ellon</Button><Button variant="outline" onClick={() => void test()} disabled={Boolean(busy) || !config?.enabled}>{busy === 'test' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlugZap className="mr-2 h-4 w-4" />}Testar autenticação</Button></div>
      {config?.enabled && <div className="flex flex-wrap gap-2">{([['products', 'Produtos alterados'], ['products-full', 'Catálogo completo'], ['customers', 'Clientes'], ['orders', 'Pedidos e vendas'], ['references', 'Cadastros auxiliares']] as Array<[EllonSyncTarget, string]>).map(([target, label]) => <Button key={target} size="sm" variant="outline" onClick={() => void syncNow(target)}><RefreshCw className="mr-2 h-4 w-4" />{label}</Button>)}</div>}
      {config?.enabled && <div className="space-y-3 border-t pt-5">
        <div><h3 className="font-medium">Pendências da integração</h3><p className="text-xs text-muted-foreground">Situações que a API não permite resolver automaticamente.</p></div>
        <EllonPendingPanel />
      </div>}
      <div className="space-y-3 border-t pt-5">
        <div><h3 className="font-medium">Serviços e mão de obra</h3><p className="text-xs text-muted-foreground">A Ellon não tem cadastro de serviços na API: vincule cada serviço a um item comercial da Ellon. Produtos são vinculados automaticamente.</p></div>
        <EllonServiceMapping serviceItemTypes={form.serviceItemTypes.split(',').map(value => value.trim()).filter(Boolean)} />
      </div>
      <div className="space-y-3 border-t pt-5">
        <div><h3 className="font-medium">Dados recebidos da Ellon</h3><p className="text-xs text-muted-foreground">Produtos e clientes entram nos cadastros do M2; os demais registros ficam disponíveis aqui para consulta.</p></div>
        <EllonDataExplorer counts={snapshotCounts} />
      </div>
      <div className="space-y-3 border-t pt-5">
        <div><h3 className="font-medium">Processamento recente</h3><p className="text-xs text-muted-foreground">Falhas após timeout exigem conferência na Ellon antes de reenviar.</p></div>
        {jobs.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum envio realizado.</p> : <div className="space-y-2">{jobs.map(job => <div key={job.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background p-3 text-sm"><div><Badge variant="outline">{job.status}</Badge> <span className="ml-2">{job.type}</span>{job.lastError && <p className="mt-1 text-xs text-red-600">{job.lastError}</p>}</div>{job.status === 'FAILED' && <Button size="sm" variant="outline" onClick={() => void retry(job.id)}>Reenviar após conferir</Button>}</div>)}</div>}
      </div>
    </CardContent>
  </Card>;
}
