// src/hooks/useAdminServices.ts
import { useState, useEffect } from 'react';
import serviceService, { Service, CreateServiceDto, UpdateServiceDto } from '@/api/serviceService';
import { handleApiError } from '@/api';
import { useToast } from '@/hooks/use-toast';

interface UseAdminServicesResult {
  services: Service[];
  loading: boolean;
  error: string | null;
  createLoading: boolean;
  updateLoading: boolean;
  deleteLoading: boolean;
  fetchServices: () => Promise<void>;
  createService: (data: CreateServiceDto) => Promise<void>;
  updateService: (id: string, data: UpdateServiceDto) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  toggleServiceStatus: (id: string, currentStatus: boolean) => Promise<void>;
}

export const useAdminServices = (): UseAdminServicesResult => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState<boolean>(false);
  const [updateLoading, setUpdateLoading] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const fetchServices = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await serviceService.getServices({ page: 1, limit: 100 });
      setServices(response.services);
    } catch (err) {
      const apiError = handleApiError(err);
      setError(apiError.message);
      toast({
        title: 'Erro ao carregar serviços',
        description: apiError.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createService = async (data: CreateServiceDto) => {
    setCreateLoading(true);

    try {
      const newService = await serviceService.createService(data);
      setServices(prev => [newService, ...prev]);
      toast({
        title: 'Serviço criado',
        description: `O serviço "${newService.name}" foi criado com sucesso.`,
      });
    } catch (err) {
      const apiError = handleApiError(err);
      toast({
        title: 'Erro ao criar serviço',
        description: apiError.message,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setCreateLoading(false);
    }
  };

  const updateService = async (id: string, data: UpdateServiceDto) => {
    setUpdateLoading(true);

    try {
      const updatedService = await serviceService.updateService(id, data);
      setServices(prev => prev.map(service =>
        service.id === id ? updatedService : service
      ));
      toast({
        title: 'Serviço atualizado',
        description: `O serviço "${updatedService.name}" foi atualizado com sucesso.`,
      });
    } catch (err) {
      const apiError = handleApiError(err);
      toast({
        title: 'Erro ao atualizar serviço',
        description: apiError.message,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setUpdateLoading(false);
    }
  };

  const deleteService = async (id: string) => {
    setDeleteLoading(true);

    try {
      await serviceService.deleteService(id);
      setServices(prev => prev.filter(service => service.id !== id));
      toast({
        title: 'Serviço excluído',
        description: 'O serviço foi excluído com sucesso.',
      });
    } catch (err) {
      const apiError = handleApiError(err);
      toast({
        title: 'Erro ao excluir serviço',
        description: apiError.message,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setDeleteLoading(false);
    }
  };

  const toggleServiceStatus = async (id: string, currentStatus: boolean) => {
    try {
      const updatedService = await serviceService.toggleServiceStatus(id, currentStatus);
      setServices(prev => prev.map(service =>
        service.id === id ? updatedService : service
      ));
      toast({
        title: 'Status atualizado',
        description: `O serviço foi ${updatedService.status === 'ACTIVE' ? 'ativado' : 'desativado'} com sucesso.`,
      });
    } catch (err) {
      const apiError = handleApiError(err);
      toast({
        title: 'Erro ao atualizar status',
        description: apiError.message,
        variant: 'destructive',
      });
      throw err;
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  return {
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
    toggleServiceStatus,
  };
};
