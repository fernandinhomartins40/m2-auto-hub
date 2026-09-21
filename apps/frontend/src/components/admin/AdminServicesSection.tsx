import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { AdminPageHeader } from './AdminPageHeader';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  Wrench,
  Search,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  DollarSign,
  Clock,
  ToggleLeft,
  ToggleRight,
  Loader2
} from 'lucide-react';
import { useAdminServices } from '../../hooks/useAdminServices.js';
import serviceService, { type ServiceCategoryResponse } from '@/api/serviceService';
import { ServiceModal } from './ServiceModal';
import { ServiceCategoriesModal } from './ServiceCategoriesModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { formatCurrency as formatPrice } from '@/lib/format';

interface ServiceWithStatus {
  id: string;
  name: string;
  description: string;
  category: string;
  estimatedTime: string;
  basePrice?: number;
  specifications?: Record<string, any>;
  isActive: boolean;
  status?: string;
  slug?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AdminServicesSectionProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
}

export function AdminServicesSection({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter
}: AdminServicesSectionProps) {
  const {
    services,
    loading,
    error,
    createLoading,
    updateLoading,
    deleteLoading,
    fetchServices,
    createService,
    updateService,
    deleteService,
    toggleServiceStatus
  } = useAdminServices();

  // Estados do modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingService, setEditingService] = useState<ServiceWithStatus | null>(null);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [categories, setCategories] = useState<ServiceCategoryResponse[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);

  // Estados do dialog de confirmação
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; serviceId: string | null; serviceName: string }>({
    open: false,
    serviceId: null,
    serviceName: ''
  });

  const categoryNames = useMemo(
    () => categories.map((category) => category.name).filter(Boolean),
    [categories]
  );

  const loadCategories = async () => {
    setCategoriesLoading(true);

    try {
      const response = await serviceService.getAdminCategories();
      setCategories(response || []);
    } catch (error) {
      console.error('[AdminServicesSection] Erro ao carregar categorias de serviços:', error);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const refreshServicesView = async () => {
    await Promise.all([fetchServices(), loadCategories()]);
  };

  useEffect(() => {
    void loadCategories();
  }, []);

  // Filtrar serviços
  const filteredServices = useMemo(() => {
    let filtered = services.map(service => ({
      ...service,
      isActive: service.status === 'ACTIVE'
    }));

    // Filtro por termo de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(service =>
        service.name?.toLowerCase().includes(term) ||
        service.category?.toLowerCase().includes(term) ||
        service.description?.toLowerCase().includes(term)
      );
    }

    // Filtro por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(service => {
        switch (statusFilter) {
          case 'active':
            return service.isActive;
          case 'inactive':
            return !service.isActive;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [services, searchTerm, statusFilter]);

  // Handlers
  const handleOpenCreateModal = () => {
    setEditingService(null);
    setEditingServiceId(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (service: ServiceWithStatus) => {
    setEditingService(service);
    setEditingServiceId(service.id);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingService(null);
    setEditingServiceId(null);
  };

  const handleSaveService = async (serviceData: any) => {
    try {
      if (editingService && editingService.id) {
        await updateService(editingService.id, serviceData);
      } else {
        await createService(serviceData);
      }

      await refreshServicesView();
    } catch (error) {
      console.error('[AdminServicesSection] Erro ao salvar serviço:', error);
      throw error;
    }
  };

  const handleToggleStatus = async (serviceId: string, currentStatus: boolean) => {
    try {
      await toggleServiceStatus(serviceId, currentStatus);
    } catch (error) {
      console.error('[AdminServicesSection] Erro ao alterar status do serviço:', error);
    }
  };

  const handleDeleteClick = (service: ServiceWithStatus) => {
    setDeleteDialog({
      open: true,
      serviceId: service.id,
      serviceName: service.name
    });
  };

  const handleConfirmDelete = async () => {
    if (deleteDialog.serviceId) {
      try {
        await deleteService(deleteDialog.serviceId);
        setDeleteDialog({ open: false, serviceId: null, serviceName: '' });
      } catch (error) {
        console.error('[AdminServicesSection] Erro ao excluir serviço:', error);
      }
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialog({ open: false, serviceId: null, serviceName: '' });
  };

  // Helper functions

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <AdminPageHeader
            icon={Wrench}
            title="Gerenciar Serviços"
            description="Controle os servicos oferecidos pela sua oficina."
            actions={
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    void refreshServicesView();
                  }}
                  disabled={loading || categoriesLoading}
                  className="w-full gap-2 sm:w-auto"
                >
                  <RefreshCw className={`h-4 w-4 ${(loading || categoriesLoading) ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCategoriesModalOpen(true)}
                  disabled={categoriesLoading}
                  className="w-full gap-2 sm:w-auto"
                >
                  {categoriesLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wrench className="h-4 w-4" />
                  )}
                  Categorias
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleOpenCreateModal}
                  disabled={createLoading || categoriesLoading}
                  className="w-full gap-2 bg-moria-orange hover:bg-moria-orange/90 sm:w-auto"
                >
                  {createLoading || categoriesLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Novo Servico
                </Button>
              </>
            }
          />
        </CardHeader>

        <CardContent>
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por nome, categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Mensagem de erro */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Erro ao carregar serviços</span>
              </div>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Loading state */}
          {loading && services.length === 0 && (
            <div className="text-center py-12">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-moria-orange mb-4" />
              <p className="text-gray-600">Carregando serviços...</p>
            </div>
          )}

          {/* Empty state */}
          {!loading && filteredServices.length === 0 && !error && (
            <div className="text-center py-12 text-gray-500">
              <Wrench className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <p className="text-lg font-medium mb-2">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Nenhum serviço encontrado'
                  : 'Nenhum serviço cadastrado'
                }
              </p>
              <p>
                {searchTerm || statusFilter !== 'all'
                  ? 'Tente ajustar os filtros de busca'
                  : 'Adicione serviços ao seu catálogo'
                }
              </p>
            </div>
          )}

          {/* Lista de serviços */}
          {filteredServices.length > 0 && (
            <div className="space-y-4">
              {filteredServices.map((service) => (
                <div
                  key={service.id}
                  className="border rounded-lg p-6 hover:border-moria-orange/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    {/* Informações básicas */}
                    <div className="flex items-center space-x-4">
                      <div className="bg-moria-orange text-white rounded-lg p-3">
                        <Wrench className="h-6 w-6" />
                      </div>
                      <div>
                        {/* h2: item logo abaixo do h1 da rota, sem nivel intermediario (A-11). */}
                        <h2 className="text-lg font-semibold">{service.name}</h2>
                        <p className="text-sm text-gray-600 mb-2">{service.description}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            {service.category}
                          </Badge>
                          {!service.isActive && (
                            <Badge variant="secondary" className="bg-red-100 text-red-800">
                              Inativo
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Status: </span>
                        {service.isActive ? (
                          <ToggleRight className="h-5 w-5 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Informações detalhadas */}
                  <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-4">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      <div>
                        <span className="text-sm text-gray-600">Preço base: </span>
                        <span className="font-medium">
                          {formatPrice(service.basePrice)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <div>
                        <span className="text-sm text-gray-600">Tempo estimado: </span>
                        <span className="font-medium">{service.estimatedTime}</span>
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(service.id, service.isActive)}
                    >
                      {service.isActive ? 'Desativar' : 'Ativar'}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditModal(service);
                      }}
                      disabled={updateLoading && editingServiceId === service.id}
                    >
                      {updateLoading && editingServiceId === service.id ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Edit className="h-4 w-4 mr-1" />
                      )}
                      Editar
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(service)}
                      disabled={deleteLoading}
                      className="text-red-600 hover:text-red-700 hover:border-red-300"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Excluir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialog.open} onOpenChange={handleCancelDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o serviço "{deleteDialog.serviceName}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir Serviço'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de serviço */}
      <ServiceModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveService}
        service={editingService}
        loading={editingService ? updateLoading : createLoading}
        categories={categoryNames}
      />

      <ServiceCategoriesModal
        isOpen={isCategoriesModalOpen}
        onClose={() => setIsCategoriesModalOpen(false)}
        categories={categories}
        onSaved={refreshServicesView}
      />
    </div>
  );
}


