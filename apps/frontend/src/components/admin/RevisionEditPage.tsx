import { useState, useEffect } from 'react';
import { Loader2, FileText, Clock, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { StepChecklist, type AvaliacaoItem } from '../revisions/steps/StepChecklist';
import { ItemStatus } from '../../types/revisions';
import { AdminRevision } from '../../api/adminService';
import revisionService from '../../api/revisionService';
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

  const handleSave = async (status?: 'draft' | 'in_progress' | 'completed') => {
    if (!revision) return;

    setIsSaving(true);
    try {
      const checklistItems = revisionItems.map((item) => ({
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        itemId: item.itemId,
        itemName: item.itemName,
        status: item.status,
        ...(item.notes ? { notes: item.notes } : {}),
      }));

      let backendStatus = revision.status;
      if (status) {
        backendStatus =
          status === 'draft' ? 'DRAFT' : status === 'in_progress' ? 'IN_PROGRESS' : 'COMPLETED';
      }

      const updatePayload: any = {
        status: backendStatus,
        checklistItems,
      };

      if (mileage) updatePayload.mileage = mileage;
      if (generalNotes) updatePayload.generalNotes = generalNotes;
      if (recommendations) updatePayload.recommendations = recommendations;

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

  const total = revisionItems.length;
  const checked = revisionItems.filter((item) => item.status !== ItemStatus.NOT_CHECKED).length;
  const percentage = total > 0 ? Math.round((checked / total) * 100) : 0;

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
        onClick={() => handleSave('completed')}
        className="h-9 flex-1 bg-green-600 text-xs text-white hover:bg-green-700 sm:flex-none sm:text-sm"
        disabled={percentage < 100 || isSaving || isLoading}
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
    <div className="min-w-0 space-y-4">
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
      {total > 0 && (
        <div className="sticky top-0 z-10 space-y-2 border-b bg-background/95 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium sm:text-sm">
              Progresso: {checked}/{total} ({percentage}%)
            </span>
            <div className="flex w-full gap-1.5 sm:w-auto sm:gap-2">{acoes}</div>
          </div>
          <Progress value={percentage} className="h-2 bg-gray-200 sm:h-3" />
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
      ) : (
        <div className="space-y-3 sm:space-y-4">
          <Card>
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-sm sm:text-base">Informações da Revisão</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-3 sm:space-y-3 sm:px-6">
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
            </CardContent>
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
