import { useState } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { CustomerVehicle } from '../../api/vehicleService';
import vehicleService from '../../api/vehicleService';
import { useToast } from '../../hooks/use-toast';

interface DeleteVehicleDialogProps {
  vehicle: CustomerVehicle;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteVehicleDialog({ vehicle, isOpen, onClose, onSuccess }: DeleteVehicleDialogProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await vehicleService.deleteVehicle(vehicle.id);
      onSuccess();
    } catch (error: any) {
      console.error('Erro ao deletar veículo:', error);
      const errorMessage = error.response?.data?.error
        || error.response?.data?.message
        || error.message
        || 'Erro ao remover veículo. Tente novamente.';

      toast({
        title: 'Erro ao remover veículo',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Remover Veículo
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Tem certeza que deseja remover o veículo{' '}
              <span className="font-semibold text-gray-900">
                {vehicle.brand} {vehicle.model} - {vehicle.plate}
              </span>
              ?
            </p>
            <div className="bg-red-50 border-red-200 border rounded-lg p-3">
              <p className="text-sm text-red-800">
                <strong>Atenção:</strong>{' '}
                Esta ação NÃO PODE ser desfeita! O veículo será removido permanentemente do sistema{' '}
                <strong>junto com TODAS as suas revisões e histórico</strong>.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Removendo...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Sim, Remover Veículo
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
