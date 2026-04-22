import { useState, useEffect } from 'react';
import { Car, Search, Loader2, Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogTitle } from '../ui/dialog';
import {
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
} from '../ui/responsive-dialog';
import { CreateVehicleModal } from '../admin/CreateVehicleModal';
import vehicleService, { CustomerVehicle } from '../../api/vehicleService';
import { useToast } from '../../hooks/use-toast';

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  color?: string;
  mileage?: number;
}

interface VehicleSelectorProps {
  customerId: string | null;
  selectedVehicle: Vehicle | null;
  onSelectVehicle: (vehicle: Vehicle) => void;
}

export function VehicleSelector({
  customerId,
  selectedVehicle,
  onSelectVehicle
}: VehicleSelectorProps) {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Load vehicles when dialog opens and customer is selected
  useEffect(() => {
    if (isDialogOpen && customerId) {
      loadVehicles();
    }
  }, [isDialogOpen, customerId]);

  const loadVehicles = async () => {
    if (!customerId) return;

    try {
      setIsLoading(true);
      const response = await vehicleService.getVehiclesByCustomer(customerId);

      // Check if response is valid and has data
      if (!response || !Array.isArray(response)) {
        console.warn('Invalid response from getVehiclesByCustomer:', response);
        setVehicles([]);
        return;
      }

      // Transform API vehicles to local format
      const transformedVehicles: Vehicle[] = response.map((v: CustomerVehicle) => ({
        id: v.id,
        brand: v.brand,
        model: v.model,
        year: v.year,
        plate: v.plate,
        color: v.color,
        mileage: v.mileage || undefined
      }));

      setVehicles(transformedVehicles);
    } catch (error) {
      console.error('Error loading vehicles:', error);
      setVehicles([]);
      toast({
        title: 'Erro ao carregar veículos',
        description: 'Não foi possível carregar os veículos deste cliente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredVehicles = vehicles.filter(vehicle =>
    vehicle.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.year.toString().includes(searchTerm)
  );

  const handleCreateSuccess = (vehicle: any) => {
    // Transform to local format
    const newVehicle: Vehicle = {
      id: vehicle.id,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      plate: vehicle.plate,
      color: vehicle.color,
      mileage: vehicle.mileage
    };

    // Select the newly created vehicle
    onSelectVehicle(newVehicle);
    setIsDialogOpen(false);
    setIsCreateModalOpen(false);

    // Reload vehicles list
    loadVehicles();
  };

  if (!customerId) {
    return (
      <Card className="opacity-50">
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Car className="h-4 w-4 sm:h-5 sm:w-5" />
            Veículo
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <p className="text-xs sm:text-sm text-gray-500">
            Selecione um cliente primeiro
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-3">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <Car className="h-4 w-4 sm:h-5 sm:w-5" />
          Veículo
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 space-y-3 sm:space-y-4">
        {selectedVehicle ? (
          <div className="bg-moria-orange/10 border border-moria-orange/30 rounded-lg p-2.5 sm:p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5 min-w-0 flex-1">
                <p className="font-semibold text-sm sm:text-base truncate">
                  {selectedVehicle.brand} {selectedVehicle.model}
                </p>
                <p className="text-xs sm:text-sm text-gray-600">Ano: {selectedVehicle.year}</p>
                <p className="text-xs sm:text-sm text-gray-600">Placa: {selectedVehicle.plate}</p>
                {selectedVehicle.color && (
                  <p className="text-xs sm:text-sm text-gray-600">Cor: {selectedVehicle.color}</p>
                )}
                {selectedVehicle.mileage !== undefined && selectedVehicle.mileage > 0 && (
                  <p className="text-xs sm:text-sm text-gray-600">
                    Km: {selectedVehicle.mileage.toLocaleString()}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDialogOpen(true)}
                className="h-7 sm:h-8 text-xs flex-shrink-0"
              >
                Trocar
              </Button>
            </div>
          </div>
        ) : (
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="w-full h-9 text-sm bg-moria-orange hover:bg-moria-orange/90"
          >
            <Car className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
            Selecionar Veículo
          </Button>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <ResponsiveDialogContent size="xl" className="sm:min-h-[32rem] p-0 flex flex-col gap-0">
            <ResponsiveDialogHeader>
              <DialogTitle className="flex flex-col gap-3 pr-10 sm:flex-row sm:items-start sm:justify-between">
                Selecionar Veículo
                <Button
                  size="sm"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="w-full sm:w-auto bg-moria-orange hover:bg-moria-orange/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Veículo
                </Button>
              </DialogTitle>
            </ResponsiveDialogHeader>

            <ResponsiveDialogBody className="flex flex-col gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por marca, modelo, placa ou ano..."
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>

              <div className="flex-1 min-h-0 space-y-3 overflow-y-auto pr-1">
                {isLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-moria-orange" />
                    <p className="text-gray-500">Carregando veículos...</p>
                  </div>
                ) : filteredVehicles.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Car className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum veículo encontrado</p>
                    <p className="text-sm mt-2">
                      {vehicles.length === 0
                        ? 'Este cliente ainda não possui veículos cadastrados'
                        : 'Tente buscar com outros termos'}
                    </p>
                  </div>
                ) : (
                  filteredVehicles.map((vehicle) => (
                    <Card
                      key={vehicle.id}
                      className="cursor-pointer rounded-xl border-slate-200 hover:border-moria-orange transition-colors"
                      onClick={() => {
                        onSelectVehicle(vehicle);
                        setIsDialogOpen(false);
                        setSearchTerm('');
                      }}
                    >
                      <CardContent className="p-4 sm:p-5 space-y-1.5">
                        <p className="font-semibold text-sm sm:text-base">
                          {vehicle.brand} {vehicle.model}
                        </p>
                        <p className="text-sm text-gray-600">Ano: {vehicle.year}</p>
                        <p className="text-sm text-gray-600">Placa: {vehicle.plate}</p>
                        {vehicle.color && (
                          <p className="text-sm text-gray-600">Cor: {vehicle.color}</p>
                        )}
                        {vehicle.mileage !== undefined && vehicle.mileage > 0 && (
                          <p className="text-sm text-gray-600">
                            Km: {vehicle.mileage.toLocaleString()}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ResponsiveDialogBody>
          </ResponsiveDialogContent>
        </Dialog>

        {customerId && (
          <CreateVehicleModal
            customerId={customerId}
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onSuccess={handleCreateSuccess}
          />
        )}
      </CardContent>
    </Card>
  );
}
