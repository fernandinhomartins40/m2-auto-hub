import { useState, useEffect } from 'react';
import { Calendar, Car, User, Filter, Eye, CheckCircle, Clock, XCircle, FileText } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Badge } from '../ui/badge';
import adminService, { AdminRevision } from '../../api/adminService';

export function RevisionsListContent() {
  const [revisions, setRevisions] = useState<AdminRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadRevisions();
  }, [page, statusFilter]);

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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      DRAFT: { color: 'bg-gray-100 text-gray-800', label: 'Rascunho', icon: FileText },
      IN_PROGRESS: { color: 'bg-blue-100 text-blue-800', label: 'Em Andamento', icon: Clock },
      COMPLETED: { color: 'bg-green-100 text-green-800', label: 'Concluída', icon: CheckCircle },
      CANCELLED: { color: 'bg-red-100 text-red-800', label: 'Cancelada', icon: XCircle },
    };

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
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const filteredRevisions = revisions.filter(revision => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      revision.customer?.name.toLowerCase().includes(search) ||
      revision.vehicle?.plate.toLowerCase().includes(search) ||
      revision.vehicle?.model.toLowerCase().includes(search) ||
      revision.vehicle?.brand.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando revisões...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Revisões Veiculares</h2>
          <p className="text-gray-600">Gerencie todas as revisões realizadas</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Input
                placeholder="Buscar por cliente, veículo ou placa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos os Status</option>
                <option value="DRAFT">Rascunho</option>
                <option value="IN_PROGRESS">Em Andamento</option>
                <option value="COMPLETED">Concluída</option>
                <option value="CANCELLED">Cancelada</option>
              </select>
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={loadRevisions}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Atualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revisions List */}
      <div className="grid gap-4">
        {filteredRevisions.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Car className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhuma revisão encontrada
                </h3>
                <p className="text-gray-600">
                  {searchTerm || statusFilter
                    ? 'Tente ajustar os filtros de busca'
                    : 'Não há revisões cadastradas no sistema'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredRevisions.map((revision) => (
            <Card key={revision.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    {/* Customer and Vehicle Info */}
                    <div className="flex items-start gap-6">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">Cliente</p>
                          <p className="font-medium">{revision.customer?.name || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">Veículo</p>
                          <p className="font-medium">
                            {revision.vehicle?.brand} {revision.vehicle?.model} {revision.vehicle?.year}
                          </p>
                          <p className="text-sm text-gray-600">Placa: {revision.vehicle?.plate}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">Data</p>
                          <p className="font-medium">{formatDate(revision.date)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="flex items-center gap-6 text-sm">
                      {revision.mileage && (
                        <div>
                          <span className="text-gray-600">Quilometragem: </span>
                          <span className="font-medium">{revision.mileage.toLocaleString('pt-BR')} km</span>
                        </div>
                      )}
                      {revision.completedAt && (
                        <div>
                          <span className="text-gray-600">Concluída em: </span>
                          <span className="font-medium">{formatDate(revision.completedAt)}</span>
                        </div>
                      )}
                    </div>

                    {/* Notes Preview */}
                    {revision.generalNotes && (
                      <div className="text-sm text-gray-600 line-clamp-2">
                        <span className="font-medium">Observações: </span>
                        {revision.generalNotes}
                      </div>
                    )}
                  </div>

                  {/* Status and Actions */}
                  <div className="flex flex-col items-end gap-3">
                    {getStatusBadge(revision.status)}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // TODO: Navigate to revision details
                        console.log('View revision:', revision.id);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Detalhes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Anterior
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              Página {page} de {totalPages}
            </span>
          </div>
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}
