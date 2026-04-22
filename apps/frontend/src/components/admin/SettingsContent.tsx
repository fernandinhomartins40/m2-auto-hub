import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { useSettings } from '@/hooks/useSettings';
import { clearSettingsCache } from '@/hooks/useStoreSettings';
import settingsService from '@/api/settingsService';
import { PdfBrandingSection } from './settings/PdfBrandingSection';
import {
  MessageCircle,
  CheckCircle,
  Loader2,
  Truck,
  DollarSign,
  BarChart3,
  Clock,
  Save,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import {
  formatCNPJ,
  formatCEP,
  formatPhone,
  unformatValue,
  toWhatsAppFormat,
  isValidCNPJFormat,
  isValidCEPFormat,
  isValidPhoneFormat,
  isValidEmail,
  isValidUF,
  validationMessages
} from '@/utils/formatters';

export function SettingsContent() {
  const { settings, loading, updateSettings, resetSettings } = useSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [testingApi, setTestingApi] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Form state
  const [formData, setFormData] = useState({
    // Informações da Empresa
    storeName: '',
    cnpj: '',
    phone: '',
    whatsapp: '', // WhatsApp para envio de mensagens
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',

    // Configurações de Vendas
    defaultMargin: 35,
    freeShippingMin: 150,
    deliveryFee: 15.90,
    deliveryDays: 3,

    // Notificações
    notifyNewOrders: true,
    notifyLowStock: true,
    notifyWeeklyReports: false,

    // Integrações
    whatsappApiKey: '',
    correiosApiKey: '',
    paymentGatewayKey: '',
    googleAnalyticsId: '',
    pdfHeaderLogoUrl: '',
    pdfHeaderHtml: '',
    pdfFooterLogoUrl: '',
    pdfFooterHtml: '',

    // Flags
    whatsappConnected: false,
    correiosConnected: false,
    paymentConnected: false,
    analyticsConnected: false,
  });

  // Carregar dados quando settings mudar
  useEffect(() => {
    if (settings) {
      setFormData({
        storeName: settings.storeName || '',
        // Formatar CNPJ se vier sem formatação
        cnpj: settings.cnpj ? formatCNPJ(settings.cnpj) : '',
        // Formatar telefone (se vier no formato WhatsApp, converte para formato brasileiro)
        phone: settings.phone ? formatPhone(settings.phone.replace(/^55/, '')) : '',
        // WhatsApp para envio de mensagens (mesma lógica do phone)
        whatsapp: settings.whatsapp ? formatPhone(settings.whatsapp.replace(/^55/, '')) : '',
        email: settings.email || '',
        address: settings.address || '',
        city: settings.city || '',
        state: settings.state || '',
        // Formatar CEP se vier sem formatação
        zipCode: settings.zipCode ? formatCEP(settings.zipCode) : '',
        defaultMargin: Number(settings.defaultMargin) || 35,
        freeShippingMin: Number(settings.freeShippingMin) || 150,
        deliveryFee: Number(settings.deliveryFee) || 15.90,
        deliveryDays: settings.deliveryDays || 3,
        notifyNewOrders: settings.notifyNewOrders,
        notifyLowStock: settings.notifyLowStock,
        notifyWeeklyReports: settings.notifyWeeklyReports,
        whatsappApiKey: settings.whatsappApiKey || '',
        correiosApiKey: settings.correiosApiKey || '',
        paymentGatewayKey: settings.paymentGatewayKey || '',
        googleAnalyticsId: settings.googleAnalyticsId || '',
        pdfHeaderLogoUrl: settings.pdfHeaderLogoUrl || '',
        pdfHeaderHtml: settings.pdfHeaderHtml || '',
        pdfFooterLogoUrl: settings.pdfFooterLogoUrl || '',
        pdfFooterHtml: settings.pdfFooterHtml || '',
        whatsappConnected: settings.whatsappConnected,
        correiosConnected: settings.correiosConnected,
        paymentConnected: settings.paymentConnected,
        analyticsConnected: settings.analyticsConnected,
      });
    }
  }, [settings]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpa erro de validação quando o usuário edita o campo
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handlers com formatação automática
  const handleCNPJChange = (value: string) => {
    const formatted = formatCNPJ(value);
    handleInputChange('cnpj', formatted);
  };

  const handleCEPChange = (value: string) => {
    const formatted = formatCEP(value);
    handleInputChange('zipCode', formatted);
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value);
    handleInputChange('phone', formatted);
  };

  const handleWhatsAppChange = (value: string) => {
    const formatted = formatPhone(value);
    handleInputChange('whatsapp', formatted);
  };

  // Validação antes de salvar
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Validar campos obrigatórios
    if (!formData.storeName.trim()) {
      errors.storeName = validationMessages.required;
    }

    if (!formData.phone.trim()) {
      errors.phone = validationMessages.required;
    } else if (!isValidPhoneFormat(formData.phone)) {
      errors.phone = validationMessages.phone;
    }

    // Validar WhatsApp (obrigatório para envio de mensagens)
    if (!formData.whatsapp.trim()) {
      errors.whatsapp = validationMessages.required;
    } else if (!isValidPhoneFormat(formData.whatsapp)) {
      errors.whatsapp = validationMessages.phone;
    }

    // Validar formatos (se preenchidos)
    if (formData.cnpj && !isValidCNPJFormat(formData.cnpj)) {
      errors.cnpj = validationMessages.cnpj;
    }

    if (formData.zipCode && !isValidCEPFormat(formData.zipCode)) {
      errors.zipCode = validationMessages.cep;
    }

    if (formData.email && !isValidEmail(formData.email)) {
      errors.email = validationMessages.email;
    }

    if (formData.state && !isValidUF(formData.state)) {
      errors.state = validationMessages.uf;
    }

    // Validar ranges numéricos
    if (formData.defaultMargin < 0 || formData.defaultMargin > 100) {
      errors.defaultMargin = validationMessages.range(0, 100);
    }

    if (formData.freeShippingMin < 0) {
      errors.freeShippingMin = validationMessages.minValue(0);
    }

    if (formData.deliveryFee < 0) {
      errors.deliveryFee = validationMessages.minValue(0);
    }

    if (formData.deliveryDays < 1) {
      errors.deliveryDays = validationMessages.minValue(1);
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    // Validar antes de salvar
    if (!validateForm()) {
      toast.error('Corrija os erros no formulário', {
        description: 'Verifique os campos destacados em vermelho e corrija as informações.',
        duration: 5000,
      });
      return;
    }

    setIsSaving(true);
    try {
      // Preparar dados para envio (converter phone para formato WhatsApp no backend)
      const dataToSend = {
        ...formData,
        // Remove formatação de CNPJ e CEP
        cnpj: formData.cnpj ? unformatValue(formData.cnpj) : undefined,
        zipCode: formData.zipCode ? unformatValue(formData.zipCode) : undefined,
        // Converte phone e whatsapp para formato WhatsApp
        phone: toWhatsAppFormat(formData.phone),
        whatsapp: toWhatsAppFormat(formData.whatsapp),
        pdfHeaderLogoUrl: formData.pdfHeaderLogoUrl.trim() || null,
        pdfFooterLogoUrl: formData.pdfFooterLogoUrl.trim() || null,
      };

      await updateSettings(dataToSend);
      // Limpar cache público para atualizar frontend
      clearSettingsCache();
      toast.success('Configurações salvas com sucesso!', {
        description: 'Todas as alterações foram aplicadas.',
      });
    } catch (error: any) {
      console.error('[SettingsContent] Erro ao salvar:', error);

      // Tratar erros de validação do backend (Zod)
      if (error.details && Array.isArray(error.details)) {
        const errorMessages = error.details.map((err: any) => {
          const field = err.path?.join('.') || 'campo';
          return `${field}: ${err.message}`;
        }).join('\n');

        toast.error('Erro de validação', {
          description: errorMessages,
          duration: 7000,
        });
      } else {
        toast.error('Erro ao salvar configurações', {
          description: error.message || 'Ocorreu um erro ao salvar. Tente novamente.',
          duration: 5000,
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Tem certeza que deseja resetar todas as configurações para os valores padrão?')) {
      return;
    }

    setIsResetting(true);
    try {
      await resetSettings();
      clearSettingsCache();
      toast.success('Configurações resetadas com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao resetar configurações');
    } finally {
      setIsResetting(false);
    }
  };

  const handleTestApi = async (apiType: 'whatsapp' | 'correios' | 'payment') => {
    const apiKeyMap = {
      whatsapp: formData.whatsappApiKey,
      correios: formData.correiosApiKey,
      payment: formData.paymentGatewayKey,
    };

    const apiKey = apiKeyMap[apiType];
    if (!apiKey) {
      toast.error('Informe a API Key primeiro');
      return;
    }

    setTestingApi(apiType);
    try {
      let result;
      if (apiType === 'whatsapp') {
        result = await settingsService.testWhatsAppConnection(apiKey);
      } else if (apiType === 'correios') {
        result = await settingsService.testCorreiosConnection(apiKey);
      } else {
        result = await settingsService.testPaymentConnection(apiKey);
      }

      const flagMap = {
        whatsapp: 'whatsappConnected',
        correios: 'correiosConnected',
        payment: 'paymentConnected',
      };

      if (result.connected) {
        toast.success(result.message || 'Conexão bem-sucedida!');
        // Atualizar flag de conexão
        handleInputChange(flagMap[apiType], true);
      } else {
        toast.error(result.message || 'Falha na conexão');
        handleInputChange(flagMap[apiType], false);
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao testar conexão');
    } finally {
      setTestingApi(null);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-moria-orange" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações do Sistema</CardTitle>
          <CardDescription>Configure e gerencie as definições da loja</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Informações da Loja */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Informações da Loja</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="storeName">Nome da Loja *</Label>
                <Input
                  id="storeName"
                  value={formData.storeName}
                  onChange={(e) => handleInputChange('storeName', e.target.value)}
                  placeholder="Moria Peças & Serviços"
                  className={validationErrors.storeName ? 'border-red-500' : ''}
                />
                {validationErrors.storeName && (
                  <p className="text-xs text-red-500">{validationErrors.storeName}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={formData.cnpj}
                  onChange={(e) => handleCNPJChange(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                  className={validationErrors.cnpj ? 'border-red-500' : ''}
                />
                {validationErrors.cnpj && (
                  <p className="text-xs text-red-500">{validationErrors.cnpj}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  className={validationErrors.phone ? 'border-red-500' : ''}
                />
                {validationErrors.phone && (
                  <p className="text-xs text-red-500">{validationErrors.phone}</p>
                )}
                <p className="text-xs text-gray-500">
                  Telefone para contato geral
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp *</Label>
                <Input
                  id="whatsapp"
                  value={formData.whatsapp}
                  onChange={(e) => handleWhatsAppChange(e.target.value)}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  className={validationErrors.whatsapp ? 'border-red-500' : ''}
                />
                {validationErrors.whatsapp && (
                  <p className="text-xs text-red-500">{validationErrors.whatsapp}</p>
                )}
                <p className="text-xs text-gray-500">
                  Número para envio de mensagens automáticas
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="contato@moriapecas.com"
                  className={validationErrors.email ? 'border-red-500' : ''}
                />
                {validationErrors.email && (
                  <p className="text-xs text-red-500">{validationErrors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">CEP</Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => handleCEPChange(e.target.value)}
                  maxLength={9}
                  className={validationErrors.zipCode ? 'border-red-500' : ''}
                  placeholder="00000-000"
                />
                {validationErrors.zipCode && (
                  <p className="text-xs text-red-500">{validationErrors.zipCode}</p>
                )}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Endereço Completo</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Av. das Oficinas, 123 - Centro"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="São Paulo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Estado (UF)</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value.toUpperCase())}
                  placeholder="SP"
                  maxLength={2}
                  className={validationErrors.state ? 'border-red-500' : ''}
                />
                {validationErrors.state && (
                  <p className="text-xs text-red-500">{validationErrors.state}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Configurações de Vendas */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Configurações de Vendas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="defaultMargin">Margem de Lucro Padrão (%)</Label>
                <Input
                  id="defaultMargin"
                  type="number"
                  value={formData.defaultMargin}
                  onChange={(e) => handleInputChange('defaultMargin', Number(e.target.value))}
                  min="0"
                  max="100"
                  className={validationErrors.defaultMargin ? 'border-red-500' : ''}
                />
                {validationErrors.defaultMargin && (
                  <p className="text-xs text-red-500">{validationErrors.defaultMargin}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="freeShippingMin">Valor Mínimo para Frete Grátis (R$)</Label>
                <Input
                  id="freeShippingMin"
                  type="number"
                  value={formData.freeShippingMin}
                  onChange={(e) => handleInputChange('freeShippingMin', Number(e.target.value))}
                  min="0"
                  step="0.01"
                  className={validationErrors.freeShippingMin ? 'border-red-500' : ''}
                />
                {validationErrors.freeShippingMin && (
                  <p className="text-xs text-red-500">{validationErrors.freeShippingMin}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliveryFee">Taxa de Entrega (R$)</Label>
                <Input
                  id="deliveryFee"
                  type="number"
                  value={formData.deliveryFee}
                  onChange={(e) => handleInputChange('deliveryFee', Number(e.target.value))}
                  min="0"
                  step="0.01"
                  className={validationErrors.deliveryFee ? 'border-red-500' : ''}
                />
                {validationErrors.deliveryFee && (
                  <p className="text-xs text-red-500">{validationErrors.deliveryFee}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliveryDays">Tempo de Entrega (dias)</Label>
                <Input
                  id="deliveryDays"
                  type="number"
                  value={formData.deliveryDays}
                  onChange={(e) => handleInputChange('deliveryDays', Number(e.target.value))}
                  min="1"
                  className={validationErrors.deliveryDays ? 'border-red-500' : ''}
                />
                {validationErrors.deliveryDays && (
                  <p className="text-xs text-red-500">{validationErrors.deliveryDays}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Notificações */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Notificações</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Novos Pedidos</p>
                  <p className="text-sm text-gray-600">Receber notificação quando houver novos pedidos</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className={formData.notifyNewOrders ? "bg-green-100 text-green-800" : ""}
                  onClick={() => handleInputChange('notifyNewOrders', !formData.notifyNewOrders)}
                >
                  {formData.notifyNewOrders ? (
                    <><CheckCircle className="h-4 w-4 mr-1" /> Ativo</>
                  ) : (
                    <><Clock className="h-4 w-4 mr-1" /> Inativo</>
                  )}
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Estoque Baixo</p>
                  <p className="text-sm text-gray-600">Alerta quando produtos estão com estoque baixo</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className={formData.notifyLowStock ? "bg-green-100 text-green-800" : ""}
                  onClick={() => handleInputChange('notifyLowStock', !formData.notifyLowStock)}
                >
                  {formData.notifyLowStock ? (
                    <><CheckCircle className="h-4 w-4 mr-1" /> Ativo</>
                  ) : (
                    <><Clock className="h-4 w-4 mr-1" /> Inativo</>
                  )}
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Relatórios Semanais</p>
                  <p className="text-sm text-gray-600">Receber relatório semanal de vendas por e-mail</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className={formData.notifyWeeklyReports ? "bg-green-100 text-green-800" : ""}
                  onClick={() => handleInputChange('notifyWeeklyReports', !formData.notifyWeeklyReports)}
                >
                  {formData.notifyWeeklyReports ? (
                    <><CheckCircle className="h-4 w-4 mr-1" /> Ativo</>
                  ) : (
                    <><Clock className="h-4 w-4 mr-1" /> Inativo</>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Integrações */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Integrações</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <MessageCircle className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="font-medium">WhatsApp Business</p>
                        <p className="text-sm text-gray-600">
                          {formData.whatsappConnected ? 'Integração ativa' : 'Não configurado'}
                        </p>
                      </div>
                    </div>
                    <Badge className={formData.whatsappConnected ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                      {formData.whatsappConnected ? 'Conectado' : 'Desconectado'}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Input
                      placeholder="API Key do WhatsApp"
                      type="password"
                      value={formData.whatsappApiKey}
                      onChange={(e) => handleInputChange('whatsappApiKey', e.target.value)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleTestApi('whatsapp')}
                      disabled={testingApi === 'whatsapp' || !formData.whatsappApiKey}
                    >
                      {testingApi === 'whatsapp' ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Testando...</>
                      ) : (
                        'Testar Conexão'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <Truck className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="font-medium">Correios API</p>
                        <p className="text-sm text-gray-600">
                          {formData.correiosConnected ? 'Integração ativa' : 'Não configurado'}
                        </p>
                      </div>
                    </div>
                    <Badge className={formData.correiosConnected ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                      {formData.correiosConnected ? 'Conectado' : 'Desconectado'}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Input
                      placeholder="API Key dos Correios"
                      type="password"
                      value={formData.correiosApiKey}
                      onChange={(e) => handleInputChange('correiosApiKey', e.target.value)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleTestApi('correios')}
                      disabled={testingApi === 'correios' || !formData.correiosApiKey}
                    >
                      {testingApi === 'correios' ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Testando...</>
                      ) : (
                        'Testar Conexão'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <DollarSign className="h-8 w-8 text-purple-600" />
                      <div>
                        <p className="font-medium">Gateway Pagamento</p>
                        <p className="text-sm text-gray-600">
                          {formData.paymentConnected ? 'Integração ativa' : 'Não configurado'}
                        </p>
                      </div>
                    </div>
                    <Badge className={formData.paymentConnected ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                      {formData.paymentConnected ? 'Conectado' : 'Desconectado'}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Input
                      placeholder="API Key do Gateway"
                      type="password"
                      value={formData.paymentGatewayKey}
                      onChange={(e) => handleInputChange('paymentGatewayKey', e.target.value)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleTestApi('payment')}
                      disabled={testingApi === 'payment' || !formData.paymentGatewayKey}
                    >
                      {testingApi === 'payment' ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Testando...</>
                      ) : (
                        'Testar Conexão'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <BarChart3 className="h-8 w-8 text-orange-600" />
                      <div>
                        <p className="font-medium">Google Analytics</p>
                        <p className="text-sm text-gray-600">
                          {formData.analyticsConnected ? 'Integração ativa' : 'Não configurado'}
                        </p>
                      </div>
                    </div>
                    <Badge className={formData.analyticsConnected ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                      {formData.analyticsConnected ? 'Conectado' : 'Desconectado'}
                    </Badge>
                  </div>
                  <Input
                    placeholder="Google Analytics ID"
                    value={formData.googleAnalyticsId}
                    onChange={(e) => handleInputChange('googleAnalyticsId', e.target.value)}
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          <Separator />

          {/* Botões de Ação */}
          <PdfBrandingSection
            storeName={formData.storeName}
            pdfHeaderLogoUrl={formData.pdfHeaderLogoUrl}
            pdfHeaderHtml={formData.pdfHeaderHtml}
            pdfFooterLogoUrl={formData.pdfFooterLogoUrl}
            pdfFooterHtml={formData.pdfFooterHtml}
            onChange={handleInputChange}
          />

          <Separator />

          <div className="flex justify-between gap-4">
            <Button
              variant="outline"
              className="text-red-600 hover:text-red-700"
              onClick={handleReset}
              disabled={isResetting || isSaving}
            >
              {isResetting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Resetando...</>
              ) : (
                <><RotateCcw className="h-4 w-4 mr-2" /> Resetar para Padrão</>
              )}
            </Button>
            <Button
              className="bg-moria-orange hover:bg-moria-orange/90"
              onClick={handleSave}
              disabled={isSaving || isResetting}
            >
              {isSaving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
              ) : (
                <><Save className="h-4 w-4 mr-2" /> Salvar Configurações</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
