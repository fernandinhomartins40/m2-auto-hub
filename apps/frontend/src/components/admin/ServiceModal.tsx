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
  'Manutenção Preventiva',
  'Motor',
  'Freios',
  'Suspensão',
  'Transmissão',
  'Sistema Elétrico',
  'Ar Condicionado',
  'Pneus e Rodas',
  'Carroceria',
  'Diagnóstico',
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
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.category?.trim()) {
      newErrors.category = 'Categoria é obrigatória';
    }

    if (formData.basePrice === undefined || formData.basePrice < 0) {
      newErrors.basePrice = 'Preço base deve ser maior ou igual a zero';
    }

    if (!formData.estimatedTime?.trim()) {
      newErrors.estimatedTime = 'Tempo estimado é obrigatório';
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
      console.error('[ServiceModal] Erro ao salvar serviço:', error);
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
            {isEditing ? 'Editar Serviço' : 'Novo Serviço'}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {isEditing
              ? 'Edite as informações do serviço abaixo'
              : 'Preencha as informações do novo serviço'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 min-h-0 custom-scrollbar">
          <div className="py-3 sm:py-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div
                className="overflow-x-auto overflow-y-hidden -mx-4 sm:mx-0 px-4 sm:px-0"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
              >
                <TabsList className="grid grid-flow-col auto-cols-max sm:auto-cols-fr w-max sm:w-full h-10 items-stretch gap-1">
                  <TabsTrigger value="basic" className="h-full w-full flex items-center justify-center gap-2 text-sm whitespace-nowrap">
                    <Wrench className="h-4 w-4" />
                    <span>Básico</span>
                  </TabsTrigger>
                  <TabsTrigger value="pricing" className="h-full w-full flex items-center justify-center gap-2 text-sm whitespace-nowrap">
                    <DollarSign className="h-4 w-4" />
                    <span>Preço & Tempo</span>
                  </TabsTrigger>
                  <TabsTrigger value="details" className="h-full w-full flex items-center justify-center gap-2 text-sm whitespace-nowrap">
                    <Settings className="h-4 w-4" />
                    <span>Detalhes</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Serviço *</Label>
                    <Input
                      id="name"
                      value={formData.name || ''}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Ex: Troca de óleo do motor"
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
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Descrição detalhada do serviço..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={Boolean(formData.isActive)}
                    onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                  />
                  <Label htmlFor="active">Serviço ativo</Label>
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
                    <Label htmlFor="basePrice">Preço Base *</Label>
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
                      Use 0 para serviços com preço sob orçamento
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
                  <h4 className="font-medium text-blue-900 mb-2">Informações de Preço</h4>
                  <div className="space-y-2 text-sm text-blue-800">
                    <div className="flex justify-between">
                      <span>Preço base:</span>
                      <span className="font-medium">
                        {typeof formData.basePrice === 'number' && formData.basePrice > 0
                          ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(formData.basePrice)
                          : 'Sob orçamento'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tempo estimado:</span>
                      <span className="font-medium">{formData.estimatedTime?.trim() || 'Não informado'}</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="details" className="space-y-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Especificações Técnicas</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    As especificações técnicas podem ser adicionadas futuramente para detalhar
                    requisitos específicos, ferramentas necessárias, peças incluídas, etc.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-gray-600">Ferramentas necessárias</Label>
                      <p className="text-xs text-gray-500">Em desenvolvimento</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Peças incluídas</Label>
                      <p className="text-xs text-gray-500">Em desenvolvimento</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Pré-requisitos</Label>
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
            <Button type="button" onClick={handleSave} disabled={loading} size="sm" className="bg-moria-orange hover:bg-moria-orange/90">
              {loading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              {isEditing ? 'Salvar Alterações' : 'Criar Serviço'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

