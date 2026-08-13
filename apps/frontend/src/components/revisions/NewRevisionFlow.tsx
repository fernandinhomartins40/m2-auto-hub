import { useState } from 'react';
import { Check } from 'lucide-react';

import revisionService from '@/api/revisionService';
import serviceOrderService from '@/api/serviceOrderService';
import type { VehicleLookupResult } from '@/api/adminService';
import { useToast } from '@/hooks/use-toast';
import { ItemStatus } from '@/types/revisions';
import { cn } from '@/lib/utils';

import { StepPlate } from './steps/StepPlate';
import { StepCustomer, type RevisionTarget } from './steps/StepCustomer';
import { StepChecklist, type AvaliacaoItem } from './steps/StepChecklist';
import { StepBudget, type OrcamentoLinha } from './steps/StepBudget';

const PASSOS = ['Veículo', 'Cliente', 'Checklist', 'Orçamento'] as const;

interface NewRevisionFlowProps {
  /** Chamado ao concluir, para a lista recarregar. */
  onFinished?: () => void;
}

/**
 * Fluxo guiado de revisao, em pagina e passo a passo.
 *
 * Substitui a tela unica que pedia cliente, veiculo e checklist completo de uma
 * vez: comeca pela placa (que resolve veiculo e cliente juntos), marca so o que
 * foi verificado e termina gerando a OS dos itens com problema.
 */
export function NewRevisionFlow({ onFinished }: NewRevisionFlowProps) {
  const { toast } = useToast();
  const [passo, setPasso] = useState(0);
  const [lookup, setLookup] = useState<VehicleLookupResult | null>(null);
  const [alvo, setAlvo] = useState<RevisionTarget | null>(null);
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoItem[]>([]);
  const [linhas, setLinhas] = useState<OrcamentoLinha[]>([]);
  const [salvando, setSalvando] = useState(false);

  const reiniciar = () => {
    setPasso(0);
    setLookup(null);
    setAlvo(null);
    setAvaliacoes([]);
    setLinhas([]);
  };

  const concluir = async () => {
    if (!alvo) return;

    setSalvando(true);
    try {
      // 1. A revisao guarda todos os itens avaliados; o que nao foi tocado
      //    simplesmente nao entra e vale como NOT_CHECKED.
      const revisao = await revisionService.createRevision({
        customerId: alvo.customerId,
        vehicleId: alvo.vehicleId,
        date: new Date().toISOString(),
        checklistItems: avaliacoes.map((a) => ({
          categoryId: a.categoryId,
          categoryName: a.categoryName,
          itemId: a.itemId,
          itemName: a.itemName,
          status: a.status,
          notes: a.notes || undefined,
          photos: [],
        })),
      });

      // 2. Havendo problemas orcados, a OS nasce ja vinculada a revisao.
      const temProblema = avaliacoes.some(
        (a) => a.status === ItemStatus.ATTENTION || a.status === ItemStatus.CRITICAL
      );

      if (temProblema && linhas.length > 0) {
        const revisaoId = (revisao as { id?: string })?.id;

        await serviceOrderService.create({
          customerId: alvo.customerId,
          vehicleId: alvo.vehicleId,
          customerName: alvo.customerName,
          customerPhone: alvo.customerPhone ?? null,
          vehicleLabel: alvo.vehicleLabel,
          vehiclePlate: alvo.plate,
          description: avaliacoes
            .filter(
              (a) => a.status === ItemStatus.ATTENTION || a.status === ItemStatus.CRITICAL
            )
            .map((a) => `${a.itemName}${a.notes ? `: ${a.notes}` : ''}`)
            .join('\n'),
          items: linhas.map(({ origemItemId: _origem, ...item }) => item),
          ...(revisaoId ? { revisionId: revisaoId } : {}),
        });

        toast({
          title: 'Revisão concluída',
          description: 'Ordem de serviço criada com os itens do orçamento.',
        });
      } else {
        toast({ title: 'Revisão concluída' });
      }

      reiniciar();
      onFinished?.();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast({
        title: 'Erro ao concluir',
        description: err?.response?.data?.error || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Trilha dos passos */}
      <div className="flex items-center gap-1 sm:gap-2">
        {PASSOS.map((nome, i) => (
          <div key={nome} className="flex flex-1 items-center gap-1 sm:gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div
                className={cn(
                  'h-1.5 rounded-full transition-colors',
                  i < passo ? 'bg-moria-orange' : i === passo ? 'bg-moria-orange/60' : 'bg-muted'
                )}
              />
              <span
                className={cn(
                  'truncate text-[11px] sm:text-xs',
                  i === passo ? 'font-semibold text-foreground' : 'text-muted-foreground'
                )}
              >
                {i < passo && <Check className="mr-0.5 inline h-3 w-3" />}
                {nome}
              </span>
            </div>
          </div>
        ))}
      </div>

      {passo === 0 && (
        <StepPlate
          onResolved={(resultado) => {
            setLookup(resultado);
            setPasso(1);
          }}
        />
      )}

      {passo === 1 && lookup && (
        <StepCustomer
          lookup={lookup}
          onBack={() => setPasso(0)}
          onConfirmed={(destino) => {
            setAlvo(destino);
            setPasso(2);
          }}
        />
      )}

      {passo === 2 && (
        <StepChecklist
          avaliacoes={avaliacoes}
          onChange={setAvaliacoes}
          onBack={() => setPasso(1)}
          onNext={() => setPasso(3)}
        />
      )}

      {passo === 3 && (
        <StepBudget
          avaliacoes={avaliacoes}
          linhas={linhas}
          onChange={setLinhas}
          onBack={() => setPasso(2)}
          onFinish={concluir}
          salvando={salvando}
        />
      )}
    </div>
  );
}
