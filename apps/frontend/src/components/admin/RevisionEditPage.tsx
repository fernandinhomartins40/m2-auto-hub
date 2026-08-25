import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle,
  Clock,
  FileText,
  Gauge,
  Loader2,
  Pencil,
  X,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { StepChecklist, type AvaliacaoItem } from '../revisions/steps/StepChecklist';
import { StepBudget, type OrcamentoLinha } from '../revisions/steps/StepBudget';
import { ItemStatus } from '../../types/revisions';
import { AdminRevision } from '../../api/adminService';
import revisionService from '../../api/revisionService';
import serviceOrderService from '../../api/serviceOrderService';
import { useToast } from '../../hooks/use-toast';

interface RevisionEditPageProps {
  revision: AdminRevision | null;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Preenchimento do checklist de revisao, em pagina.
 *
 * Era um Dialog com altura travada em `max-h-[calc(100vh-4rem)]`: header, barra
 * de progresso e footer ocupavam altura fixa e o checklist (170+ itens) ficava
 * espremido numa faixa rolavel, cortando o conteudo em telas menores. Aqui a
 * pagina rola inteira e o checklist usa a largura e a altura que precisar.
 */
export function RevisionEditPage({ revision, onClose, onSuccess }: RevisionEditPageProps) {
  const { toast } = useToast();
  const [mileage, setMileage] = useState<number>(0);
  const [generalNotes, setGeneralNotes] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [revisionItems, setRevisionItems] = useState<AvaliacaoItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [isBudgetStep, setIsBudgetStep] = useState(false);
  const [budgetLines, setBudgetLines] = useState<OrcamentoLinha[]>([]);

  useEffect(() => {
    if (revision) {
      loadRevisionData();
    }
  }, [revision?.id]);

  const loadRevisionData = async () => {
    if (!revision) return;

    setIsLoading(true);
    try {
      const fullRevision = await revisionService.getRevisionById(revision.id);

      setMileage(fullRevision.mileage || 0);
      setGeneralNotes(fullRevision.generalNotes || '');
      setRecommendations(fullRevision.recommendations || '');

      // O checklist pode vir como array ou embrulhado em um objeto.
      let checklistArray = fullRevision.checklistItems;
      if (checklistArray && typeof checklistArray === 'object' && !Array.isArray(checklistArray)) {
        if ('data' in checklistArray) {
          checklistArray = checklistArray.data;
        } else if ('items' in checklistArray) {
          checklistArray = checklistArray.items;
        }
      }

      // itemName e categoryName ja estao gravados no checklist; sem eles a
      // busca nao teria o que mostrar ao continuar a revisao.
      const items: AvaliacaoItem[] = Array.isArray(checklistArray)
        ? checklistArray.map((item: any) => ({
            itemId: item.itemId,
            itemName: item.itemName ?? '',
            categoryId: item.categoryId ?? '',
            categoryName: item.categoryName ?? '',
            status: item.status as ItemStatus,
            notes: item.notes ?? '',
          }))
        : [];

      setRevisionItems(items);
    } catch (error) {
      console.error('Error loading revision:', error);
      toast({
        title: 'Erro ao carregar revisão',
        description: 'Não foi possível carregar os dados da revisão',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const serializeChecklist = () =>
    revisionItems.map((item) => ({
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      itemId: item.itemId,
      itemName: item.itemName,
      status: item.status,
      ...(item.notes ? { notes: item.notes } : {}),
      photos: [],
    }));

  const handleSave = async (status?: 'draft' | 'in_progress') => {
    if (!revision) return;

    setIsSaving(true);
    try {
      const checklistItems = serializeChecklist();

      let backendStatus = revision.status;
      if (status) {
        backendStatus = status === 'draft' ? 'DRAFT' : 'IN_PROGRESS';
      }

      const updatePayload: any = {
        status: backendStatus,
        checklistItems,
        mileage,
        generalNotes,
        recommendations,
      };

      await revisionService.updateRevision(revision.id, updatePayload);

      toast({
        title: 'Revisão atualizada!',
        description: 'As alterações foram salvas com sucesso.',
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error saving revision:', error);
      toast({
        title: 'Erro ao salvar',
        description:
          error.response?.data?.message || 'Erro ao salvar revisão. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinish = async () => {
    if (!revision) return;

    setIsSaving(true);
    try {
      // Primeiro persiste o checklist inteiro. Os itens nao tocados seguem
      // explicitamente como NOT_CHECKED e recebem seu RevisionCheck.
      const savedRevision = await revisionService.updateRevision(revision.id, {
        status: 'IN_PROGRESS',
        checklistItems: serializeChecklist(),
        mileage,
        generalNotes,
        recommendations,
      });

      const checkByItem = new Map(
        (savedRevision.checks || []).map((check) => [check.itemId ?? check.itemName, check.id])
      );
      const evaluated = revisionItems.filter((item) => item.status !== ItemStatus.NOT_CHECKED);
      const notEvaluated = revisionItems.length - evaluated.length;

      await serviceOrderService.create({
        customerId: revision.customerId,
        vehicleId: revision.vehicleId,
        customerName: revision.customer?.name || 'Cliente da revisão',
        customerPhone: revision.customer?.phone || null,
        vehicleLabel: `${revision.vehicle?.brand || ''} ${revision.vehicle?.model || ''}`.trim(),
        vehiclePlate: revision.vehicle?.plate || null,
        mileage: mileage || null,
        assignedMechanicId: revision.assignedMechanicId || null,
        revisionId: revision.id,
        description: [
          ...evaluated.map(
            (item) =>
              `${item.itemName} — ${item.status}${item.notes ? `: ${item.notes}` : ''}`
          ),
          `${notEvaluated} item(ns) não avaliado(s)`,
        ].join('\n'),
        items: budgetLines.map(({ origemItemId, ...line }) => ({
          ...line,
          revisionCheckId: checkByItem.get(origemItemId) || null,
        })),
      });

      await revisionService.completeRevision(revision.id);
      toast({
        title: 'Revisão finalizada e OS criada',
        description: `${evaluated.length} item(ns) avaliado(s) e ${notEvaluated} não avaliado(s).`,
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erro ao finalizar revisão',
        description:
          error.response?.data?.message ||
          error.response?.data?.error ||
          'Não foi possível gerar a ordem de serviço.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const total = revisionItems.length;
  const checked = revisionItems.filter((item) => item.status !== ItemStatus.NOT_CHECKED).length;
  const percentage = total > 0 ? Math.round((checked / total) * 100) : 0;

  const progressTone =
    percentage === 100
      ? {
          bar: 'bg-emerald-500',
          text: 'text-emerald-700',
          surface: 'border-emerald-200 bg-emerald-50/95',
        }
      : percentage >= 70
        ? {
            bar: 'bg-lime-500',
            text: 'text-lime-700',
            surface: 'border-lime-200 bg-lime-50/95',
          }
        : percentage >= 35
          ? {
              bar: 'bg-orange-500',
              text: 'text-orange-700',
              surface: 'border-orange-200 bg-orange-50/95',
            }
          : {
              bar: 'bg-blue-500',
              text: 'text-blue-700',
              surface: 'border-blue-200 bg-blue-50/95',
            };

  if (!revision) return null;

  const acoes = (
    <>
      <Button
        variant="outline"
        onClick={() => handleSave('draft')}
        disabled={isSaving || isLoading}
        className="h-9 flex-1 text-xs sm:flex-none sm:text-sm"
      >
        {isSaving ? (
          <Loader2 className="h-4 w-4 animate-spin sm:mr-1.5" />
        ) : (
          <FileText className="h-4 w-4 sm:mr-1.5" />
        )}
        <span className="hidden sm:inline">Salvar Rascunho</span>
        <span className="sm:hidden ml-1">Rascunho</span>
      </Button>
      <Button
        variant="outline"
        onClick={() => handleSave('in_progress')}
        disabled={isSaving || isLoading}
        className="h-9 flex-1 text-xs sm:flex-none sm:text-sm"
      >
        {isSaving ? (
          <Loader2 className="h-4 w-4 animate-spin sm:mr-1.5" />
        ) : (
          <Clock className="h-4 w-4 sm:mr-1.5" />
        )}
        <span className="hidden sm:inline">Em Andamento</span>
        <span className="sm:hidden ml-1">Andamento</span>
      </Button>
      <Button
        onClick={() => setIsBudgetStep(true)}
        className="h-9 flex-1 bg-green-600 text-xs text-white hover:bg-green-700 sm:flex-none sm:text-sm"
        disabled={checked === 0 || isSaving || isLoading}
      >
        {isSaving ? (
          <Loader2 className="h-4 w-4 animate-spin sm:mr-1.5" />
        ) : (
          <CheckCircle className="h-4 w-4 sm:mr-1.5" />
        )}
        <span className="ml-1 sm:ml-0">Finalizar</span>
      </Button>
    </>
  );

  return (
    <div className="min-w-0 w-full space-y-4">
      {/* Cabecalho: quem/qual veiculo, e a volta para a lista */}
      <div className="flex min-w-0 items-start gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-9 w-9 shrink-0"
          title="Voltar para a lista"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold leading-tight sm:text-lg">
            {revision.status === 'DRAFT' ? 'Editar Rascunho' : 'Continuar Revisão'}
          </h2>
          <p className="mt-0.5 truncate text-xs text-muted-foreground sm:text-sm">
            {revision.customer?.name} - {revision.vehicle?.brand} {revision.vehicle?.model} (
            {revision.vehicle?.plate})
          </p>
        </div>
      </div>

      {/* Progresso + acoes, colado no topo enquanto o checklist rola */}
      {total > 0 && !isBudgetStep && (
        <div
          className={`sticky top-0 z-30 space-y-3 rounded-xl border px-3 py-3 shadow-sm backdrop-blur sm:px-4 ${progressTone.surface}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span
                className={`grid h-9 w-9 place-items-center rounded-full bg-white shadow-sm ${progressTone.text}`}
              >
                {percentage === 100 ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Gauge className="h-5 w-5" />
                )}
              </span>
              <div>
                <p className={`text-sm font-bold sm:text-base ${progressTone.text}`}>
                  {percentage === 100 ? 'Revisão concluída' : `${percentage}% concluído`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {checked} de {total} itens avaliados
                </p>
              </div>
            </div>
            <div className="flex w-full gap-1.5 sm:w-auto sm:gap-2">{acoes}</div>
          </div>
          <div
            className="h-3 w-full overflow-hidden rounded-full bg-white/80 ring-1 ring-black/5 sm:h-4"
            role="progressbar"
            aria-label="Progresso da revisão"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percentage}
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ${progressTone.bar}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex h-48 items-center justify-center sm:h-64">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-moria-orange sm:h-12 sm:w-12"></div>
            <p className="mt-3 text-sm text-gray-600 sm:mt-4 sm:text-base">
              Carregando revisão...
            </p>
          </div>
        </div>
      ) : isBudgetStep ? (
        <StepBudget
          avaliacoes={revisionItems}
          linhas={budgetLines}
          onChange={setBudgetLines}
          onBack={() => setIsBudgetStep(false)}
          onFinish={handleFinish}
          salvando={isSaving}
        />
      ) : (
        <div className="space-y-3 sm:space-y-4">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 px-3 py-3 sm:px-4">
              <div className="min-w-0">
                <CardTitle className="text-sm sm:text-base">Informações da Revisão</CardTitle>
                {!isEditingInfo && <p className="mt-0.5 text-xs text-muted-foreground">Dados gerais do atendimento</p>}
              </div>
              <Button
                type="button"
                variant={isEditingInfo ? 'ghost' : 'outline'}
                size="sm"
                onClick={() => setIsEditingInfo((value) => !value)}
                className="h-8 shrink-0 text-xs"
              >
                {isEditingInfo ? <X className="mr-1.5 h-3.5 w-3.5" /> : <Pencil className="mr-1.5 h-3.5 w-3.5" />}
                {isEditingInfo ? 'Fechar edição' : 'Editar dados'}
              </Button>
            </CardHeader>
            {!isEditingInfo ? (
              <CardContent className="grid gap-2 border-t bg-muted/20 px-3 py-3 sm:grid-cols-3 sm:px-4">
                <div className="rounded-lg bg-background px-3 py-2 ring-1 ring-border">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Quilometragem</p>
                  <p className="mt-0.5 text-sm font-semibold">{mileage ? `${mileage.toLocaleString('pt-BR')} km` : 'Não informada'}</p>
                </div>
                <div className="rounded-lg bg-background px-3 py-2 ring-1 ring-border">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Observações gerais</p>
                  <p className="mt-0.5 line-clamp-2 text-sm">{generalNotes || 'Nenhuma observação'}</p>
                </div>
                <div className="rounded-lg bg-background px-3 py-2 ring-1 ring-border">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Recomendações</p>
                  <p className="mt-0.5 line-clamp-2 text-sm">{recommendations || 'Nenhuma recomendação'}</p>
                </div>
              </CardContent>
            ) : (
            <CardContent className="space-y-2 border-t px-3 py-3 sm:space-y-3 sm:px-4">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
                <div className="space-y-1">
                  <Label htmlFor="mileage" className="text-xs sm:text-sm">
                    Quilometragem
                  </Label>
                  <Input
                    id="mileage"
                    type="number"
                    value={mileage}
                    onChange={(e) => setMileage(parseInt(e.target.value) || 0)}
                    placeholder="0"
                    min={0}
                    className="h-8 text-sm sm:h-9"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="generalNotes" className="text-xs sm:text-sm">
                    Observações Gerais
                  </Label>
                  <Textarea
                    id="generalNotes"
                    value={generalNotes}
                    onChange={(e) => setGeneralNotes(e.target.value)}
                    placeholder="Observações..."
                    rows={2}
                    className="resize-none text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="recommendations" className="text-xs sm:text-sm">
                  Recomendações
                </Label>
                <Textarea
                  id="recommendations"
                  value={recommendations}
                  onChange={(e) => setRecommendations(e.target.value)}
                  placeholder="Recomendações para o cliente..."
                  rows={2}
                  className="resize-none text-sm"
                />
              </div>
              <div className="flex justify-end">
                <Button type="button" size="sm" onClick={() => setIsEditingInfo(false)} className="h-8">
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                  Concluir edição
                </Button>
              </div>
            </CardContent>
            )}
          </Card>

          <StepChecklist avaliacoes={revisionItems} onChange={setRevisionItems} />

          {/* Repete as acoes no fim: quem rolou 170 itens nao volta ao topo. */}
          <div className="flex flex-wrap gap-1.5 border-t pt-3 sm:gap-2">
            <Button variant="outline" onClick={onClose} className="h-9 text-xs sm:text-sm">
              Cancelar
            </Button>
            {acoes}
          </div>
        </div>
      )}
    </div>
  );
}
