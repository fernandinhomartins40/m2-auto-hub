import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { AlertCircle, Loader2, TrendingUp, Percent, Calendar, Settings, X, CheckCircle2, Package, Tag, Check } from 'lucide-react';
import apiClient from '../../api/apiClient';
import productService, { Product } from '../../api/productService';
import type { AdvancedPromotion } from '../../types/promotions';
import { toast } from 'sonner';

// Interface para dados do formulário (simplificada e alinhada com backend)
interface PromotionFormData {
  // Básico
  name: string;
  description: string;
  shortDescription?: string;
  badgeText?: string;

  // Tipo e Alvo
  discountType: 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING';
  target: 'ALL_PRODUCTS' | 'SPECIFIC_PRODUCTS' | 'CATEGORY';

  // Seleção (baseado em target)
  targetProductIds?: string[];
  targetCategories?: string[];

  // Desconto
  discountValue: number;
  maxDiscount?: number;

  // Período
  startDate: string;
  endDate: string;

  // Configurações
  minPurchaseAmount?: number;
  usageLimit?: number;
  usageLimitPerCustomer?: number;

  // Estado
  autoApply: boolean;
  canCombineWithOthers: boolean;
  priority: number;
  code?: string;
  isActive: boolean;
}

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (promotion: Partial<any>) => Promise<void>;
  promotion?: AdvancedPromotion | null;
  loading?: boolean;
}

// Função de conversão: AdvancedPromotion (Backend) → PromotionFormData (Form)
const isValidDate = (value: string | Date | null | undefined): boolean => {
  if (!value) return false;
  return !Number.isNaN(new Date(value).getTime());
};

const formatDateTimeLocal = (value: string | Date | null | undefined): string => {
  if (!isValidDate(value)) return '';

  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const toIsoDateTime = (value: string): string => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error('Data/hora inválida');
  }

  return date.toISOString();
};

const convertFromBackendFormat = (promotion: AdvancedPromotion): PromotionFormData => {
  const promotionWithRootDates = promotion as AdvancedPromotion & {
    startDate?: string;
    endDate?: string;
  };
  const rawStartDate = promotion.schedule?.startDate || promotionWithRootDates.startDate;
  const rawEndDate = promotion.schedule?.endDate || promotionWithRootDates.endDate;
  // Detectar tipo de desconto baseado em rewards
  let discountType: 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING' = 'PERCENTAGE';
  if (promotion.type === 'FREE_SHIPPING') {
    discountType = 'FREE_SHIPPING';
  } else if (promotion.rewards?.primary?.type === 'FIXED') {
    discountType = 'FIXED';
  } else {
    discountType = 'PERCENTAGE';
  }

  // Detectar target
  let target: 'ALL_PRODUCTS' | 'SPECIFIC_PRODUCTS' | 'CATEGORY' = 'ALL_PRODUCTS';
  if (promotion.target === 'SPECIFIC_PRODUCTS') {
    target = 'SPECIFIC_PRODUCTS';
  } else if (promotion.target === 'CATEGORY') {
    target = 'CATEGORY';
  }

  // Extrair minPurchaseAmount das rules
  const minPurchaseRule = promotion.rules?.find(r => r.type === 'MIN_VALUE');

  return {
    name: promotion.name || '',
    description: promotion.description || '',
    shortDescription: promotion.shortDescription,
    badgeText: promotion.badgeText,

    discountType,
    target,

    targetProductIds: (promotion.targetProductIds as string[]) || [],
    targetCategories: (promotion.targetCategories as string[]) || [],

    discountValue: promotion.rewards?.primary?.value || 0,
    maxDiscount: promotion.rewards?.primary?.maxAmount,

    startDate: formatDateTimeLocal(rawStartDate),
    endDate: formatDateTimeLocal(rawEndDate),

    minPurchaseAmount: minPurchaseRule?.value as number | undefined,
    usageLimit: promotion.usageLimit,
    usageLimitPerCustomer: promotion.usageLimitPerCustomer,

    autoApply: promotion.autoApply ?? true,
    canCombineWithOthers: promotion.canCombineWithOthers ?? false,
    priority: promotion.priority ?? 0,
    code: promotion.code,
    isActive: promotion.isActive ?? true
  };
};

// Função de conversão: PromotionFormData (Form) → CreatePromotionDto (Backend)
const convertToBackendFormat = (formData: PromotionFormData) => {
  const startDateIso = toIsoDateTime(formData.startDate);
  const endDateIso = toIsoDateTime(formData.endDate);
  // Construir rules array
  const rules = [];
  if (formData.minPurchaseAmount && formData.minPurchaseAmount > 0) {
    rules.push({
      type: 'MIN_VALUE',
      field: 'cartTotal',
      condition: 'gte',
      value: formData.minPurchaseAmount,
      description: `Valor mínimo: R$ ${formData.minPurchaseAmount.toFixed(2)}`
    });
  }

  // Construir rewards
  const rewards: any = {
    primary: {
      type: formData.discountType,
      value: formData.discountValue
    }
  };

  if (formData.discountType === 'PERCENTAGE' && formData.maxDiscount) {
    rewards.primary.maxAmount = formData.maxDiscount;
  }

  if (formData.discountType === 'FREE_SHIPPING') {
    rewards.freeShipping = true;
  }

  // Construir payload
  const payload: any = {
    name: formData.name,
    description: formData.description,

    // Mapear tipo de desconto
    type: formData.discountType,
    target: formData.target,
    trigger: 'AUTO_APPLY',

    customerSegments: ['ALL'],

    rules,
    rewards,

    schedule: {
      startDate: startDateIso,
      endDate: endDateIso
    },

    // Campos obrigatórios no nível raiz
    startDate: startDateIso,
    endDate: endDateIso,

    autoApply: formData.autoApply,
    canCombineWithOthers: formData.canCombineWithOthers,
    priority: formData.priority,
    isActive: formData.isActive
  };

  // Adicionar campos opcionais
  if (formData.shortDescription) payload.shortDescription = formData.shortDescription;
  if (formData.badgeText) payload.badgeText = formData.badgeText;
  if (formData.code) payload.code = formData.code;
  if (formData.usageLimit) payload.usageLimit = formData.usageLimit;
  if (formData.usageLimitPerCustomer) payload.usageLimitPerCustomer = formData.usageLimitPerCustomer;

  // Adicionar targetProductIds ou targetCategories baseado em target
  if (formData.target === 'SPECIFIC_PRODUCTS' && formData.targetProductIds && formData.targetProductIds.length > 0) {
    payload.targetProductIds = formData.targetProductIds;
  }

  if (formData.target === 'CATEGORY' && formData.targetCategories && formData.targetCategories.length > 0) {
    payload.targetCategories = formData.targetCategories;
  }

  return payload;
};

const DISCOUNT_TYPES = [
  { value: 'PERCENTAGE', label: 'Desconto Percentual (%)', description: 'Desconto em porcentagem do valor' },
  { value: 'FIXED', label: 'Desconto Fixo (R$)', description: 'Desconto em valor fixo em reais' },
  { value: 'FREE_SHIPPING', label: 'Frete Grátis', description: 'Isenção do frete' }
];

const TARGET_TYPES = [
  { value: 'ALL_PRODUCTS', label: 'Todos os Produtos', description: 'Aplicada a todos os produtos do catálogo' },
  { value: 'CATEGORY', label: 'Por Categoria', description: 'Aplicada a categorias específicas' },
  { value: 'SPECIFIC_PRODUCTS', label: 'Produtos Específicos', description: 'Aplicada apenas aos produtos selecionados' }
];

export function PromotionModal({ isOpen, onClose, onSave, promotion, loading = false }: PromotionModalProps) {
  const [formData, setFormData] = useState<PromotionFormData>({
    name: '',
    description: '',
    shortDescription: '',
    badgeText: '',
    discountType: 'PERCENTAGE',
    target: 'ALL_PRODUCTS',
    targetProductIds: [],
    targetCategories: [],
    discountValue: 0,
    maxDiscount: undefined,
    startDate: '',
    endDate: '',
    minPurchaseAmount: undefined,
    usageLimit: undefined,
    usageLimitPerCustomer: undefined,
    autoApply: true,
    canCombineWithOthers: false,
    priority: 0,
    code: '',
    isActive: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('basic');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Funções auxiliares para conversão segura de números
  const safeParseFloat = (value: string): number | undefined => {
    if (!value || value.trim() === '') return undefined;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? undefined : parsed;
  };

  const safeParseInt = (value: string): number | undefined => {
    if (!value || value.trim() === '') return undefined;
    const parsed = parseInt(value);
    return isNaN(parsed) ? undefined : parsed;
  };

  // Carregar dados necessários
  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    setLoadingData(true);
    try {
      // Backend limit máximo é 100, então fazer múltiplas requisições se necessário
      let allProducts: Product[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore && page <= 10) { // Limitar a 10 páginas (1000 produtos)
        const productsResponse = await productService.getProducts({ page, limit: 100 });

        const products = productsResponse.products || [];
        allProducts = [...allProducts, ...products];

        // Verificar se há mais páginas
        hasMore = products.length === 100;
        page++;
      }

      setAvailableProducts(allProducts);

      const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))];
      setAvailableCategories(categories);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar produtos e categorias');
    } finally {
      setLoadingData(false);
    }
  };

  // Preencher form quando promoção é editada
  useEffect(() => {
    if (promotion) {
      const converted = convertFromBackendFormat(promotion);
      setFormData(converted);
    } else {
      // Resetar form para nova promoção
      const now = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 7);

      setFormData({
        name: '',
        description: '',
        shortDescription: '',
        badgeText: '',
        discountType: 'PERCENTAGE',
        target: 'ALL_PRODUCTS',
        targetProductIds: [],
        targetCategories: [],
        discountValue: 0,
        maxDiscount: undefined,
        startDate: formatDateTimeLocal(now),
        endDate: formatDateTimeLocal(tomorrow),
        minPurchaseAmount: undefined,
        usageLimit: undefined,
        usageLimitPerCustomer: undefined,
        autoApply: true,
        canCombineWithOthers: false,
        priority: 0,
        code: '',
        isActive: true
      });
    }
    setErrors({});
    setActiveTab('basic');
  }, [promotion, isOpen]);

  const handleInputChange = (field: keyof PromotionFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleCategoryToggle = (category: string) => {
    setFormData(prev => {
      const currentCategories = prev.targetCategories || [];
      const isSelected = currentCategories.includes(category);

      const newCategories = isSelected
        ? currentCategories.filter(c => c !== category)
        : [...currentCategories, category];

      return { ...prev, targetCategories: newCategories };
    });
  };

  const handleProductToggle = (productId: string) => {
    setFormData(prev => {
      const currentProducts = prev.targetProductIds || [];
      const isSelected = currentProducts.includes(productId);

      const newProducts = isSelected
        ? currentProducts.filter(p => p !== productId)
        : [...currentProducts, productId];

      return { ...prev, targetProductIds: newProducts };
    });
  };

  const removeCategory = (category: string) => {
    const currentCategories = formData.targetCategories || [];
    const newCategories = currentCategories.filter(c => c !== category);
    handleInputChange('targetCategories', newCategories);
  };

  const removeProduct = (productId: string) => {
    const currentProducts = formData.targetProductIds || [];
    const newProducts = currentProducts.filter(p => p !== productId);
    handleInputChange('targetProductIds', newProducts);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.target) {
      newErrors.target = 'Alvo da promoção é obrigatório';
    }

    if (formData.discountType !== 'FREE_SHIPPING' && (!formData.discountValue || formData.discountValue <= 0)) {
      newErrors.discountValue = 'Valor do desconto deve ser maior que zero';
    }

    if (formData.discountType === 'PERCENTAGE' && formData.discountValue > 100) {
      newErrors.discountValue = 'Percentual não pode ser maior que 100%';
    }

    if (formData.maxDiscount && formData.maxDiscount < 0) {
      newErrors.maxDiscount = 'Desconto máximo não pode ser negativo';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Data de início é obrigatória';
    } else if (!isValidDate(formData.startDate)) {
      newErrors.startDate = 'Data de início inválida';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'Data de fim é obrigatória';
    } else if (!isValidDate(formData.endDate)) {
      newErrors.endDate = 'Data de fim inválida';
    }

    if (isValidDate(formData.startDate) && isValidDate(formData.endDate)) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);

      if (endDate <= startDate) {
        newErrors.endDate = 'Data de fim deve ser posterior ao início';
      }
    }

    // Validar seleção baseada em target
    if (formData.target === 'CATEGORY' && (!formData.targetCategories || formData.targetCategories.length === 0)) {
      newErrors.targetCategories = 'Selecione pelo menos uma categoria';
    }

    if (formData.target === 'SPECIFIC_PRODUCTS' && (!formData.targetProductIds || formData.targetProductIds.length === 0)) {
      newErrors.targetProductIds = 'Selecione pelo menos um produto';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Por favor, corrija os erros no formulário');
      return;
    }

    try {
      const backendData = convertToBackendFormat(formData);

      await onSave(backendData);

      toast.success(promotion ? 'Promoção atualizada com sucesso!' : 'Promoção criada com sucesso!');
      onClose();
    } catch (error) {
      console.error('Erro ao salvar promoção:', error);
      toast.error('Erro ao salvar promoção. Verifique os dados e tente novamente.');
    }
  };

  const formatPreview = () => {
    if (formData.discountType === 'FREE_SHIPPING') {
      return 'Frete Grátis';
    }

    if (!formData.discountValue) return '';

    if (formData.discountType === 'PERCENTAGE') {
      let text = `${formData.discountValue}% de desconto`;
      if (formData.maxDiscount) {
        text += ` (máx ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(formData.maxDiscount)})`;
      }
      return text;
    } else {
      return `${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(formData.discountValue)} de desconto`;
    }
  };

  const getPromotionStatus = () => {
    if (!formData.isActive) return { label: 'Inativa', color: 'gray' };

    const now = new Date();
    const starts = formData.startDate ? new Date(formData.startDate) : null;
    const ends = formData.endDate ? new Date(formData.endDate) : null;

    if (starts && now < starts) {
      return { label: 'Agendada', color: 'blue' };
    }

    if (ends && now > ends) {
      return { label: 'Expirada', color: 'red' };
    }

    return { label: 'Ativa', color: 'green' };
  };

  const isEditing = !!promotion?.id;
  const status = getPromotionStatus();

  // Contadores para feedback visual
  const selectedProductsCount = formData.targetProductIds?.length || 0;
  const selectedCategoriesCount = formData.targetCategories?.length || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[calc(100%-2rem)] sm:w-[calc(100%-4rem)] max-h-[calc(100vh-8rem)] sm:max-h-[calc(100vh-4rem)] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-orange-50 to-yellow-50 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <TrendingUp className="h-6 w-6 text-moria-orange" />
            {isEditing ? 'Editar Promoção' : 'Nova Promoção'}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {isEditing
              ? 'Edite as informações da promoção abaixo'
              : 'Configure uma nova campanha de marketing e ofertas especiais'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          <div className="py-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="overflow-x-auto overflow-y-hidden -mx-4 sm:mx-0 px-4 sm:px-0 mb-6" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
                <TabsList className="inline-flex w-auto sm:grid sm:w-full sm:grid-cols-4 gap-1">
                  <TabsTrigger value="basic" className="flex items-center gap-2 text-sm whitespace-nowrap flex-shrink-0">
                    <TrendingUp className="h-4 w-4" />
                    <span>Básico</span>
                  </TabsTrigger>
                  <TabsTrigger value="discount" className="flex items-center gap-2 text-sm whitespace-nowrap flex-shrink-0">
                    <Percent className="h-4 w-4" />
                    <span>Desconto</span>
                  </TabsTrigger>
                  <TabsTrigger value="schedule" className="flex items-center gap-2 text-sm whitespace-nowrap flex-shrink-0">
                    <Calendar className="h-4 w-4" />
                    <span>Período</span>
                  </TabsTrigger>
                  <TabsTrigger value="conditions" className="flex items-center gap-2 text-sm whitespace-nowrap flex-shrink-0">
                    <Settings className="h-4 w-4" />
                    <span>Condições</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Aba Básico */}
              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome da Promoção *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Ex: Black Friday 2024"
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
                    <Label htmlFor="badgeText">Texto do Badge (Opcional)</Label>
                    <Input
                      id="badgeText"
                      value={formData.badgeText || ''}
                      onChange={(e) => handleInputChange('badgeText', e.target.value)}
                      placeholder="Ex: SUPER OFERTA"
                      maxLength={20}
                    />
                    <p className="text-xs text-gray-500">Aparecerá nos cards de produtos</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Descrição detalhada da promoção para os clientes..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shortDescription">Descrição Curta (Opcional)</Label>
                  <Input
                    id="shortDescription"
                    value={formData.shortDescription || ''}
                    onChange={(e) => handleInputChange('shortDescription', e.target.value)}
                    placeholder="Ex: Até 50% OFF em peças selecionadas"
                    maxLength={100}
                  />
                  <p className="text-xs text-gray-500">Usada em banners e listagens</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Switch
                      id="active"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                    />
                    <Label htmlFor="active" className="cursor-pointer">Promoção ativa</Label>
                  </div>
                  <Badge
                    variant="outline"
                    className={`${
                      status.color === 'green' ? 'bg-green-50 text-green-700 border-green-200' :
                      status.color === 'blue' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      status.color === 'red' ? 'bg-red-50 text-red-700 border-red-200' :
                      'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    {status.label}
                  </Badge>
                </div>
              </TabsContent>

              {/* Aba Desconto */}
              <TabsContent value="discount" className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tipo de Desconto *</Label>
                    <Select
                      value={formData.discountType}
                      onValueChange={(value) => handleInputChange('discountType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DISCOUNT_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            <div>
                              <div className="font-medium">{type.label}</div>
                              <div className="text-xs text-gray-500">{type.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.discountType !== 'FREE_SHIPPING' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="discountValue">
                          Valor do Desconto * {formData.discountType === 'PERCENTAGE' ? '(%)' : '(R$)'}
                        </Label>
                        <div className="relative">
                          {formData.discountType === 'PERCENTAGE' ? (
                            <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                          ) : (
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">R$</span>
                          )}
                          <Input
                            id="discountValue"
                            type="number"
                            step={formData.discountType === 'PERCENTAGE' ? "1" : "0.01"}
                            min="0"
                            max={formData.discountType === 'PERCENTAGE' ? "100" : undefined}
                            value={formData.discountValue || ''}
                            onChange={(e) => handleInputChange('discountValue', safeParseFloat(e.target.value) || 0)}
                            placeholder="0"
                            className={`pl-10 ${errors.discountValue ? 'border-red-500' : ''}`}
                          />
                        </div>
                        {errors.discountValue && (
                          <p className="text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {errors.discountValue}
                          </p>
                        )}
                      </div>

                      {formData.discountType === 'PERCENTAGE' && (
                        <div className="space-y-2">
                          <Label htmlFor="maxDiscount">Desconto Máximo (R$)</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">R$</span>
                            <Input
                              id="maxDiscount"
                              type="number"
                              step="0.01"
                              min="0"
                              value={formData.maxDiscount ?? ''}
                              onChange={(e) => handleInputChange('maxDiscount', safeParseFloat(e.target.value))}
                              placeholder="Sem limite"
                              className="pl-10"
                            />
                          </div>
                          <p className="text-xs text-gray-500">Opcional: limite máximo do desconto em reais</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Preview do Desconto */}
                  {(formData.discountValue > 0 || formData.discountType === 'FREE_SHIPPING') && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                        <h4 className="font-bold text-green-900 text-lg">Preview do Desconto</h4>
                      </div>
                      <p className="text-green-800 font-bold text-2xl">
                        {formatPreview()}
                      </p>
                      {formData.discountType === 'PERCENTAGE' && formData.discountValue > 0 && (
                        <div className="mt-4 space-y-1 text-sm text-green-700">
                          <p>• Em um produto de R$ 100,00: <span className="font-bold">R$ {(100 * formData.discountValue / 100).toFixed(2)} de desconto</span></p>
                          <p>• Em um produto de R$ 500,00: <span className="font-bold">R$ {Math.min(500 * formData.discountValue / 100, formData.maxDiscount || Infinity).toFixed(2)} de desconto</span></p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Aba Período */}
              <TabsContent value="schedule" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Data/Hora de Início *</Label>
                    <Input
                      id="startDate"
                      type="datetime-local"
                      value={formData.startDate}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                      className={errors.startDate ? 'border-red-500' : ''}
                    />
                    {errors.startDate && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.startDate}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate">Data/Hora de Fim *</Label>
                    <Input
                      id="endDate"
                      type="datetime-local"
                      value={formData.endDate}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                      className={errors.endDate ? 'border-red-500' : ''}
                    />
                    {errors.endDate && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.endDate}
                      </p>
                    )}
                  </div>
                </div>

                {formData.startDate && formData.endDate && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Duração da Promoção
                    </h4>
                    <p className="text-blue-800 font-semibold">
                      {(() => {
                        const start = new Date(formData.startDate);
                        const end = new Date(formData.endDate);
                        const diffTime = Math.abs(end.getTime() - start.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));

                        if (diffDays >= 1) {
                          return `${diffDays} dia${diffDays > 1 ? 's' : ''} (${diffHours}h)`;
                        } else {
                          return `${diffHours} hora${diffHours > 1 ? 's' : ''}`;
                        }
                      })()}
                    </p>
                    <div className="mt-3 text-sm text-blue-700 space-y-1">
                      <p>Início: {new Date(formData.startDate).toLocaleString('pt-BR')}</p>
                      <p>Fim: {new Date(formData.endDate).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Aba Condições */}
              <TabsContent value="conditions" className="space-y-6">
                {loadingData ? (
                  <div className="text-center py-12">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-moria-orange" />
                    <p className="text-sm text-gray-600 mt-3">Carregando produtos e categorias...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Seleção de Alvo */}
                    <div className="space-y-3">
                      <Label className="text-base font-medium">Onde aplicar esta promoção? *</Label>
                      <Select
                        value={formData.target}
                        onValueChange={(value) => handleInputChange('target', value)}
                      >
                        <SelectTrigger className={errors.target ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Selecione onde aplicar a promoção" />
                        </SelectTrigger>
                        <SelectContent>
                          {TARGET_TYPES.map(target => (
                            <SelectItem key={target.value} value={target.value}>
                              <div>
                                <div className="font-medium">{target.label}</div>
                                <div className="text-xs text-gray-500">{target.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.target && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.target}
                        </p>
                      )}

                      {/* Debug info */}
                      <p className="text-xs text-gray-500">
                        Target atual: <span className="font-mono font-bold">{formData.target}</span>
                      </p>
                    </div>

                    {/* Seleção de Categorias */}
                    {formData.target === 'CATEGORY' && (
                      <div className="space-y-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <Label className="text-base font-medium flex items-center gap-2">
                            <Tag className="h-4 w-4 text-purple-600" />
                            Categorias Elegíveis *
                          </Label>
                          {selectedCategoriesCount > 0 && (
                            <Badge className="bg-purple-600">
                              {selectedCategoriesCount} selecionada{selectedCategoriesCount > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">Clique nas categorias para selecioná-las ({availableCategories.length} disponíveis)</p>

                        {/* Categorias selecionadas */}
                        {formData.targetCategories && formData.targetCategories.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3 p-3 bg-white rounded border border-purple-200">
                            {formData.targetCategories.map(category => (
                              <Badge key={category} variant="secondary" className="gap-1 bg-purple-100 text-purple-800">
                                {category}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeCategory(category);
                                  }}
                                  className="ml-1 hover:text-red-600 transition-colors"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Lista de categorias disponíveis */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto bg-white border border-purple-200 rounded-lg p-3">
                          {availableCategories.map(category => {
                            const isSelected = formData.targetCategories?.includes(category) || false;
                            return (
                              <button
                                key={category}
                                type="button"
                                onClick={() => handleCategoryToggle(category)}
                                className={`flex items-center justify-between p-2 rounded text-sm transition-all ${
                                  isSelected
                                    ? 'bg-purple-500 text-white font-medium'
                                    : 'bg-white hover:bg-purple-100 text-gray-700 border border-gray-200'
                                }`}
                              >
                                <span>{category}</span>
                                {isSelected && <Check className="h-4 w-4 ml-2" />}
                              </button>
                            );
                          })}
                        </div>
                        {errors.targetCategories && (
                          <p className="text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {errors.targetCategories}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Seleção de Produtos */}
                    {formData.target === 'SPECIFIC_PRODUCTS' && (
                      <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <Label className="text-base font-medium flex items-center gap-2">
                            <Package className="h-4 w-4 text-blue-600" />
                            Produtos Específicos *
                          </Label>
                          {selectedProductsCount > 0 && (
                            <Badge className="bg-blue-600">
                              {selectedProductsCount} selecionado{selectedProductsCount > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">Selecione os produtos onde esta promoção será aplicada ({availableProducts.length} disponíveis)</p>

                        {/* Produtos selecionados */}
                        {formData.targetProductIds && formData.targetProductIds.length > 0 && (
                          <div className="space-y-2 mb-3">
                            <Label className="text-sm font-medium">Produtos Selecionados:</Label>
                            <div className="flex flex-wrap gap-2 p-3 bg-white rounded border border-blue-200 max-h-32 overflow-y-auto">
                              {formData.targetProductIds.map(productId => {
                                const product = availableProducts.find(p => p.id === productId);
                                return product ? (
                                  <Badge key={productId} variant="secondary" className="gap-1 bg-blue-100 text-blue-800">
                                    {product.name}
                                    <button
                                      type="button"
                                      onClick={() => removeProduct(productId)}
                                      className="ml-1 hover:text-red-600 transition-colors"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                ) : null;
                              })}
                            </div>
                          </div>
                        )}

                        {/* Lista de produtos disponíveis */}
                        <div className="max-h-64 overflow-y-auto bg-white border border-blue-200 rounded-lg">
                          <div className="p-2 space-y-1">
                            {availableProducts.map(product => {
                              const isSelected = formData.targetProductIds?.includes(product.id) || false;
                              return (
                                <button
                                  key={product.id}
                                  type="button"
                                  onClick={() => handleProductToggle(product.id)}
                                  className={`w-full flex items-center justify-between p-3 rounded text-sm transition-all ${
                                    isSelected
                                      ? 'bg-blue-500 text-white font-medium shadow-md'
                                      : 'bg-white hover:bg-blue-100 border border-transparent hover:border-blue-300'
                                  }`}
                                >
                                  <div className="flex-1 text-left">
                                    <span className="block font-medium">{product.name}</span>
                                    <p className={`text-xs mt-0.5 ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>
                                      {product.category} • {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.promoPrice || product.salePrice)}
                                    </p>
                                  </div>
                                  {isSelected && <Check className="h-4 w-4 ml-2 flex-shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        {errors.targetProductIds && (
                          <p className="text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {errors.targetProductIds}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Condições adicionais */}
                    <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
                      <h4 className="font-medium text-gray-900">Configurações Adicionais</h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="minPurchaseAmount">Valor Mínimo do Pedido (R$)</Label>
                          <Input
                            id="minPurchaseAmount"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.minPurchaseAmount ?? ''}
                            onChange={(e) => handleInputChange('minPurchaseAmount', safeParseFloat(e.target.value))}
                            placeholder="Ex: 100.00"
                          />
                          <p className="text-xs text-gray-500">Deixe vazio para não ter valor mínimo</p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="usageLimitPerCustomer">Limite de Uso por Cliente</Label>
                          <Input
                            id="usageLimitPerCustomer"
                            type="number"
                            min="1"
                            value={formData.usageLimitPerCustomer ?? ''}
                            onChange={(e) => handleInputChange('usageLimitPerCustomer', safeParseInt(e.target.value))}
                            placeholder="Ex: 1"
                          />
                          <p className="text-xs text-gray-500">Quantas vezes cada cliente pode usar</p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="usageLimit">Limite Total de Usos</Label>
                          <Input
                            id="usageLimit"
                            type="number"
                            min="1"
                            value={formData.usageLimit ?? ''}
                            onChange={(e) => handleInputChange('usageLimit', safeParseInt(e.target.value))}
                            placeholder="Ex: 100"
                          />
                          <p className="text-xs text-gray-500">Limite global da promoção</p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="code">Código da Promoção (Opcional)</Label>
                          <Input
                            id="code"
                            value={formData.code || ''}
                            onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                            placeholder="Ex: BLACKFRIDAY"
                            maxLength={20}
                          />
                          <p className="text-xs text-gray-500">Para aplicação manual pelo cliente</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div className="flex items-center justify-between space-x-2 p-3 bg-gray-50 rounded border">
                          <Label htmlFor="autoApply" className="cursor-pointer text-sm">
                            Aplicar automaticamente no carrinho
                          </Label>
                          <Switch
                            id="autoApply"
                            checked={formData.autoApply}
                            onCheckedChange={(checked) => handleInputChange('autoApply', checked)}
                          />
                        </div>

                        <div className="flex items-center justify-between space-x-2 p-3 bg-gray-50 rounded border">
                          <Label htmlFor="canCombine" className="cursor-pointer text-sm">
                            Pode combinar com outras promoções
                          </Label>
                          <Switch
                            id="canCombine"
                            checked={formData.canCombineWithOthers}
                            onCheckedChange={(checked) => handleInputChange('canCombineWithOthers', checked)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="priority">Prioridade (0-10)</Label>
                        <Input
                          id="priority"
                          type="number"
                          min="0"
                          max="10"
                          value={formData.priority}
                          onChange={(e) => handleInputChange('priority', safeParseInt(e.target.value) || 0)}
                        />
                        <p className="text-xs text-gray-500">Promoções com maior prioridade são aplicadas primeiro</p>
                      </div>
                    </div>

                    {/* Resumo da promoção */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-5">
                      <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5" />
                        Resumo da Configuração
                      </h4>
                      <div className="text-blue-800 text-sm space-y-2">
                        {formData.target === 'ALL_PRODUCTS' && (
                          <p className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                            Será aplicada em <strong>todos os produtos e serviços</strong>
                          </p>
                        )}
                        {formData.target === 'CATEGORY' && formData.targetCategories && formData.targetCategories.length > 0 && (
                          <p className="flex items-start gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-600 mt-1.5"></span>
                            <span>Aplicada nas categorias: <strong>{formData.targetCategories.join(', ')}</strong></span>
                          </p>
                        )}
                        {formData.target === 'SPECIFIC_PRODUCTS' && formData.targetProductIds && formData.targetProductIds.length > 0 && (
                          <p className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                            Aplicada em <strong>{formData.targetProductIds.length} produto(s) específico(s)</strong>
                          </p>
                        )}
                        {formData.minPurchaseAmount && (
                          <p className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                            Valor mínimo do pedido: <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(formData.minPurchaseAmount)}</strong>
                          </p>
                        )}
                        {formData.usageLimitPerCustomer && (
                          <p className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                            Máximo <strong>{formData.usageLimitPerCustomer} uso(s) por cliente</strong>
                          </p>
                        )}
                        {formData.usageLimit && (
                          <p className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                            Limite total de <strong>{formData.usageLimit} uso(s)</strong>
                          </p>
                        )}
                        {formData.autoApply && (
                          <p className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-600"></span>
                            <strong>Aplicação automática</strong> no carrinho
                          </p>
                        )}
                        {formData.code && (
                          <p className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                            Código: <strong>{formData.code}</strong>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <div className="px-6 py-4 border-t bg-gray-50/50 flex items-center justify-between flex-shrink-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="bg-moria-orange hover:bg-moria-orange/90 min-w-[140px]"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Salvar Alterações' : 'Criar Promoção'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
