import { useState } from 'react';
import { AlertCircle, FileText, Loader2, Save, ScanLine } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { CustomerSelector } from '../revisions/CustomerSelector';
import { RevisionVehicleLookupDialog } from '../revisions/RevisionVehicleLookupDialog';
import { VehicleSelector } from '../revisions/VehicleSelector';
import { RevisionChecklist } from '../revisions/RevisionChecklist';
import { ChecklistManager } from '../revisions/ChecklistManager';
import { useRevisions } from '../../contexts/RevisionsContext';
import { Customer, ItemStatus, RevisionChecklistItem, Vehicle } from '../../types/revisions';
import revisionService from '../../api/revisionService';
import { useToast } from '../../hooks/use-toast';

export function RevisionsContent() {
  const { categories } = useRevisions();
  const { toast } = useToast();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [currentRevisionId, setCurrentRevisionId] = useState<string | null>(null);
  const [mileage, setMileage] = useState<number>(0);
  const [generalNotes, setGeneralNotes] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [revisionItems, setRevisionItems] = useState<RevisionChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLookupDialogOpen, setIsLookupDialogOpen] = useState(false);

  const buildInitialRevisionItems = () => {
    const items: RevisionChecklistItem[] = [];

    categories.forEach((category) => {
      if (!category.isEnabled) {
        return;
      }

      category.items.forEach((item) => {
        if (!item.isEnabled) {
          return;
        }

        items.push({
          itemId: item.id,
          status: ItemStatus.NOT_CHECKED,
        });
      });
    });

    return items;
  };

  const serializeChecklistItems = (items: RevisionChecklistItem[]) => {
    return items.map((item) => {
      const categoryData = categories.find((category) =>
        category.items.some((categoryItem) => categoryItem.id === item.itemId)
      );
      const itemData = categoryData?.items.find((categoryItem) => categoryItem.id === item.itemId);

      const checkItem: any = {
        categoryId: categoryData?.id || '',
        categoryName: categoryData?.name || '',
        itemId: item.itemId,
        itemName: itemData?.name || '',
        status: item.status,
      };

      if (item.notes) {
        checkItem.notes = item.notes;
      }

      if (item.photos && item.photos.length > 0) {
        checkItem.photos = item.photos;
      }

      return checkItem;
    });
  };

  const startDraftRevision = async (customer: Customer, vehicle: Vehicle) => {
    const items = buildInitialRevisionItems();

    setSelectedCustomer(customer);
    setSelectedVehicle(vehicle);
    setMileage(vehicle.mileage || 0);
    setGeneralNotes('');
    setRecommendations('');
    setRevisionItems(items);
    setCurrentRevisionId(null);
    setIsLoading(true);

    try {
      const payload: any = {
        customerId: customer.id,
        vehicleId: vehicle.id,
        date: new Date().toISOString(),
        checklistItems: serializeChecklistItems(items),
      };

      if (vehicle.mileage) {
        payload.mileage = vehicle.mileage;
      }

      const revision = await revisionService.createRevision(payload);
      setCurrentRevisionId(revision.id);

      toast({
        title: 'Revisão criada',
        description: 'Revisão criada com sucesso. Preencha o checklist.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao criar revisão',
        description: error.response?.data?.message || 'Erro ao criar revisão. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectVehicle = async (vehicle: Vehicle) => {
    if (!selectedCustomer) {
      return;
    }

    await startDraftRevision(selectedCustomer, vehicle);
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSelectedVehicle(null);
    setMileage(0);
    setGeneralNotes('');
    setRecommendations('');
    setRevisionItems([]);
    setCurrentRevisionId(null);
  };

  const handleLookupResolved = async (payload: {
    customer: {
      id: string;
      name: string;
      email: string;
      phone: string;
      cpf?: string;
    };
    vehicle: {
      id: string;
      brand: string;
      model: string;
      year: number;
      plate: string;
      color?: string;
      mileage?: number;
    };
  }) => {
    const resolvedCustomer: Customer = {
      id: payload.customer.id,
      name: payload.customer.name,
      email: payload.customer.email,
      phone: payload.customer.phone,
      cpf: payload.customer.cpf,
      createdAt: new Date(),
    };

    const resolvedVehicle: Vehicle = {
      id: payload.vehicle.id,
      customerId: payload.customer.id,
      brand: payload.vehicle.brand,
      model: payload.vehicle.model,
      year: payload.vehicle.year,
      plate: payload.vehicle.plate,
      color: payload.vehicle.color,
      mileage: payload.vehicle.mileage,
      createdAt: new Date(),
    };

    await startDraftRevision(resolvedCustomer, resolvedVehicle);
    setIsLookupDialogOpen(false);
  };

  const handleUpdateItem = async (itemId: string, updates: Partial<RevisionChecklistItem>) => {
    setRevisionItems((previousItems) => {
      const existingIndex = previousItems.findIndex((item) => item.itemId === itemId);

      if (existingIndex >= 0) {
        const nextItems = [...previousItems];
        nextItems[existingIndex] = { ...nextItems[existingIndex], ...updates };
        return nextItems;
      }

      return [...previousItems, { itemId, status: ItemStatus.NOT_CHECKED, ...updates }];
    });

    if (currentRevisionId) {
      try {
        const existingIndex = revisionItems.findIndex((item) => item.itemId === itemId);
        const updatedItems =
          existingIndex >= 0
            ? revisionItems.map((item, index) =>
                index === existingIndex ? { ...item, ...updates } : item
              )
            : [...revisionItems, { itemId, status: ItemStatus.NOT_CHECKED, ...updates }];

        await revisionService.updateRevision(currentRevisionId, {
          checklistItems: serializeChecklistItems(updatedItems),
        });
      } catch {
        // Silent fail for auto-save.
      }
    }
  };

  const handleSave = async (status: 'draft' | 'in_progress' | 'completed') => {
    if (!currentRevisionId) {
      toast({
        title: 'Erro',
        description: 'Nenhuma revisão em andamento',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const backendStatus =
        status === 'draft' ? 'DRAFT' : status === 'in_progress' ? 'IN_PROGRESS' : 'COMPLETED';

      const updatePayload: any = {
        status: backendStatus,
        checklistItems: serializeChecklistItems(revisionItems),
      };

      if (mileage) {
        updatePayload.mileage = mileage;
      }

      if (generalNotes) {
        updatePayload.generalNotes = generalNotes;
      }

      if (recommendations) {
        updatePayload.recommendations = recommendations;
      }

      await revisionService.updateRevision(currentRevisionId, updatePayload);

      toast({
        title: status === 'completed' ? 'Revisão finalizada!' : 'Revisão salva!',
        description:
          status === 'completed'
            ? 'Revisão finalizada com sucesso!'
            : 'Revisão salva com sucesso!',
      });

      if (status === 'completed') {
        setSelectedCustomer(null);
        setSelectedVehicle(null);
        setMileage(0);
        setGeneralNotes('');
        setRecommendations('');
        setRevisionItems([]);
        setCurrentRevisionId(null);
      }
    } catch (error: any) {
      console.error('Erro ao salvar revisão:', error);
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
  const canStartRevision = Boolean(selectedCustomer && selectedVehicle);

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div>
          <h2 className="text-lg font-bold sm:text-xl">Nova Revisão</h2>
          <p className="hidden text-xs text-gray-600 sm:block sm:text-sm">
            Preencha o checklist de revisão veicular
          </p>
        </div>
        <ChecklistManager />
      </div>

      <Card className="border-moria-orange/30 bg-moria-orange/5">
        <CardContent className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold sm:text-base">
              <ScanLine className="h-4 w-4 text-moria-orange sm:h-5 sm:w-5" />
              Iniciar por placa ou NFC
            </div>
            <p className="text-xs text-gray-600 sm:text-sm">
              No PWA mobile, a câmera é o fluxo principal para identificar a placa. NFC fica como alternativa para veículos com tag.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => setIsLookupDialogOpen(true)}
            className="w-full bg-moria-orange hover:bg-moria-orange/90 sm:w-auto"
          >
            <ScanLine className="h-4 w-4" />
            Ler placa / NFC
          </Button>
        </CardContent>
      </Card>

      {canStartRevision && progress.total > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 flex-shrink-0 text-blue-600" />
              <span className="text-xs font-medium sm:text-sm">
                {progress.checked}/{progress.total} ({progress.percentage}%)
              </span>
            </div>
            <div className="flex gap-1.5 sm:gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSave('draft')}
                disabled={isSaving}
                className="h-8 flex-1 px-2 text-xs sm:flex-none sm:px-3"
              >
                {isSaving ? <Loader2 className="h-3 w-3 animate-spin sm:mr-1" /> : null}
                <span className="hidden sm:inline">Rascunho</span>
                <span className="sm:hidden">Rasc.</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSave('in_progress')}
                disabled={isSaving}
                className="h-8 flex-1 px-2 text-xs sm:flex-none sm:px-3"
              >
                {isSaving ? <Loader2 className="h-3 w-3 animate-spin sm:mr-1" /> : null}
                <span className="hidden sm:inline">Em Andamento</span>
                <span className="sm:hidden">Andam.</span>
              </Button>
              <Button
                size="sm"
                onClick={() => handleSave('completed')}
                className="h-8 flex-1 bg-green-600 px-2 text-xs text-white hover:bg-green-700 sm:flex-none sm:px-3"
                disabled={progress.percentage < 100 || isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-3 w-3 animate-spin sm:mr-1" />
                ) : (
                  <Save className="h-3 w-3 sm:mr-1" />
                )}
                <span className="hidden sm:inline">Finalizar</span>
                <span className="sm:hidden">Fim</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
        <CustomerSelector
          selectedCustomer={selectedCustomer}
          onSelectCustomer={handleSelectCustomer}
        />
        <VehicleSelector
          customerId={selectedCustomer?.id || null}
          selectedVehicle={selectedVehicle}
          onSelectVehicle={handleSelectVehicle}
        />
      </div>

      {canStartRevision && (
        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base">Informações da Revisão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-3 sm:space-y-4 sm:px-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="mileage" className="text-xs sm:text-sm">
                  Quilometragem
                </Label>
                <Input
                  id="mileage"
                  type="number"
                  value={mileage}
                  onChange={(event) => setMileage(parseInt(event.target.value, 10) || 0)}
                  placeholder="0"
                  min={0}
                  className="h-8 text-sm sm:h-9"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="generalNotes" className="text-xs sm:text-sm">
                  Observações Gerais
                </Label>
                <Textarea
                  id="generalNotes"
                  value={generalNotes}
                  onChange={(event) => setGeneralNotes(event.target.value)}
                  placeholder="Observações..."
                  rows={2}
                  className="resize-none text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="recommendations" className="text-xs sm:text-sm">
                Recomendações
              </Label>
              <Textarea
                id="recommendations"
                value={recommendations}
                onChange={(event) => setRecommendations(event.target.value)}
                placeholder="Recomendações para o cliente..."
                rows={2}
                className="resize-none text-sm"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {canStartRevision ? (
        <RevisionChecklist revisionItems={revisionItems} onUpdateItem={handleUpdateItem} />
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Selecione um cliente e um veículo para iniciar o checklist de revisão.
          </AlertDescription>
        </Alert>
      )}

      {canStartRevision && progress.total > 0 && (
        <div className="sticky bottom-2 flex flex-col gap-2 rounded-lg border bg-white px-3 py-2 shadow-lg sm:bottom-4 sm:flex-row sm:justify-end sm:p-3">
          <Button
            variant="outline"
            onClick={() => handleSave('draft')}
            disabled={isSaving}
            className="h-9 text-sm"
          >
            {isSaving ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin sm:mr-2 sm:h-4 sm:w-4" /> : null}
            <span className="hidden sm:inline">Salvar Rascunho</span>
            <span className="sm:hidden">Rascunho</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSave('in_progress')}
            disabled={isSaving}
            className="h-9 text-sm"
          >
            {isSaving ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin sm:mr-2 sm:h-4 sm:w-4" /> : null}
            <span className="hidden sm:inline">Salvar em Andamento</span>
            <span className="sm:hidden">Em Andamento</span>
          </Button>
          <Button
            onClick={() => handleSave('completed')}
            className="h-9 bg-green-600 text-sm text-white hover:bg-green-700"
            disabled={progress.percentage < 100 || isSaving}
          >
            {isSaving ? (
              <Loader2 className="mr-1.5 h-3 w-3 animate-spin sm:mr-2 sm:h-4 sm:w-4" />
            ) : (
              <Save className="mr-1.5 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
            )}
            Finalizar Revisão
          </Button>
        </div>
      )}

      <RevisionVehicleLookupDialog
        isOpen={isLookupDialogOpen}
        onClose={() => setIsLookupDialogOpen(false)}
        onResolved={handleLookupResolved}
      />
    </div>
  );
}
