import { useMemo } from 'react';
import { useRevisions } from '../../contexts/RevisionsContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Car,
  Calendar,
  Gauge,
  User,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MinusCircle,
  Circle,
  FileText
} from 'lucide-react';
import { Revision, ItemStatus } from '../../types/revisions';

interface RevisionDetailsDialogProps {
  revision: Revision;
  isOpen: boolean;
  onClose: () => void;
}

const statusConfig = {
  [ItemStatus.NOT_CHECKED]: {
    icon: Circle,
    label: 'Não verificado',
    color: 'text-gray-400',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-300'
  },
  [ItemStatus.OK]: {
    icon: CheckCircle2,
    label: 'OK',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300'
  },
  [ItemStatus.ATTENTION]: {
    icon: AlertTriangle,
    label: 'Atenção',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300'
  },
  [ItemStatus.CRITICAL]: {
    icon: XCircle,
    label: 'Crítico',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300'
  },
  [ItemStatus.NOT_APPLICABLE]: {
    icon: MinusCircle,
    label: 'Não se aplica',
    color: 'text-gray-500',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-300'
  }
};

export function RevisionDetailsDialog({ revision, isOpen, onClose }: RevisionDetailsDialogProps) {
  const { getVehicle, categories } = useRevisions();
  const vehicle = getVehicle(revision.vehicleId);

  // Organize items by category
  const itemsByCategory = useMemo(() => {
    const organized: Record<string, Array<{
      itemId: string;
      itemName: string;
      itemDescription?: string;
      status: ItemStatus;
      notes?: string;
      checkedAt?: Date;
    }>> = {};

    revision.checklistItems.forEach(checkItem => {
      for (const category of categories) {
        const item = category.items.find(i => i.id === checkItem.itemId);
        if (item) {
          if (!organized[category.name]) {
            organized[category.name] = [];
          }
          organized[category.name].push({
            itemId: item.id,
            itemName: item.name,
            itemDescription: item.description,
            status: checkItem.status,
            notes: checkItem.notes,
            checkedAt: checkItem.checkedAt
          });
          break;
        }
      }
    });

    return organized;
  }, [revision, categories]);

  const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!vehicle) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <FileText className="h-6 w-6 text-moria-orange" />
            Detalhes da Revisão
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <div className="space-y-6">
            {/* Vehicle Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-moria-orange" />
                  Informações do Veículo
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Veículo</p>
                  <p className="font-semibold">{vehicle.brand} {vehicle.model}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ano</p>
                  <p className="font-semibold">{vehicle.year}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Placa</p>
                  <p className="font-semibold">{vehicle.plate}</p>
                </div>
                {vehicle.color && (
                  <div>
                    <p className="text-sm text-muted-foreground">Cor</p>
                    <p className="font-semibold">{vehicle.color}</p>
                  </div>
                )}
                {revision.mileage && (
                  <div>
                    <p className="text-sm text-muted-foreground">Quilometragem</p>
                    <p className="font-semibold flex items-center gap-1">
                      <Gauge className="h-4 w-4" />
                      {revision.mileage.toLocaleString()} km
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Data da Revisão</p>
                  <p className="font-semibold flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(revision.date)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* General Notes */}
            {revision.generalNotes && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5" />
                    Observações Gerais
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{revision.generalNotes}</p>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {revision.recommendations && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg text-blue-900">
                    <AlertTriangle className="h-5 w-5" />
                    Recomendações
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap text-blue-900">
                    {revision.recommendations}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Checklist by Category */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Checklist Detalhado</h3>
              {Object.entries(itemsByCategory).map(([categoryName, items]) => {
                const categoryIcon = categories.find(c => c.name === categoryName)?.icon || '🔧';

                return (
                  <Card key={categoryName}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <span className="text-2xl">{categoryIcon}</span>
                        {categoryName}
                        <Badge variant="secondary" className="ml-auto">
                          {items.length} {items.length === 1 ? 'item' : 'itens'}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {items.map((item, idx) => {
                          const config = statusConfig[item.status];
                          const StatusIcon = config.icon;

                          return (
                            <div
                              key={item.itemId}
                              className={`p-3 rounded-lg border-2 ${config.borderColor} ${config.bgColor}`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <StatusIcon className={`h-5 w-5 ${config.color}`} />
                                    <p className="font-semibold">{item.itemName}</p>
                                  </div>
                                  {item.itemDescription && (
                                    <p className="text-sm text-muted-foreground mb-2">
                                      {item.itemDescription}
                                    </p>
                                  )}
                                  {item.notes && (
                                    <div className="mt-2 p-2 bg-white rounded border">
                                      <p className="text-sm font-medium mb-1">Observações:</p>
                                      <p className="text-sm text-gray-700">{item.notes}</p>
                                    </div>
                                  )}
                                  {item.checkedAt && (
                                    <p className="text-xs text-muted-foreground mt-2">
                                      Verificado em: {formatDate(item.checkedAt)}
                                    </p>
                                  )}
                                </div>
                                <Badge className={config.bgColor}>
                                  <span className={config.color}>{config.label}</span>
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Footer Info */}
            <Card className="bg-gray-50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Revisão ID: {revision.id}</span>
                  {revision.completedAt && (
                    <span>Concluída em: {formatDate(revision.completedAt)}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
