import { useCallback, useEffect, useState } from 'react';
import { Link2, Loader2, Search, Unlink } from 'lucide-react';
import { toast } from 'sonner';
import ellonService, { EllonCatalogItem, EllonServiceMapping as ServiceRow } from '@/api/ellonService';
import { getErrorMessage } from '@/lib/errors';
import { formatCurrency } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * A API Ellon não tem cadastro de serviços: cada serviço do M2 é vinculado a um item comercial
 * da Ellon (de preferência do tipo serviço, para sair em NFS-e).
 */
export function EllonServiceMapping({ serviceItemTypes }: { serviceItemTypes: string[] }) {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [selected, setSelected] = useState<ServiceRow | null>(null);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<EllonCatalogItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [onlyUnmapped, setOnlyUnmapped] = useState(true);

  const load = useCallback(() => {
    ellonService.listServices().then(setServices).catch(error => toast.error(getErrorMessage(error)));
  }, []);
  useEffect(load, [load]);

  const allowed = serviceItemTypes.map(value => value.toUpperCase());
  const isServiceType = (type: string | null) => !allowed.length || Boolean(type && allowed.includes(type.toUpperCase()));

  const find = async (event: React.FormEvent) => {
    event.preventDefault();
    if (search.trim().length < 2) return;
    setBusy(true);
    try { setResults(await ellonService.searchCatalog(search.trim())); }
    catch (error) { toast.error(getErrorMessage(error)); }
    finally { setBusy(false); }
  };

  const link = async (item: EllonCatalogItem) => {
    if (!selected) return;
    try {
      await ellonService.upsertLink({ entityType: 'SERVICE', localId: selected.id, externalId: item.externalId, externalSequence: item.externalSequence });
      toast.success(`"${selected.name}" vinculado a ${item.name}.`);
      setSelected(null); setResults([]); setSearch('');
      load();
    } catch (error) { toast.error(getErrorMessage(error)); }
  };

  const unlink = async (row: ServiceRow) => {
    if (!row.link) return;
    try { await ellonService.removeLink(row.link.id); toast.success('Vínculo removido.'); load(); }
    catch (error) { toast.error(getErrorMessage(error)); }
  };

  const unmapped = services.filter(item => !item.link).length;
  const visible = onlyUnmapped ? services.filter(item => !item.link || !isServiceType(item.link.ellonType)) : services;

  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{unmapped} de {services.length} serviço(s) sem vínculo. OS com serviço sem vínculo não podem ser faturadas.</span>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={onlyUnmapped} onChange={event => setOnlyUnmapped(event.target.checked)} />Mostrar só pendentes</label>
    </div>
    <div className="max-h-64 overflow-auto rounded-md border bg-background text-sm">
      {visible.length === 0 ? <p className="p-3 text-muted-foreground">Nenhum serviço pendente.</p> : visible.map(row => <div key={row.id} className={`flex flex-wrap items-center justify-between gap-2 border-b p-2 last:border-0 ${selected?.id === row.id ? 'bg-sky-50' : ''}`}>
        <div className="min-w-0">
          <p className="truncate font-medium">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.category}{row.link ? ` · Ellon ${row.link.externalId}/${row.link.externalSequence}` : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          {row.link && <Badge variant={isServiceType(row.link.ellonType) ? 'outline' : 'destructive'}>tipo {row.link.ellonType ?? '?'}</Badge>}
          <Button size="sm" variant={selected?.id === row.id ? 'default' : 'outline'} onClick={() => setSelected(row)}><Link2 className="mr-1 h-4 w-4" />{row.link ? 'Trocar' : 'Vincular'}</Button>
          {row.link && <Button size="sm" variant="ghost" onClick={() => void unlink(row)} aria-label="Remover vínculo"><Unlink className="h-4 w-4" /></Button>}
        </div>
      </div>)}
    </div>
    {selected && <div className="space-y-2 rounded-lg border p-3">
      <p className="text-sm">Escolha o item Ellon para <strong>{selected.name}</strong>:</p>
      <form onSubmit={find} className="flex gap-2">
        <Input placeholder="Buscar item Ellon por nome ou referência (ex.: mão de obra)" value={search} onChange={event => setSearch(event.target.value)} />
        <Button type="submit" variant="outline" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}<span className="sr-only">Buscar</span></Button>
      </form>
      {results.map(item => <button type="button" key={`${item.externalId}:${item.externalSequence}`} onClick={() => void link(item)} disabled={!isServiceType(item.type)}
        className="flex w-full flex-wrap items-center justify-between gap-2 rounded-md border bg-background p-2 text-left text-sm hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50">
        <span className="min-w-0"><span className="block truncate font-medium">{item.name}</span><span className="text-xs text-muted-foreground">Ellon {item.externalId}/{item.externalSequence} · {item.sku}{item.unit ? ` · ${item.unit}` : ''}</span></span>
        <span className="flex items-center gap-2"><Badge variant={isServiceType(item.type) ? 'outline' : 'destructive'}>tipo {item.type ?? '?'}</Badge><span className="text-xs">{formatCurrency(item.salePrice)}</span></span>
      </button>)}
      {allowed.length === 0 && <p className="text-xs text-amber-700">Configure os tipos fiscais de serviço para impedir vínculo com mercadoria.</p>}
    </div>}
  </div>;
}
