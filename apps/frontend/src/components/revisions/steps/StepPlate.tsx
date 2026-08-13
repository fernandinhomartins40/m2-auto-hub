import { useState } from 'react';
import { AlertCircle, Camera, Car, CheckCircle2, Loader2, Search, User } from 'lucide-react';

import adminService, { type VehicleLookupResult } from '@/api/adminService';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RevisionVehicleLookupDialog } from '@/components/revisions/RevisionVehicleLookupDialog';
import { useToast } from '@/hooks/use-toast';
import { formatPlate, isValidBrazilianPlate, normalizePlate } from '@/utils/licensePlate';

interface StepPlateProps {
  onResolved: (lookup: VehicleLookupResult) => void;
}

/**
 * Passo 1: identificar o veiculo pela placa.
 *
 * Reaproveita a mesma consulta usada no painel (base propria -> busca externa),
 * entao uma placa ja conhecida responde na hora e uma nova traz marca, modelo e
 * ano sem ninguem digitar.
 */
export function StepPlate({ onResolved }: StepPlateProps) {
  const { toast } = useToast();
  const [plate, setPlate] = useState('');
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [result, setResult] = useState<VehicleLookupResult | null>(null);

  const buscar = async (valor: string) => {
    const normalizada = normalizePlate(valor);

    if (!isValidBrazilianPlate(normalizada)) {
      toast({
        title: 'Placa inválida',
        description: 'Verifique os caracteres e tente novamente.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setResult(null);
    const inicio = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - inicio) / 1000)), 500);

    try {
      const lookup = await adminService.lookupVehicleByPlate(normalizada);
      setResult(lookup);

      // Veiculo cadastrado e com cliente: nao ha o que confirmar, segue direto.
      if (lookup.found && lookup.vehicle && lookup.customer) {
        onResolved(lookup);
      }
    } catch (error: unknown) {
      const err = error as { code?: string; response?: { data?: { error?: string } } };
      toast({
        title: 'Erro na consulta',
        description:
          err?.code === 'ECONNABORTED'
            ? 'A consulta demorou mais que o esperado. Tente novamente.'
            : err?.response?.data?.error || 'Não foi possível consultar a placa agora.',
        variant: 'destructive',
      });
    } finally {
      clearInterval(timer);
      setElapsed(0);
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl space-y-5">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-moria-orange/10">
          <Car className="h-7 w-7 text-moria-orange" />
        </div>
        <h2 className="text-xl font-bold">Qual é o veículo?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Leia a placa pela câmera ou digite para começar a revisão.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          className="h-12 sm:w-auto"
          onClick={() => setCameraOpen(true)}
          disabled={loading}
        >
          <Camera className="mr-2 h-5 w-5" />
          Ler placa
        </Button>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
          <Input
            className="h-12 pl-10 text-lg uppercase tracking-wider"
            placeholder="ABC1D23"
            value={plate}
            onChange={(e) => setPlate(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && buscar(plate)}
            disabled={loading}
            maxLength={8}
            autoFocus
          />
        </div>

        <Button
          type="button"
          className="h-12 bg-moria-orange hover:bg-moria-orange/90 sm:w-auto"
          onClick={() => buscar(plate)}
          disabled={loading || !plate.trim()}
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Buscar'}
        </Button>
      </div>

      {loading && (
        <div className="flex items-start gap-3 rounded-lg border bg-blue-50/60 p-4">
          <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-blue-600" />
          <div>
            <p className="font-medium text-blue-900">
              Consultando {formatPlate(normalizePlate(plate))}...
            </p>
            <p className="text-sm text-blue-800">
              {elapsed < 3
                ? 'Procurando no cadastro da oficina.'
                : 'Buscando os dados do veículo — pode levar alguns segundos.'}
            </p>
          </div>
        </div>
      )}

      {/* Veiculo sem cliente vinculado, ou nem cadastrado: o passo seguinte
          resolve o cadastro, aqui só confirmamos o que foi encontrado. */}
      {!loading && result && !(result.found && result.customer) && (
        <div className="space-y-3">
          {result.technicalData ? (
            <div className="rounded-lg border-2 border-green-300 bg-green-50/70 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                    Veículo identificado
                  </p>
                  <p className="mt-1 text-lg font-bold text-green-900">
                    {[result.technicalData.brand, result.technicalData.model]
                      .filter(Boolean)
                      .join(' ')}
                    {result.technicalData.year ? ` ${result.technicalData.year}` : ''}
                  </p>
                  <p className="text-sm text-green-800">
                    {[result.technicalData.color, result.technicalData.fuel]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Não foi possível identificar o veículo automaticamente. Você preenche os
                dados no próximo passo.
              </AlertDescription>
            </Alert>
          )}

          <Button
            className="h-12 w-full bg-moria-orange hover:bg-moria-orange/90"
            onClick={() => onResolved(result)}
          >
            <User className="mr-2 h-4 w-4" />
            Continuar
          </Button>
        </div>
      )}

      <RevisionVehicleLookupDialog
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onResolved={(payload) => {
          setCameraOpen(false);
          setPlate(formatPlate(payload.vehicle.plate));
          void buscar(payload.vehicle.plate);
        }}
      />
    </div>
  );
}
