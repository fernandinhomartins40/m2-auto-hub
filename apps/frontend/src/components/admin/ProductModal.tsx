import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { AlertCircle, Loader2, Package, DollarSign, Warehouse, Settings, Images, CheckCircle } from 'lucide-react';
import { ProductImageUpload, ProductImage } from './ProductImageUpload';
import { useToast } from '../ui/use-toast';
import { Product as ApiProduct } from '@/api/productService';
import { getImageUrl } from '@/utils/imageUrl';

// Interface local para o form (snake_case para compatibilidade com código existente)
interface ProductFormData {
  id?: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  price?: number;
  original_price?: number;
  sale_price?: number;
  discount_price?: number;
  promo_price?: number;
  cost_price?: number;
  stock: number;
  min_stock: number;
  sku: string;
  supplier: string;
  image_url?: string;
  images: string[];
  is_active: boolean;
  is_favorite?: boolean;
  specifications: Record<string, string>;
  vehicle_compatibility: string[];
  // Ofertas
  offer_type?: 'DIA' | 'SEMANA' | 'MES' | null;
  offer_start_date?: string;
  offer_end_date?: string;
  offer_badge?: string;
}

// Usar a interface do backend para as props
type Product = ApiProduct;

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Partial<Product>) => Promise<void>;
  product?: Product | null;
  loading?: boolean;
  categories?: string[];
}

const DEFAULT_PRODUCT_CATEGORIES = [
  'Filtros',
  'Freios',
  'Motor',
  'Suspensão',
  'Elétrica',
  'Óleos',
  'Pneus',
  'Carroceria',
  'Transmissão',
  'Combustível',
  'Ar Condicionado',
  'Sistema de Ignição'
];

export function ProductModal({
  isOpen,
  onClose,
  onSave,
  product,
  loading = false,
  categories = [],
}: ProductModalProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<ProductFormData>>({
    name: '',
    description: '',
    category: '',
    subcategory: '',
    price: undefined,
    sale_price: undefined,
    promo_price: undefined,
    cost_price: undefined,
    stock: 0,
    min_stock: 5,
    sku: '',
    supplier: '',
    images: [],
    is_active: true,
    specifications: {},
    vehicle_compatibility: []
  });

  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('basic');

  const availableCategories = useMemo(() => {
    const baseCategories = categories.length > 0 ? categories : DEFAULT_PRODUCT_CATEGORIES;
    return [...new Set([...baseCategories, formData.category].filter((value): value is string => Boolean(value)))];
  }, [categories, formData.category]);

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

  // Preencher form quando produto é editado
  useEffect(() => {
    if (product) {
      // Mapear campos do backend (camelCase) para o form (snake_case)
      setFormData({
        id: product.id,
        name: product.name || '',
        description: product.description || '',
        category: product.category || '',
        subcategory: product.subcategory || '',
        price: product.salePrice || 0,
        sale_price: product.salePrice || 0,
        promo_price: product.promoPrice || 0,
        cost_price: product.costPrice || 0,
        stock: product.stock || 0,
        min_stock: product.minStock || 5,
        sku: product.sku || '',
        supplier: product.supplier || '',
        images: product.images || [],
        is_active: product.status === 'ACTIVE',
        specifications: product.specifications || {},
        vehicle_compatibility: product.vehicleCompatibility || [],
        // Ofertas
        offer_type: (product as any).offerType || null,
        offer_start_date: (product as any).offerStartDate ? new Date((product as any).offerStartDate).toISOString().slice(0, 16) : '',
        offer_end_date: (product as any).offerEndDate ? new Date((product as any).offerEndDate).toISOString().slice(0, 16) : '',
        offer_badge: (product as any).offerBadge || ''
      });

      // Converter imagens existentes para ProductImage para preview
      if (product.images && product.images.length > 0) {
        const existingImages: ProductImage[] = product.images.map((url, index) => ({
          id: `existing-${index}`,
          url: getImageUrl(url),
          file: null, // Não há arquivo para imagens existentes
          status: 'ready' as const,
          progress: 100,
          isExisting: true // Marcar como imagem existente
        }));
        setProductImages(existingImages);
      } else {
        setProductImages([]);
      }
    } else {
      // Resetar form para novo produto
      setFormData({
        name: '',
        description: '',
        category: '',
        subcategory: '',
        price: undefined,
        sale_price: undefined,
        promo_price: undefined,
        cost_price: undefined,
        stock: 0,
        min_stock: 5,
        sku: '',
        supplier: '',
        image_url: '',
        images: [],
        is_active: true,
        is_favorite: false,
        specifications: {},
        vehicle_compatibility: []
      });
      setProductImages([]);
    }
    setErrors({});
    setActiveTab('basic');
  }, [product, isOpen]);

  // Helper para calcular datas padrão baseadas no tipo de oferta
  const getDefaultOfferDates = (offerType: 'DIA' | 'SEMANA' | 'MES') => {
    const now = new Date();
    const startDate = new Date(now);
    const endDate = new Date(now);

    // Definir data de início para agora
    startDate.setMinutes(0);
    startDate.setSeconds(0);
    startDate.setMilliseconds(0);

    // Definir data de fim baseada no tipo
    switch (offerType) {
      case 'DIA':
        endDate.setDate(endDate.getDate() + 1);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'SEMANA':
        endDate.setDate(endDate.getDate() + 7);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'MES':
        endDate.setDate(endDate.getDate() + 30);
        endDate.setHours(23, 59, 59, 999);
        break;
    }

    return {
      startDate: startDate.toISOString().slice(0, 16),
      endDate: endDate.toISOString().slice(0, 16)
    };
  };

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    // Se mudou o tipo de oferta, aplicar smart defaults nas datas
    if (field === 'offer_type') {
      if (value && value !== 'NONE') {
        const { startDate, endDate } = getDefaultOfferDates(value as 'DIA' | 'SEMANA' | 'MES');

        // Aplicar datas padrão apenas se não houver datas já preenchidas
        setFormData(prev => ({
          ...prev,
          [field]: value,
          offer_start_date: prev.offer_start_date || startDate,
          offer_end_date: prev.offer_end_date || endDate
        }));

        // Limpar erros de data ao selecionar tipo de oferta
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.offer_start_date;
          delete newErrors.offer_end_date;
          delete newErrors[field];
          return newErrors;
        });
      } else {
        // Se removeu a oferta, limpar as datas
        setFormData(prev => ({
          ...prev,
          [field]: null,
          offer_start_date: '',
          offer_end_date: '',
          offer_badge: ''
        }));
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
      // Limpar erro do campo quando usuário digita
      if (errors[field]) {
        setErrors(prev => ({ ...prev, [field]: '' }));
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validações obrigatórias
    if (!formData.name?.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.category) {
      newErrors.category = 'Categoria é obrigatória';
    }

    // Verificar se pelo menos um preço foi informado
    if ((!formData.price || formData.price <= 0) && (!formData.original_price || formData.original_price <= 0)) {
      newErrors.price = 'Preço deve ser maior que zero';
    }

    if (formData.sale_price !== undefined && formData.sale_price < 0) {
      newErrors.sale_price = 'Preço de venda não pode ser negativo';
    }

    if (formData.promo_price !== undefined && formData.promo_price < 0) {
      newErrors.promo_price = 'Preço promocional não pode ser negativo';
    }

    if (formData.stock !== undefined && formData.stock < 0) {
      newErrors.stock = 'Estoque não pode ser negativo';
    }

    if (formData.min_stock !== undefined && formData.min_stock < 0) {
      newErrors.min_stock = 'Estoque mínimo não pode ser negativo';
    }

    // Validações de ofertas
    if (formData.offer_type && formData.offer_type !== 'NONE') {
      // Datas são obrigatórias quando há tipo de oferta
      if (!formData.offer_start_date) {
        newErrors.offer_start_date = 'Data de início é obrigatória para ofertas';
      }

      if (!formData.offer_end_date) {
        newErrors.offer_end_date = 'Data de fim é obrigatória para ofertas';
      }

      // Validar se data de fim é maior que data de início
      if (formData.offer_start_date && formData.offer_end_date) {
        const startDate = new Date(formData.offer_start_date);
        const endDate = new Date(formData.offer_end_date);

        if (endDate <= startDate) {
          newErrors.offer_end_date = 'Data de fim deve ser posterior à data de início';
        }
      }

      // Preço de venda é obrigatório para calcular desconto
      if (!formData.sale_price || formData.sale_price <= 0) {
        newErrors.sale_price = 'Preço de venda é obrigatório para produtos em oferta';
      }

      // Preço promocional é obrigatório para ofertas
      if (!formData.promo_price || formData.promo_price <= 0) {
        newErrors.promo_price = 'Preço promocional é obrigatório para ofertas (vá para aba "Preços")';
      }

      // Preço promocional deve ser menor que o preço de venda
      if (formData.promo_price && formData.sale_price && formData.promo_price >= formData.sale_price) {
        newErrors.promo_price = 'Preço promocional deve ser menor que o preço de venda (R$ ' + formData.sale_price.toFixed(2) + ')';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      // Identificar qual aba tem erros e navegar para ela
      const errorKeys = Object.keys(errors);
      let targetTab = 'basic';

      if (errorKeys.some(key => ['offer_type', 'offer_start_date', 'offer_end_date', 'offer_badge'].includes(key))) {
        targetTab = 'offers';
      } else if (errorKeys.some(key => ['price', 'sale_price', 'promo_price', 'cost_price'].includes(key))) {
        targetTab = 'pricing';
      } else if (errorKeys.includes('images')) {
        targetTab = 'images';
      } else if (errorKeys.some(key => ['stock', 'min_stock'].includes(key))) {
        targetTab = 'inventory';
      } else if (errorKeys.some(key => ['sku', 'subcategory', 'supplier'].includes(key))) {
        targetTab = 'details';
      }

      setActiveTab(targetTab);

      toast({
        title: "Erro de validação",
        description: `Corrija os erros na aba "${getTabName(targetTab)}" antes de salvar.`,
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // Separar imagens novas (com arquivo) das existentes (só URL)
      const newImages = productImages.filter(img => img.file && img.status === 'ready');
      const existingImageUrls = productImages
        .filter(img => img.isExisting && img.url)
        .map(img => {
          // Remover o baseURL se existir para manter apenas o caminho relativo
          const baseUrl = (import.meta.env.VITE_API_BASE_URL?.trim() || '/api').replace(/\/$/, '');
          return img.url.replace(baseUrl, '').replace(/^\//, '');
        });

      // Validar se há pelo menos uma imagem (nova ou existente)
      if (newImages.length === 0 && existingImageUrls.length === 0) {
        setErrors(prev => ({ ...prev, images: 'Adicione pelo menos uma imagem do produto' }));
        setActiveTab('images');
        toast({
          title: "Imagem obrigatória",
          description: "Adicione pelo menos uma imagem do produto.",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      // Criar FormData para upload
      const uploadData = new FormData();

      // Adicionar arquivos de imagem (apenas novas)
      newImages.forEach((img) => {
        if (img.file) {
          uploadData.append('images', img.file);
        }
      });

      // Mapear campos do formData para o formato do backend
      // Converter valores string para number quando necessário
      const costPrice = Number(formData.cost_price || formData.price || 0);
      const salePrice = Number(formData.sale_price || formData.price || 0);
      const promoPrice = formData.promo_price ? Number(formData.promo_price) : undefined;
      const stock = Number(formData.stock || 0);
      const minStock = Number(formData.min_stock || 5);

      // Dados que serão enviados para o backend
      uploadData.append('name', formData.name.trim());
      uploadData.append('description', (formData.description || '').trim());
      uploadData.append('category', formData.category);

      if (formData.subcategory?.trim()) {
        uploadData.append('subcategory', formData.subcategory.trim());
      }

      uploadData.append('sku', (formData.sku || `SKU-${Date.now()}`).toUpperCase());
      uploadData.append('supplier', (formData.supplier || 'Não informado').trim());
      uploadData.append('costPrice', costPrice.toString());
      uploadData.append('salePrice', salePrice.toString());

      if (promoPrice) {
        uploadData.append('promoPrice', promoPrice.toString());
      }

      uploadData.append('stock', stock.toString());
      uploadData.append('minStock', minStock.toString());
      uploadData.append('status', formData.is_active ? 'ACTIVE' : 'DISCONTINUED');

      // Enviar specifications como JSON string
      if (formData.specifications && Object.keys(formData.specifications).length > 0) {
        uploadData.append('specifications', JSON.stringify(formData.specifications));
      }

      // Enviar vehicle_compatibility como JSON string (manter snake_case pois backend espera assim)
      if (formData.vehicle_compatibility && formData.vehicle_compatibility.length > 0) {
        uploadData.append('vehicle_compatibility', JSON.stringify(formData.vehicle_compatibility));
      }

      // Ofertas
      if (formData.offer_type) {
        uploadData.append('offerType', formData.offer_type);
      }
      if (formData.offer_start_date) {
        uploadData.append('offerStartDate', new Date(formData.offer_start_date).toISOString());
      }
      if (formData.offer_end_date) {
        uploadData.append('offerEndDate', new Date(formData.offer_end_date).toISOString());
      }
      if (formData.offer_badge) {
        uploadData.append('offerBadge', formData.offer_badge.trim());
      }

      // Se estiver editando, manter imagens existentes
      if (formData.id && existingImageUrls.length > 0) {
        uploadData.append('existingImages', JSON.stringify(existingImageUrls));
      }

      // Enviar para API usando httpOnly cookie (credentials: 'include')
      const apiUrl = (import.meta.env.VITE_API_BASE_URL?.trim() || '/api').replace(/\/$/, '');
      const url = formData.id
        ? `${apiUrl}/products/${formData.id}`
        : `${apiUrl}/products`;
      const method = formData.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        credentials: 'include', // Envia o cookie httpOnly automaticamente
        body: uploadData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const validationDetails = Array.isArray(errorData.details)
          ? errorData.details
              .map((detail: { field?: string; message?: string }) => detail.message || detail.field)
              .filter(Boolean)
              .join(' | ')
          : '';

        throw new Error(
          validationDetails ||
          errorData.error ||
          errorData.message ||
          'Erro ao salvar produto'
        );
      }

      const result = await response.json();

      // Toast de sucesso
      toast({
        title: formData.id ? "Produto atualizado!" : "Produto criado!",
        description: formData.id
          ? "As alterações foram salvas com sucesso."
          : "O produto foi criado e já está disponível.",
        variant: "default",
      });

      // Chamar callback de sucesso com dados retornados
      await onSave(result.data);

      // Fechar modal
      onClose();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);

      const errorMessage = error instanceof Error ? error.message : 'Erro ao salvar produto. Tente novamente.';

      setErrors(prev => ({
        ...prev,
        general: errorMessage
      }));

      toast({
        title: "Erro ao salvar",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getTabName = (tabId: string): string => {
    const tabNames: Record<string, string> = {
      basic: 'Básico',
      images: 'Imagens',
      pricing: 'Preços',
      inventory: 'Estoque',
      offers: 'Ofertas',
      details: 'Detalhes'
    };
    return tabNames[tabId] || tabId;
  };

  // Verificar se uma tab tem erros
  const hasTabErrors = (tabId: string): boolean => {
    const errorKeys = Object.keys(errors);

    switch (tabId) {
      case 'basic':
        return errorKeys.some(key => ['name', 'category', 'description', 'is_active'].includes(key));
      case 'images':
        return errorKeys.includes('images');
      case 'pricing':
        return errorKeys.some(key => ['price', 'sale_price', 'promo_price', 'cost_price'].includes(key));
      case 'inventory':
        return errorKeys.some(key => ['stock', 'min_stock'].includes(key));
      case 'offers':
        return errorKeys.some(key => ['offer_type', 'offer_start_date', 'offer_end_date', 'offer_badge'].includes(key));
      case 'details':
        return errorKeys.some(key => ['sku', 'subcategory', 'supplier'].includes(key));
      default:
        return false;
    }
  };

  const isEditing = !!product?.id;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] md:w-[calc(100vw-4rem)] max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-3rem)] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b bg-gray-50/50 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5 text-moria-orange" />
            {isEditing ? 'Editar Produto' : 'Novo Produto'}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {isEditing
              ? 'Edite as informações do produto abaixo'
              : 'Preencha as informações do novo produto'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 min-h-0">
          <div className="py-3 sm:py-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="overflow-x-auto overflow-y-hidden -mx-4 sm:mx-0 px-4 sm:px-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
              <TabsList className="inline-flex w-auto sm:grid sm:w-full sm:grid-cols-6 gap-1">
            <TabsTrigger value="basic" className="flex items-center gap-2 text-sm whitespace-nowrap flex-shrink-0 relative">
              <Package className="h-4 w-4" />
              <span>Básico</span>
              {hasTabErrors('basic') && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
              )}
            </TabsTrigger>
            <TabsTrigger value="images" className="flex items-center gap-2 text-sm whitespace-nowrap flex-shrink-0 relative">
              <Images className="h-4 w-4" />
              <span>Imagens</span>
              {hasTabErrors('images') && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
              )}
            </TabsTrigger>
            <TabsTrigger value="pricing" className="flex items-center gap-2 text-sm whitespace-nowrap flex-shrink-0 relative">
              <DollarSign className="h-4 w-4" />
              <span>Preços</span>
              {hasTabErrors('pricing') && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
              )}
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2 text-sm whitespace-nowrap flex-shrink-0 relative">
              <Warehouse className="h-4 w-4" />
              <span>Estoque</span>
              {hasTabErrors('inventory') && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
              )}
            </TabsTrigger>
            <TabsTrigger value="offers" className="flex items-center gap-2 text-sm whitespace-nowrap flex-shrink-0 relative">
              <AlertCircle className="h-4 w-4" />
              <span>Ofertas</span>
              {hasTabErrors('offers') && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
              )}
            </TabsTrigger>
            <TabsTrigger value="details" className="flex items-center gap-2 text-sm whitespace-nowrap flex-shrink-0 relative">
              <Settings className="h-4 w-4" />
              <span>Detalhes</span>
              {hasTabErrors('details') && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
              )}
            </TabsTrigger>
          </TabsList>
          </div>

          {/* Aba Básico */}
          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Produto *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Ex: Filtro de Óleo Mann W75/3"
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
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => handleInputChange('category', value)}
                >
                  <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map(category => (
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
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Descrição detalhada do produto..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleInputChange('is_active', checked)}
              />
              <Label htmlFor="active">Produto ativo</Label>
              {formData.is_active ? (
                <Badge variant="outline" className="text-green-600">Ativo</Badge>
              ) : (
                <Badge variant="outline" className="text-gray-500">Inativo</Badge>
              )}
            </div>
          </TabsContent>

          {/* Aba Imagens */}
          <TabsContent value="images" className="space-y-4">
            <ProductImageUpload
              images={productImages}
              onChange={setProductImages}
              maxImages={10}
              aspectRatio={1}
              maxSizeMB={1}
              maxWidthOrHeight={1200}
              disabled={loading}
            />
            {errors.images && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.images}
              </p>
            )}
          </TabsContent>

          {/* Aba Preços */}
          <TabsContent value="pricing" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cost_price">Preço de Custo</Label>
                <Input
                  id="cost_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost_price ?? ''}
                  onChange={(e) => handleInputChange('cost_price', safeParseFloat(e.target.value))}
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Preço Base *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price ?? ''}
                  onChange={(e) => handleInputChange('price', safeParseFloat(e.target.value))}
                  placeholder="0.00"
                  className={errors.price ? 'border-red-500' : ''}
                />
                {errors.price && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.price}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sale_price">Preço de Venda</Label>
                <Input
                  id="sale_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.sale_price ?? ''}
                  onChange={(e) => handleInputChange('sale_price', safeParseFloat(e.target.value))}
                  placeholder="0.00"
                  className={errors.sale_price ? 'border-red-500' : ''}
                />
                {errors.sale_price && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.sale_price}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="promo_price">Preço Promocional</Label>
                <Input
                  id="promo_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.promo_price ?? ''}
                  onChange={(e) => handleInputChange('promo_price', safeParseFloat(e.target.value))}
                  placeholder="0.00"
                  className={errors.promo_price ? 'border-red-500' : ''}
                />
                {errors.promo_price && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.promo_price}
                  </p>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Aba Estoque */}
          <TabsContent value="inventory" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stock">Quantidade em Estoque</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => handleInputChange('stock', safeParseInt(e.target.value))}
                  placeholder="0"
                  className={errors.stock ? 'border-red-500' : ''}
                />
                {errors.stock && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.stock}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="min_stock">Estoque Mínimo</Label>
                <Input
                  id="min_stock"
                  type="number"
                  min="0"
                  value={formData.min_stock}
                  onChange={(e) => handleInputChange('min_stock', safeParseInt(e.target.value))}
                  placeholder="5"
                  className={errors.min_stock ? 'border-red-500' : ''}
                />
                {errors.min_stock && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.min_stock}
                  </p>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Aba Detalhes */}
          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU / Código</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => handleInputChange('sku', e.target.value)}
                  placeholder="SKU123456"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subcategory">Subcategoria</Label>
                <Input
                  id="subcategory"
                  value={formData.subcategory}
                  onChange={(e) => handleInputChange('subcategory', e.target.value)}
                  placeholder="Ex: Filtro de Óleo, Pastilha Dianteira"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier">Fornecedor</Label>
                <Input
                  id="supplier"
                  value={formData.supplier}
                  onChange={(e) => handleInputChange('supplier', e.target.value)}
                  placeholder="Nome do fornecedor"
                />
              </div>
            </div>
          </TabsContent>

          {/* Aba Ofertas */}
          <TabsContent value="offers" className="space-y-4">
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800 mb-2">🎯 Ofertas Especiais (Dia/Semana/Mês)</h4>
                <p className="text-sm text-yellow-700">
                  Configure este produto como oferta destacada na página inicial.
                  As ofertas aparecem com timer de contagem regressiva e badges especiais.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="offer_type">Tipo de Oferta</Label>
                  <Select
                    value={formData.offer_type || 'NONE'}
                    onValueChange={(value) => handleInputChange('offer_type', value === 'NONE' ? null : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Nenhuma oferta</SelectItem>
                      <SelectItem value="DIA">🔥 Oferta do Dia</SelectItem>
                      <SelectItem value="SEMANA">⭐ Oferta da Semana</SelectItem>
                      <SelectItem value="MES">💎 Oferta do Mês</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    {!formData.offer_type && 'Produto sem oferta especial'}
                    {formData.offer_type === 'DIA' && 'Exibido com timer na seção "Ofertas do Dia"'}
                    {formData.offer_type === 'SEMANA' && 'Exibido na seção "Ofertas da Semana"'}
                    {formData.offer_type === 'MES' && 'Exibido na seção "Ofertas do Mês"'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="offer_badge">Badge da Oferta</Label>
                  <Input
                    id="offer_badge"
                    value={formData.offer_badge || ''}
                    onChange={(e) => handleInputChange('offer_badge', e.target.value)}
                    placeholder="Ex: LIMITADO, QUEIMA DE ESTOQUE"
                    maxLength={50}
                  />
                  <p className="text-xs text-gray-500">Texto que aparece no badge do card (opcional)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="offer_start_date" className="flex items-center gap-1">
                    Data/Hora Início
                    {formData.offer_type && <span className="text-red-500">*</span>}
                  </Label>
                  <Input
                    id="offer_start_date"
                    type="datetime-local"
                    value={formData.offer_start_date || ''}
                    onChange={(e) => handleInputChange('offer_start_date', e.target.value)}
                    className={errors.offer_start_date ? 'border-red-500' : ''}
                    disabled={!formData.offer_type}
                  />
                  {errors.offer_start_date ? (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.offer_start_date}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500">
                      {formData.offer_type
                        ? 'Quando a oferta começa (preenchido automaticamente)'
                        : 'Selecione um tipo de oferta primeiro'}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="offer_end_date" className="flex items-center gap-1">
                    Data/Hora Fim
                    {formData.offer_type && <span className="text-red-500">*</span>}
                  </Label>
                  <Input
                    id="offer_end_date"
                    type="datetime-local"
                    value={formData.offer_end_date || ''}
                    onChange={(e) => handleInputChange('offer_end_date', e.target.value)}
                    className={errors.offer_end_date ? 'border-red-500' : ''}
                    disabled={!formData.offer_type}
                  />
                  {errors.offer_end_date ? (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.offer_end_date}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500">
                      {formData.offer_type
                        ? 'Quando a oferta expira (preenchido automaticamente)'
                        : 'Selecione um tipo de oferta primeiro'}
                    </p>
                  )}
                </div>
              </div>

              {formData.offer_type && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">📝 Lembre-se:</h4>
                  <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                    <li>Configure o <strong>Preço Promocional</strong> na aba "Preços"</li>
                    <li>A oferta só aparece se estiver dentro do período (início/fim)</li>
                    <li>Produtos INATIVOS não aparecem nas ofertas</li>
                    <li>O desconto é calculado automaticamente (Preço Normal - Preço Promocional)</li>
                  </ul>
                </div>
              )}
            </div>
          </TabsContent>
            </Tabs>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-2 sm:py-3 border-t bg-gray-50/50 shrink-0">
          {errors.general && (
            <div className="mb-2">
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.general}
              </p>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving || loading} size="sm">
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave} disabled={isSaving || loading} size="sm" className="bg-moria-orange hover:bg-moria-orange/90">
              {(isSaving || loading) && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              {isSaving
                ? (isEditing ? 'Salvando...' : 'Criando...')
                : (isEditing ? 'Salvar Alterações' : 'Criar Produto')
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
