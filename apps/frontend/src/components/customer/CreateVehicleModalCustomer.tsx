import { useState, useEffect } from 'react';
import { Save, Loader2, Car } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Combobox } from '../ui/combobox';
import vehicleService, { CustomerVehicle } from '../../api/vehicleService';
import { useFipeData } from '../../hooks/useFipeData';
import fipeService from '../../api/fipeService';
import { useToast } from '../../hooks/use-toast';

interface CreateVehicleModalCustomerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (vehicle: CustomerVehicle) => void;
}

export function CreateVehicleModalCustomer({ isOpen, onClose, onSuccess }: CreateVehicleModalCustomerProps) {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);

  // Dados FIPE
  const { brands, models, years, loadingBrands, loadingModels, loadingYears, loadModels, loadYears, resetModels, resetYears } = useFipeData('cars');

  // Seleções FIPE
  const [selectedBrandCode, setSelectedBrandCode] = useState('');
  const [selectedModelCode, setSelectedModelCode] = useState('');
  const [selectedYearCode, setSelectedYearCode] = useState('');

  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    year: '',
    plate: '',
    color: '',
    mileage: '',
    chassisNumber: '',
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

  // Quando marca é selecionada, carregar modelos
  useEffect(() => {
    if (selectedBrandCode) {
      loadModels(selectedBrandCode);
      // Limpar seleções anteriores
      setSelectedModelCode('');
      setSelectedYearCode('');
      setFormData(prev => ({ ...prev, model: '', year: '' }));
      resetYears();
    } else {
      resetModels();
      resetYears();
    }
  }, [selectedBrandCode]);

  // Quando modelo é selecionado, carregar anos
  useEffect(() => {
    if (selectedBrandCode && selectedModelCode) {
      loadYears(selectedBrandCode, selectedModelCode);
      // Limpar ano anterior
      setSelectedYearCode('');
      setFormData(prev => ({ ...prev, year: '' }));
    } else {
      resetYears();
    }
  }, [selectedModelCode]);

  // Quando ano é selecionado, extrair valor numérico
  useEffect(() => {
    if (selectedYearCode) {
      const yearNum = fipeService.extractYear(selectedYearCode);
      setFormData(prev => ({ ...prev, year: yearNum.toString() }));
    }
  }, [selectedYearCode]);

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

    setIsCreating(true);
    try {
      const vehicle = await vehicleService.createVehicle({
        brand: formData.brand.trim(),
        model: formData.model.trim(),
        year: parseInt(formData.year),
        plate: formData.plate.trim().toUpperCase(),
        color: formData.color.trim(),
        mileage: formData.mileage ? parseInt(formData.mileage) : undefined,
        chassisNumber: formData.chassisNumber.trim() || undefined,
      });

      // Reset form
      setFormData({
        brand: '',
        model: '',
        year: '',
        plate: '',
        color: '',
        mileage: '',
        chassisNumber: '',
      });
      setErrors({
        brand: '',
        model: '',
        year: '',
        plate: '',
        color: '',
        mileage: '',
        chassisNumber: '',
      });
      setSelectedBrandCode('');
      setSelectedModelCode('');
      setSelectedYearCode('');

      onSuccess(vehicle);
    } catch (error: any) {
      console.error('Erro ao criar veículo:', error);
      const errorMessage = error.response?.data?.error
        || error.response?.data?.message
        || error.message
        || 'Erro ao criar veículo. Tente novamente.';

      toast({
        title: 'Erro ao criar veículo',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setFormData({
        brand: '',
        model: '',
        year: '',
        plate: '',
        color: '',
        mileage: '',
        chassisNumber: '',
      });
      setErrors({
        brand: '',
        model: '',
        year: '',
        plate: '',
        color: '',
        mileage: '',
        chassisNumber: '',
      });
      setSelectedBrandCode('');
      setSelectedModelCode('');
      setSelectedYearCode('');
      onClose();
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

  const handleBrandChange = (brandCode: string) => {
    setSelectedBrandCode(brandCode);
    const brand = brands.find(b => b.code === brandCode);
    if (brand) {
      setFormData(prev => ({ ...prev, brand: brand.name }));
    }
  };

  const handleModelChange = (modelCode: string) => {
    setSelectedModelCode(modelCode);
    const model = models.find(m => m.code === modelCode);
    if (model) {
      setFormData(prev => ({ ...prev, model: model.name }));
    }
  };

  const handleYearChange = (yearCode: string) => {
    setSelectedYearCode(yearCode);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gray-50/50">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Car className="h-5 w-5 text-moria-orange" />
            Cadastrar Novo Veículo
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <form onSubmit={handleSubmit} className="py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {/* Marca (Combobox FIPE) */}
              <div>
                <Label htmlFor="brand" className="text-xs">
                  Marca <span className="text-red-500">*</span>
                </Label>
                <Combobox
                  options={brands.map(b => ({ value: b.code, label: b.name }))}
                  value={selectedBrandCode}
                  onValueChange={handleBrandChange}
                  placeholder="Selecione a marca"
                  searchPlaceholder="Buscar marca..."
                  emptyText="Nenhuma marca encontrada"
                  disabled={isCreating}
                  loading={loadingBrands}
                  className={`mt-1 ${errors.brand ? 'border-red-500' : ''}`}
                />
                {errors.brand && <p className="text-xs text-red-500 mt-0.5">{errors.brand}</p>}
              </div>

              {/* Modelo (Combobox FIPE) */}
              <div>
                <Label htmlFor="model" className="text-xs">
                  Modelo <span className="text-red-500">*</span>
                </Label>
                <Combobox
                  options={models.map(m => ({ value: m.code, label: m.name }))}
                  value={selectedModelCode}
                  onValueChange={handleModelChange}
                  placeholder={selectedBrandCode ? "Selecione o modelo" : "Selecione a marca primeiro"}
                  searchPlaceholder="Buscar modelo..."
                  emptyText="Nenhum modelo encontrado"
                  disabled={isCreating || !selectedBrandCode}
                  loading={loadingModels}
                  className={`mt-1 ${errors.model ? 'border-red-500' : ''}`}
                />
                {errors.model && <p className="text-xs text-red-500 mt-0.5">{errors.model}</p>}
              </div>

              {/* Ano (Combobox FIPE) */}
              <div>
                <Label htmlFor="year" className="text-xs">
                  Ano <span className="text-red-500">*</span>
                </Label>
                <Combobox
                  options={years.map(y => ({ value: y.code, label: y.name }))}
                  value={selectedYearCode}
                  onValueChange={handleYearChange}
                  placeholder={selectedModelCode ? "Selecione o ano" : "Selecione o modelo primeiro"}
                  searchPlaceholder="Buscar ano..."
                  emptyText="Nenhum ano encontrado"
                  disabled={isCreating || !selectedModelCode}
                  loading={loadingYears}
                  className={`mt-1 ${errors.year ? 'border-red-500' : ''}`}
                />
                {errors.year && <p className="text-xs text-red-500 mt-0.5">{errors.year}</p>}
              </div>

              {/* Placa */}
              <div>
                <Label htmlFor="plate" className="text-xs">
                  Placa <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="plate"
                  value={formatPlate(formData.plate)}
                  onChange={handlePlateChange}
                  placeholder="ABC-1234 ou ABC1D23"
                  disabled={isCreating}
                  className={`mt-1 h-9 text-sm ${errors.plate ? 'border-red-500' : ''}`}
                  maxLength={8}
                />
                {errors.plate && <p className="text-xs text-red-500 mt-0.5">{errors.plate}</p>}
              </div>

              {/* Cor */}
              <div>
                <Label htmlFor="color" className="text-xs">
                  Cor <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="Ex: Branco, Preto, Prata"
                  disabled={isCreating}
                  className={`mt-1 h-9 text-sm ${errors.color ? 'border-red-500' : ''}`}
                />
                {errors.color && <p className="text-xs text-red-500 mt-0.5">{errors.color}</p>}
              </div>

              {/* Quilometragem */}
              <div>
                <Label htmlFor="mileage" className="text-xs">Quilometragem (opcional)</Label>
                <Input
                  id="mileage"
                  type="number"
                  value={formData.mileage}
                  onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                  placeholder="50000"
                  disabled={isCreating}
                  className={`mt-1 h-9 text-sm ${errors.mileage ? 'border-red-500' : ''}`}
                  min="0"
                />
                {errors.mileage && <p className="text-xs text-red-500 mt-0.5">{errors.mileage}</p>}
              </div>
            </div>

            {/* Chassi */}
            <div>
              <Label htmlFor="chassisNumber" className="text-xs">Número do Chassi (opcional)</Label>
              <Input
                id="chassisNumber"
                value={formData.chassisNumber}
                onChange={(e) => setFormData({ ...formData, chassisNumber: e.target.value.toUpperCase() })}
                placeholder="9BWZZZ377VT004251"
                disabled={isCreating}
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
            onClick={handleClose}
            disabled={isCreating}
            size="sm"
            className="h-8 text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isCreating}
            size="sm"
            className="bg-moria-orange hover:bg-moria-orange/90 h-8 text-xs"
            onClick={handleSubmit}
          >
            {isCreating ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <Save className="h-3 w-3 mr-1" />
                Criar Veículo
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
