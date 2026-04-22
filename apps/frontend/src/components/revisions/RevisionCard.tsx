import {
  Calendar,
  Car,
  User,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  UserCog,
  Edit,
  Trash2,
  Play,
  Circle,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { AdminRevision } from '../../api/adminService';

interface RevisionCardProps {
  revision: AdminRevision;
  onViewDetails?: (revision: AdminRevision) => void;
  onAssignMechanic?: (revision: AdminRevision) => void;
  onEditRevision?: (revision: AdminRevision) => void;
  onChangeStatus?: (revisionId: string, newStatus: string) => void;
  onDeleteRevision?: (revisionId: string) => void;
  // Controle de visibilidade das ações
  showAssignMechanic?: boolean;
  showDelete?: boolean;
  showMechanicInfo?: boolean;
}

const statusConfig = {
  DRAFT: { color: 'bg-gray-100 text-gray-800', label: 'Rascunho', icon: Circle },
  IN_PROGRESS: { color: 'bg-blue-100 text-blue-800', label: 'Em Andamento', icon: Clock },
  COMPLETED: { color: 'bg-green-100 text-green-800', label: 'Concluída', icon: CheckCircle },
  CANCELLED: { color: 'bg-red-100 text-red-800', label: 'Cancelada', icon: XCircle },
};

export function RevisionCard({
  revision,
  onViewDetails,
  onAssignMechanic,
  onEditRevision,
  onChangeStatus,
  onDeleteRevision,
  showAssignMechanic = true,
  showDelete = true,
  showMechanicInfo = true,
}: RevisionCardProps) {
  const getStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <Card className="hover:border-moria-orange transition-colors">
      <CardContent className="p-3 sm:p-4">
        {/* Mobile Layout */}
        <div className="block md:hidden space-y-3">
          {/* Header: Status + Date */}
          <div className="flex items-center justify-between gap-2">
            {getStatusBadge(revision.status)}
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(revision.date)}</span>
            </div>
          </div>

          {/* Customer Info */}
          <div className="flex items-start gap-2">
            <User className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">
                {revision.customer?.name || 'N/A'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {revision.customer?.phone || revision.customer?.email || ''}
              </p>
            </div>
          </div>

          {/* Vehicle Info */}
          <div className="flex items-start gap-2">
            <Car className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">
                {revision.vehicle?.brand} {revision.vehicle?.model}
              </p>
              <p className="text-xs text-gray-500 truncate">
                Placa: {revision.vehicle?.plate || 'N/A'}
              </p>
            </div>
          </div>

          {/* Mechanic Info */}
          {showMechanicInfo && (
            <div className="flex items-start gap-2">
              <UserCog className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                {revision.mechanicName ? (
                  <>
                    <p className="text-sm font-medium truncate">
                      {revision.mechanicName}
                    </p>
                    <p className="text-xs text-gray-500">Mecânico</p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">Não atribuído</p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1.5 pt-2 border-t flex-wrap">
            {/* View Details */}
            {onViewDetails && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails(revision)}
                className="flex-1 min-w-[80px] h-8 text-xs"
              >
                <Eye className="h-3 w-3 mr-1" />
                Ver
              </Button>
            )}

            {/* Assign Mechanic */}
            {showAssignMechanic && onAssignMechanic && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAssignMechanic(revision)}
                className="flex-1 min-w-[80px] h-8 text-xs"
              >
                <UserCog className="h-3 w-3 mr-1" />
                {revision.assignedMechanicId ? 'Trocar' : 'Atribuir'}
              </Button>
            )}

            {/* Edit/Continue (DRAFT or IN_PROGRESS) */}
            {(revision.status === 'DRAFT' || revision.status === 'IN_PROGRESS') && onEditRevision && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditRevision(revision)}
                className="flex-1 min-w-[80px] h-8 text-xs text-blue-600 hover:text-blue-700 hover:border-blue-600"
              >
                <Edit className="h-3 w-3 mr-1" />
                {revision.status === 'DRAFT' ? 'Editar' : 'Continuar'}
              </Button>
            )}

            {/* Start (only DRAFT) */}
            {revision.status === 'DRAFT' && onChangeStatus && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onChangeStatus(revision.id, 'IN_PROGRESS')}
                className="flex-1 min-w-[80px] h-8 text-xs text-blue-600 hover:text-blue-700 hover:border-blue-600"
              >
                <Play className="h-3 w-3 mr-1" />
                Iniciar
              </Button>
            )}

            {/* Complete (only IN_PROGRESS) */}
            {revision.status === 'IN_PROGRESS' && onChangeStatus && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onChangeStatus(revision.id, 'COMPLETED')}
                className="flex-1 min-w-[80px] h-8 text-xs text-green-600 hover:text-green-700 hover:border-green-600"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Concluir
              </Button>
            )}

            {/* Cancel (DRAFT or IN_PROGRESS) */}
            {(revision.status === 'DRAFT' || revision.status === 'IN_PROGRESS') && onChangeStatus && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onChangeStatus(revision.id, 'CANCELLED')}
                className="flex-1 min-w-[80px] h-8 text-xs text-orange-600 hover:text-orange-700 hover:border-orange-600"
              >
                <XCircle className="h-3 w-3 mr-1" />
                Cancelar
              </Button>
            )}

            {/* Delete */}
            {showDelete && onDeleteRevision && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDeleteRevision(revision.id)}
                className="flex-1 min-w-[80px] h-8 text-xs text-red-600 hover:text-red-700 hover:border-red-600"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Excluir
              </Button>
            )}
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:flex items-center justify-between gap-4">
          {/* Main Info */}
          <div className={`flex-1 grid grid-cols-1 ${showMechanicInfo ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
            {/* Customer */}
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {revision.customer?.name || 'N/A'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {revision.customer?.phone || revision.customer?.email || ''}
                </p>
              </div>
            </div>

            {/* Vehicle */}
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {revision.vehicle?.brand} {revision.vehicle?.model}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {revision.vehicle?.plate || 'N/A'}
                </p>
              </div>
            </div>

            {/* Mechanic (optional) */}
            {showMechanicInfo && (
              <div className="flex items-center gap-2">
                <UserCog className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div className="min-w-0">
                  {revision.mechanicName ? (
                    <>
                      <p className="text-sm font-medium truncate">
                        {revision.mechanicName}
                      </p>
                      <p className="text-xs text-gray-500">Mecânico</p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">Não atribuído</p>
                  )}
                </div>
              </div>
            )}

            {/* Date & Status */}
            <div className="flex items-center gap-3 justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-600">
                  {formatDate(revision.date)}
                </span>
              </div>
              {getStatusBadge(revision.status)}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* View Details */}
            {onViewDetails && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => onViewDetails(revision)}
                title="Ver detalhes"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}

            {/* Assign Mechanic */}
            {showAssignMechanic && onAssignMechanic && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => onAssignMechanic(revision)}
                title={revision.assignedMechanicId ? 'Trocar mecânico' : 'Atribuir mecânico'}
              >
                <UserCog className="h-4 w-4" />
              </Button>
            )}

            {/* Edit/Continue (DRAFT or IN_PROGRESS) */}
            {(revision.status === 'DRAFT' || revision.status === 'IN_PROGRESS') && onEditRevision && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => onEditRevision(revision)}
                title={revision.status === 'DRAFT' ? 'Editar rascunho' : 'Continuar revisão'}
                className="text-blue-600 hover:text-blue-700 hover:border-blue-600"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}

            {/* Start (only DRAFT) */}
            {revision.status === 'DRAFT' && onChangeStatus && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => onChangeStatus(revision.id, 'IN_PROGRESS')}
                title="Iniciar revisão"
                className="text-blue-600 hover:text-blue-700 hover:border-blue-600"
              >
                <Play className="h-4 w-4" />
              </Button>
            )}

            {/* Complete (only IN_PROGRESS) */}
            {revision.status === 'IN_PROGRESS' && onChangeStatus && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => onChangeStatus(revision.id, 'COMPLETED')}
                title="Concluir revisão"
                className="text-green-600 hover:text-green-700 hover:border-green-600"
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
            )}

            {/* Cancel (DRAFT or IN_PROGRESS) */}
            {(revision.status === 'DRAFT' || revision.status === 'IN_PROGRESS') && onChangeStatus && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => onChangeStatus(revision.id, 'CANCELLED')}
                title="Cancelar revisão"
                className="text-orange-600 hover:text-orange-700 hover:border-orange-600"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            )}

            {/* Delete */}
            {showDelete && onDeleteRevision && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => onDeleteRevision(revision.id)}
                title="Excluir revisão"
                className="text-red-600 hover:text-red-700 hover:border-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
