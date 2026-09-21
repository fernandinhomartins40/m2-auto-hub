import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Car,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Gauge,
  AlertCircle,
  Loader2,
  ClipboardCheck,
} from 'lucide-react';
import { CreateVehicleModalCustomer } from './CreateVehicleModalCustomer';
import { EditVehicleModalCustomer } from './EditVehicleModalCustomer';
import { DeleteVehicleDialog } from './DeleteVehicleDialog';
import { ScheduleRevisionModal } from './ScheduleRevisionModal';
import vehicleService, { CustomerVehicle } from '../../api/vehicleService';
import { useToast } from '../../hooks/use-toast';

export function CustomerVehicles() {
  const { customer } = useAuth();
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<CustomerVehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<CustomerVehicle | null>(null);
  const [deletingVehicle, setDeletingVehicle] = useState<CustomerVehicle | null>(null);
  const [schedulingVehicle, setSchedulingVehicle] = useState<CustomerVehicle | null>(null);

  useEffect(() => {
    if (customer) {
      loadVehicles();
    }
  }, [customer]);

  const loadVehicles = async () => {
    try {
      setIsLoading(true);
      const data = await vehicleService.getVehicles();
      setVehicles(data);
    } catch (error) {
      console.error('Erro ao carregar veiculos:', error);
      toast({
        title: 'Erro ao carregar veiculos',
        description: 'Nao foi possivel carregar seus veiculos. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSuccess = (vehicle: CustomerVehicle) => {
    setVehicles((prev) => [...prev, vehicle]);
    setIsCreateModalOpen(false);
    toast({
      title: 'Veiculo cadastrado com sucesso',
      description: `${vehicle.brand} ${vehicle.model} - ${vehicle.plate}`,
    });
  };

  const handleEditSuccess = (updatedVehicle: CustomerVehicle) => {
    setVehicles((prev) => prev.map((vehicle) => (vehicle.id === updatedVehicle.id ? updatedVehicle : vehicle)));
    setEditingVehicle(null);
    toast({
      title: 'Veiculo atualizado com sucesso',
      description: `${updatedVehicle.brand} ${updatedVehicle.model}`,
    });
  };

  const handleDeleteSuccess = (vehicleId: string) => {
    setVehicles((prev) => prev.filter((vehicle) => vehicle.id !== vehicleId));
    setDeletingVehicle(null);
    toast({
      title: 'Veiculo removido com sucesso',
      description: 'O veiculo foi removido da sua lista.',
    });
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

  if (!customer) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Meus Veiculos</h1>
          <p className="text-muted-foreground">Gerencie seus veiculos cadastrados</p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-moria-orange hover:bg-moria-orange/90"
        >
          <Plus className="h-4 w-4 shrink-0" />
          Cadastrar Veiculo
        </Button>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Cadastre seus veiculos para facilitar o agendamento de revisoes e acompanhar o historico de manutencoes.
        </AlertDescription>
      </Alert>

      {isLoading ? (
        <div className="py-12 text-center">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-moria-orange" />
          <p className="text-muted-foreground">Carregando seus veiculos...</p>
        </div>
      ) : vehicles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Car className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <p className="mb-2 text-lg font-semibold">Nenhum veiculo cadastrado</p>
            <p className="mb-4 text-sm text-muted-foreground">
              Cadastre seu primeiro veiculo para comecar
            </p>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-moria-orange hover:bg-moria-orange/90"
            >
              <Plus className="h-4 w-4 shrink-0" />
              Cadastrar Primeiro Veiculo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {vehicles.map((vehicle) => (
            <Card key={vehicle.id} className="transition-shadow hover:shadow-lg">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-moria-orange/10 p-3">
                      <Car className="h-6 w-6 text-moria-orange" />
                    </div>
                    <div>
                      {/* h2: cada veiculo e um item logo abaixo do h1 da
                          rota, sem nivel intermediario (A-11). */}
                      <CardTitle as="h2" className="text-xl">
                        {vehicle.brand} {vehicle.model}
                      </CardTitle>
                      <CardDescription className="mt-2 space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="secondary" className="font-mono">
                            {vehicle.plate}
                          </Badge>
                          <span>•</span>
                          <span>Ano: {vehicle.year}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span>Cor: {vehicle.color}</span>
                        </div>
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 border-b pb-4">
                  {vehicle.mileage ? (
                    <div className="flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Quilometragem</p>
                        <p className="text-sm font-semibold">{vehicle.mileage.toLocaleString()} km</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Quilometragem</p>
                        <p className="text-sm font-semibold">Nao informada</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Cadastrado em</p>
                      <p className="text-sm font-semibold">{formatDate(vehicle.createdAt)}</p>
                    </div>
                  </div>
                </div>

                {vehicle.chassisNumber && (
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Numero do Chassi</p>
                    <p className="rounded border bg-gray-50 px-3 py-2 font-mono text-sm">
                      {vehicle.chassisNumber}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Button
                    className="w-full bg-moria-orange hover:bg-moria-orange/90"
                    size="sm"
                    onClick={() => setSchedulingVehicle(vehicle)}
                  >
                    <ClipboardCheck className="h-4 w-4 shrink-0" />
                    Agendar Revisao
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setEditingVehicle(vehicle)}
                    >
                      <Edit className="h-4 w-4 shrink-0" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => setDeletingVehicle(vehicle)}
                    >
                      <Trash2 className="h-4 w-4 shrink-0" />
                      Remover
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateVehicleModalCustomer
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {editingVehicle && (
        <EditVehicleModalCustomer
          vehicle={editingVehicle}
          isOpen={!!editingVehicle}
          onClose={() => setEditingVehicle(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {deletingVehicle && (
        <DeleteVehicleDialog
          vehicle={deletingVehicle}
          isOpen={!!deletingVehicle}
          onClose={() => setDeletingVehicle(null)}
          onSuccess={() => handleDeleteSuccess(deletingVehicle.id)}
        />
      )}

      <ScheduleRevisionModal
        isOpen={!!schedulingVehicle}
        vehicle={schedulingVehicle}
        onClose={() => setSchedulingVehicle(null)}
      />
    </div>
  );
}
