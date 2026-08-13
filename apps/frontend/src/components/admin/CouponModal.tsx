import { useEffect, useState } from 'react';
import { AlertCircle, Gift, Loader2, Percent, Settings } from 'lucide-react';

import type { Coupon, CouponDiscountType, CouponUpsertInput } from '@/api/couponService';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';

type CouponFormData = {
  code: string;
  description: string;
  discountType: CouponDiscountType;
  discountValue?: number;
  maxDiscount?: number;
  minValue?: number;
  usageLimit?: number;
  usedCount: number;
  expiresAt: string;
  isActive: boolean;
};

interface CouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (coupon: CouponUpsertInput | Partial<CouponUpsertInput>) => Promise<void>;
  coupon?: Coupon | null;
  loading?: boolean;
}

const getDefaultFormData = (): CouponFormData => ({
  code: '',
  description: '',
  discountType: 'PERCENTAGE',
  discountValue: undefined,
  maxDiscount: undefined,
  minValue: undefined,
  usageLimit: 1,
  usedCount: 0,
  expiresAt: '',
  isActive: true,
});

const safeParseFloat = (value: string): number | undefined => {
  if (!value || value.trim() === '') {
    return undefined;
  }

  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const safeParseInt = (value: string): number | undefined => {
  if (!value || value.trim() === '') {
    return undefined;
  }

  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const safeNumber = (value: number | string | null | undefined): number | undefined => {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export function CouponModal({
  isOpen,
  onClose,
  onSave,
  coupon,
  loading = false,
}: CouponModalProps) {
  const [formData, setFormData] = useState<CouponFormData>(getDefaultFormData());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (!coupon) {
      setFormData(getDefaultFormData());
      setErrors({});
      setActiveTab('basic');
      return;
    }

    setFormData({
      code: coupon.code || '',
      description: coupon.description || '',
      discountType: coupon.discountType || 'PERCENTAGE',
      discountValue: safeNumber(coupon.discountValue) ?? 0,
      maxDiscount: safeNumber(coupon.maxDiscount ?? coupon.maxValue),
      minValue: safeNumber(coupon.minValue),
      usageLimit: coupon.usageLimit ?? 1,
      usedCount: coupon.usedCount ?? 0,
      expiresAt: coupon.expiresAt ? coupon.expiresAt.split('T')[0] : '',
      isActive: coupon.isActive ?? true,
    });
    setErrors({});
    setActiveTab('basic');
  }, [coupon, isOpen]);

  const handleInputChange = <K extends keyof CouponFormData>(field: K, value: CouponFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';

    for (let index = 0; index < 8; index += 1) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    handleInputChange('code', result);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.code.trim()) {
      newErrors.code = 'Codigo e obrigatorio';
    } else if (formData.code.trim().length < 3) {
      newErrors.code = 'Codigo deve ter pelo menos 3 caracteres';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Descrição é obrigatória';
    }

    if (!formData.discountValue || formData.discountValue <= 0) {
      newErrors.discountValue = 'Valor do desconto deve ser maior que zero';
    }

    if (formData.discountType === 'PERCENTAGE' && (formData.discountValue ?? 0) > 100) {
      newErrors.discountValue = 'Percentual nao pode ser maior que 100%';
    }

    if (!formData.usageLimit || formData.usageLimit < 1) {
      newErrors.usageLimit = 'Limite de uso deve ser pelo menos 1';
    }

    if (formData.minValue !== undefined && formData.minValue < 0) {
      newErrors.minValue = 'Valor minimo nao pode ser negativo';
    }

    if (formData.maxDiscount !== undefined && formData.maxDiscount < 0) {
      newErrors.maxDiscount = 'Desconto maximo nao pode ser negativo';
    }

    if (!formData.expiresAt) {
      newErrors.expiresAt = 'Data de expiracao e obrigatoria';
    } else {
      const expiryDate = new Date(formData.expiresAt);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (expiryDate < today) {
        newErrors.expiresAt = 'Data de expiracao deve ser futura';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    const payload: CouponUpsertInput = {
      code: formData.code.trim().toUpperCase(),
      description: formData.description.trim(),
      discountType: formData.discountType,
      discountValue: formData.discountValue ?? 0,
      expiresAt: new Date(formData.expiresAt).toISOString(),
      usageLimit: formData.usageLimit,
      isActive: formData.isActive,
      ...(formData.minValue !== undefined ? { minValue: formData.minValue } : {}),
      ...(formData.maxDiscount !== undefined ? { maxDiscount: formData.maxDiscount } : {}),
    };

    try {
      await onSave(payload);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar cupom:', error);
    }
  };

  const formatPreview = () => {
    if (!formData.discountValue) {
      return '';
    }

    if (formData.discountType === 'PERCENTAGE') {
      let text = `${formData.discountValue}% de desconto`;

      if (formData.maxDiscount) {
        text += ` (max ${new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(formData.maxDiscount)})`;
      }

      return text;
    }

    return `${new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(formData.discountValue)} de desconto`;
  };

  const isEditing = Boolean(coupon?.id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl sm:w-[calc(100vw-2rem)] md:w-[calc(100vw-4rem)] sm:max-h-[calc(100vh-3rem)] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gray-50/50">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Gift className="h-5 w-5 text-moria-orange" />
            {isEditing ? 'Editar Cupom' : 'Novo Cupom'}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {isEditing
              ? 'Edite as informacoes do cupom abaixo'
              : 'Preencha as informacoes do novo cupom'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 min-h-0">
          <div className="py-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div
                className="overflow-x-auto overflow-y-hidden -mx-4 sm:mx-0 px-4 sm:px-0"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                <TabsList className="grid grid-flow-col auto-cols-max sm:auto-cols-fr w-max sm:w-full h-10 items-stretch gap-1">
                  <TabsTrigger
                    value="basic"
                    className="h-full w-full flex items-center justify-center gap-2 text-sm whitespace-nowrap"
                  >
                    <Gift className="h-4 w-4" />
                    <span>Basico</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="discount"
                    className="h-full w-full flex items-center justify-center gap-2 text-sm whitespace-nowrap"
                  >
                    <Percent className="h-4 w-4" />
                    <span>Desconto</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="rules"
                    className="h-full w-full flex items-center justify-center gap-2 text-sm whitespace-nowrap"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Regras</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Codigo do Cupom *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                        placeholder="Ex: DESCONTO10"
                        className={`font-mono ${errors.code ? 'border-red-500' : ''}`}
                        maxLength={20}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={generateRandomCode}
                        className="whitespace-nowrap"
                      >
                        Gerar
                      </Button>
                    </div>
                    {errors.code && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.code}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">Codigo unico que os clientes vao usar</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expiresAt">Data de Expiracao *</Label>
                    <Input
                      id="expiresAt"
                      type="date"
                      value={formData.expiresAt}
                      onChange={(e) => handleInputChange('expiresAt', e.target.value)}
                      className={errors.expiresAt ? 'border-red-500' : ''}
                      min={new Date().toISOString().split('T')[0]}
                    />
                    {errors.expiresAt && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.expiresAt}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      Informe uma data futura para o cupom permanecer valido.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Descrição do cupom para os clientes..."
                    rows={3}
                    className={errors.description ? 'border-red-500' : ''}
                  />
                  {errors.description && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                  />
                  <Label htmlFor="active">Cupom ativo</Label>
                  {formData.isActive ? (
                    <Badge variant="outline" className="text-green-600">
                      Ativo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-500">
                      Inativo
                    </Badge>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="discount" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tipo de Desconto *</Label>
                    <Select
                      value={formData.discountType}
                      onValueChange={(value) =>
                        handleInputChange('discountType', value as CouponDiscountType)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PERCENTAGE">Percentual (%)</SelectItem>
                        <SelectItem value="FIXED">Valor fixo (R$)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="discountValue">
                        Valor do Desconto * {formData.discountType === 'PERCENTAGE' ? '(%)' : '(R$)'}
                      </Label>
                      <div className="relative">
                        {formData.discountType === 'PERCENTAGE' ? (
                          <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                        ) : (
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                            R$
                          </span>
                        )}
                        <Input
                          id="discountValue"
                          type="number"
                          step={formData.discountType === 'PERCENTAGE' ? '1' : '0.01'}
                          min="0"
                          max={formData.discountType === 'PERCENTAGE' ? '100' : undefined}
                          value={formData.discountValue ?? ''}
                          onChange={(e) =>
                            handleInputChange('discountValue', safeParseFloat(e.target.value))
                          }
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
                        <Label htmlFor="maxDiscount">Desconto Maximo (R$)</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                            R$
                          </span>
                          <Input
                            id="maxDiscount"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.maxDiscount ?? ''}
                            onChange={(e) =>
                              handleInputChange('maxDiscount', safeParseFloat(e.target.value))
                            }
                            placeholder="Sem limite"
                            className={`pl-10 ${errors.maxDiscount ? 'border-red-500' : ''}`}
                          />
                        </div>
                        {errors.maxDiscount && (
                          <p className="text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {errors.maxDiscount}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          Limite maximo para descontos percentuais
                        </p>
                      </div>
                    )}
                  </div>

                  {(formData.discountValue ?? 0) > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-medium text-green-900 mb-2">Preview do Desconto</h4>
                      <p className="text-green-800 font-medium">{formatPreview()}</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="rules" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minValue">Valor Minimo do Pedido (R$)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                        R$
                      </span>
                      <Input
                        id="minValue"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.minValue ?? ''}
                        onChange={(e) => handleInputChange('minValue', safeParseFloat(e.target.value))}
                        placeholder="Sem minimo"
                        className={`pl-10 ${errors.minValue ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors.minValue && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.minValue}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      Valor minimo do pedido para usar o cupom
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="usageLimit">Limite de Uso *</Label>
                    <Input
                      id="usageLimit"
                      type="number"
                      min="1"
                      value={formData.usageLimit ?? ''}
                      onChange={(e) => handleInputChange('usageLimit', safeParseInt(e.target.value))}
                      placeholder="1"
                      className={errors.usageLimit ? 'border-red-500' : ''}
                    />
                    {errors.usageLimit && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.usageLimit}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      Quantas vezes o cupom pode ser usado
                    </p>
                  </div>
                </div>

                {isEditing && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Estatisticas de Uso</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm text-blue-800">
                      <div>
                        <span className="text-blue-600">Usado:</span>
                        <span className="font-medium ml-2">{formData.usedCount || 0} vezes</span>
                      </div>
                      <div>
                        <span className="text-blue-600">Restante:</span>
                        <span className="font-medium ml-2">
                          {Math.max(0, (formData.usageLimit || 0) - (formData.usedCount || 0))} vezes
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <div className="px-6 py-3 border-t bg-gray-50/50 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} size="sm">
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={loading}
              size="sm"
              className="bg-moria-orange hover:bg-moria-orange/90"
            >
              {loading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              {isEditing ? 'Salvar Alteracoes' : 'Criar Cupom'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
