import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  UserCog,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRightLeft,
  User,
} from 'lucide-react';
import revisionService from '../../api/revisionService';
import apiClient from '../../api/apiClient';

interface Mechanic {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  workload?: {
    total: number;
    active: number;
    byStatus: {
      draft: number;
      inProgress: number;
      completed: number;
      cancelled: number;
    };
  };
}

interface MechanicAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  revisionId: string | null;
  currentMechanicId?: string | null;
  currentMechanicName?: string | null;
  onSuccess?: () => void;
}

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MANAGER: 'Gerente',
  STAFF: 'Mecânico',
};

export function MechanicAssignmentModal({
  isOpen,
  onClose,
  revisionId,
  currentMechanicId,
  currentMechanicName,
  onSuccess,
}: MechanicAssignmentModalProps) {
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMechanicId, setSelectedMechanicId] = useState<string | null>(null);
  const [transferReason, setTransferReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isTransfer = !!currentMechanicId;

  useEffect(() => {
    if (isOpen) {
      loadMechanics();
    }
  }, [isOpen]);

  const loadMechanics = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load mechanics with workload
      const workloadResponse = await revisionService.getMechanicsWorkload();
      setMechanics(workloadResponse);
    } catch (err: any) {
      console.error('Error loading mechanics:', err);
      setError('Erro ao carregar mecânicos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedMechanicId || !revisionId) return;

    setSubmitting(true);
    setError(null);

    try {
      if (isTransfer) {
        await revisionService.transferMechanic(
          revisionId,
          selectedMechanicId,
          transferReason || undefined
        );
      } else {
        await revisionService.assignMechanic(revisionId, selectedMechanicId);
      }

      onSuccess?.();
      handleClose();
    } catch (err: any) {
      console.error('Error assigning/transferring mechanic:', err);
      setError(
        err.response?.data?.message ||
          `Erro ao ${isTransfer ? 'transferir' : 'atribuir'} mecânico. Tente novamente.`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedMechanicId(null);
    setTransferReason('');
    setSearchTerm('');
    setError(null);
    onClose();
  };

  const filteredMechanics = mechanics.filter((mechanic) => {
    const search = searchTerm.toLowerCase();
    return (
      mechanic.name.toLowerCase().includes(search) ||
      mechanic.email.toLowerCase().includes(search) ||
      roleLabels[mechanic.role]?.toLowerCase().includes(search)
    );
  });

  const selectedMechanic = mechanics.find((m) => m.id === selectedMechanicId);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl w-[calc(100%-2rem)] sm:w-[calc(100%-4rem)] max-h-[calc(100vh-8rem)] sm:max-h-[calc(100vh-4rem)] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-3">
            {isTransfer ? (
              <>
                <ArrowRightLeft className="h-6 w-6 text-moria-orange" />
                Transferir Revisão
              </>
            ) : (
              <>
                <UserCog className="h-6 w-6 text-moria-orange" />
                Atribuir Mecânico
              </>
            )}
          </DialogTitle>
          {isTransfer && currentMechanicName && (
            <p className="text-sm text-gray-600">
              Mecânico atual: <span className="font-medium">{currentMechanicName}</span>
            </p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, email ou cargo..."
              className="pl-10"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-moria-orange" />
            </div>
          ) : (
            <>
              {/* Mechanics List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredMechanics.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum mecânico encontrado</p>
                  </div>
                ) : (
                  filteredMechanics.map((mechanic) => {
                    const isCurrentMechanic = mechanic.id === currentMechanicId;
                    const isSelected = mechanic.id === selectedMechanicId;
                    const isActive = mechanic.status === 'ACTIVE';

                    return (
                      <Card
                        key={mechanic.id}
                        className={`cursor-pointer transition-all ${
                          isSelected
                            ? 'border-2 border-moria-orange bg-moria-orange/5'
                            : 'hover:border-moria-orange/50'
                        } ${isCurrentMechanic ? 'opacity-50 cursor-not-allowed' : ''} ${
                          !isActive ? 'opacity-60' : ''
                        }`}
                        onClick={() => {
                          if (!isCurrentMechanic && isActive) {
                            setSelectedMechanicId(mechanic.id);
                          }
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-lg">{mechanic.name}</p>
                                {isCurrentMechanic && (
                                  <Badge variant="outline" className="text-xs">
                                    Atual
                                  </Badge>
                                )}
                                {!isActive && (
                                  <Badge variant="outline" className="text-xs bg-gray-100">
                                    Inativo
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{mechanic.email}</p>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {roleLabels[mechanic.role] || mechanic.role}
                                </Badge>
                              </div>
                            </div>

                            {/* Workload */}
                            {mechanic.workload && (
                              <div className="flex flex-col items-end gap-1">
                                <div className="text-right">
                                  <p className="text-2xl font-bold text-moria-orange">
                                    {mechanic.workload.active}
                                  </p>
                                  <p className="text-xs text-gray-500">Ativas</p>
                                </div>
                                <div className="flex gap-2 text-xs text-gray-500">
                                  <span
                                    className="text-green-600"
                                    title="Concluídas"
                                  >
                                    ✓ {mechanic.workload.byStatus.completed}
                                  </span>
                                  <span
                                    className="text-blue-600"
                                    title="Em andamento"
                                  >
                                    ⟳ {mechanic.workload.byStatus.inProgress}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>

              {/* Transfer Reason (only for transfers) */}
              {isTransfer && selectedMechanicId && (
                <div className="space-y-2 pt-4 border-t">
                  <Label htmlFor="reason">Motivo da Transferência (opcional)</Label>
                  <Textarea
                    id="reason"
                    value={transferReason}
                    onChange={(e) => setTransferReason(e.target.value)}
                    placeholder="Ex: Sobrecarga de trabalho, especialização necessária, etc."
                    rows={3}
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500">{transferReason.length}/500 caracteres</p>
                </div>
              )}

              {/* Selected Mechanic Summary */}
              {selectedMechanic && (
                <div className="p-4 bg-moria-orange/10 border-2 border-moria-orange rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-moria-orange" />
                    <p className="font-semibold">
                      {isTransfer ? 'Novo mecânico selecionado' : 'Mecânico selecionado'}
                    </p>
                  </div>
                  <p className="text-sm text-gray-700">{selectedMechanic.name}</p>
                  <p className="text-xs text-gray-600">{selectedMechanic.email}</p>
                  {selectedMechanic.workload && (
                    <p className="text-xs text-gray-600 mt-1">
                      Carga atual: {selectedMechanic.workload.active} revisões ativas
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedMechanicId || submitting}
            className="bg-moria-orange hover:bg-moria-orange/90"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isTransfer ? 'Transferindo...' : 'Atribuindo...'}
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {isTransfer ? 'Transferir' : 'Atribuir'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
