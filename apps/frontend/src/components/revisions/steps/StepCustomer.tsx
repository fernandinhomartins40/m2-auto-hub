import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Car, Check, Loader2, Search, User, UserPlus, X } from 'lucide-react';

import adminService, {
  type ProvisionalUser,
  type VehicleLookupResult,
} from '@/api/adminService';
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
 * Placa ja cadastrada mostra so o resumo. Caso contrario, o campo de nome
 * tambem busca no cadastro: o carro pode ser novo mas o dono ja existir, e
 * criar um cliente duplicado quebraria o historico. So quando nao ha resultado
 * e que se cria o pre-cadastro (nome + WhatsApp), completado depois na ficha.
 */
export function StepCustomer({ lookup, onConfirmed, onBack }: StepCustomerProps) {
  const { toast } = useToast();
  const [salvando, setSalvando] = useState(false);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');

  const [resultados, setResultados] = useState<ProvisionalUser[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [selecionado, setSelecionado] = useState<ProvisionalUser | null>(null);
  const buscaRef = useRef<number>();

  const tecnico = lookup.technicalData;
  const veiculoLabel = lookup.vehicle
    ? `${lookup.vehicle.brand} ${lookup.vehicle.model} ${lookup.vehicle.year}`.trim()
    : [tecnico?.brand, tecnico?.model, tecnico?.year].filter(Boolean).join(' ');

  const jaCadastrado = Boolean(lookup.found && lookup.vehicle && lookup.customer);

  // Busca enquanto digita, com um respiro para não disparar a cada tecla.
  useEffect(() => {
    if (jaCadastrado || selecionado) return;

    const termo = nome.trim();
    if (termo.length < 2) {
      setResultados([]);
      return;
    }

    window.clearTimeout(buscaRef.current);
    buscaRef.current = window.setTimeout(async () => {
      setBuscando(true);
      try {
        const { customers } = await adminService.getCustomers({ search: termo, limit: 6 });
        setResultados(customers || []);
      } catch {
        setResultados([]);
      } finally {
        setBuscando(false);
      }
    }, 350);

    return () => window.clearTimeout(buscaRef.current);
  }, [nome, jaCadastrado, selecionado]);

  /** Cria o veículo para o cliente informado e segue para o checklist. */
  const vincularVeiculo = async (cliente: ProvisionalUser) => {
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
      customerPhone: cliente.whatsapp,
      vehicleId: veiculo.id,
      vehicleLabel: veiculoLabel,
      plate: lookup.plate,
    });
  };

  const usarClienteExistente = async (cliente: ProvisionalUser) => {
    setSalvando(true);
    try {
      await vincularVeiculo(cliente);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast({
        title: 'Erro ao vincular veículo',
        description: err?.response?.data?.error || 'Tente novamente.',
        variant: 'destructive',
      });
      setSalvando(false);
    }
  };

  const criarPreCadastro = async () => {
    if (!nome.trim()) {
      toast({ title: 'Informe o nome do cliente', variant: 'destructive' });
      return;
    }
    if (!telefone.trim()) {
      toast({ title: 'Informe o WhatsApp do cliente', variant: 'destructive' });
      return;
    }

    setSalvando(true);
    try {
      const somenteDigitos = telefone.replace(/\D/g, '');

      const cliente = await adminService.createCustomer({
        name: nome.trim(),
        phone: somenteDigitos,
        // Pré-cadastro: o e-mail é obrigatório no cadastro, mas no balcão
        // raramente se tem um. Gera a partir do telefone, que já é único, e a
        // ficha completa do cliente é preenchida depois.
        email: `${somenteDigitos}@sememail.local`,
      });

      await vincularVeiculo(cliente);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast({
        title: 'Erro ao cadastrar',
        description: err?.response?.data?.error || 'Tente novamente.',
        variant: 'destructive',
      });
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
              Digite o nome para buscar no cadastro. Se ainda não existir, um cadastro
              rápido é criado com nome e WhatsApp.
            </p>
          </div>

          {selecionado ? (
            <div className="flex items-center gap-3 rounded-xl border-2 border-green-300 bg-green-50/70 p-4">
              <Check className="h-5 w-5 shrink-0 text-green-600" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-green-900">{selecionado.name}</p>
                <p className="text-sm text-green-800">{selecionado.whatsapp}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => {
                  setSelecionado(null);
                  setNome('');
                }}
                disabled={salvando}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="rev-cliente-nome">Cliente</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="rev-cliente-nome"
                    className="h-12 pl-10"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Buscar por nome, telefone ou CPF"
                    disabled={salvando}
                    autoFocus
                    autoComplete="off"
                  />
                  {buscando && (
                    <Loader2 className="absolute right-3 top-3.5 h-5 w-5 animate-spin text-muted-foreground" />
                  )}
                </div>

                {resultados.length > 0 && (
                  <div className="overflow-hidden rounded-lg border">
                    {resultados.map((cliente) => (
                      <button
                        key={cliente.id}
                        type="button"
                        onClick={() => setSelecionado(cliente)}
                        disabled={salvando}
                        className="flex w-full items-center gap-3 border-b px-4 py-3 text-left last:border-b-0 hover:bg-muted"
                      >
                        <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{cliente.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {cliente.whatsapp}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {nome.trim().length >= 2 && !buscando && resultados.length === 0 && (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <UserPlus className="h-4 w-4" />
                    Nenhum cliente encontrado. Informe o WhatsApp para cadastrar.
                  </p>
                )}
              </div>

              {/* O WhatsApp só é pedido quando de fato vamos criar alguém. */}
              {nome.trim().length >= 2 && resultados.length === 0 && !buscando && (
                <div className="space-y-1.5">
                  <Label htmlFor="rev-cliente-fone">WhatsApp</Label>
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
              )}
            </div>
          )}

          <Button
            className="h-12 w-full bg-moria-orange hover:bg-moria-orange/90"
            onClick={() =>
              selecionado ? usarClienteExistente(selecionado) : criarPreCadastro()
            }
            disabled={salvando || (!selecionado && nome.trim().length < 2)}
          >
            {salvando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : selecionado ? (
              <>
                Iniciar revisão
                <ArrowRight className="ml-2 h-4 w-4" />
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
