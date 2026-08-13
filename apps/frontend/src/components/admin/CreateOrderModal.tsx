import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import {
  Package,
  User,
  MapPin,
  CreditCard,
  Plus,
  Minus,
  Trash2,
  Search,
  Loader2,
  X,
  ShoppingCart,
  Wrench
} from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import adminService from "../../api/adminService";
import productService from "../../api/productService";
import serviceService from "../../api/serviceService";

interface CreateOrderModalProps {
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

interface OrderItem {
  id: string;
  name: string;
  type: 'PRODUCT' | 'SERVICE';
  price: number;
  quantity: number;
  stock?: number;
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

export function CreateOrderModal({ isOpen, onClose, onSuccess }: CreateOrderModalProps) {
  const { toast } = useToast();

  // Estados principais
  const [step, setStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);

  // Cliente
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);

  // Dados do cliente (para novo cliente ou edição)
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Itens
  const [products, setProducts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingServices, setIsLoadingServices] = useState(false);

  // Endereço
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

  // Pagamento
  const [paymentMethod, setPaymentMethod] = useState('');
  const [couponCode, setCouponCode] = useState('');

  // Carregar clientes
  useEffect(() => {
    if (isOpen) {
      loadCustomers();
      loadProducts();
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

  const loadProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const response = await productService.getProducts({ page: 1, limit: 100 });
      // Mostrar todos os produtos ativos (sem estoque ficam desabilitados visualmente)
      setProducts(response.products.filter(p => p.status === 'ACTIVE'));
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setIsLoadingProducts(false);
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
    // Priorizar whatsapp, depois phone
    setCustomerPhone(customer.whatsapp || customer.phone || '');

    // Se cliente tem endereços, priorizar o endereço residencial/padrão
    if (customer.addresses && customer.addresses.length > 0) {
      const defaultAddress = customer.addresses.find(addr => addr.type === 'HOME') || customer.addresses[0];
      setSelectedAddressId(defaultAddress.id);
      setUseExistingAddress(true);
    } else {
      // Cliente não tem endereços, forçar cadastro de novo
      setUseExistingAddress(false);
      setSelectedAddressId('');
    }
  };

  const handleAddItem = (item: any, type: 'PRODUCT' | 'SERVICE') => {
    const existingItem = selectedItems.find(i => i.id === item.id);

    if (existingItem) {
      toast({
        title: "❌ Item já adicionado",
        description: "Este item já está no pedido. Ajuste a quantidade se necessário.",
        variant: "destructive"
      });
      return;
    }

    const newItem: OrderItem = {
      id: item.id,
      name: item.name,
      type,
      price: type === 'PRODUCT' ? Number(item.promoPrice || item.salePrice) : Number(item.basePrice || 0),
      quantity: 1,
      stock: type === 'PRODUCT' ? item.stock : undefined
    };

    setSelectedItems([...selectedItems, newItem]);
    toast({
      title: "✅ Item adicionado",
      description: `${item.name} foi adicionado ao pedido`,
      duration: 2000
    });
  };

  const handleRemoveItem = (itemId: string) => {
    const item = selectedItems.find(i => i.id === itemId);
    setSelectedItems(selectedItems.filter(i => i.id !== itemId));

    if (item) {
      toast({
        title: "🗑️ Item removido",
        description: `${item.name} foi removido do pedido`,
        duration: 2000
      });
    }
  };

  const handleQuantityChange = (itemId: string, delta: number) => {
    setSelectedItems(selectedItems.map(item => {
      if (item.id === itemId) {
        const newQuantity = Math.max(1, item.quantity + delta);

        // Verificar estoque para produtos
        if (item.type === 'PRODUCT' && item.stock && newQuantity > item.stock) {
          toast({
            title: "Estoque insuficiente",
            description: `Apenas ${item.stock} unidades disponíveis`,
            variant: "destructive"
          });
          return item;
        }

        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
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

  const calculateSubtotal = () => {
    return selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
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
            title: "Nenhum item selecionado",
            description: "Adicione pelo menos um produto ou serviço",
            variant: "destructive"
          });
          return false;
        }
        return true;

      case 3:
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
        return true;

      case 4:
        if (!paymentMethod) {
          toast({
            title: "Forma de pagamento não selecionada",
            description: "Selecione a forma de pagamento",
            variant: "destructive"
          });
          return false;
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

  const handleCreateOrder = async () => {
    if (!validateStep(4)) return;

    setIsCreating(true);
    try {
      const customerId = selectedCustomer?.id;

      // Preparar endereço
      let orderAddressId: string | undefined = selectedAddressId || undefined;
      let orderAddress: Address | undefined;

      if (useExistingAddress && selectedAddressId) {
        const existingAddr = selectedCustomer?.addresses.find(a => a.id === selectedAddressId);
        if (!existingAddr) {
          throw new Error('Endereço selecionado não encontrado');
        }
        orderAddressId = existingAddr.id;
        orderAddress = undefined;
      } else {
        orderAddress = address;

        // Salvar endereço no cadastro do cliente se solicitado
        if (saveAddressToCustomer && selectedCustomer) {
          try {
            const createdAddress = await adminService.createCustomerAddress(selectedCustomer.id, address);
            orderAddressId = createdAddress.id;
            orderAddress = undefined;
            toast({
              title: "Endereço salvo",
              description: "Endereço adicionado ao cadastro do cliente"
            });
          } catch (addrError: any) {
            console.error('Erro ao salvar endereço:', addrError);
            // Não interrompe a criação do pedido
          }
        }
      }

      // Preparar itens
      const items = selectedItems.map(item => ({
        productId: item.type === 'PRODUCT' ? item.id : undefined,
        serviceId: item.type === 'SERVICE' ? item.id : undefined,
        type: item.type,
        quantity: item.quantity
      }));

      // Criar pedido
      const orderData = {
        customerId,
        addressId: orderAddressId,
        customerData: !customerId ? {
          name: customerName,
          email: customerEmail,
          phone: customerPhone.replace(/\D/g, ''),
        } : undefined,
        address: orderAddress,
        items,
        paymentMethod,
        couponCode: couponCode || undefined
      };

      await adminService.createAdminOrder(orderData);

      toast({
        title: "✅ Pedido criado com sucesso!",
        description: `Pedido criado para ${customerName}`
      });

      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Erro ao criar pedido:', error);
      toast({
        title: "❌ Erro ao criar pedido",
        description: error.response?.data?.error || error.message || "Tente novamente",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    // Verificar se há dados preenchidos
    const hasData = customerName || customerEmail || customerPhone || selectedItems.length > 0;

    if (hasData) {
      const confirmClose = window.confirm(
        'Você tem dados não salvos. Tem certeza que deseja fechar e perder estas informações?'
      );
      if (!confirmClose) return;
    }

    setStep(1);
    setSelectedCustomer(null);
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setSelectedItems([]);
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
    setPaymentMethod('');
    setCouponCode('');
    setCustomerSearch('');
    setProductSearch('');
    setServiceSearch('');
    setUseExistingAddress(false);
    setSelectedAddressId('');
    setSaveAddressToCustomer(true);
    onClose();
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.category.toLowerCase().includes(productSearch.toLowerCase())
  );

  const filteredServices = services.filter(s =>
    s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
    s.category.toLowerCase().includes(serviceSearch.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl sm:w-[calc(100vw-2rem)] md:w-[calc(100vw-4rem)] sm:max-h-[calc(100vh-3rem)] p-0 flex flex-col gap-0">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b bg-gray-50/50 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ShoppingCart className="h-5 w-5 text-moria-orange" />
            Criar Novo Pedido
          </DialogTitle>

          {/* Indicador de progresso visual - Responsivo */}
          <div className="mt-3">
            {/* Desktop: Stepper completo */}
            <div className="hidden sm:flex items-center justify-between">
              {[
                { num: 1, label: 'Cliente', icon: User },
                { num: 2, label: 'Itens', icon: Package },
                { num: 3, label: 'Endereço', icon: MapPin },
                { num: 4, label: 'Pagamento', icon: CreditCard }
              ].map((item, index) => (
                <div key={item.num} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`
                      h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-all
                      ${step > item.num
                        ? 'bg-green-500 text-white'
                        : step === item.num
                        ? 'bg-moria-orange text-white ring-2 ring-moria-orange/30'
                        : 'bg-gray-200 text-gray-500'}
                    `}>
                      {step > item.num ? '✓' : item.num}
                    </div>
                    <span className={`text-xs mt-1 ${step === item.num ? 'font-semibold text-moria-orange' : 'text-muted-foreground'}`}>
                      {item.label}
                    </span>
                  </div>
                  {index < 3 && (
                    <div className={`h-0.5 flex-1 mx-1.5 rounded ${step > item.num ? 'bg-green-500' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Mobile: Dots + Título atual */}
            <div className="sm:hidden space-y-2">
              <div className="flex items-center justify-center gap-1.5">
                {[1, 2, 3, 4].map((num) => (
                  <div
                    key={num}
                    className={`h-2 rounded-full transition-all ${
                      step > num
                        ? 'w-2 bg-green-500'
                        : step === num
                        ? 'w-8 bg-moria-orange'
                        : 'w-2 bg-gray-300'
                    }`}
                  />
                ))}
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-moria-orange">
                  {step === 1 && 'Cliente'}
                  {step === 2 && 'Itens do Pedido'}
                  {step === 3 && 'Endereço de Entrega'}
                  {step === 4 && 'Pagamento e Confirmação'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Etapa {step} de 4
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4">
            {/* ETAPA 1: Cliente */}
            {step === 1 && (
              <div className="space-y-3">
                {/* Cliente selecionado - Card de destaque */}
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
                        className="min-h-[36px] min-w-[36px] h-9 w-9 p-0 text-green-700 hover:text-green-900 hover:bg-green-100 touch-manipulation"
                      >
                        <X className="h-4 w-4" />
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
                  {/* Indicador de campos preenchidos */}
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
                      className={`mt-1 min-h-[44px] h-11 text-sm ${customerName ? 'border-green-300 bg-green-50/30' : ''}`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="customerEmail" className="text-xs">Email *</Label>
                      <Input
                        id="customerEmail"
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="joao@email.com"
                        className={`mt-1 min-h-[44px] h-11 text-sm ${customerEmail ? 'border-green-300 bg-green-50/30' : ''}`}
                      />
                    </div>

                    <div>
                      <Label htmlFor="customerPhone" className="text-xs">WhatsApp *</Label>
                      <Input
                        id="customerPhone"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="(11) 99999-9999"
                        className={`mt-1 min-h-[44px] h-11 text-sm ${customerPhone ? 'border-green-300 bg-green-50/30' : ''}`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ETAPA 2: Itens */}
            {step === 2 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Adicionar Itens</Label>
                  <span className="text-xs text-muted-foreground">
                    {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'itens'} no carrinho
                  </span>
                </div>

                <Tabs defaultValue="products" className="w-full">
                  <div className="overflow-x-auto overflow-y-hidden -mx-4 sm:mx-0 px-4 sm:px-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
                    <TabsList className="grid grid-flow-col auto-cols-max sm:auto-cols-fr w-max sm:w-full h-9 items-stretch gap-1">
                      <TabsTrigger value="products" className="h-full w-full justify-center text-xs whitespace-nowrap">
                        <Package className="h-3 w-3 mr-1" />
                        <span>Produtos</span>
                      </TabsTrigger>
                      <TabsTrigger value="services" className="h-full w-full justify-center text-xs whitespace-nowrap">
                        <Wrench className="h-3 w-3 mr-1" />
                        <span>Serviços</span>
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="products" className="space-y-2 mt-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                      <Input
                        placeholder="Buscar produtos..."
                        className="pl-8 h-8 text-sm"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                      />
                    </div>
                    {!isLoadingProducts && (
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{filteredProducts.length} produtos</span>
                        {productSearch && (
                          <button
                            onClick={() => setProductSearch('')}
                            className="text-moria-orange hover:underline"
                          >
                            Limpar
                          </button>
                        )}
                      </div>
                    )}

                    <ScrollArea className="h-44 border rounded-lg">
                      {isLoadingProducts ? (
                        <div className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                          <p className="text-sm text-muted-foreground mt-2">Carregando produtos...</p>
                        </div>
                      ) : filteredProducts.length > 0 ? (
                        <div className="p-2 space-y-2">
                          {filteredProducts.map(product => {
                            const isLowStock = product.stock < 5;
                            const isOutOfStock = product.stock === 0;
                            const isAlreadyAdded = selectedItems.some(i => i.id === product.id);

                            return (
                              <div
                                key={product.id}
                                className={`p-3 border rounded-lg transition-all ${
                                  isOutOfStock
                                    ? 'opacity-50 cursor-not-allowed bg-gray-50'
                                    : isAlreadyAdded
                                    ? 'bg-green-50 border-green-200'
                                    : 'hover:bg-muted cursor-pointer hover:border-moria-orange'
                                }`}
                                onClick={() => !isOutOfStock && !isAlreadyAdded && handleAddItem(product, 'PRODUCT')}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="font-medium">{product.name}</p>
                                      {isAlreadyAdded && (
                                        <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                                          ✓ Adicionado
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-1">
                                      {product.category}
                                    </p>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="text-sm font-semibold text-moria-orange">
                                        {formatCurrency(Number(product.promoPrice || product.salePrice))}
                                      </p>
                                      <span className="text-muted-foreground">•</span>
                                      <p className={`text-sm ${
                                        isOutOfStock
                                          ? 'text-red-600 font-semibold'
                                          : isLowStock
                                          ? 'text-yellow-600 font-medium'
                                          : 'text-muted-foreground'
                                      }`}>
                                        {isOutOfStock
                                          ? '❌ Sem estoque'
                                          : isLowStock
                                          ? `⚠️ Estoque baixo: ${product.stock}`
                                          : `✓ Estoque: ${product.stock}`}
                                      </p>
                                    </div>
                                  </div>
                                  {!isOutOfStock && !isAlreadyAdded && (
                                    <Plus className="h-5 w-5 text-moria-orange flex-shrink-0" />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <Package className="h-16 w-16 mx-auto mb-3 opacity-20" />
                          <p className="font-medium mb-1">
                            {productSearch ? 'Nenhum produto encontrado' : 'Nenhum produto disponível'}
                          </p>
                          {productSearch && (
                            <p className="text-sm">
                              Tente buscar com outros termos
                            </p>
                          )}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="services" className="space-y-2 mt-2">
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
                                onClick={() => !isAlreadyAdded && handleAddItem(service, 'SERVICE')}
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
                  </TabsContent>
                </Tabs>

                <Separator className="my-3" />

                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold">
                    Carrinho ({selectedItems.length})
                  </Label>
                  {selectedItems.length > 0 && (
                    <span className="text-sm font-bold text-moria-orange">
                      {formatCurrency(calculateSubtotal())}
                    </span>
                  )}
                </div>

                {selectedItems.length > 0 ? (
                  <ScrollArea className="h-32 border rounded-lg">
                    <div className="p-2 space-y-1.5">
                      {selectedItems.map(item => (
                        <div key={item.id} className="p-2 bg-gray-50 rounded flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(item.price)} cada
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuantityChange(item.id, -1)}
                              disabled={item.quantity <= 1}
                              className="h-9 w-9 min-h-[36px] min-w-[36px] p-0 touch-manipulation"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="min-w-[32px] text-center text-sm font-medium">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuantityChange(item.id, 1)}
                              disabled={item.type === 'PRODUCT' && item.stock ? item.quantity >= item.stock : false}
                              className="h-9 w-9 min-h-[36px] min-w-[36px] p-0 touch-manipulation"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <span className="font-bold text-sm w-20 text-right">
                            {formatCurrency(item.price * item.quantity)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(item.id)}
                            className="min-h-[36px] min-w-[36px] h-9 w-9 p-0 touch-manipulation"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-4 text-muted-foreground border border-dashed rounded-lg">
                    <ShoppingCart className="h-8 w-8 mx-auto mb-1 opacity-20" />
                    <p className="text-sm">Carrinho vazio</p>
                  </div>
                )}
              </div>
            )}

            {/* ETAPA 3: Endereço */}
            {step === 3 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Endereço de Entrega</Label>
                  {selectedCustomer?.addresses && selectedCustomer.addresses.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {selectedCustomer.addresses.length} cadastrado(s)
                    </span>
                  )}
                </div>

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
                          className="mt-1 min-h-[44px] h-11 text-sm"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          variant="outline"
                          onClick={() => searchCep(address.zipCode)}
                          disabled={isSearchingCep}
                          className="min-h-[44px] min-w-[44px] h-11 w-11 p-0 touch-manipulation"
                        >
                          {isSearchingCep ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Search className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      <div>
                        <Label htmlFor="street" className="text-xs">Rua *</Label>
                        <Input
                          id="street"
                          value={address.street}
                          onChange={(e) => setAddress({ ...address, street: e.target.value })}
                          className="mt-1 min-h-[44px] h-11 text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <Label htmlFor="number" className="text-xs">Número *</Label>
                          <Input
                            id="number"
                            value={address.number}
                            onChange={(e) => setAddress({ ...address, number: e.target.value })}
                            className="mt-1 min-h-[44px] h-11 text-sm"
                          />
                        </div>
                        <div>
                          <Label htmlFor="complement" className="text-xs">Compl.</Label>
                          <Input
                            id="complement"
                            value={address.complement}
                            onChange={(e) => setAddress({ ...address, complement: e.target.value })}
                            placeholder="Apto"
                            className="mt-1 min-h-[44px] h-11 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="neighborhood" className="text-xs">Bairro *</Label>
                        <Input
                          id="neighborhood"
                          value={address.neighborhood}
                          onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })}
                          className="mt-1 min-h-[44px] h-11 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="city" className="text-xs">Cidade *</Label>
                        <Input
                          id="city"
                          value={address.city}
                          onChange={(e) => setAddress({ ...address, city: e.target.value })}
                          className="mt-1 min-h-[44px] h-11 text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div>
                        <Label htmlFor="state" className="text-xs">UF *</Label>
                        <Input
                          id="state"
                          value={address.state}
                          onChange={(e) => setAddress({ ...address, state: e.target.value.toUpperCase() })}
                          placeholder="SP"
                          maxLength={2}
                          className="mt-1 min-h-[44px] h-11 text-sm"
                        />
                      </div>
                      <div className="col-span-1 sm:col-span-2">
                        <Label htmlFor="addressType" className="text-xs">Tipo</Label>
                        <Select
                          value={address.type}
                          onValueChange={(value: 'HOME' | 'WORK' | 'OTHER') => setAddress({ ...address, type: value })}
                        >
                          <SelectTrigger className="mt-1 min-h-[44px] h-11 text-sm">
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
              </div>
            )}

            {/* ETAPA 4: Pagamento */}
            {step === 4 && (
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Forma de Pagamento *</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { value: 'DINHEIRO', label: 'Dinheiro', icon: '💵' },
                    { value: 'CARTAO_CREDITO', label: 'Crédito', icon: '💳' },
                    { value: 'CARTAO_DEBITO', label: 'Débito', icon: '💳' },
                    { value: 'PIX', label: 'Pix', icon: '📱' },
                    { value: 'TRANSFERENCIA', label: 'Transf.', icon: '🏦' },
                    { value: 'BOLETO', label: 'Boleto', icon: '📄' }
                  ].map(method => (
                    <Button
                      key={method.value}
                      variant={paymentMethod === method.value ? 'default' : 'outline'}
                      className={`w-full min-h-[52px] h-auto py-3 flex flex-col items-center gap-1 transition-all touch-manipulation ${
                        paymentMethod === method.value
                          ? 'bg-moria-orange hover:bg-moria-orange/90 ring-2 ring-moria-orange/30'
                          : 'hover:border-moria-orange hover:bg-moria-orange/5'
                      }`}
                      onClick={() => setPaymentMethod(method.value)}
                    >
                      <span className="text-base sm:text-sm">{method.icon}</span>
                      <span className="text-xs sm:text-[10px] font-medium">{method.label}</span>
                    </Button>
                  ))}
                </div>

                <div>
                  <Label htmlFor="couponCode" className="text-xs">Cupom (opcional)</Label>
                  <Input
                    id="couponCode"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="DESCONTO10"
                    className="mt-1 min-h-[44px] h-11 text-sm"
                  />
                </div>

                <Separator className="my-2" />

                {/* Resumo completo do pedido */}
                <div className="bg-gray-50 p-3 rounded-lg border">
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                    <ShoppingCart className="h-4 w-4" />
                    Resumo do Pedido
                  </h3>

                  <div className="space-y-2">
                    {/* Cliente e Endereço */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="p-2 bg-white rounded text-xs">
                        <p className="text-[10px] text-muted-foreground">Cliente</p>
                        <p className="font-medium truncate">{customerName}</p>
                      </div>
                      <div className="p-2 bg-white rounded text-xs">
                        <p className="text-[10px] text-muted-foreground">Endereço</p>
                        {useExistingAddress && selectedCustomer?.addresses ? (
                          (() => {
                            const addr = selectedCustomer.addresses.find(a => a.id === selectedAddressId);
                            return addr ? (
                              <p className="truncate">{addr.city}/{addr.state}</p>
                            ) : null;
                          })()
                        ) : (
                          <p className="truncate">{address.city}/{address.state}</p>
                        )}
                      </div>
                    </div>

                    {/* Itens */}
                    <div className="p-2 bg-white rounded">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] text-muted-foreground">
                          {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'itens'}
                        </p>
                      </div>
                      <ScrollArea className="h-16">
                        <div className="space-y-0.5">
                          {selectedItems.map(item => (
                            <div key={item.id} className="flex justify-between text-xs">
                              <span className="truncate flex-1">
                                {item.quantity}x {item.name}
                              </span>
                              <span className="font-medium ml-2">
                                {formatCurrency(item.price * item.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>

                    {/* Pagamento e Total */}
                    <div className="flex items-center justify-between p-2 bg-moria-orange/10 rounded">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Pagamento</p>
                        <p className={`text-xs font-medium ${paymentMethod ? 'text-moria-orange' : 'text-red-500'}`}>
                          {paymentMethod ?
                            paymentMethod.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) :
                            'Selecione'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground">Total</p>
                        <span className="text-lg font-bold text-moria-orange">
                          {formatCurrency(calculateSubtotal())}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Botões de Navegação */}
        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-3 border-t bg-gray-50/50 flex-shrink-0">
          <Button
            variant="outline"
            onClick={step === 1 ? handleClose : handlePreviousStep}
            className="min-h-[44px] h-11 touch-manipulation"
          >
            {step === 1 ? 'Cancelar' : 'Voltar'}
          </Button>

          {step < 4 ? (
            <Button onClick={handleNextStep} className="min-h-[44px] h-11 touch-manipulation">
              Próximo
            </Button>
          ) : (
            <Button
              onClick={handleCreateOrder}
              disabled={isCreating}
              className="bg-moria-orange hover:bg-moria-orange/90 min-h-[44px] h-11 touch-manipulation"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4 mr-1.5" />
                  Criar Pedido
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
