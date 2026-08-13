import { useState } from 'react';
import { ArrowRight, Car, Loader2, User } from 'lucide-react';

import adminService, { type VehicleLookupResult } from '@/api/adminService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { formatPlate } from '@/utils/licensePlate';

export interface RevisionTarget {
  customerId: string;
  customerName: string;
  customerPhone?: string;
  vehicleId: string;
  vehicleLabel: string;
  plate: string;
}

interface StepCustomerProps {
  lookup: VehicleLookupResult;
  onConfirmed: (target: RevisionTarget) => void;
  onBack: () => void;
}

/**
 * Passo 2: confirmar cliente e veiculo.
 *
 * Quando a placa ja esta cadastrada, mostra apenas o resumo - nada de
 * formulario. Caso contrario, faz o cadastro rapido aproveitando os dados
 * tecnicos que a consulta trouxe.
 */
export function StepCustomer({ lookup, onConfirmed, onBack }: StepCustomerProps) {
  const { toast } = useToast();
  const [salvando, setSalvando] = useState(false);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');

  const tecnico = lookup.technicalData;
  const veiculoLabel = lookup.vehicle
    ? `${lookup.vehicle.brand} ${lookup.vehicle.model} ${lookup.vehicle.year}`.trim()
    : [tecnico?.brand, tecnico?.model, tecnico?.year].filter(Boolean).join(' ');

  const jaCadastrado = Boolean(lookup.found && lookup.vehicle && lookup.customer);

  const cadastrarEContinuar = async () => {
    if (!nome.trim()) {
      toast({ title: 'Informe o nome do cliente', variant: 'destructive' });
      return;
    }
    if (!telefone.trim()) {
      toast({ title: 'Informe o telefone do cliente', variant: 'destructive' });
      return;
    }

    setSalvando(true);
    try {
      const somenteDigitos = telefone.replace(/\D/g, '');

      const cliente = await adminService.createCustomer({
        name: nome.trim(),
        phone: somenteDigitos,
        // O cadastro exige email, mas no balcão raramente se tem um. Gera a
        // partir do telefone, que já é único, e o cliente ajusta depois.
        email: `${somenteDigitos}@sememail.local`,
      });

      const veiculo = await adminService.createVehicleForCustomer(cliente.id, {
        brand: tecnico?.brand || 'Não informado',
        model: tecnico?.model || 'Não informado',
        year: tecnico?.year || new Date().getFullYear(),
        plate: lookup.plate,
        color: tecnico?.color || '',
        chassisNumber: tecnico?.chassisNumber || undefined,
        fuel: tecnico?.fuel || undefined,
        displacement: tecnico?.displacement || undefined,
        power: tecnico?.power || undefined,
        city: tecnico?.city || undefined,
        state: tecnico?.state || undefined,
      });

      onConfirmed({
        customerId: cliente.id,
        customerName: cliente.name,
        customerPhone: cliente.phone,
        vehicleId: veiculo.id,
        vehicleLabel: veiculoLabel,
        plate: lookup.plate,
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast({
        title: 'Erro ao cadastrar',
        description: err?.response?.data?.error || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl space-y-5">
      {/* Resumo do veiculo - curto de proposito */}
      <div className="rounded-xl border bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <Car className="mt-0.5 h-5 w-5 shrink-0 text-moria-orange" />
          <div className="min-w-0">
            <p className="font-semibold">{veiculoLabel || 'Veículo'}</p>
            <p className="text-sm text-muted-foreground">{formatPlate(lookup.plate)}</p>
          </div>
        </div>
      </div>

      {jaCadastrado ? (
        <>
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <User className="mt-0.5 h-5 w-5 shrink-0 text-moria-orange" />
              <div className="min-w-0">
                <p className="font-semibold">{lookup.customer?.name}</p>
                {lookup.customer?.whatsapp && (
                  <p className="text-sm text-muted-foreground">{lookup.customer.whatsapp}</p>
                )}
              </div>
            </div>
          </div>

          <Button
            className="h-12 w-full bg-moria-orange hover:bg-moria-orange/90"
            onClick={() =>
              onConfirmed({
                customerId: lookup.customer!.id,
                customerName: lookup.customer!.name,
                customerPhone: lookup.customer!.whatsapp,
                vehicleId: lookup.vehicle!.id,
                vehicleLabel: veiculoLabel,
                plate: lookup.plate,
              })
            }
          >
            Iniciar revisão
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </>
      ) : (
        <>
          <div>
            <h2 className="text-lg font-bold">De quem é o veículo?</h2>
            <p className="text-sm text-muted-foreground">
              Este veículo ainda não está no cadastro. Informe o cliente para continuar.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="rev-cliente-nome">Nome do cliente</Label>
              <Input
                id="rev-cliente-nome"
                className="h-12"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="João da Silva"
                disabled={salvando}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rev-cliente-fone">Telefone / WhatsApp</Label>
              <Input
                id="rev-cliente-fone"
                className="h-12"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 99999-9999"
                disabled={salvando}
                inputMode="tel"
              />
            </div>
          </div>

          <Button
            className="h-12 w-full bg-moria-orange hover:bg-moria-orange/90"
            onClick={cadastrarEContinuar}
            disabled={salvando}
          >
            {salvando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cadastrando...
              </>
            ) : (
              <>
                Cadastrar e iniciar revisão
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </>
      )}

      <Button variant="ghost" className="w-full" onClick={onBack} disabled={salvando}>
        Trocar veículo
      </Button>
    </div>
  );
}
