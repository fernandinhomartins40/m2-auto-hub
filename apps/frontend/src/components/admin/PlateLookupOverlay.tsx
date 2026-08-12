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
  Phone,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import adminService, { type AdminRevision, type VehicleLookupResult } from '@/api/adminService';
import serviceOrderService, { type ServiceOrder } from '@/api/serviceOrderService';
import { normalizePlate, isValidBrazilianPlate, formatPlate } from '@/utils/licensePlate';
import { RevisionVehicleLookupDialog } from '../revisions/RevisionVehicleLookupDialog';
import { AssistedPlateLookupDialog } from './AssistedPlateLookupDialog';
import { ServiceOrderModal, type ServiceOrderInitialData } from './ServiceOrderModal';
import { ServiceOrderDetailsModal } from './ServiceOrderDetailsModal';
import { RevisionEditModal } from './RevisionEditModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const money = (v: number | string) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);

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

  const [cameraOpen, setCameraOpen] = useState(false);
  const [assistedOpen, setAssistedOpen] = useState(false);
  const [osModalOpen, setOsModalOpen] = useState(false);
  const [osInitial, setOsInitial] = useState<ServiceOrderInitialData | null>(null);
  const [osEditing, setOsEditing] = useState<ServiceOrder | null>(null);
  const [osDetails, setOsDetails] = useState<ServiceOrder | null>(null);
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
      toast({ title: 'Erro na consulta', description: err?.response?.data?.error, variant: 'destructive' });
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
    if (lookup?.found && lookup.vehicle && lookup.customer) {
      setOsInitial({
        customerId: lookup.customer.id,
        customerName: lookup.customer.name,
        customerPhone: lookup.customer.whatsapp,
        vehicleId: lookup.vehicle.id,
        vehicleLabel: `${lookup.vehicle.brand} ${lookup.vehicle.model} ${lookup.vehicle.year}`.trim(),
        vehiclePlate: lookup.vehicle.plate,
        mileage: lookup.vehicle.mileage ?? null,
      });
    } else {
      // Sem cadastro, mas com dados técnicos: já identifica o veículo na OS.
      const technical = lookup?.technicalData;
      const vehicleLabel = technical
        ? [technical.brand, technical.model, technical.year].filter(Boolean).join(' ').trim()
        : '';

      setOsInitial({
        vehiclePlate: normalizePlate(plateInput),
        vehicleLabel: vehicleLabel || null,
      });
    }
    setOsEditing(null);
    setOsModalOpen(true);
  };

  const continueOs = (o: ServiceOrder) => {
    setOsEditing(o);
    setOsInitial(null);
    setOsModalOpen(true);
  };

  const refreshAfterChange = () => {
    if (lookup?.vehicle) void runSearch(lookup.vehicle.plate);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
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

          {/* Resultado */}
          {searched && !loading && (
            <div className="space-y-4 pt-2">
              {!lookup?.found ? (
                <>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Placa <strong>{formatPlate(normalizePlate(plateInput))}</strong> não encontrada no cadastro.
                    </AlertDescription>
                  </Alert>

                  {/* Sem dados técnicos: oferece a consulta assistida, feita no
                      navegador do próprio atendente. */}
                  {!lookup?.technicalData && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setAssistedOpen(true)}
                    >
                      <Search className="h-4 w-4 mr-2" /> Identificar veículo pela placa
                    </Button>
                  )}

                  {/* Dados técnicos vindos da base própria ou da consulta externa:
                      permitem abrir a OS já com o veículo identificado. */}
                  {lookup?.technicalData && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3">
                      <div className="flex items-start gap-2">
                        <Car className="h-4 w-4 mt-0.5 text-blue-600 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-blue-900">
                            {[lookup.technicalData.brand, lookup.technicalData.model]
                              .filter(Boolean)
                              .join(' ') || 'Veículo identificado'}
                            {lookup.technicalData.year ? ` ${lookup.technicalData.year}` : ''}
                          </p>
                          <p className="mt-1 text-sm text-blue-800">
                            {[
                              lookup.technicalData.color,
                              lookup.technicalData.fuel,
                              [lookup.technicalData.city, lookup.technicalData.state]
                                .filter(Boolean)
                                .join('/'),
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                          <p className="mt-1.5 text-xs text-blue-700">
                            {lookup.technicalData.source === 'cache'
                              ? 'Dados da base própria da oficina.'
                              : 'Dados da consulta veicular. Confirme antes de salvar.'}
                          </p>
                        </div>
                      </div>
                    </div>
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
                            onClick={() => setOsDetails(o)}
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

      {/* Consulta assistida no navegador do atendente */}
      <AssistedPlateLookupDialog
        isOpen={assistedOpen}
        plate={normalizePlate(plateInput)}
        onClose={() => setAssistedOpen(false)}
        onResolved={(data) =>
          setLookup((atual) =>
            atual ? { ...atual, technicalData: data } : { found: false, plate: data.plate, technicalData: data }
          )
        }
      />

      {/* OS: criar / continuar */}
      <ServiceOrderModal
        isOpen={osModalOpen}
        onClose={() => setOsModalOpen(false)}
        onSaved={refreshAfterChange}
        order={osEditing}
        initialData={osInitial}
      />
      <ServiceOrderDetailsModal
        order={osDetails}
        isOpen={!!osDetails}
        onClose={() => setOsDetails(null)}
        onChanged={refreshAfterChange}
      />

      {/* Revisão: continuar */}
      <RevisionEditModal
        revision={revEditing}
        isOpen={!!revEditing}
        onClose={() => setRevEditing(null)}
        onSuccess={refreshAfterChange}
      />
    </>
  );
}
