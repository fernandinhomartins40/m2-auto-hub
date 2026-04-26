import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import {
  Wrench,
  User,
  Phone,
  Mail,
  Plus,
  Minus,
  Trash2,
  Search,
  Loader2,
  X,
  Calculator,
  Calendar,
  FileText,
  MapPin,
  DollarSign
} from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import adminService from "../../api/adminService";
import serviceService from "../../api/serviceService";

interface CreateQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  addresses?: Array<{
    id: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    type: string;
  }>;
}

interface QuoteItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  quotedPrice: number;
  observations: string;
}

interface Address {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  type: 'HOME' | 'WORK' | 'OTHER';
}

export function CreateQuoteModal({ isOpen, onClose, onSuccess }: CreateQuoteModalProps) {
  const { toast } = useToast();

  // Estados principais
  const [step, setStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);

  // Cliente
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);

  // Dados do cliente (para novo cliente)
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCpf, setCustomerCpf] = useState('');

  // Serviços
  const [services, setServices] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<QuoteItem[]>([]);
  const [serviceSearch, setServiceSearch] = useState('');
  const [isLoadingServices, setIsLoadingServices] = useState(false);

  // Observações gerais e validade
  const [generalObservations, setGeneralObservations] = useState('');
  const [validityDays, setValidityDays] = useState(7);

  // Endereço (opcional)
  const [needsAddress, setNeedsAddress] = useState(false);
  const [useExistingAddress, setUseExistingAddress] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [saveAddressToCustomer, setSaveAddressToCustomer] = useState(true);
  const [address, setAddress] = useState<Address>({
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
    type: 'HOME'
  });
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  // Carregar dados iniciais
  useEffect(() => {
    if (isOpen) {
      loadCustomers();
      loadServices();
    }
  }, [isOpen]);

  // Buscar clientes com debounce
  useEffect(() => {
    if (customerSearch.length >= 2) {
      const timer = setTimeout(() => {
        loadCustomers(customerSearch);
      }, 500);
      return () => clearTimeout(timer);
    } else if (customerSearch.length === 0) {
      loadCustomers();
    }
  }, [customerSearch]);

  const loadCustomers = async (search?: string) => {
    setIsLoadingCustomers(true);
    try {
      const response = await adminService.getCustomers({ search, limit: 50 });
      setCustomers(response.customers);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  const loadServices = async () => {
    setIsLoadingServices(true);
    try {
      const response = await serviceService.getServices({ page: 1, limit: 100 });
      setServices(response.services.filter(s => s.status === 'ACTIVE'));
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
    } finally {
      setIsLoadingServices(false);
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerName(customer.name);
    setCustomerEmail(customer.email);
    setCustomerPhone(customer.whatsapp || customer.phone || '');

    // Se cliente tem endereços
    if (customer.addresses && customer.addresses.length > 0) {
      const defaultAddress = customer.addresses.find(addr => addr.type === 'HOME') || customer.addresses[0];
      setSelectedAddressId(defaultAddress.id);
      setUseExistingAddress(true);
    } else {
      setUseExistingAddress(false);
      setSelectedAddressId('');
    }
  };

  const handleAddService = (service: any) => {
    const existingItem = selectedItems.find(i => i.id === service.id);

    if (existingItem) {
      toast({
        title: "Serviço já adicionado",
        description: "Este serviço já está no orçamento. Ajuste a quantidade se necessário.",
        variant: "destructive"
      });
      return;
    }

    const newItem: QuoteItem = {
      id: service.id,
      name: service.name,
      category: service.category,
      quantity: 1,
      quotedPrice: Number(service.basePrice || 0),
      observations: ''
    };

    setSelectedItems([...selectedItems, newItem]);
    toast({
      title: "✅ Serviço adicionado",
      description: `${service.name} foi adicionado ao orçamento`
    });
  };

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems(selectedItems.filter(i => i.id !== itemId));
  };

  const handleQuantityChange = (itemId: string, delta: number) => {
    setSelectedItems(selectedItems.map(item => {
      if (item.id === itemId) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const handlePriceChange = (itemId: string, value: string) => {
    const price = parseFloat(value) || 0;
    setSelectedItems(selectedItems.map(item =>
      item.id === itemId ? { ...item, quotedPrice: price } : item
    ));
  };

  const handleObservationsChange = (itemId: string, value: string) => {
    setSelectedItems(selectedItems.map(item =>
      item.id === itemId ? { ...item, observations: value } : item
    ));
  };

  const searchCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');

    if (cleanCep.length !== 8) {
      return;
    }

    setIsSearchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP e tente novamente",
          variant: "destructive"
        });
        return;
      }

      setAddress({
        ...address,
        street: data.logradouro,
        neighborhood: data.bairro,
        city: data.localidade,
        state: data.uf,
        zipCode: cep
      });
    } catch (error) {
      toast({
        title: "Erro ao buscar CEP",
        description: "Tente novamente mais tarde",
        variant: "destructive"
      });
    } finally {
      setIsSearchingCep(false);
    }
  };

  const calculateTotal = () => {
    return selectedItems.reduce((sum, item) => sum + (item.quotedPrice * item.quantity), 0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const validateStep = (stepNumber: number): boolean => {
    switch (stepNumber) {
      case 1:
        if (!customerName || !customerEmail || !customerPhone) {
          toast({
            title: "Dados incompletos",
            description: "Preencha todos os dados do cliente",
            variant: "destructive"
          });
          return false;
        }
        return true;

      case 2:
        if (selectedItems.length === 0) {
          toast({
            title: "Nenhum serviço selecionado",
            description: "Adicione pelo menos um serviço ao orçamento",
            variant: "destructive"
          });
          return false;
        }
        return true;

      case 3:
        const hasEmptyPrices = selectedItems.some(item => !item.quotedPrice || item.quotedPrice <= 0);
        if (hasEmptyPrices) {
          toast({
            title: "Preços incompletos",
            description: "Defina preços válidos para todos os serviços",
            variant: "destructive"
          });
          return false;
        }
        return true;

      case 4:
        if (needsAddress) {
          if (useExistingAddress) {
            if (!selectedAddressId) {
              toast({
                title: "Endereço não selecionado",
                description: "Selecione um endereço ou cadastre um novo",
                variant: "destructive"
              });
              return false;
            }
          } else {
            if (!address.street || !address.number || !address.neighborhood ||
                !address.city || !address.state || !address.zipCode) {
              toast({
                title: "Endereço incompleto",
                description: "Preencha todos os campos do endereço",
                variant: "destructive"
              });
              return false;
            }
          }
        }
        return true;

      default:
        return true;
    }
  };

  const handleNextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handlePreviousStep = () => {
    setStep(step - 1);
  };

  const handleCreateQuote = async (sendToClient: boolean = false) => {
    if (!validateStep(3)) return;
    if (needsAddress && !validateStep(4)) return;
    if (!needsAddress && !selectedAddressId && !(selectedCustomer?.addresses && selectedCustomer.addresses.length > 0)) {
      toast({
        title: "Endereço necessário",
        description: "Selecione um endereço já cadastrado ou preencha um novo endereço para concluir o orçamento.",
        variant: "destructive"
      });
      setNeedsAddress(true);
      setStep(4);
      return;
    }

    setIsCreating(true);
    try {
      // Preparar dados do cliente
      let customerData: any = {};
      let customerId: string | undefined = selectedCustomer?.id;

      // Se não é cliente existente, criar novo
      if (!selectedCustomer) {
        customerData = {
          name: customerName,
          email: customerEmail,
          phone: customerPhone.replace(/\D/g, ''),
          cpf: customerCpf || undefined
        };
      }

      // Preparar endereço se necessário
      let quoteAddressId: string | undefined = selectedAddressId || undefined;
      let quoteAddress: Address | undefined;
      if (needsAddress) {
        if (useExistingAddress && selectedAddressId) {
          quoteAddressId = selectedAddressId;
        } else {
          quoteAddress = address;

          // Salvar endereço no cadastro do cliente se solicitado
          if (saveAddressToCustomer && selectedCustomer) {
            try {
              const createdAddress = await adminService.createCustomerAddress(selectedCustomer.id, address);
              quoteAddressId = createdAddress.id;
              quoteAddress = undefined;
            } catch (addrError: any) {
              console.error('Erro ao salvar endereço:', addrError);
            }
          }
        }
      }

      // Preparar itens
      const items = selectedItems.map(item => ({
        serviceId: item.id,
        quantity: item.quantity,
        quotedPrice: item.quotedPrice,
        observations: item.observations || undefined
      }));

      // Criar orçamento
      const quoteData = {
        customerId,
        addressId: quoteAddressId,
        customerData: !customerId ? customerData : undefined,
        items,
        observations: generalObservations || undefined,
        validityDays,
        address: quoteAddress,
        sendToClient // true = QUOTED, false = ANALYZING
      };

      await adminService.createQuote(quoteData);

      toast({
        title: "✅ Orçamento criado com sucesso!",
        description: sendToClient
          ? `Orçamento enviado para ${customerName}`
          : `Orçamento salvo como rascunho para ${customerName}`
      });

      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Erro ao criar orçamento:', error);
      toast({
        title: "❌ Erro ao criar orçamento",
        description: error.response?.data?.error || error.message || "Tente novamente",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setSelectedCustomer(null);
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setCustomerCpf('');
    setSelectedItems([]);
    setGeneralObservations('');
    setValidityDays(7);
    setNeedsAddress(false);
    setAddress({
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: '',
      type: 'HOME'
    });
    setCustomerSearch('');
    setServiceSearch('');
    setUseExistingAddress(false);
    setSelectedAddressId('');
    setSaveAddressToCustomer(true);
    onClose();
  };

  const filteredServices = services.filter(s =>
    s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
    s.category.toLowerCase().includes(serviceSearch.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] md:w-[calc(100vw-4rem)] max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-3rem)] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gray-50/50">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Wrench className="h-5 w-5 text-moria-orange" />
            Criar Novo Orçamento
          </DialogTitle>

          {/* Indicador de progresso visual */}
          <div className="mt-3">
            <div className="flex items-center justify-between">
              {[
                { num: 1, label: 'Cliente', icon: User },
                { num: 2, label: 'Serviços', icon: Wrench },
                { num: 3, label: 'Preços', icon: DollarSign },
                { num: 4, label: 'Endereço', icon: MapPin }
              ].map((item, index) => (
                <div key={item.num} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`
                      h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium transition-all
                      ${step > item.num
                        ? 'bg-green-500 text-white'
                        : step === item.num
                        ? 'bg-moria-orange text-white ring-2 ring-moria-orange/30'
                        : 'bg-gray-200 text-gray-500'}
                    `}>
                      {step > item.num ? '✓' : item.num}
                    </div>
                    <span className={`text-[10px] mt-1 ${step === item.num ? 'font-semibold text-moria-orange' : 'text-muted-foreground'}`}>
                      {item.label}
                    </span>
                  </div>
                  {index < 3 && (
                    <div className={`h-0.5 flex-1 mx-1.5 rounded ${step > item.num ? 'bg-green-500' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="py-4 space-y-4">
            {/* ETAPA 1: Cliente */}
            {step === 1 && (
              <div className="space-y-3">
                {/* Cliente selecionado */}
                {selectedCustomer && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm">
                          {customerName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-green-800 text-sm">{customerName}</p>
                            <Badge className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0">
                              Selecionado
                            </Badge>
                          </div>
                          <p className="text-xs text-green-700">{customerEmail} • {customerPhone || 'Sem tel.'}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedCustomer(null);
                          setCustomerName('');
                          setCustomerEmail('');
                          setCustomerPhone('');
                          setUseExistingAddress(false);
                          setSelectedAddressId('');
                        }}
                        className="h-7 w-7 p-0 text-green-700 hover:text-green-900 hover:bg-green-100"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    {selectedCustomer.addresses && selectedCustomer.addresses.length > 0 && (
                      <p className="text-[10px] text-green-600 mt-1.5 pl-10">
                        {selectedCustomer.addresses.length} endereço(s) cadastrado(s)
                      </p>
                    )}
                  </div>
                )}

                {/* Busca de cliente */}
                {!selectedCustomer && (
                  <div>
                    <Label>Buscar Cliente Existente</Label>
                    <div className="relative mt-1">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Digite nome, email ou telefone..."
                        className="pl-10"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                      />
                    </div>

                    {isLoadingCustomers && (
                      <div className="mt-2 text-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        <p className="text-sm text-muted-foreground mt-1">Buscando clientes...</p>
                      </div>
                    )}

                    {customerSearch.length >= 2 && !isLoadingCustomers && customers.length > 0 && (
                      <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto">
                        {customers.map(customer => (
                          <button
                            key={customer.id}
                            className="w-full p-3 text-left hover:bg-moria-orange/10 hover:border-l-4 hover:border-l-moria-orange flex items-center justify-between border-b last:border-b-0 transition-all"
                            onClick={() => handleSelectCustomer(customer)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium text-sm">
                                {customer.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium">{customer.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {customer.email} • {customer.whatsapp || customer.phone || 'Sem telefone'}
                                </p>
                              </div>
                            </div>
                            <Plus className="h-4 w-4 text-moria-orange" />
                          </button>
                        ))}
                      </div>
                    )}

                    {customerSearch.length >= 2 && !isLoadingCustomers && customers.length === 0 && (
                      <div className="mt-2 p-4 text-center border rounded-lg bg-gray-50">
                        <User className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-muted-foreground">Nenhum cliente encontrado</p>
                        <p className="text-xs text-muted-foreground">Preencha os dados abaixo para criar um novo</p>
                      </div>
                    )}
                  </div>
                )}

                <Separator className="my-3" />

                {/* Formulário de dados do cliente */}
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    {selectedCustomer ? (
                      <>
                        <User className="h-4 w-4 text-green-600" />
                        Dados do Cliente
                      </>
                    ) : (
                      <>
                        <User className="h-4 w-4 text-moria-orange" />
                        Novo Cliente
                      </>
                    )}
                  </Label>
                  <div className="flex items-center gap-1">
                    <div className={`h-1.5 w-1.5 rounded-full ${customerName ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <div className={`h-1.5 w-1.5 rounded-full ${customerEmail ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <div className={`h-1.5 w-1.5 rounded-full ${customerPhone ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className="text-[10px] text-muted-foreground ml-1">
                      {[customerName, customerEmail, customerPhone].filter(Boolean).length}/3
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label htmlFor="customerName" className="text-xs">Nome Completo *</Label>
                    <Input
                      id="customerName"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="João Silva"
                      className={`mt-1 h-9 text-sm ${customerName ? 'border-green-300 bg-green-50/30' : ''}`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="customerEmail" className="text-xs">Email *</Label>
                      <Input
                        id="customerEmail"
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="joao@email.com"
                        className={`mt-1 h-9 text-sm ${customerEmail ? 'border-green-300 bg-green-50/30' : ''}`}
                      />
                    </div>

                    <div>
                      <Label htmlFor="customerPhone" className="text-xs">WhatsApp *</Label>
                      <Input
                        id="customerPhone"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="(11) 99999-9999"
                        className={`mt-1 h-9 text-sm ${customerPhone ? 'border-green-300 bg-green-50/30' : ''}`}
                      />
                    </div>
                  </div>

                  {!selectedCustomer && (
                    <div>
                      <Label htmlFor="customerCpf" className="text-xs">CPF (opcional)</Label>
                      <Input
                        id="customerCpf"
                        value={customerCpf}
                        onChange={(e) => setCustomerCpf(e.target.value)}
                        placeholder="000.000.000-00"
                        className="mt-1 h-9 text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ETAPA 2: Serviços */}
            {step === 2 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Adicionar Serviços</Label>
                  <span className="text-xs text-muted-foreground">
                    {selectedItems.length} {selectedItems.length === 1 ? 'serviço' : 'serviços'} selecionados
                  </span>
                </div>

                {/* Lista de serviços disponíveis */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                    <Input
                      placeholder="Buscar serviços..."
                      className="pl-8 h-8 text-sm"
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                    />
                  </div>

                  {!isLoadingServices && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{filteredServices.length} serviços</span>
                      {serviceSearch && (
                        <button
                          onClick={() => setServiceSearch('')}
                          className="text-moria-orange hover:underline"
                        >
                          Limpar
                        </button>
                      )}
                    </div>
                  )}

                  <ScrollArea className="h-44 border rounded-lg">
                    {isLoadingServices ? (
                      <div className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        <p className="text-sm text-muted-foreground mt-2">Carregando serviços...</p>
                      </div>
                    ) : filteredServices.length > 0 ? (
                      <div className="p-2 space-y-2">
                        {filteredServices.map(service => {
                          const isAlreadyAdded = selectedItems.some(i => i.id === service.id);

                          return (
                            <div
                              key={service.id}
                              className={`p-3 border rounded-lg transition-all ${
                                isAlreadyAdded
                                  ? 'bg-green-50 border-green-200'
                                  : 'hover:bg-muted cursor-pointer hover:border-moria-orange'
                              }`}
                              onClick={() => !isAlreadyAdded && handleAddService(service)}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-medium">{service.name}</p>
                                    {isAlreadyAdded && (
                                      <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                                        ✓ Adicionado
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mb-1">
                                    {service.category}
                                  </p>
                                  <p className="text-sm font-semibold text-moria-orange">
                                    {service.basePrice ? formatCurrency(Number(service.basePrice)) : 'Sob consulta'}
                                  </p>
                                </div>
                                {!isAlreadyAdded && (
                                  <Plus className="h-5 w-5 text-moria-orange flex-shrink-0" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Wrench className="h-16 w-16 mx-auto mb-3 opacity-20" />
                        <p className="font-medium mb-1">
                          {serviceSearch ? 'Nenhum serviço encontrado' : 'Nenhum serviço disponível'}
                        </p>
                        {serviceSearch && (
                          <p className="text-sm">
                            Tente buscar com outros termos
                          </p>
                        )}
                      </div>
                    )}
                  </ScrollArea>
                </div>

                <Separator className="my-3" />

                {/* Serviços selecionados */}
                <div>
                  <Label className="text-sm font-semibold mb-2 block">
                    Serviços Selecionados ({selectedItems.length})
                  </Label>

                  {selectedItems.length > 0 ? (
                    <ScrollArea className="h-32 border rounded-lg">
                      <div className="p-2 space-y-1.5">
                        {selectedItems.map(item => (
                          <div key={item.id} className="p-2 bg-gray-50 rounded flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{item.name}</p>
                              <p className="text-xs text-muted-foreground">{item.category}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuantityChange(item.id, -1)}
                                disabled={item.quantity <= 1}
                                className="h-6 w-6 p-0"
                              >
                                <Minus className="h-2.5 w-2.5" />
                              </Button>
                              <span className="w-6 text-center text-sm font-medium">
                                {item.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuantityChange(item.id, 1)}
                                className="h-6 w-6 p-0"
                              >
                                <Plus className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(item.id)}
                              className="h-6 w-6 p-0"
                            >
                              <Trash2 className="h-3 w-3 text-red-600" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground border border-dashed rounded-lg">
                      <Wrench className="h-8 w-8 mx-auto mb-1 opacity-20" />
                      <p className="text-sm">Nenhum serviço selecionado</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ETAPA 3: Preços */}
            {step === 3 && (
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Precificação dos Serviços</Label>

                <div className="space-y-3">
                  {selectedItems.map((item, index) => (
                    <div key={item.id} className="p-3 bg-gray-50 border rounded">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Quantidade: {item.quantity}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <Label htmlFor={`price-${item.id}`} className="text-xs">
                            Preço Unitário *
                          </Label>
                          <div className="relative mt-1">
                            <DollarSign className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                            <Input
                              id={`price-${item.id}`}
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={item.quotedPrice || ''}
                              onChange={(e) => handlePriceChange(item.id, e.target.value)}
                              className="pl-7 h-9 text-sm"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Subtotal</Label>
                          <div className="mt-1 h-9 flex items-center justify-center bg-muted rounded-md font-bold text-sm">
                            {formatCurrency(item.quotedPrice * item.quantity)}
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor={`obs-${item.id}`} className="text-xs">
                          Observações (opcional)
                        </Label>
                        <Textarea
                          id={`obs-${item.id}`}
                          placeholder="Ex: Peça importada, prazo de 15 dias..."
                          value={item.observations}
                          onChange={(e) => handleObservationsChange(item.id, e.target.value)}
                          className="mt-1 text-sm h-16 resize-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center p-2 bg-moria-orange/10 rounded">
                  <div className="flex items-center gap-1.5">
                    <Calculator className="h-3.5 w-3.5 text-moria-orange" />
                    <span className="text-sm font-semibold">Total do Orçamento</span>
                  </div>
                  <span className="text-base font-bold text-moria-orange">
                    {formatCurrency(calculateTotal())}
                  </span>
                </div>

                <Separator className="my-2" />

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Label htmlFor="generalObs" className="text-xs">Observações Gerais</Label>
                    <Textarea
                      id="generalObs"
                      placeholder="Ex: Inclui mão de obra. Peças com garantia de 90 dias..."
                      value={generalObservations}
                      onChange={(e) => setGeneralObservations(e.target.value)}
                      className="mt-1 text-sm"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="validity" className="text-xs">Validade (dias)</Label>
                    <Input
                      id="validity"
                      type="number"
                      min="1"
                      max="30"
                      value={validityDays}
                      onChange={(e) => setValidityDays(parseInt(e.target.value) || 7)}
                      className="mt-1 h-9 text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Válido até: {new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ETAPA 4: Endereço (Opcional) */}
            {step === 4 && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded">
                  <Checkbox
                    id="needsAddress"
                    checked={needsAddress}
                    onCheckedChange={(checked) => setNeedsAddress(checked as boolean)}
                  />
                  <label
                    htmlFor="needsAddress"
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    Este orçamento precisa de endereço de entrega?
                  </label>
                </div>

                {needsAddress && (
                  <>
                    {selectedCustomer?.addresses && selectedCustomer.addresses.length > 0 && (
                      <Select
                        value={useExistingAddress ? selectedAddressId : 'new'}
                        onValueChange={(value) => {
                          if (value === 'new') {
                            setUseExistingAddress(false);
                            setSelectedAddressId('');
                          } else {
                            setUseExistingAddress(true);
                            setSelectedAddressId(value);
                          }
                        }}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Selecione um endereço" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedCustomer.addresses.map(addr => (
                            <SelectItem key={addr.id} value={addr.id} className="text-sm">
                              {addr.street}, {addr.number} - {addr.city}/{addr.state}
                            </SelectItem>
                          ))}
                          <SelectItem value="new" className="text-sm">+ Novo Endereço</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    {(!selectedCustomer?.addresses || selectedCustomer.addresses.length === 0) && (
                      <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                        Cliente sem endereço cadastrado. Preencha abaixo.
                      </div>
                    )}

                    {(!useExistingAddress || !selectedCustomer?.addresses || selectedCustomer.addresses.length === 0) && (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Label htmlFor="zipCode" className="text-xs">CEP *</Label>
                            <Input
                              id="zipCode"
                              value={address.zipCode}
                              onChange={(e) => setAddress({ ...address, zipCode: e.target.value })}
                              placeholder="00000-000"
                              maxLength={9}
                              className="mt-1 h-9 text-sm"
                            />
                          </div>
                          <div className="flex items-end">
                            <Button
                              variant="outline"
                              onClick={() => searchCep(address.zipCode)}
                              disabled={isSearchingCep}
                              className="h-9"
                            >
                              {isSearchingCep ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Search className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                          <div className="col-span-3">
                            <Label htmlFor="street" className="text-xs">Rua *</Label>
                            <Input
                              id="street"
                              value={address.street}
                              onChange={(e) => setAddress({ ...address, street: e.target.value })}
                              className="mt-1 h-9 text-sm"
                            />
                          </div>
                          <div>
                            <Label htmlFor="number" className="text-xs">NÂº *</Label>
                            <Input
                              id="number"
                              value={address.number}
                              onChange={(e) => setAddress({ ...address, number: e.target.value })}
                              className="mt-1 h-9 text-sm"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="complement" className="text-xs">Complemento</Label>
                            <Input
                              id="complement"
                              value={address.complement}
                              onChange={(e) => setAddress({ ...address, complement: e.target.value })}
                              placeholder="Apto, bloco..."
                              className="mt-1 h-9 text-sm"
                            />
                          </div>
                          <div>
                            <Label htmlFor="neighborhood" className="text-xs">Bairro *</Label>
                            <Input
                              id="neighborhood"
                              value={address.neighborhood}
                              onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })}
                              className="mt-1 h-9 text-sm"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label htmlFor="city" className="text-xs">Cidade *</Label>
                            <Input
                              id="city"
                              value={address.city}
                              onChange={(e) => setAddress({ ...address, city: e.target.value })}
                              className="mt-1 h-9 text-sm"
                            />
                          </div>
                          <div>
                            <Label htmlFor="state" className="text-xs">UF *</Label>
                            <Input
                              id="state"
                              value={address.state}
                              onChange={(e) => setAddress({ ...address, state: e.target.value.toUpperCase() })}
                              placeholder="SP"
                              maxLength={2}
                              className="mt-1 h-9 text-sm"
                            />
                          </div>
                          <div>
                            <Label htmlFor="addressType" className="text-xs">Tipo</Label>
                            <Select
                              value={address.type}
                              onValueChange={(value: 'HOME' | 'WORK' | 'OTHER') => setAddress({ ...address, type: value })}
                            >
                              <SelectTrigger className="mt-1 h-9 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="HOME">Casa</SelectItem>
                                <SelectItem value="WORK">Trabalho</SelectItem>
                                <SelectItem value="OTHER">Outro</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {selectedCustomer && (
                          <div className="flex items-center space-x-2 pt-2 border-t">
                            <Checkbox
                              id="saveAddress"
                              checked={saveAddressToCustomer}
                              onCheckedChange={(checked) => setSaveAddressToCustomer(checked as boolean)}
                            />
                            <label
                              htmlFor="saveAddress"
                              className="text-xs leading-none"
                            >
                              Salvar endereço no cadastro do cliente
                            </label>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {!needsAddress && (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Cliente buscará serviço na loja</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Botões de Navegação */}
        <div className="px-6 py-3 border-t bg-gray-50/50">
          <div className="flex items-center justify-between mb-2">
            <Button
              variant="outline"
              onClick={step === 1 ? handleClose : handlePreviousStep}
              size="sm"
            >
              {step === 1 ? 'Cancelar' : 'Voltar'}
            </Button>

            {step < 4 ? (
              <Button onClick={handleNextStep} size="sm">
                Próximo
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={() => handleCreateQuote(false)}
                  disabled={isCreating}
                  variant="outline"
                  size="sm"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <FileText className="h-3.5 w-3.5 mr-1.5" />
                      Salvar Rascunho
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => handleCreateQuote(true)}
                  disabled={isCreating}
                  className="bg-moria-orange hover:bg-moria-orange/90"
                  size="sm"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Wrench className="h-3.5 w-3.5 mr-1.5" />
                      Enviar para Cliente
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


