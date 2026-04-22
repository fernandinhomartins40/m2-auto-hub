import { useState, useEffect } from 'react';
import { Save, Loader2, Car } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import vehicleService, { CustomerVehicle } from '../../api/vehicleService';
import { useToast } from '../../hooks/use-toast';

interface EditVehicleModalCustomerProps {
  vehicle: CustomerVehicle;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (vehicle: CustomerVehicle) => void;
}

export function EditVehicleModalCustomer({ vehicle, isOpen, onClose, onSuccess }: EditVehicleModalCustomerProps) {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [formData, setFormData] = useState({
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year.toString(),
    plate: vehicle.plate,
    color: vehicle.color,
    mileage: vehicle.mileage?.toString() || '',
    chassisNumber: vehicle.chassisNumber || '',
  });

  const [errors, setErrors] = useState({
    brand: '',
    model: '',
    year: '',
    plate: '',
    color: '',
    mileage: '',
    chassisNumber: '',
  });

  // Update form when vehicle changes
  useEffect(() => {
    setFormData({
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year.toString(),
      plate: vehicle.plate,
      color: vehicle.color,
      mileage: vehicle.mileage?.toString() || '',
      chassisNumber: vehicle.chassisNumber || '',
    });
  }, [vehicle]);

  const validateForm = () => {
    const newErrors = {
      brand: '',
      model: '',
      year: '',
      plate: '',
      color: '',
      mileage: '',
      chassisNumber: '',
    };

    let isValid = true;

    // Validar marca
    if (!formData.brand.trim()) {
      newErrors.brand = 'Marca é obrigatória';
      isValid = false;
    }

    // Validar modelo
    if (!formData.model.trim()) {
      newErrors.model = 'Modelo é obrigatório';
      isValid = false;
    }

    // Validar ano
    if (!formData.year) {
      newErrors.year = 'Ano é obrigatório';
      isValid = false;
    } else {
      const year = parseInt(formData.year);
      const currentYear = new Date().getFullYear();
      if (year < 1900 || year > currentYear + 1) {
        newErrors.year = `Ano deve estar entre 1900 e ${currentYear + 1}`;
        isValid = false;
      }
    }

    // Validar placa
    if (!formData.plate.trim()) {
      newErrors.plate = 'Placa é obrigatória';
      isValid = false;
    } else {
      const plateClean = formData.plate.replace(/[^A-Z0-9]/gi, '');
      if (plateClean.length !== 7) {
        newErrors.plate = 'Placa deve ter 7 caracteres';
        isValid = false;
      }
    }

    // Validar cor
    if (!formData.color.trim()) {
      newErrors.color = 'Cor é obrigatória';
      isValid = false;
    }

    // Validar quilometragem (opcional, mas se preenchida deve ser válida)
    if (formData.mileage) {
      const mileage = parseInt(formData.mileage);
      if (isNaN(mileage) || mileage < 0) {
        newErrors.mileage = 'Quilometragem inválida';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsUpdating(true);
    try {
      const updatedVehicle = await vehicleService.updateVehicle(vehicle.id, {
        brand: formData.brand.trim(),
        model: formData.model.trim(),
        year: parseInt(formData.year),
        plate: formData.plate.trim().toUpperCase(),
        color: formData.color.trim(),
        mileage: formData.mileage ? parseInt(formData.mileage) : undefined,
        chassisNumber: formData.chassisNumber.trim() || undefined,
      });

      onSuccess(updatedVehicle);
    } catch (error: any) {
      console.error('Erro ao atualizar veículo:', error);
      const errorMessage = error.response?.data?.error
        || error.response?.data?.message
        || error.message
        || 'Erro ao atualizar veículo. Tente novamente.';

      toast({
        title: 'Erro ao atualizar veículo',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const formatPlate = (value: string) => {
    const clean = value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    if (clean.length <= 3) {
      return clean;
    }
    if (clean.length <= 7) {
      return `${clean.slice(0, 3)}-${clean.slice(3)}`;
    }
    return `${clean.slice(0, 3)}-${clean.slice(3, 7)}`;
  };

  const handlePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    setFormData({ ...formData, plate: value });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gray-50/50">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Car className="h-5 w-5 text-moria-orange" />
            Editar Veículo
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <form onSubmit={handleSubmit} className="py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="brand" className="text-xs">
                Marca <span className="text-red-500">*</span>
              </Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="Ex: Fiat, Ford, Chevrolet"
                disabled={isUpdating}
                className={`mt-1 h-9 text-sm ${errors.brand ? 'border-red-500' : ''}`}
              />
              {errors.brand && <p className="text-xs text-red-500 mt-0.5">{errors.brand}</p>}
            </div>

            <div>
              <Label htmlFor="model" className="text-xs">
                Modelo <span className="text-red-500">*</span>
              </Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="Ex: Uno, Fiesta, Onix"
                disabled={isUpdating}
                className={`mt-1 h-9 text-sm ${errors.model ? 'border-red-500' : ''}`}
              />
              {errors.model && <p className="text-xs text-red-500 mt-0.5">{errors.model}</p>}
            </div>

            <div>
              <Label htmlFor="year" className="text-xs">
                Ano <span className="text-red-500">*</span>
              </Label>
              <Input
                id="year"
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                placeholder="2020"
                disabled={isUpdating}
                className={`mt-1 h-9 text-sm ${errors.year ? 'border-red-500' : ''}`}
                min="1900"
                max={new Date().getFullYear() + 1}
              />
              {errors.year && <p className="text-xs text-red-500 mt-0.5">{errors.year}</p>}
            </div>

            <div>
              <Label htmlFor="plate" className="text-xs">
                Placa <span className="text-red-500">*</span>
              </Label>
              <Input
                id="plate"
                value={formatPlate(formData.plate)}
                onChange={handlePlateChange}
                placeholder="ABC-1234 ou ABC1D23"
                disabled={isUpdating}
                className={`mt-1 h-9 text-sm ${errors.plate ? 'border-red-500' : ''}`}
                maxLength={8}
              />
              {errors.plate && <p className="text-xs text-red-500 mt-0.5">{errors.plate}</p>}
            </div>

            <div>
              <Label htmlFor="color" className="text-xs">
                Cor <span className="text-red-500">*</span>
              </Label>
              <Input
                id="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                placeholder="Ex: Branco, Preto, Prata"
                disabled={isUpdating}
                className={`mt-1 h-9 text-sm ${errors.color ? 'border-red-500' : ''}`}
              />
              {errors.color && <p className="text-xs text-red-500 mt-0.5">{errors.color}</p>}
            </div>

            <div>
              <Label htmlFor="mileage" className="text-xs">Quilometragem (opcional)</Label>
              <Input
                id="mileage"
                type="number"
                value={formData.mileage}
                onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                placeholder="50000"
                disabled={isUpdating}
                className={`mt-1 h-9 text-sm ${errors.mileage ? 'border-red-500' : ''}`}
                min="0"
              />
              {errors.mileage && <p className="text-xs text-red-500 mt-0.5">{errors.mileage}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="chassisNumber" className="text-xs">Número do Chassi (opcional)</Label>
            <Input
              id="chassisNumber"
              value={formData.chassisNumber}
              onChange={(e) => setFormData({ ...formData, chassisNumber: e.target.value.toUpperCase() })}
              placeholder="9BWZZZ377VT004251"
              disabled={isUpdating}
              maxLength={17}
              className="mt-1 h-9 text-sm"
            />
          </div>
        </form>
        </ScrollArea>

        {/* Footer com ações */}
        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t bg-gray-50/50">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isUpdating}
            size="sm"
            className="h-8 text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isUpdating}
            size="sm"
            className="bg-moria-orange hover:bg-moria-orange/90 h-8 text-xs"
            onClick={handleSubmit}
          >
            {isUpdating ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-3 w-3 mr-1" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
