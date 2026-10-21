import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import ellonService, { EllonSalesReport as Report } from '@/api/ellonService';
import { getErrorMessage } from '@/lib/errors';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ORIGIN_LABEL: Record<string, string> = { site: 'Site', oficina: 'Oficina', loja: 'Balcão' };
const isoDay = (date: Date) => date.toISOString().slice(0, 10);

/** Vendas faturadas de toda a loja (site, oficina e balcão), a partir das vendas da Ellon. */
export function EllonSalesReport() {
  const [from, setFrom] = useState(isoDay(new Date(Date.now() - 30 * 86_400_000)));
  const [to, setTo] = useState(isoDay(new Date()));
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    ellonService.salesReport({ from, to }).then(setReport).catch(err => setError(getErrorMessage(err))).finally(() => setLoading(false));
  }, [from, to]);
  useEffect(load, [load]);

  return <Card>
    <CardHeader>
      <CardTitle>Vendas da loja (Ellon)</CardTitle>
      <CardDescription>Vendas faturadas no ERP, incluindo balcão, site e oficina. Canceladas ficam fora dos totais.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div><Label htmlFor="ellon-report-from">De</Label><Input id="ellon-report-from" type="date" value={from} max={to} onChange={event => setFrom(event.target.value)} /></div>
        <div><Label htmlFor="ellon-report-to">Até</Label><Input id="ellon-report-to" type="date" value={to} min={from} onChange={event => setTo(event.target.value)} /></div>
        <Button variant="outline" onClick={load} disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Atualizar</Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {report && <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Faturamento" value={formatCurrency(report.total)} />
          <Stat label="Vendas" value={report.count.toLocaleString('pt-BR')} />
          <Stat label="Ticket médio" value={formatCurrency(report.averageTicket)} />
          <Stat label="Canceladas no período" value={report.cancelled.toLocaleString('pt-BR')} />
        </div>
        {report.count === 0 && <p className="text-sm text-muted-foreground">Nenhuma venda no período. As vendas chegam pela sincronização “Pedidos e vendas” da integração Ellon.</p>}
        {report.undated > 0 && <p className="text-xs text-muted-foreground">{report.undated} venda(s) sem data reconhecível não entram no período.</p>}
        <div className="grid gap-5 lg:grid-cols-2">
          <Table title="Por origem" head={['Origem', 'Vendas', 'Total']} rows={report.byOrigin.map(item => [ORIGIN_LABEL[item.name] ?? item.name, item.count.toLocaleString('pt-BR'), formatCurrency(item.total)])} />
          <Table title="Por vendedor" head={['Vendedor', 'Vendas', 'Total']} rows={report.bySeller.map(item => [item.name, item.count.toLocaleString('pt-BR'), formatCurrency(item.total)])} empty="Vendedor não informado nas vendas." />
          <Table title="Produtos mais vendidos" head={['Produto', 'Qtd.', 'Total']} rows={report.topProducts.map(item => [item.name, item.quantity.toLocaleString('pt-BR'), formatCurrency(item.total)])} empty="As vendas não trouxeram itens." />
          <Table title="Por dia" head={['Dia', 'Vendas', 'Total']} rows={[...report.byDay].reverse().map(item => [new Date(`${item.date}T12:00:00`).toLocaleDateString('pt-BR'), item.count.toLocaleString('pt-BR'), formatCurrency(item.total)])} />
        </div>
      </>}
    </CardContent>
  </Card>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border bg-background p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-semibold tabular-nums">{value}</p></div>;
}

function Table({ title, head, rows, empty = 'Sem dados no período.' }: { title: string; head: string[]; rows: string[][]; empty?: string }) {
  return <div className="space-y-2">
    <h3 className="text-sm font-medium">{title}</h3>
    {!rows.length ? <p className="text-sm text-muted-foreground">{empty}</p> : <div className="max-h-80 overflow-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-muted/60 text-left text-xs text-muted-foreground"><tr>{head.map((label, index) => <th key={label} scope="col" className={`p-2 font-medium ${index ? 'text-right' : ''}`}>{label}</th>)}</tr></thead>
        <tbody>{rows.map((row, rowIndex) => <tr key={rowIndex} className="border-t">{row.map((cell, index) => <td key={index} className={`p-2 ${index ? 'text-right tabular-nums' : 'max-w-56 truncate'}`}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>}
  </div>;
}
