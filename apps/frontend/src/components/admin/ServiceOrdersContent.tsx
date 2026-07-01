import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { AdminPageHeader } from './AdminPageHeader';
import { ServiceOrderModal } from './ServiceOrderModal';
import { ServiceOrderDetailsModal } from './ServiceOrderDetailsModal';
import {
  ClipboardList,
  Plus,
  Search,
  RefreshCw,
  Loader2,
  Play,
  CheckCircle2,
  Eye,
  Pencil,
  User,
  Car,
} from 'lucide-react';
import serviceOrderService, {
  ServiceOrder,
  ServiceOrderStatistics,
  ServiceOrderStatus,
} from '@/api/serviceOrderService';
import { useToast } from '@/hooks/use-toast';

interface Props {
  /** Quando definido, filtra apenas as OS deste mecânico (uso no painel oficina). */
  mechanicId?: string;
  /** Oculta ações restritas a gestão (atribuir/cancelar/excluir). */
  restricted?: boolean;
}

const money = (v: number | string) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);

const STATUS_META: Record<ServiceOrderStatus, { label: string; color: string }> = {
  OPEN: { label: 'Aberta', color: 'bg-yellow-100 text-yellow-800' },
  IN_PROGRESS: { label: 'Em andamento', color: 'bg-blue-100 text-blue-800' },
  COMPLETED: { label: 'Concluída', color: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Cancelada', color: 'bg-red-100 text-red-800' },
};

export function ServiceOrdersContent({ mechanicId, restricted = false }: Props) {
  const { toast } = useToast();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [stats, setStats] = useState<ServiceOrderStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceOrder | null>(null);
  const [detailsOrder, setDetailsOrder] = useState<ServiceOrder | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [list, statistics] = await Promise.all([
        serviceOrderService.list({ limit: 100, mechanicId }),
        serviceOrderService.getStatistics(mechanicId),
      ]);
      setOrders(list.data);
      setStats(statistics);
    } catch {
      toast({ title: 'Erro ao carregar OS', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mechanicId]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          String(o.number).includes(s) ||
          o.customerName.toLowerCase().includes(s) ||
          (o.vehiclePlate ?? '').toLowerCase().includes(s) ||
          (o.vehicleLabel ?? '').toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [orders, search, statusFilter]);

  const doAction = async (id: string, action: 'start' | 'complete') => {
    setBusyId(id);
    try {
      if (action === 'start') await serviceOrderService.start(id);
      else await serviceOrderService.complete(id);
      toast({ title: action === 'start' ? 'OS iniciada' : 'OS concluída' });
      await load();
    } catch (err: any) {
      toast({ title: 'Não foi possível', description: err?.response?.data?.error, variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (o: ServiceOrder) => {
    setEditing(o);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={ClipboardList}
        title={restricted ? 'Minhas Ordens de Serviço' : 'Ordens de Serviço'}
        description="Gerencie serviços executados e produtos usados, com atribuição de mecânico."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button size="sm" onClick={openNew} className="bg-moria-orange hover:bg-moria-orange/90">
              <Plus className="h-4 w-4 mr-2" />
              Nova OS
            </Button>
          </>
        }
      />

      {/* Cards de resumo */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Abertas', value: stats.open, color: 'text-yellow-600' },
            { label: 'Em andamento', value: stats.inProgress, color: 'text-blue-600' },
            { label: 'Concluídas hoje', value: stats.completedToday, color: 'text-green-600' },
            { label: 'Total', value: stats.total, color: 'text-gray-700' },
          ].map((c) => (
            <Card key={c.label}>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600">{c.label}</p>
                <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            className="pl-10"
            placeholder="Buscar por nº, cliente ou placa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="OPEN">Abertas</SelectItem>
            <SelectItem value="IN_PROGRESS">Em andamento</SelectItem>
            <SelectItem value="COMPLETED">Concluídas</SelectItem>
            <SelectItem value="CANCELLED">Canceladas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <ClipboardList className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-2">Nenhuma ordem de serviço encontrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => {
            const meta = STATUS_META[o.status];
            return (
              <div key={o.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold">OS #{o.number}</p>
                      <Badge className={meta.color} variant="secondary">
                        {meta.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 flex items-center gap-1 mt-1">
                      <User className="h-3.5 w-3.5 text-gray-400" /> {o.customerName}
                    </p>
                    {(o.vehicleLabel || o.vehiclePlate) && (
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Car className="h-3.5 w-3.5 text-gray-400" /> {o.vehicleLabel} {o.vehiclePlate ? `· ${o.vehiclePlate}` : ''}
                      </p>
                    )}
                    {o.mechanicName && (
                      <p className="text-xs text-gray-500 mt-0.5">Mecânico: {o.mechanicName}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-moria-orange">{money(o.total)}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(o.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={() => setDetailsOrder(o)}>
                    <Eye className="h-4 w-4 mr-1" /> Ver
                  </Button>
                  {o.status !== 'COMPLETED' && o.status !== 'CANCELLED' && (
                    <Button size="sm" variant="outline" onClick={() => openEdit(o)}>
                      <Pencil className="h-4 w-4 mr-1" /> Editar
                    </Button>
                  )}
                  {o.status === 'OPEN' && (
                    <Button size="sm" variant="outline" disabled={busyId === o.id} onClick={() => doAction(o.id, 'start')}>
                      {busyId === o.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
                      Iniciar
                    </Button>
                  )}
                  {(o.status === 'OPEN' || o.status === 'IN_PROGRESS') && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      disabled={busyId === o.id}
                      onClick={() => doAction(o.id, 'complete')}
                    >
                      {busyId === o.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                      Concluir
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ServiceOrderModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={load}
        order={editing}
      />
      <ServiceOrderDetailsModal
        order={detailsOrder}
        isOpen={!!detailsOrder}
        onClose={() => setDetailsOrder(null)}
        onChanged={load}
        restricted={restricted}
      />
    </div>
  );
}
