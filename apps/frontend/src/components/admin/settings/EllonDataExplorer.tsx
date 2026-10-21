import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import ellonService, { EllonSnapshot, EllonSnapshotType, Paginated } from '@/api/ellonService';
import { getErrorMessage } from '@/lib/errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const TYPES: Array<[EllonSnapshotType, string]> = [
  ['PRE_ORDER', 'Pré-pedidos'],
  ['SALE', 'Vendas/faturamento'],
  ['NFE', 'NF-e'],
  ['DELIVERY', 'Entregas'],
  ['CUSTOMER', 'Clientes'],
  ['PAYMENT_METHOD', 'Formas de pagamento'],
  ['SELLER', 'Vendedores'],
  ['CARRIER', 'Transportadoras'],
  ['PRODUCT_GROUP', 'Grupos de produtos'],
  ['PRODUCT_BRAND', 'Marcas'],
];

/** Consulta o espelho dos dados recebidos da Ellon que não têm tela própria no M2. */
export function EllonDataExplorer({ counts }: { counts: Partial<Record<string, number>> }) {
  const [type, setType] = useState<EllonSnapshotType>('PRE_ORDER');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Paginated<EllonSnapshot> | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    ellonService.listSnapshots({ type, search: query || undefined, page, limit: 25 })
      .then(value => { if (active) setResult(value); })
      .catch(error => toast.error(getErrorMessage(error)))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [type, query, page]);

  const changeType = (next: EllonSnapshotType) => { setType(next); setPage(1); setOpen(null); };
  const submit = (event: React.FormEvent) => { event.preventDefault(); setQuery(search.trim()); setPage(1); };

  return <div className="space-y-3">
    <div className="flex flex-wrap gap-2">
      {TYPES.map(([value, label]) => <Button key={value} size="sm" variant={type === value ? 'default' : 'outline'} onClick={() => changeType(value)}>
        {label}<span className="ml-1.5 text-xs opacity-70">{counts[value] ?? 0}</span>
      </Button>)}
    </div>
    <form onSubmit={submit} className="flex gap-2">
      <Input placeholder="Buscar por nome ou código Ellon" value={search} onChange={event => setSearch(event.target.value)} />
      <Button type="submit" variant="outline"><Search className="h-4 w-4" /><span className="sr-only">Buscar</span></Button>
    </form>
    <div className="overflow-hidden rounded-md border bg-background text-sm">
      {loading && !result ? <div className="flex items-center gap-2 p-4 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>
        : !result?.data.length ? <p className="p-4 text-muted-foreground">Nenhum registro recebido da Ellon para este tipo.</p>
          : result.data.map(item => <div key={item.id} className="border-b last:border-0">
            <button type="button" className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-2 p-3 text-left hover:bg-muted/50 sm:grid-cols-[120px_minmax(0,1fr)_150px]" onClick={() => setOpen(current => current === item.id ? null : item.id)} aria-expanded={open === item.id}>
              <span className="font-mono text-xs text-muted-foreground sm:text-sm">{item.externalId}</span>
              <span className="order-first truncate font-medium sm:order-none">{item.name || '—'}</span>
              <span className="text-xs text-muted-foreground sm:text-right">{new Date(item.syncedAt).toLocaleString('pt-BR')}</span>
            </button>
            {open === item.id && <pre className="max-h-80 overflow-auto bg-muted/40 p-3 text-xs">{JSON.stringify(item.payload, null, 2)}</pre>}
          </div>)}
    </div>
    {result && result.meta.totalPages > 1 && <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{result.meta.total} registros · página {result.meta.page} de {result.meta.totalPages}</span>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage(current => current - 1)}><ChevronLeft className="h-4 w-4" /><span className="sr-only">Anterior</span></Button>
        <Button size="sm" variant="outline" disabled={page >= result.meta.totalPages || loading} onClick={() => setPage(current => current + 1)}><ChevronRight className="h-4 w-4" /><span className="sr-only">Próxima</span></Button>
      </div>
    </div>}
  </div>;
}
