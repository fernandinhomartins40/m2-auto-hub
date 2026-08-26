import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Camera,
  Search,
  Loader2,
  User,
  Car,
  ClipboardList,
  ClipboardCheck,
  ArrowRight,
  Plus,
  AlertCircle,
  CheckCircle2,
  Phone,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import adminService, { type AdminRevision, type VehicleLookupResult } from '@/api/adminService';
import serviceOrderService, { type ServiceOrder } from '@/api/serviceOrderService';
import { normalizePlate, isValidBrazilianPlate, formatPlate } from '@/utils/licensePlate';
import { RevisionVehicleLookupDialog } from '../revisions/RevisionVehicleLookupDialog';
import { ServiceOrderModal, type ServiceOrderInitialData } from './ServiceOrderModal';
import { ServiceOrderDetailsModal } from './ServiceOrderDetailsModal';
import { RevisionEditPage } from './RevisionEditPage';
import { formatCurrency as money } from '@/lib/format';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const OS_STATUS: Record<string, { label: string; color: string }> = {
  OPEN: { label: 'Aberta', color: 'bg-yellow-100 text-yellow-800' },
  IN_PROGRESS: { label: 'Em andamento', color: 'bg-blue-100 text-blue-800' },
  COMPLETED: { label: 'Concluída', color: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Cancelada', color: 'bg-red-100 text-red-800' },
};
const REV_STATUS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Aberta', color: 'bg-yellow-100 text-yellow-800' },
  IN_PROGRESS: { label: 'Em andamento', color: 'bg-blue-100 text-blue-800' },
  COMPLETED: { label: 'Concluída', color: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Cancelada', color: 'bg-red-100 text-red-800' },
};

const isOpenOs = (s: string) => s === 'OPEN' || s === 'IN_PROGRESS';
const isOpenRev = (s: string) => s === 'DRAFT' || s === 'IN_PROGRESS';

export function PlateLookupOverlay({ isOpen, onClose }: Props) {
  const { toast } = useToast();

  const [plateInput, setPlateInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [lookup, setLookup] = useState<VehicleLookupResult | null>(null);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [revisions, setRevisions] = useState<AdminRevision[]>([]);

  const [elapsed, setElapsed] = useState(0);
  const [cameraOpen, setCameraOpen] = useState(false);
  // Paginas de tela cheia no lugar dos antigos modais de OS.
  type OsPage =
    | { kind: 'none' }
    | { kind: 'form'; order: ServiceOrder | null; initialData: ServiceOrderInitialData | null }
    | { kind: 'details'; order: ServiceOrder };
  const [osPage, setOsPage] = useState<OsPage>({ kind: 'none' });
  const [revEditing, setRevEditing] = useState<AdminRevision | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPlateInput('');
      setSearched(false);
      setLookup(null);
      setOrders([]);
      setRevisions([]);
    }
  }, [isOpen]);

  // Conta os segundos da busca para trocar a mensagem de progresso.
  useEffect(() => {
    if (!loading) {
      setElapsed(0);
      return;
    }

    const inicio = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - inicio) / 1000));
    }, 500);

    return () => clearInterval(timer);
  }, [loading]);

  const runSearch = async (plateRaw: string) => {
    const plate = normalizePlate(plateRaw);
    if (!isValidBrazilianPlate(plate)) {
      toast({ title: 'Placa inválida', description: 'Verifique os caracteres e tente novamente.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const result = await adminService.lookupVehicleByPlate(plate);
      setLookup(result);

      if (result.found && result.vehicle) {
        const [osRes, revRes] = await Promise.all([
          serviceOrderService.list({ vehicleId: result.vehicle.id, limit: 50 }).catch(() => ({ data: [] as ServiceOrder[] })),
          adminService.getRevisions({ vehicleId: result.vehicle.id, limit: 50 }).catch(() => ({ data: [] as AdminRevision[] })),
        ]);
        setOrders(osRes.data || []);
        setRevisions(revRes.data || []);
      } else {
        setOrders([]);
        setRevisions([]);
      }
    } catch (err: any) {
      // Num timeout não existe `err.response`, então a descrição vinha vazia e
      // a falha passava despercebida.
      const description =
        err?.code === 'ECONNABORTED'
          ? 'A consulta demorou mais que o esperado. Tente novamente ou cadastre o veículo manualmente.'
          : err?.response?.data?.error || 'Não foi possível consultar a placa agora.';

      toast({ title: 'Erro na consulta', description, variant: 'destructive' });
      setLookup(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCameraResolved = (payload: {
    customer: { id: string; name: string; phone: string };
    vehicle: { id: string; brand: string; model: string; year: number; plate: string; mileage?: number };
  }) => {
    setCameraOpen(false);
    setPlateInput(formatPlate(payload.vehicle.plate));
    void runSearch(payload.vehicle.plate);
  };

  const openOs = orders.filter((o) => isOpenOs(o.status));
  const pastOs = orders.filter((o) => !isOpenOs(o.status));
  const openRev = revisions.filter((r) => isOpenRev(r.status));
  const pastRev = revisions.filter((r) => !isOpenRev(r.status));

  const startNewOs = () => {
    let initialData: ServiceOrderInitialData | null = null;

    if (lookup?.found && lookup.vehicle && lookup.customer) {
      initialData = {
        customerId: lookup.customer.id,
        customerName: lookup.customer.name,
        customerPhone: lookup.customer.whatsapp,
        vehicleId: lookup.vehicle.id,
        vehicleLabel: `${lookup.vehicle.brand} ${lookup.vehicle.model} ${lookup.vehicle.year}`.trim(),
        vehiclePlate: lookup.vehicle.plate,
        mileage: lookup.vehicle.mileage ?? null,
      };
    } else {
      // Sem cadastro, mas com dados técnicos: já identifica o veículo na OS.
      const technical = lookup?.technicalData;
      const vehicleLabel = technical
        ? [technical.brand, technical.model, technical.year].filter(Boolean).join(' ').trim()
        : '';

      initialData = {
        vehiclePlate: normalizePlate(plateInput),
        vehicleLabel: vehicleLabel || null,
      };
    }

    setOsPage({ kind: 'form', order: null, initialData });
  };

  const continueOs = (o: ServiceOrder) => {
    setOsPage({ kind: 'form', order: o, initialData: null });
  };

  const refreshAfterChange = () => {
    if (lookup?.vehicle) void runSearch(lookup.vehicle.plate);
  };

  /**
   * Criada a OS, o atendimento acabou: fecha a consulta junto com o modal.
   * Antes o overlay ficava aberto por baixo e era preciso fechar na mão.
   *
   * Não recarrega a busca de propósito — a consulta está saindo da tela, e
   * recarregá-la só gastaria uma requisição cujo resultado ninguém veria.
   */
  const handleOsSaved = () => {
    onClose();
  };

  return (
    <>
      {/* Enquanto preenche o checklist, a consulta sai da frente: a pagina de
          revisao precisa da tela inteira para nao cortar os itens. */}
      <Dialog open={isOpen && !revEditing} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" /> Consulta por Placa
            </DialogTitle>
            <DialogDescription>
              Leia ou digite a placa para ver a OS/revisão em aberto, o histórico e os dados do cliente.
            </DialogDescription>
          </DialogHeader>

          {/* Busca */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCameraOpen(true)}>
              <Camera className="h-4 w-4 mr-2" /> Ler placa
            </Button>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                className="pl-10 uppercase"
                placeholder="ABC1D23"
                value={plateInput}
                onChange={(e) => setPlateInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && runSearch(plateInput)}
              />
            </div>
            <Button onClick={() => runSearch(plateInput)} disabled={loading} className="bg-moria-orange hover:bg-moria-orange/90">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Consultar'}
            </Button>
          </div>

          {/* Carregando: a consulta externa abre um navegador real e leva alguns
              segundos, então a espera precisa ficar explícita. */}
          {loading && (
            <div className="flex items-start gap-3 rounded-lg border bg-blue-50/60 p-4">
              <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-blue-600" />
              <div className="min-w-0">
                <p className="font-medium text-blue-900">
                  Consultando {formatPlate(normalizePlate(plateInput))}...
                </p>
                <p className="mt-0.5 text-sm text-blue-800">
                  {elapsed < 3
                    ? 'Procurando no cadastro da oficina.'
                    : 'Buscando os dados do veículo na consulta externa — pode levar alguns segundos.'}
                </p>
              </div>
            </div>
          )}

          {/* Resultado */}
          {searched && !loading && (
            <div className="space-y-4 pt-2">
              {!lookup?.found ? (
                <>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Placa <strong>{formatPlate(normalizePlate(plateInput))}</strong>{' '}
                      {lookup?.technicalData
                        ? 'ainda não tem cliente vinculado no cadastro.'
                        : 'não encontrada no cadastro.'}
                    </AlertDescription>
                  </Alert>

                  {/* Dados técnicos vindos da base própria ou da consulta externa:
                      permitem abrir a OS já com o veículo identificado. */}
                  {lookup?.technicalData ? (
                    <div className="rounded-lg border-2 border-green-300 bg-green-50/70 p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                            Veículo identificado
                          </p>
                          <p className="mt-1 text-lg font-bold text-green-900">
                            {[lookup.technicalData.brand, lookup.technicalData.model]
                              .filter(Boolean)
                              .join(' ')}
                            {lookup.technicalData.year ? ` ${lookup.technicalData.year}` : ''}
                          </p>

                          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-green-900 sm:grid-cols-3">
                            {[
                              ['Cor', lookup.technicalData.color],
                              ['Combustível', lookup.technicalData.fuel],
                              ['Chassi', lookup.technicalData.chassisNumber],
                              ['Cilindrada', lookup.technicalData.displacement],
                              ['Potência', lookup.technicalData.power],
                              [
                                'Local',
                                [lookup.technicalData.city, lookup.technicalData.state]
                                  .filter(Boolean)
                                  .join('/'),
                              ],
                            ]
                              .filter(([, valor]) => valor)
                              .map(([rotulo, valor]) => (
                                <div key={String(rotulo)} className="min-w-0">
                                  <dt className="text-xs text-green-700">{rotulo}</dt>
                                  <dd className="truncate font-medium">{valor}</dd>
                                </div>
                              ))}
                          </dl>

                          <p className="mt-3 text-xs text-green-700">
                            {lookup.technicalData.source === 'cache'
                              ? 'Da base própria da oficina — sem nova consulta externa.'
                              : 'Da consulta veicular, agora salvo na base. Confira antes de gravar.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        Não foi possível identificar o veículo automaticamente. Preencha os
                        dados ao criar a OS.
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button onClick={startNewOs} className="w-full bg-moria-orange hover:bg-moria-orange/90">
                    <Plus className="h-4 w-4 mr-2" /> Criar OS com esta placa
                  </Button>
                </>
              ) : (
                <>
                  {/* Dados do cliente/veículo */}
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="font-semibold flex items-center gap-2">
                          <Car className="h-4 w-4 text-gray-400" />
                          {lookup.vehicle?.brand} {lookup.vehicle?.model} {lookup.vehicle?.year}
                          <Badge variant="outline">{formatPlate(lookup.vehicle?.plate ?? '')}</Badge>
                        </p>
                        {lookup.customer && (
                          <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                            <User className="h-3.5 w-3.5 text-gray-400" /> {lookup.customer.name}
                            {lookup.customer.whatsapp && (
                              <span className="flex items-center gap-1 text-gray-400">
                                <Phone className="h-3 w-3" /> {lookup.customer.whatsapp}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Abertas em destaque */}
                  {(openOs.length > 0 || openRev.length > 0) && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Em aberto</p>
                      {openOs.map((o) => (
                        <div key={o.id} className="flex items-center justify-between rounded-lg border-2 border-moria-orange/40 bg-orange-50/40 p-3">
                          <div>
                            <p className="font-medium flex items-center gap-2">
                              <ClipboardList className="h-4 w-4" /> OS #{o.number}
                              <Badge className={OS_STATUS[o.status].color} variant="secondary">{OS_STATUS[o.status].label}</Badge>
                            </p>
                            <p className="text-sm text-gray-500">{money(o.total)}</p>
                          </div>
                          <Button size="sm" className="bg-moria-orange hover:bg-moria-orange/90" onClick={() => continueOs(o)}>
                            Continuar OS <ArrowRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      ))}
                      {openRev.map((r) => (
                        <div key={r.id} className="flex items-center justify-between rounded-lg border-2 border-moria-orange/40 bg-orange-50/40 p-3">
                          <div>
                            <p className="font-medium flex items-center gap-2">
                              <ClipboardCheck className="h-4 w-4" /> Revisão
                              <Badge className={REV_STATUS[r.status]?.color} variant="secondary">{REV_STATUS[r.status]?.label ?? r.status}</Badge>
                            </p>
                            <p className="text-sm text-gray-500">{new Date(r.date).toLocaleDateString('pt-BR')}</p>
                          </div>
                          <Button size="sm" className="bg-moria-orange hover:bg-moria-orange/90" onClick={() => setRevEditing(r)}>
                            Continuar revisão <ArrowRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Nova OS */}
                  <Button variant="outline" className="w-full" onClick={startNewOs}>
                    <Plus className="h-4 w-4 mr-2" /> Nova OS para este veículo
                  </Button>

                  {/* Histórico */}
                  {(pastOs.length > 0 || pastRev.length > 0) && (
                    <>
                      <Separator />
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Histórico</p>
                      <div className="space-y-1">
                        {pastOs.map((o) => (
                          <button
                            key={o.id}
                            onClick={() => setOsPage({ kind: 'details', order: o })}
                            className="w-full flex items-center justify-between rounded-lg border p-2 text-left hover:bg-gray-50"
                          >
                            <span className="text-sm flex items-center gap-2">
                              <ClipboardList className="h-3.5 w-3.5 text-gray-400" /> OS #{o.number}
                              <Badge className={OS_STATUS[o.status].color} variant="secondary">{OS_STATUS[o.status].label}</Badge>
                            </span>
                            <span className="text-sm text-gray-500">{money(o.total)} · {new Date(o.createdAt).toLocaleDateString('pt-BR')}</span>
                          </button>
                        ))}
                        {pastRev.map((r) => (
                          <button
                            key={r.id}
                            onClick={() => setRevEditing(r)}
                            className="w-full flex items-center justify-between rounded-lg border p-2 text-left hover:bg-gray-50"
                          >
                            <span className="text-sm flex items-center gap-2">
                              <ClipboardCheck className="h-3.5 w-3.5 text-gray-400" /> Revisão
                              <Badge className={REV_STATUS[r.status]?.color} variant="secondary">{REV_STATUS[r.status]?.label ?? r.status}</Badge>
                            </span>
                            <span className="text-sm text-gray-500">{new Date(r.date).toLocaleDateString('pt-BR')}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {openOs.length === 0 && openRev.length === 0 && pastOs.length === 0 && pastRev.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-2">Nenhuma OS ou revisão para este veículo ainda.</p>
                  )}
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Câmera / ALPR */}
      <RevisionVehicleLookupDialog isOpen={cameraOpen} onClose={() => setCameraOpen(false)} onResolved={handleCameraResolved} />

      {/* OS: criar / continuar, em pagina de tela cheia */}
      {osPage.kind === 'form' && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-background p-3 sm:p-6">
          <ServiceOrderModal
            onClose={() => setOsPage({ kind: 'none' })}
            onSaved={handleOsSaved}
            order={osPage.order}
            initialData={osPage.initialData}
          />
        </div>
      )}
      {osPage.kind === 'details' && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-background p-3 sm:p-6">
          <ServiceOrderDetailsModal
            order={osPage.order}
            onClose={() => setOsPage({ kind: 'none' })}
            onChanged={refreshAfterChange}
          />
        </div>
      )}

      {/* Revisão: continuar, em pagina de tela cheia */}
      {revEditing && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-background p-3 sm:p-6">
          <div className="w-full">
            <RevisionEditPage
              revision={revEditing}
              onClose={() => setRevEditing(null)}
              onSuccess={() => {
                setRevEditing(null);
                refreshAfterChange();
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
