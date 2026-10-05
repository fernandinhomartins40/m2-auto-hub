import { useEffect, useState } from 'react';
import { AlertTriangle, DatabaseZap, Loader2, PlugZap, RefreshCw, Save } from 'lucide-react';
import { toast } from 'sonner';
import ellonService, { EllonConfig, EllonEntityType, EllonJob, EllonLink } from '@/api/ellonService';
import { getErrorMessage } from '@/lib/errors';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

type Form = Pick<EllonConfig, 'enabled' | 'baseUrl' | 'companyCode' | 'transactionCode' | 'costCenterCode' | 'sellerCode' | 'warehouseCode' | 'paymentMethodCode' | 'carrierCode' | 'syncProducts' | 'syncCustomers' | 'syncOrders'> & {
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
  syncProducts: false, syncCustomers: false, syncOrders: false,
};

export function EllonIntegrationSection() {
  const [config, setConfig] = useState<EllonConfig | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [busy, setBusy] = useState<'load' | 'save' | 'test' | null>('load');
  const [links, setLinks] = useState<EllonLink[]>([]);
  const [jobs, setJobs] = useState<EllonJob[]>([]);
  const [mapping, setMapping] = useState<{ entityType: EllonEntityType; localId: string; externalId: string; externalSequence: string }>({ entityType: 'PRODUCT', localId: '', externalId: '', externalSequence: '' });

  const loadOperations = () => Promise.all([ellonService.listLinks(), ellonService.listJobs()]).then(([nextLinks, nextJobs]) => { setLinks(nextLinks); setJobs(nextJobs); });

  useEffect(() => {
    ellonService.getConfig().then(value => {
      setConfig(value);
      setForm(current => ({ ...current, ...value, username: '', integrationCode: '', password: '', accessHash: '' }));
      void loadOperations();
    }).catch(error => toast.error(getErrorMessage(error))).finally(() => setBusy(null));
  }, []);

  const number = (key: keyof Form, value: string) => setForm(current => ({ ...current, [key]: value ? Number(value) : null }));
  const save = async () => {
    setBusy('save');
    try {
      const payload: Record<string, unknown> = { ...form };
      if (!form.integrationCode) delete payload.integrationCode;
      if (!form.username) delete payload.username;
      if (!form.password) delete payload.password;
      if (!form.accessHash) delete payload.accessHash;
      const updated = await ellonService.updateConfig(payload);
      setConfig(updated);
      setForm(current => ({ ...current, username: '', integrationCode: '', password: '', accessHash: '' }));
      toast.success('Configuração Ellon salva com segurança.');
    } catch (error) { toast.error(getErrorMessage(error)); } finally { setBusy(null); }
  };
  const test = async () => {
    setBusy('test');
    try { await ellonService.test(); toast.success('Autenticação Ellon validada.'); setConfig(await ellonService.getConfig()); }
    catch (error) { toast.error(getErrorMessage(error)); } finally { setBusy(null); }
  };
  const saveMapping = async () => {
    try {
      await ellonService.upsertLink({ ...mapping, externalSequence: mapping.externalSequence ? Number(mapping.externalSequence) : null });
      setMapping(current => ({ ...current, localId: '', externalId: '', externalSequence: '' }));
      await loadOperations();
      toast.success('Mapeamento Ellon salvo.');
    } catch (error) { toast.error(getErrorMessage(error)); }
  };
  const retry = async (id: string) => {
    try { await ellonService.retryJob(id); await loadOperations(); toast.success('Job reenfileirado após confirmação manual.'); }
    catch (error) { toast.error(getErrorMessage(error)); }
  };
  const syncProducts = async () => {
    try {
      await ellonService.syncProducts();
      await loadOperations();
      toast.success('Sincronização de produtos colocada na fila.');
    } catch (error) { toast.error(getErrorMessage(error)); }
  };

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
      {config?.lastError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{config.lastError}</p>}
      <div className="flex flex-wrap gap-2"><Button onClick={() => void save()} disabled={Boolean(busy)}>{busy === 'save' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Salvar Ellon</Button><Button variant="outline" onClick={() => void test()} disabled={Boolean(busy) || !config?.enabled}>{busy === 'test' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlugZap className="mr-2 h-4 w-4" />}Testar autenticação</Button><Button variant="outline" onClick={() => void syncProducts()} disabled={!config?.enabled}><RefreshCw className="mr-2 h-4 w-4" />Sincronizar produtos agora</Button></div>
      <div className="space-y-3 border-t pt-5">
        <div><h3 className="font-medium">Mapeamento comercial de itens</h3><p className="text-xs text-muted-foreground">Vincule o UUID local da peça ou serviço ao ID e sequência cadastrados na Ellon.</p></div>
        <div className="grid gap-3 md:grid-cols-4">
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={mapping.entityType} onChange={e => setMapping(current => ({ ...current, entityType: e.target.value as EllonEntityType }))}><option value="PRODUCT">Produto</option><option value="SERVICE">Serviço/mão de obra</option></select>
          <Input placeholder="UUID local" value={mapping.localId} onChange={e => setMapping(current => ({ ...current, localId: e.target.value }))} />
          <Input placeholder="ID Ellon" value={mapping.externalId} onChange={e => setMapping(current => ({ ...current, externalId: e.target.value }))} />
          <div className="flex gap-2"><Input type="number" min="0" placeholder="Sequência" value={mapping.externalSequence} onChange={e => setMapping(current => ({ ...current, externalSequence: e.target.value }))} /><Button variant="outline" onClick={() => void saveMapping()} disabled={!mapping.localId || !mapping.externalId}>Vincular</Button></div>
        </div>
        {links.length > 0 && <div className="max-h-40 overflow-auto rounded-md border bg-background text-xs">{links.slice(0, 20).map(link => <div key={link.id} className="grid grid-cols-[90px_1fr_100px] gap-2 border-b p-2 last:border-0"><span>{link.entityType}</span><span className="truncate font-mono">{link.localId}</span><span>Ellon {link.externalId}{link.externalSequence != null ? `/${link.externalSequence}` : ''}</span></div>)}</div>}
      </div>
      <div className="space-y-3 border-t pt-5">
        <div><h3 className="font-medium">Processamento recente</h3><p className="text-xs text-muted-foreground">Falhas após timeout exigem conferência na Ellon antes de reenviar.</p></div>
        {jobs.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum envio realizado.</p> : <div className="space-y-2">{jobs.map(job => <div key={job.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background p-3 text-sm"><div><Badge variant="outline">{job.status}</Badge> <span className="ml-2">{job.type}</span>{job.lastError && <p className="mt-1 text-xs text-red-600">{job.lastError}</p>}</div>{job.status === 'FAILED' && <Button size="sm" variant="outline" onClick={() => void retry(job.id)}>Reenviar após conferir</Button>}</div>)}</div>}
      </div>
    </CardContent>
  </Card>;
}
