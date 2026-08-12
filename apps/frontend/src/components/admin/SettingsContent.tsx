import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { AdminPageHeader } from './AdminPageHeader';
import { useSettings } from '@/hooks/useSettings';
import { clearSettingsCache } from '@/hooks/useStoreSettings';
import settingsService from '@/api/settingsService';
import { PdfBrandingSection } from './settings/PdfBrandingSection';
import { PlateLookupSection } from './settings/PlateLookupSection';
import {
  MessageCircle,
  CheckCircle,
  Loader2,
  Truck,
  DollarSign,
  BarChart3,
  Clock,
  Save,
  RotateCcw,
  MapPin,
  Settings
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
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<ViaCepAddressLookupResult[]>([]);
  const [addressLookupMessage, setAddressLookupMessage] = useState<string | null>(null);

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
    // Consulta de placa. Os tokens começam vazios: o servidor nunca devolve o
    // valor salvo, apenas a flag de configurado.
    plateLookupEnabled: false,
    plateLookupBearerToken: '',
    plateLookupDeviceToken: '',
    plateLookupBearerTokenSet: false,
    plateLookupDeviceTokenSet: false,
    // Flags
    whatsappConnected: false,
    correiosConnected: false,
    paymentConnected: false,
    analyticsConnected: false,
  });

  interface ViaCepCepResponse {
    cep?: string;
    logradouro?: string;
    complemento?: string;
    bairro?: string;
    localidade?: string;
    uf?: string;
    erro?: boolean;
  }

  interface ViaCepAddressLookupResult {
    cep: string;
    logradouro: string;
    bairro: string;
    localidade: string;
    uf: string;
  }

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
        plateLookupEnabled: settings.plateLookupEnabled ?? false,
        plateLookupBearerToken: '',
        plateLookupDeviceToken: '',
        plateLookupBearerTokenSet: settings.plateLookupBearerTokenSet ?? false,
        plateLookupDeviceTokenSet: settings.plateLookupDeviceTokenSet ?? false,
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

  const mergeAddressWithExistingNumber = (street: string, currentAddress: string) => {
    const suffix = currentAddress.includes(',') ? currentAddress.slice(currentAddress.indexOf(',')) : '';
    return `${street}${suffix}`.trim();
  };

  const applyAddressSuggestion = (result: ViaCepAddressLookupResult | ViaCepCepResponse) => {
    const formattedCep = result.cep ? formatCEP(result.cep) : '';
    const street = result.logradouro || '';

    setFormData(prev => ({
      ...prev,
      zipCode: formattedCep || prev.zipCode,
      address: street ? mergeAddressWithExistingNumber(street, prev.address) : prev.address,
      city: result.localidade || prev.city,
      state: result.uf || prev.state,
    }));

    setAddressSuggestions([]);
    setAddressLookupMessage(null);
  };

  const searchCep = async (cep: string) => {
    const cleanCep = unformatValue(cep);
    if (cleanCep.length !== 8) {
      return;
    }

    setIsFetchingCep(true);
    setAddressLookupMessage(null);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      if (!response.ok) {
        throw new Error('Falha ao consultar o CEP');
      }

      const data = (await response.json()) as ViaCepCepResponse;

      if (data.erro) {
        setAddressLookupMessage('CEP não encontrado. Verifique o número informado.');
        return;
      }

      applyAddressSuggestion(data);
    } catch (error) {
      console.error('[SettingsContent] Erro ao buscar CEP:', error);
      setAddressLookupMessage('Não foi possível consultar o CEP agora. Tente novamente.');
    } finally {
      setIsFetchingCep(false);
    }
  };

  const searchAddress = async (state: string, city: string, address: string) => {
    const normalizedState = state.trim().toUpperCase();
    const normalizedCity = city.trim();
    const normalizedAddress = address.split(',')[0].trim();

    if (normalizedState.length !== 2 || normalizedCity.length < 3 || normalizedAddress.length < 3) {
      setAddressSuggestions([]);
      setAddressLookupMessage(null);
      return;
    }

    setIsSearchingAddress(true);
    setAddressLookupMessage(null);

    try {
      const cityParam = encodeURIComponent(normalizedCity);
      const addressParam = encodeURIComponent(normalizedAddress);
      const response = await fetch(
        `https://viacep.com.br/ws/${normalizedState}/${cityParam}/${addressParam}/json/`
      );

      if (!response.ok) {
        throw new Error('Falha ao consultar o endereço');
      }

      const data = (await response.json()) as ViaCepAddressLookupResult[];
      const suggestions = Array.isArray(data) ? data.slice(0, 5) : [];

      setAddressSuggestions(suggestions);

      if (suggestions.length === 1) {
        applyAddressSuggestion(suggestions[0]);
        return;
      }

      if (suggestions.length === 0) {
        setAddressLookupMessage('Nenhum CEP encontrado para esse endereço.');
      }
    } catch (error) {
      console.error('[SettingsContent] Erro ao buscar endereço:', error);
      setAddressSuggestions([]);
      setAddressLookupMessage('Não foi possível consultar o endereço agora. Tente novamente.');
    } finally {
      setIsSearchingAddress(false);
    }
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value);
    handleInputChange('phone', formatted);
  };

  const handleWhatsAppChange = (value: string) => {
    const formatted = formatPhone(value);
    handleInputChange('whatsapp', formatted);
  };

  useEffect(() => {
    const cleanCep = unformatValue(formData.zipCode);
    if (cleanCep.length !== 8) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void searchCep(formData.zipCode);
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [formData.zipCode]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void searchAddress(formData.state, formData.city, formData.address);
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [formData.state, formData.city, formData.address]);

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
      // Flags de "token já salvo" são apenas de exibição e não vão ao backend.
      const {
        plateLookupBearerTokenSet: _bearerSet,
        plateLookupDeviceTokenSet: _deviceSet,
        plateLookupBearerToken,
        plateLookupDeviceToken,
        ...rest
      } = formData;

      // Preparar dados para envio (converter phone para formato WhatsApp no backend)
      const dataToSend = {
        ...rest,
        // Remove formatação de CNPJ e CEP
        cnpj: formData.cnpj ? unformatValue(formData.cnpj) : undefined,
        zipCode: formData.zipCode ? unformatValue(formData.zipCode) : undefined,
        // Converte phone e whatsapp para formato WhatsApp
        phone: toWhatsAppFormat(formData.phone),
        whatsapp: toWhatsAppFormat(formData.whatsapp),
        pdfHeaderLogoUrl: formData.pdfHeaderLogoUrl.trim() || null,
        pdfFooterLogoUrl: formData.pdfFooterLogoUrl.trim() || null,
        // Campo em branco significa "manter o token atual": só envia quando o
        // usuário digitou algo, senão salvar outra configuração apagaria o token.
        ...(plateLookupBearerToken.trim()
          ? { plateLookupBearerToken: plateLookupBearerToken.trim() }
          : {}),
        ...(plateLookupDeviceToken.trim()
          ? { plateLookupDeviceToken: plateLookupDeviceToken.trim() }
          : {}),
      };

      await updateSettings(dataToSend);

      // Tokens não voltam do servidor: limpa os campos e marca como salvos.
      setFormData((prev) => ({
        ...prev,
        plateLookupBearerToken: '',
        plateLookupDeviceToken: '',
        plateLookupBearerTokenSet:
          prev.plateLookupBearerTokenSet || Boolean(plateLookupBearerToken.trim()),
        plateLookupDeviceTokenSet:
          prev.plateLookupDeviceTokenSet || Boolean(plateLookupDeviceToken.trim()),
      }));

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
    <div className="min-w-0 max-w-full space-y-6">
      <Card>
        <CardHeader>
          <AdminPageHeader
            icon={Settings}
            title="Configurações do Sistema"
            description="Configure e gerencie as definições da loja."
          />
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
                  placeholder="M2 Center Auto"
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
                  placeholder="contato@m2centerauto.com.br"
                  className={validationErrors.email ? 'border-red-500' : ''}
                />
                {validationErrors.email && (
                  <p className="text-xs text-red-500">{validationErrors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">CEP</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => handleCEPChange(e.target.value)}
                    maxLength={9}
                    className={validationErrors.zipCode ? 'border-red-500' : ''}
                    placeholder="00000-000"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => void searchCep(formData.zipCode)}
                    disabled={isFetchingCep || unformatValue(formData.zipCode).length !== 8}
                  >
                    {isFetchingCep ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                  </Button>
                </div>
                {validationErrors.zipCode && (
                  <p className="text-xs text-red-500">{validationErrors.zipCode}</p>
                )}
                {!validationErrors.zipCode && (
                  <p className="text-xs text-gray-500">
                    Digite o CEP para preencher endereço, cidade e UF automaticamente.
                  </p>
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
                <div className="flex min-h-5 items-center gap-2 text-xs text-gray-500">
                  {isSearchingAddress ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Buscando CEPs para o endereço informado...</span>
                    </>
                  ) : (
                    <span>Ao digitar rua + cidade + UF, o sistema busca CEPs compatíveis automaticamente.</span>
                  )}
                </div>
                {addressLookupMessage && (
                  <p className="text-xs text-amber-600">{addressLookupMessage}</p>
                )}
                {addressSuggestions.length > 1 && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <p className="mb-2 text-xs font-medium text-slate-700">
                      Encontramos estes CEPs para o endereço. Escolha o correto:
                    </p>
                    <div className="space-y-2">
                      {addressSuggestions.map((suggestion) => (
                        <button
                          key={`${suggestion.cep}-${suggestion.logradouro}`}
                          type="button"
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-xs transition hover:border-moria-orange hover:bg-orange-50"
                          onClick={() => applyAddressSuggestion(suggestion)}
                        >
                          <span className="block font-medium text-slate-900">
                            {suggestion.logradouro}
                          </span>
                          <span className="block text-slate-600">
                            {suggestion.bairro} • {suggestion.localidade}/{suggestion.uf} • {formatCEP(suggestion.cep)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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
              <div className="flex flex-col gap-3 rounded-lg bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
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
              <div className="flex flex-col gap-3 rounded-lg bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
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
              <div className="flex flex-col gap-3 rounded-lg bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
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
                  <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                  <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                  <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                  <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

          <PlateLookupSection
            enabled={formData.plateLookupEnabled}
            bearerToken={formData.plateLookupBearerToken}
            deviceToken={formData.plateLookupDeviceToken}
            bearerTokenSet={formData.plateLookupBearerTokenSet}
            deviceTokenSet={formData.plateLookupDeviceTokenSet}
            onChange={handleInputChange}
          />

          <Separator />

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="outline"
              className="w-full text-red-600 hover:text-red-700 sm:w-auto"
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
              className="w-full bg-moria-orange hover:bg-moria-orange/90 sm:w-auto"
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
