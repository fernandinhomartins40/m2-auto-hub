import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { AlertCircle, Loader2, Wrench, DollarSign, Clock, Settings } from 'lucide-react';

interface Service {
  id?: string;
  name: string;
  description: string;
  category: string;
  basePrice?: number;
  estimatedTime: string;
  specifications: Record<string, any>;
  isActive: boolean;
  status?: string;
}

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (service: Partial<Service>) => Promise<void>;
  service?: Service | null;
  loading?: boolean;
  categories?: string[];
}

const DEFAULT_SERVICE_CATEGORIES = [
  'ManutenÃ§Ã£o Preventiva',
  'Motor',
  'Freios',
  'SuspensÃ£o',
  'TransmissÃ£o',
  'Sistema ElÃ©trico',
  'Ar Condicionado',
  'Pneus e Rodas',
  'Carroceria',
  'DiagnÃ³stico',
  'Outros'
];

const DEFAULT_ESTIMATED_TIME = '60 minutos';

export function ServiceModal({
  isOpen,
  onClose,
  onSave,
  service,
  loading = false,
  categories = [],
}: ServiceModalProps) {
  const [formData, setFormData] = useState<Partial<Service>>({
    name: '',
    description: '',
    category: '',
    basePrice: undefined,
    estimatedTime: DEFAULT_ESTIMATED_TIME,
    specifications: {},
    isActive: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('basic');
  const [isModalVisible, setIsModalVisible] = useState(false);

  const availableCategories = useMemo(() => {
    const baseCategories = categories.length > 0 ? categories : DEFAULT_SERVICE_CATEGORIES;
    return [...new Set([...baseCategories, formData.category].filter((value): value is string => Boolean(value)))];
  }, [categories, formData.category]);

  const safeParseFloat = (value: string): number | undefined => {
    if (!value || value.trim() === '') return undefined;
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  };

  const normalizeBasePrice = (value: unknown): number | undefined => {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : undefined;
    }

    if (typeof value === 'string') {
      return safeParseFloat(value);
    }

    return undefined;
  };

  useEffect(() => {
    if (isOpen) {
      const timer = window.setTimeout(() => setIsModalVisible(true), 50);

      if (service) {
        setFormData({
          id: service.id,
          name: service.name || '',
          description: service.description || '',
          category: service.category || '',
          basePrice: normalizeBasePrice(service.basePrice),
          estimatedTime: service.estimatedTime || DEFAULT_ESTIMATED_TIME,
          specifications: service.specifications || {},
          isActive: service.isActive !== undefined ? service.isActive : service.status === 'ACTIVE'
        });
      } else {
        setFormData({
          name: '',
          description: '',
          category: '',
          basePrice: undefined,
          estimatedTime: DEFAULT_ESTIMATED_TIME,
          specifications: {},
          isActive: true
        });
      }

      setErrors({});
      setActiveTab('basic');

      return () => window.clearTimeout(timer);
    }

    setIsModalVisible(false);
    return undefined;
  }, [service, isOpen]);

  const handleInputChange = (field: keyof Service, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Nome Ã© obrigatÃ³rio';
    }

    if (!formData.category?.trim()) {
      newErrors.category = 'Categoria Ã© obrigatÃ³ria';
    }

    if (formData.basePrice === undefined || formData.basePrice < 0) {
      newErrors.basePrice = 'PreÃ§o base deve ser maior ou igual a zero';
    }

    if (!formData.estimatedTime?.trim()) {
      newErrors.estimatedTime = 'Tempo estimado Ã© obrigatÃ³rio';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const dataToSave: Partial<Service> & { status: 'ACTIVE' | 'INACTIVE' } = {
        ...formData,
        status: formData.isActive ? 'ACTIVE' : 'INACTIVE',
        description: formData.description?.trim() || '',
        estimatedTime: formData.estimatedTime?.trim() || DEFAULT_ESTIMATED_TIME,
        basePrice: normalizeBasePrice(formData.basePrice),
      };

      delete dataToSave.isActive;

      await onSave(dataToSave);
      onClose();
    } catch (error) {
      console.error('[ServiceModal] Erro ao salvar serviÃ§o:', error);
    }
  };

  const isEditing = Boolean(service?.id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`max-w-4xl w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] md:w-[calc(100vw-4rem)] max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-3rem)] overflow-hidden flex flex-col p-0 gap-0 transition-all duration-300 ${
          isModalVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b bg-gray-50/50 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Wrench className="h-5 w-5 text-moria-orange" />
            {isEditing ? 'Editar ServiÃ§o' : 'Novo ServiÃ§o'}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {isEditing
              ? 'Edite as informaÃ§Ãµes do serviÃ§o abaixo'
              : 'Preencha as informaÃ§Ãµes do novo serviÃ§o'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 min-h-0 custom-scrollbar">
          <div className="py-3 sm:py-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div
                className="overflow-x-auto overflow-y-hidden -mx-4 sm:mx-0 px-4 sm:px-0"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
              >
                <TabsList className="inline-flex w-auto sm:grid sm:w-full sm:grid-cols-3 gap-1">
                  <TabsTrigger value="basic" className="flex items-center gap-2 text-sm whitespace-nowrap flex-shrink-0">
                    <Wrench className="h-4 w-4" />
                    <span>BÃ¡sico</span>
                  </TabsTrigger>
                  <TabsTrigger value="pricing" className="flex items-center gap-2 text-sm whitespace-nowrap flex-shrink-0">
                    <DollarSign className="h-4 w-4" />
                    <span>PreÃ§o & Tempo</span>
                  </TabsTrigger>
                  <TabsTrigger value="details" className="flex items-center gap-2 text-sm whitespace-nowrap flex-shrink-0">
                    <Settings className="h-4 w-4" />
                    <span>Detalhes</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do ServiÃ§o *</Label>
                    <Input
                      id="name"
                      value={formData.name || ''}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Ex: Troca de Ã³leo do motor"
                      className={errors.name ? 'border-red-500' : ''}
                    />
                    {errors.name && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria *</Label>
                    <Select value={formData.category || ''} onValueChange={(value) => handleInputChange('category', value)}>
                      <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.category && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.category}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">DescriÃ§Ã£o</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="DescriÃ§Ã£o detalhada do serviÃ§o..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={Boolean(formData.isActive)}
                    onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                  />
                  <Label htmlFor="active">ServiÃ§o ativo</Label>
                  {formData.isActive ? (
                    <Badge variant="outline" className="text-green-600">Ativo</Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-500">Inativo</Badge>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="pricing" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="basePrice">PreÃ§o Base *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
                      <Input
                        id="basePrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.basePrice ?? ''}
                        onChange={(e) => handleInputChange('basePrice', safeParseFloat(e.target.value))}
                        placeholder="0.00"
                        className={`pl-10 ${errors.basePrice ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors.basePrice && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.basePrice}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      Use 0 para serviÃ§os com preÃ§o sob orÃ§amento
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estimatedTime">Tempo Estimado *</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                      <Input
                        id="estimatedTime"
                        type="text"
                        value={formData.estimatedTime || ''}
                        onChange={(e) => handleInputChange('estimatedTime', e.target.value)}
                        placeholder="Ex: 30 minutos, 1 hora, 1 hora e 30 minutos"
                        className={`pl-10 ${errors.estimatedTime ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors.estimatedTime && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.estimatedTime}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      Informe o tempo no formato que deseja exibir ao cliente.
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">InformaÃ§Ãµes de PreÃ§o</h4>
                  <div className="space-y-2 text-sm text-blue-800">
                    <div className="flex justify-between">
                      <span>PreÃ§o base:</span>
                      <span className="font-medium">
                        {typeof formData.basePrice === 'number' && formData.basePrice > 0
                          ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(formData.basePrice)
                          : 'Sob orÃ§amento'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tempo estimado:</span>
                      <span className="font-medium">{formData.estimatedTime?.trim() || 'NÃ£o informado'}</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="details" className="space-y-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">EspecificaÃ§Ãµes TÃ©cnicas</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    As especificaÃ§Ãµes tÃ©cnicas podem ser adicionadas futuramente para detalhar
                    requisitos especÃ­ficos, ferramentas necessÃ¡rias, peÃ§as incluÃ­das, etc.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-gray-600">Ferramentas necessÃ¡rias</Label>
                      <p className="text-xs text-gray-500">Em desenvolvimento</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">PeÃ§as incluÃ­das</Label>
                      <p className="text-xs text-gray-500">Em desenvolvimento</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">PrÃ©-requisitos</Label>
                      <p className="text-xs text-gray-500">Em desenvolvimento</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Garantia</Label>
                      <p className="text-xs text-gray-500">Em desenvolvimento</p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t bg-gray-50/50 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} size="sm">
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave} disabled={loading} size="sm" className="bg-moria-orange hover:bg-orange-600">
              {loading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              {isEditing ? 'Salvar AlteraÃ§Ãµes' : 'Criar ServiÃ§o'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
