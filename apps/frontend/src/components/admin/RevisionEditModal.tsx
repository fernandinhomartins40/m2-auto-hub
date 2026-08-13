import { useState, useEffect } from 'react';
import { Save, Loader2, FileText, Clock, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Separator } from '../ui/separator';
import { Progress } from '../ui/progress';
import { RevisionChecklist } from '../revisions/RevisionChecklist';
import { useRevisions } from '../../contexts/RevisionsContext';
import { RevisionChecklistItem, ItemStatus } from '../../types/revisions';
import { AdminRevision } from '../../api/adminService';
import revisionService from '../../api/revisionService';
import { useToast } from '../../hooks/use-toast';

interface RevisionEditModalProps {
  revision: AdminRevision | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RevisionEditModal({
  revision,
  isOpen,
  onClose,
  onSuccess,
}: RevisionEditModalProps) {
  const { categories } = useRevisions();
  const { toast } = useToast();
  const [mileage, setMileage] = useState<number>(0);
  const [generalNotes, setGeneralNotes] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [revisionItems, setRevisionItems] = useState<RevisionChecklistItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && revision) {
      loadRevisionData();
    }
  }, [isOpen, revision]);

  const loadRevisionData = async () => {
    if (!revision) return;

    setIsLoading(true);
    try {
      // Load full revision details
      const fullRevision = await revisionService.getRevisionById(revision.id);

      setMileage(fullRevision.mileage || 0);
      setGeneralNotes(fullRevision.generalNotes || '');
      setRecommendations(fullRevision.recommendations || '');

      // Convert backend checklist to frontend format
      // Handle both array and object formats
      let checklistArray = fullRevision.checklistItems;

      // If checklistItems is an object, try to extract the array
      if (checklistArray && typeof checklistArray === 'object' && !Array.isArray(checklistArray)) {
        // Try common patterns for nested data
        if ('data' in checklistArray) {
          checklistArray = checklistArray.data;
        } else if ('items' in checklistArray) {
          checklistArray = checklistArray.items;
        }
      }

      const items: RevisionChecklistItem[] = Array.isArray(checklistArray)
        ? checklistArray.map((item: any) => {
            return {
              itemId: item.itemId,
              status: item.status as ItemStatus,
              notes: item.notes,
              photos: item.photos || [],
              checkedAt: item.checkedAt,
              checkedBy: item.checkedBy,
            };
          })
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

  const handleUpdateItem = (itemId: string, updates: Partial<RevisionChecklistItem>) => {
    setRevisionItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.itemId === itemId);
      if (existingIndex >= 0) {
        const newItems = [...prev];
        newItems[existingIndex] = { ...newItems[existingIndex], ...updates };
        return newItems;
      } else {
        return [...prev, { itemId, status: ItemStatus.NOT_CHECKED, ...updates }];
      }
    });
  };

  const handleSave = async (status?: 'draft' | 'in_progress' | 'completed') => {
    if (!revision) return;

    setIsSaving(true);
    try {
      // Transform checklist items to backend format
      const checklistItems = revisionItems.map((item) => {
        const categoryData = categories.find((cat) =>
          cat.items.some((catItem) => catItem.id === item.itemId)
        );
        const itemData = categoryData?.items.find((catItem) => catItem.id === item.itemId);

        const checkItem: any = {
          categoryId: categoryData?.id || '',
          categoryName: categoryData?.name || '',
          itemId: item.itemId,
          itemName: itemData?.name || '',
          status: item.status,
        };

        if (item.notes) checkItem.notes = item.notes;
        if (item.photos && item.photos.length > 0) checkItem.photos = item.photos;

        return checkItem;
      });

      // Map status to backend format
      let backendStatus = revision.status;
      if (status) {
        backendStatus = status === 'draft' ? 'DRAFT' : status === 'in_progress' ? 'IN_PROGRESS' : 'COMPLETED';
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
        description: error.response?.data?.message || 'Erro ao salvar revisão. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getProgress = () => {
    const total = revisionItems.length;
    const checked = revisionItems.filter((item) => item.status !== ItemStatus.NOT_CHECKED).length;
    const percentage = total > 0 ? Math.round((checked / total) * 100) : 0;
    return { checked, total, percentage };
  };

  const progress = getProgress();

  if (!revision) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-6xl w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)] sm:max-h-[calc(100vh-4rem)] my-4 sm:my-auto flex flex-col p-0">
        {/* Compact Header */}
        <DialogHeader className="px-3 sm:px-4 pt-3 sm:pt-4 pb-2">
          <DialogTitle className="text-base sm:text-lg font-bold leading-tight">
            {revision.status === 'DRAFT' ? 'Editar Rascunho' : 'Continuar Revisão'}
          </DialogTitle>
          <DialogDescription className="mt-1 text-xs sm:text-sm truncate">
            {revision.customer?.name} - {revision.vehicle?.brand} {revision.vehicle?.model} ({revision.vehicle?.plate})
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar - Mobile: Only indicator, Desktop: Full bar with buttons */}
        {progress.total > 0 && (
          <div className="px-3 sm:px-4">
            <Separator className="my-2 sm:my-3" />

            {/* Mobile: Compact progress only */}
            <div className="sm:hidden py-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium">
                  Progresso: {progress.checked}/{progress.total}
                </span>
                <span className="text-xs text-gray-500">
                  {progress.percentage}%
                </span>
              </div>
              <Progress
                value={progress.percentage}
                className="h-2 bg-gray-200"
              />
            </div>

            {/* Desktop: Full progress with buttons */}
            <div className="hidden sm:block py-2 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  Progresso: {progress.checked}/{progress.total} ({progress.percentage}%)
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSave('draft')}
                    disabled={isSaving}
                    className="h-8 text-xs"
                  >
                    {isSaving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <FileText className="h-3 w-3 mr-1" />}
                    Salvar Rascunho
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSave('in_progress')}
                    disabled={isSaving}
                    className="h-8 text-xs"
                  >
                    {isSaving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Clock className="h-3 w-3 mr-1" />}
                    Em Andamento
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSave('completed')}
                    className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
                    disabled={progress.percentage < 100 || isSaving}
                  >
                    {isSaving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                    Finalizar
                  </Button>
                </div>
              </div>
              <Progress
                value={progress.percentage}
                className="h-3 bg-gray-200"
              />
            </div>

            <Separator />
          </div>
        )}

        {/* Compact Content - Scrollable Area */}
        <div className="flex-1 overflow-y-auto px-2 sm:px-3 py-2 sm:py-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {isLoading ? (
            <div className="flex items-center justify-center h-48 sm:h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-moria-orange mx-auto"></div>
                <p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-600">Carregando revisão...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {/* Compact Info Section */}
              <Card>
                <CardHeader className="pb-2 sm:pb-3">
                  <CardTitle className="text-sm sm:text-base">Informações da Revisão</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="mileage" className="text-xs sm:text-sm">Quilometragem</Label>
                      <Input
                        id="mileage"
                        type="number"
                        value={mileage}
                        onChange={(e) => setMileage(parseInt(e.target.value) || 0)}
                        placeholder="0"
                        min={0}
                        className="h-8 sm:h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor="generalNotes" className="text-xs sm:text-sm">Observações Gerais</Label>
                      <Textarea
                        id="generalNotes"
                        value={generalNotes}
                        onChange={(e) => setGeneralNotes(e.target.value)}
                        placeholder="Observações..."
                        rows={2}
                        className="text-sm resize-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="recommendations" className="text-xs sm:text-sm">Recomendações</Label>
                    <Textarea
                      id="recommendations"
                      value={recommendations}
                      onChange={(e) => setRecommendations(e.target.value)}
                      placeholder="Recomendações para o cliente..."
                      rows={2}
                      className="text-sm resize-none"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Checklist - Maximum Space */}
              <RevisionChecklist revisionItems={revisionItems} onUpdateItem={handleUpdateItem} />
            </div>
          )}
        </div>

        {/* Footer - Mobile: Icons only, Desktop: Full text */}
        <DialogFooter className="px-3 sm:px-4 py-2 sm:py-3 border-t bg-gray-50/50 flex-shrink-0">
          <div className="flex w-full gap-1.5 sm:gap-2">
            {/* Mobile: Icon buttons with tooltips */}
            <div className="flex sm:hidden w-full gap-1.5">
              <Button
                size="icon"
                variant="outline"
                onClick={() => handleSave('draft')}
                disabled={isSaving || isLoading}
                className="h-9 flex-1"
                title="Salvar Rascunho"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={() => handleSave('in_progress')}
                disabled={isSaving || isLoading}
                className="h-9 flex-1"
                title="Salvar em Andamento"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
              </Button>
              <Button
                size="icon"
                onClick={() => handleSave('completed')}
                className="h-9 flex-1 bg-green-600 hover:bg-green-700 text-white"
                disabled={progress.percentage < 100 || isSaving || isLoading}
                title="Finalizar Revisão"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              </Button>
            </div>

            {/* Desktop: Full text buttons */}
            <div className="hidden sm:flex w-full gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="h-9 text-sm"
              >
                Cancelar
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSave('draft')}
                disabled={isSaving || isLoading}
                className="h-9 text-sm"
              >
                {isSaving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <FileText className="h-4 w-4 mr-1.5" />}
                Salvar Rascunho
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSave('in_progress')}
                disabled={isSaving || isLoading}
                className="h-9 text-sm"
              >
                {isSaving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Clock className="h-4 w-4 mr-1.5" />}
                Em Andamento
              </Button>
              <Button
                onClick={() => handleSave('completed')}
                className="h-9 text-sm bg-green-600 hover:bg-green-700 text-white"
                disabled={progress.percentage < 100 || isSaving || isLoading}
              >
                {isSaving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1.5" />}
                Finalizar
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
