import { useState, useEffect } from 'react';
import {
  Filter,
  FileText,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import adminService, { AdminRevision } from '../../api/adminService';
import revisionService from '../../api/revisionService';
import { RevisionDetailsModal } from './RevisionDetailsModal';
import { MechanicAssignmentModal } from './MechanicAssignmentModal';
import { RevisionEditModal } from './RevisionEditModal';
import { RevisionCard } from '../revisions/RevisionCard';

export function RevisionsListContent() {
  const [revisions, setRevisions] = useState<AdminRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [mechanicFilter, setMechanicFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [selectedRevision, setSelectedRevision] = useState<AdminRevision | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [mechanicModalOpen, setMechanicModalOpen] = useState(false);
  const [mechanicModalRevisionId, setMechanicModalRevisionId] = useState<string | null>(null);
  const [mechanicModalCurrentMechanicId, setMechanicModalCurrentMechanicId] = useState<
    string | null
  >(null);
  const [mechanicModalCurrentMechanicName, setMechanicModalCurrentMechanicName] = useState<
    string | null
  >(null);

  useEffect(() => {
    loadRevisions();
  }, [page, statusFilter, mechanicFilter]);

  const loadRevisions = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 20 };

      if (statusFilter) {
        params.status = statusFilter;
      }

      const response = await adminService.getRevisions(params);
      setRevisions(response.data);
      setTotalPages(response.meta?.totalPages || 1);
    } catch (error) {
      console.error('Error loading revisions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (revision: AdminRevision) => {
    setSelectedRevision(revision);
    setDetailsModalOpen(true);
  };

  const handleAssignMechanic = (revision: AdminRevision) => {
    setMechanicModalRevisionId(revision.id);
    setMechanicModalCurrentMechanicId(revision.assignedMechanicId);
    setMechanicModalCurrentMechanicName(revision.mechanicName);
    setMechanicModalOpen(true);
  };

  const handleEditRevision = (revision: AdminRevision) => {
    setSelectedRevision(revision);
    setEditModalOpen(true);
  };

  const handleChangeStatus = async (revisionId: string, newStatus: string) => {
    try {
      if (newStatus === 'IN_PROGRESS') {
        await revisionService.startRevision(revisionId);
      } else if (newStatus === 'COMPLETED') {
        await revisionService.completeRevision(revisionId);
      } else if (newStatus === 'CANCELLED') {
        await revisionService.cancelRevision(revisionId);
      }
      loadRevisions();
    } catch (error) {
      console.error('Error changing status:', error);
      alert('Erro ao mudar status. Tente novamente.');
    }
  };

  const handleDeleteRevision = async (revisionId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta revisão? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      await revisionService.deleteRevision(revisionId);
      loadRevisions();
    } catch (error) {
      console.error('Error deleting revision:', error);
      alert('Erro ao excluir revisão. Tente novamente.');
    }
  };

  const filteredRevisions = revisions.filter((revision) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      revision.customer?.name.toLowerCase().includes(search) ||
      revision.vehicle?.plate.toLowerCase().includes(search) ||
      revision.vehicle?.model.toLowerCase().includes(search) ||
      revision.vehicle?.brand.toLowerCase().includes(search) ||
      revision.mechanicName?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-moria-orange mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando revisões...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="sm:col-span-2 md:col-span-1">
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-9 text-sm"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full h-9 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-moria-orange"
              >
                <option value="">Todos os status</option>
                <option value="DRAFT">Rascunho</option>
                <option value="IN_PROGRESS">Em Andamento</option>
                <option value="COMPLETED">Concluída</option>
                <option value="CANCELLED">Cancelada</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revisions List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">
            Revisões ({filteredRevisions.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          {filteredRevisions.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <FileText className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-gray-400 mb-3 sm:mb-4" />
              <p className="text-sm sm:text-base text-gray-600">Nenhuma revisão encontrada</p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {filteredRevisions.map((revision) => (
                <RevisionCard
                  key={revision.id}
                  revision={revision}
                  onViewDetails={handleViewDetails}
                  onAssignMechanic={handleAssignMechanic}
                  onEditRevision={handleEditRevision}
                  onChangeStatus={handleChangeStatus}
                  onDeleteRevision={handleDeleteRevision}
                  showAssignMechanic={true}
                  showDelete={true}
                  showMechanicInfo={true}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4 sm:mt-6 pb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-8 px-3 text-xs sm:text-sm"
              >
                Anterior
              </Button>
              <span className="text-xs sm:text-sm text-gray-600 px-2">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-8 px-3 text-xs sm:text-sm"
              >
                Próxima
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <RevisionDetailsModal
        revision={selectedRevision}
        isOpen={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedRevision(null);
        }}
        onAssignMechanic={(revisionId) => {
          const revision = revisions.find((r) => r.id === revisionId);
          if (revision) {
            handleAssignMechanic(revision);
          }
        }}
        onChangeStatus={handleChangeStatus}
      />

      <RevisionEditModal
        revision={selectedRevision}
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedRevision(null);
        }}
        onSuccess={() => {
          loadRevisions();
          setEditModalOpen(false);
          setSelectedRevision(null);
        }}
      />

      <MechanicAssignmentModal
        isOpen={mechanicModalOpen}
        onClose={() => {
          setMechanicModalOpen(false);
          setMechanicModalRevisionId(null);
          setMechanicModalCurrentMechanicId(null);
          setMechanicModalCurrentMechanicName(null);
        }}
        revisionId={mechanicModalRevisionId}
        currentMechanicId={mechanicModalCurrentMechanicId}
        currentMechanicName={mechanicModalCurrentMechanicName}
        onSuccess={() => {
          loadRevisions();
        }}
      />
    </div>
  );
}
