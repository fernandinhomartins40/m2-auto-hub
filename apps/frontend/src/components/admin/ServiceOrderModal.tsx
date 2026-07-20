import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import {
  Loader2,
  Plus,
  Minus,
  Trash2,
  Wrench,
  Package,
  User,
  Car,
  AlertTriangle,
  Search,
  X,
  UserPlus,
  Camera,
  ClipboardList,
} from 'lucide-react';
import { useToast } from '../ui/use-toast';
import serviceOrderService, {
  ServiceOrder,
  ServiceOrderInput,
  ServiceOrderItemInput,
} from '@/api/serviceOrderService';
import adminService, { type ProvisionalUser, type AdminCustomerVehicle } from '@/api/adminService';
import productService from '@/api/productService';
import serviceService from '@/api/serviceService';
import revisionService from '@/api/revisionService';
import { CreateCustomerModal } from './CreateCustomerModal';
import { RevisionVehicleLookupDialog } from '../revisions/RevisionVehicleLookupDialog';

/** Dados iniciais para pré-preencher a OS (ex.: vindos da leitura de placa). */
export interface ServiceOrderInitialData {
  customerId?: string | null;
  customerName?: string;
  customerPhone?: string | null;
  vehicleId?: string | null;
  vehicleLabel?: string | null;
  vehiclePlate?: string | null;
  mileage?: number | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  order?: ServiceOrder | null;
  initialData?: ServiceOrderInitialData | null;
}

interface CatalogProduct {
  id: string;
  name: string;
  category?: string;
  salePrice: number;
  promoPrice?: number | null;
  stock: number;
}
interface CatalogService {
  id: string;
  name: string;
  category?: string;
  basePrice?: number;
}
interface Mechanic {
  id: string;
  name: string;
}

const money = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export function ServiceOrderModal({ isOpen, onClose, onSaved, order, initialData }: Props) {
  const { toast } = useToast();
  const isEditing = !!order;

  // Navegação por etapas (mesmo padrão do modal de Pedidos)
  const [step, setStep] = useState(1);

  // Cliente
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<ProvisionalUser[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);

  // Veículo
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [vehicleLabel, setVehicleLabel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [mileage, setMileage] = useState<string>('');
  const [plateLookupOpen, setPlateLookupOpen] = useState(false);
  const [customerVehicles, setCustomerVehicles] = useState<AdminCustomerVehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  // Serviço
  const [description, setDescription] = useState('');
  const [mechanicId, setMechanicId] = useState<string>('');
  const [discount, setDiscount] = useState<string>('0');
  const [items, setItems] = useState<ServiceOrderItemInput[]>([]);

  // Catálogo
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    void loadCatalog();
    if (order) {
      setCustomerName(order.customerName);
      setCustomerPhone(order.customerPhone ?? '');
      setCustomerId(order.customerId);
      setVehicleId(order.vehicleId);
      setVehicleLabel(order.vehicleLabel ?? '');
      setVehiclePlate(order.vehiclePlate ?? '');
      setMileage(order.mileage != null ? String(order.mileage) : '');
      setDescription(order.description ?? '');
      setMechanicId(order.assignedMechanicId ?? '');
      setDiscount(String(Number(order.discount) || 0));
      setItems(
        order.items.map((i) => ({
          type: i.type,
          productId: i.productId,
          serviceId: i.serviceId,
          name: i.name,
          unitPrice: Number(i.unitPrice),
          quantity: i.quantity,
        }))
      );
      if (order.customerId) void loadCustomerVehicles(order.customerId);
    } else {
      // Criação: aplica initialData (ex.: leitura de placa) quando houver
      setCustomerName(initialData?.customerName ?? '');
      setCustomerPhone(initialData?.customerPhone ?? '');
      setCustomerId(initialData?.customerId ?? null);
      setVehicleId(initialData?.vehicleId ?? null);
      setVehicleLabel(initialData?.vehicleLabel ?? '');
      setVehiclePlate(initialData?.vehiclePlate ?? '');
      setMileage(initialData?.mileage != null ? String(initialData.mileage) : '');
      setDescription('');
      setMechanicId('');
      setDiscount('0');
      setItems([]);
      if (initialData?.customerId) void loadCustomerVehicles(initialData.customerId);
      else setCustomerVehicles([]);
    }
    setCustomerSearch('');
    setCustomerResults([]);
    setShowResults(false);
    setProductSearch('');
    setServiceSearch('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, order, initialData]);

  // Busca de clientes com debounce
  useEffect(() => {
    if (!showResults) return;
    const term = customerSearch.trim();
    if (term.length < 2) {
      setCustomerResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      setSearchingCustomers(true);
      try {
        const res = await adminService.getCustomers({ page: 1, limit: 8, search: term });
        setCustomerResults(res.customers || []);
      } catch {
        setCustomerResults([]);
      } finally {
        setSearchingCustomers(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [customerSearch, showResults]);

  const loadCatalog = async () => {
    // Usa os mesmos serviços públicos do modal de Pedidos (productService/serviceService),
    // que comprovadamente retornam os itens ativos. Mecânicos vêm do fluxo de revisões.
    const [prodRes, servRes, mechRes] = await Promise.all([
      productService.getProducts({ page: 1, limit: 100 }).catch(() => ({ products: [] as any[] })),
      serviceService.getServices({ page: 1, limit: 100 }).catch(() => ({ services: [] as any[] })),
      revisionService.getMechanicsWorkload().catch(() => []),
    ]);

    const activeProducts = (prodRes.products || [])
      .filter((p: any) => p.status === 'ACTIVE' || p.isActive)
      .map((p: any) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        salePrice: Number(p.salePrice) || 0,
        promoPrice: p.promoPrice != null ? Number(p.promoPrice) : null,
        stock: Number(p.stock) || 0,
      })) as CatalogProduct[];

    const activeServices = (servRes.services || [])
      .filter((s: any) => s.status === 'ACTIVE' || s.isActive)
      .map((s: any) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        basePrice: s.basePrice != null ? Number(s.basePrice) : undefined,
      })) as CatalogService[];

    setProducts(activeProducts);
    setServices(activeServices);
    setMechanics((mechRes || []) as Mechanic[]);
  };

  // Melhoria: ao selecionar um cliente, buscar seus veículos cadastrados
  const loadCustomerVehicles = async (id: string) => {
    setLoadingVehicles(true);
    try {
      const vehicles = await adminService.getCustomerVehicles(id);
      setCustomerVehicles(vehicles);
    } catch {
      setCustomerVehicles([]);
    } finally {
      setLoadingVehicles(false);
    }
  };

  const selectCustomer = (c: ProvisionalUser) => {
    setCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerPhone(c.whatsapp ?? '');
    setShowResults(false);
    setCustomerSearch('');
    setCustomerResults([]);
    void loadCustomerVehicles(c.id);
  };

  const clearCustomer = () => {
    setCustomerId(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerVehicles([]);
    // Limpa também o vínculo de veículo escolhido a partir do cliente
    setVehicleId(null);
  };

  const selectVehicle = (v: AdminCustomerVehicle) => {
    setVehicleId(v.id);
    setVehicleLabel(`${v.brand} ${v.model} ${v.year}`.trim());
    setVehiclePlate(v.plate ?? '');
    if (v.mileage != null) setMileage(String(v.mileage));
    toast({ title: 'Veículo selecionado', description: v.plate ?? undefined, duration: 2000 });
  };

  const handleCustomerCreated = (c: ProvisionalUser) => {
    setCreateCustomerOpen(false);
    selectCustomer(c);
    toast({ title: 'Cliente cadastrado e vinculado à OS' });
  };

  // Leitura de placa (camera/ALPR): preenche cliente + veiculo de uma vez
  const handlePlateResolved = (payload: {
    customer: { id: string; name: string; phone: string };
    vehicle: { id: string; brand: string; model: string; year: number; plate: string; mileage?: number };
  }) => {
    setPlateLookupOpen(false);
    setCustomerId(payload.customer.id);
    setCustomerName(payload.customer.name);
    setCustomerPhone(payload.customer.phone ?? '');
    setVehicleId(payload.vehicle.id);
    setVehicleLabel(`${payload.vehicle.brand} ${payload.vehicle.model} ${payload.vehicle.year}`.trim());
    setVehiclePlate(payload.vehicle.plate);
    if (payload.vehicle.mileage != null) setMileage(String(payload.vehicle.mileage));
    setShowResults(false);
    void loadCustomerVehicles(payload.customer.id);
    toast({ title: 'Veículo identificado pela placa', description: payload.vehicle.plate });
  };

  const totals = useMemo(() => {
    let labor = 0;
    let parts = 0;
    for (const i of items) {
      const sub = i.unitPrice * i.quantity;
      if (i.type === 'SERVICE') labor += sub;
      else parts += sub;
    }
    const disc = Number(discount) || 0;
    return { labor, parts, total: Math.max(0, labor + parts - disc) };
  }, [items, discount]);

  // Adiciona um item do catálogo ao "carrinho" da OS (mesmo fluxo do modal de Pedidos)
  const addCatalogItem = (item: CatalogProduct | CatalogService, type: 'PRODUCT' | 'SERVICE') => {
    const alreadyAdded = items.some(
      (i) => (type === 'PRODUCT' ? i.productId === item.id : i.serviceId === item.id)
    );
    if (alreadyAdded) {
      toast({
        title: 'Item já adicionado',
        description: 'Este item já está na OS. Ajuste a quantidade se necessário.',
        variant: 'destructive',
      });
      return;
    }

    const unitPrice =
      type === 'PRODUCT'
        ? Number((item as CatalogProduct).promoPrice || (item as CatalogProduct).salePrice) || 0
        : Number((item as CatalogService).basePrice) || 0;

    setItems((prev) => [
      ...prev,
      {
        type,
        productId: type === 'PRODUCT' ? item.id : undefined,
        serviceId: type === 'SERVICE' ? item.id : undefined,
        name: item.name,
        unitPrice,
        quantity: 1,
      },
    ]);
    toast({ title: 'Item adicionado', description: item.name, duration: 2000 });
  };

  const addManualItem = (type: 'PRODUCT' | 'SERVICE') =>
    setItems((prev) => [...prev, { type, name: '', unitPrice: 0, quantity: 1 }]);

  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const patchItem = (idx: number, patch: Partial<ServiceOrderItemInput>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const changeQuantity = (idx: number, delta: number) =>
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const newQuantity = Math.max(1, it.quantity + delta);
        if (it.type === 'PRODUCT' && it.productId) {
          const p = products.find((x) => x.id === it.productId);
          if (p && newQuantity > p.stock) {
            toast({
              title: 'Estoque insuficiente',
              description: `Apenas ${p.stock} unidade(s) disponível(is)`,
              variant: 'destructive',
            });
            return it;
          }
        }
        return { ...it, quantity: newQuantity };
      })
    );

  const stockWarning = (item: ServiceOrderItemInput): boolean => {
    if (item.type !== 'PRODUCT' || !item.productId) return false;
    const p = products.find((x) => x.id === item.productId);
    return !!p && item.quantity > p.stock;
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.category ?? '').toLowerCase().includes(productSearch.toLowerCase())
  );
  const filteredServices = services.filter(
    (s) =>
      s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
      (s.category ?? '').toLowerCase().includes(serviceSearch.toLowerCase())
  );

  const validateStep = (stepNumber: number): boolean => {
    switch (stepNumber) {
      case 1:
        if (!customerName.trim()) {
          toast({ title: 'Informe o cliente', description: 'Selecione ou cadastre um cliente.', variant: 'destructive' });
          return false;
        }
        return true;
      case 2:
        if (items.length === 0) {
          toast({ title: 'Nenhum item', description: 'Adicione ao menos um serviço ou produto.', variant: 'destructive' });
          return false;
        }
        if (items.some((i) => !i.name.trim())) {
          toast({ title: 'Item sem nome', description: 'Preencha o nome de todos os itens.', variant: 'destructive' });
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNextStep = () => {
    if (validateStep(step)) setStep(step + 1);
  };
  const handlePreviousStep = () => setStep(step - 1);

  const handleSave = async () => {
    if (!validateStep(1)) {
      setStep(1);
      return;
    }
    if (!validateStep(2)) {
      setStep(2);
      return;
    }

    const payload: ServiceOrderInput = {
      customerId: customerId ?? undefined,
      vehicleId: vehicleId ?? undefined,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      vehicleLabel: vehicleLabel.trim() || undefined,
      vehiclePlate: vehiclePlate.trim() || undefined,
      mileage: mileage ? Number(mileage) : undefined,
      description: description.trim() || undefined,
      assignedMechanicId: mechanicId || undefined,
      discount: Number(discount) || 0,
      items,
    };

    setSaving(true);
    try {
      if (isEditing && order) {
        await serviceOrderService.update(order.id, payload);
        toast({ title: 'OS atualizada!' });
      } else {
        await serviceOrderService.create(payload);
        toast({ title: 'OS criada!' });
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar',
        description: err?.response?.data?.error ?? err?.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    { num: 1, label: 'Cliente', icon: User },
    { num: 2, label: 'Itens', icon: Package },
    { num: 3, label: 'Finalizar', icon: ClipboardList },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] md:w-[calc(100vw-4rem)] max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-3rem)] p-0 flex flex-col gap-0">
        <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b bg-gray-50/50 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Wrench className="h-5 w-5 text-moria-orange" />
            {isEditing ? `Editar OS #${order?.number}` : 'Nova Ordem de Serviço'}
          </DialogTitle>

          {/* Indicador de progresso - Responsivo */}
          <div className="mt-3">
            {/* Desktop: Stepper completo */}
            <div className="hidden sm:flex items-center justify-between">
              {steps.map((item, index) => (
                <div key={item.num} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                        step > item.num
                          ? 'bg-green-500 text-white'
                          : step === item.num
                          ? 'bg-moria-orange text-white ring-2 ring-moria-orange/30'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {step > item.num ? '✓' : item.num}
                    </div>
                    <span
                      className={`text-xs mt-1 ${
                        step === item.num ? 'font-semibold text-moria-orange' : 'text-muted-foreground'
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-1.5 rounded ${step > item.num ? 'bg-green-500' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Mobile: Dots + Título atual */}
            <div className="sm:hidden space-y-2">
              <div className="flex items-center justify-center gap-1.5">
                {steps.map(({ num }) => (
                  <div
                    key={num}
                    className={`h-2 rounded-full transition-all ${
                      step > num ? 'w-2 bg-green-500' : step === num ? 'w-8 bg-moria-orange' : 'w-2 bg-gray-300'
                    }`}
                  />
                ))}
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-moria-orange">
                  {step === 1 && 'Cliente e Veículo'}
                  {step === 2 && 'Itens da OS'}
                  {step === 3 && 'Mecânico e Finalização'}
                </p>
                <p className="text-xs text-muted-foreground">Etapa {step} de {steps.length}</p>
              </div>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4">
            {/* ETAPA 1: Cliente e Veículo */}
            {step === 1 && (
              <div className="space-y-4">
                {/* Cliente selecionado - Card de destaque */}
                {customerId ? (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm">
                          {customerName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-green-800 text-sm">{customerName}</p>
                            <Badge className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0">Selecionado</Badge>
                          </div>
                          <p className="text-xs text-green-700">{customerPhone || 'Sem telefone'}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearCustomer}
                        className="min-h-[36px] min-w-[36px] h-9 w-9 p-0 text-green-700 hover:text-green-900 hover:bg-green-100 touch-manipulation"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {customerVehicles.length > 0 && (
                      <p className="text-[10px] text-green-600 mt-1.5 pl-10">
                        {customerVehicles.length} veículo(s) cadastrado(s)
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between">
                      <Label>Buscar Cliente Cadastrado</Label>
                      <Button type="button" size="sm" variant="outline" onClick={() => setCreateCustomerOpen(true)}>
                        <UserPlus className="h-3.5 w-3.5 mr-1" /> Cadastrar cliente
                      </Button>
                    </div>
                    <div className="relative mt-1">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Digite nome, e-mail ou telefone..."
                        className="pl-10"
                        value={customerSearch}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value);
                          setShowResults(true);
                        }}
                        onFocus={() => setShowResults(true)}
                      />
                    </div>

                    {showResults && customerSearch.trim().length >= 2 && (
                      <div className="mt-2 border rounded-lg max-h-56 overflow-y-auto">
                        {searchingCustomers ? (
                          <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" /> Buscando clientes...
                          </div>
                        ) : customerResults.length === 0 ? (
                          <div className="p-4 text-center">
                            <User className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm text-muted-foreground">Nenhum cliente encontrado</p>
                            <button
                              type="button"
                              className="text-xs text-moria-orange hover:underline mt-1"
                              onClick={() => setCreateCustomerOpen(true)}
                            >
                              Cadastrar novo cliente
                            </button>
                          </div>
                        ) : (
                          customerResults.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              className="w-full p-3 text-left hover:bg-moria-orange/10 hover:border-l-4 hover:border-l-moria-orange flex items-center justify-between border-b last:border-b-0 transition-all"
                              onClick={() => selectCustomer(c)}
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium text-sm">
                                  {c.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium">{c.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {c.whatsapp || c.email}
                                    {c.cpf ? ` • ${c.cpf}` : ''}
                                  </p>
                                </div>
                              </div>
                              <Plus className="h-4 w-4 text-moria-orange" />
                            </button>
                          ))
                        )}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Selecione um cliente cadastrado ou clique em "Cadastrar cliente".
                    </p>
                  </div>
                )}

                <Separator className="my-1" />

                {/* Veículo */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-1.5">
                      <Car className="h-4 w-4 text-moria-orange" /> Veículo
                    </Label>
                    <Button type="button" size="sm" variant="outline" onClick={() => setPlateLookupOpen(true)}>
                      <Camera className="h-3.5 w-3.5 mr-1" /> Ler placa
                    </Button>
                  </div>

                  {/* Melhoria: veículos do cliente para seleção rápida */}
                  {customerId && (
                    <div>
                      {loadingVehicles ? (
                        <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground border rounded-lg">
                          <Loader2 className="h-4 w-4 animate-spin" /> Carregando veículos do cliente...
                        </div>
                      ) : customerVehicles.length > 0 ? (
                        <div className="space-y-1.5">
                          <p className="text-xs text-muted-foreground">Veículos deste cliente — toque para selecionar:</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {customerVehicles.map((v) => {
                              const selected = vehicleId === v.id;
                              return (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() => selectVehicle(v)}
                                  className={`p-2.5 text-left border rounded-lg transition-all flex items-center justify-between gap-2 ${
                                    selected
                                      ? 'bg-green-50 border-green-300 ring-1 ring-green-200'
                                      : 'hover:bg-muted hover:border-moria-orange'
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <p className="font-medium text-sm truncate">
                                      {v.brand} {v.model} {v.year}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {v.plate}
                                      {v.color ? ` • ${v.color}` : ''}
                                      {v.mileage != null ? ` • ${v.mileage} km` : ''}
                                    </p>
                                  </div>
                                  {selected ? (
                                    <Badge className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0 flex-shrink-0">✓</Badge>
                                  ) : (
                                    <Car className="h-4 w-4 text-moria-orange flex-shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                          Cliente sem veículos cadastrados. Preencha os dados abaixo.
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1 sm:col-span-1">
                      <Label className="text-xs">Modelo / descrição</Label>
                      <Input
                        value={vehicleLabel}
                        onChange={(e) => setVehicleLabel(e.target.value)}
                        placeholder="Ex.: Gol 2018"
                        className="min-h-[44px] h-11 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Placa</Label>
                      <div className="flex gap-1">
                        <Input
                          value={vehiclePlate}
                          onChange={(e) => setVehiclePlate(e.target.value)}
                          placeholder="ABC1D23"
                          className="min-h-[44px] h-11 text-sm"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="shrink-0 min-h-[44px] h-11 w-11"
                          title="Ler placa com a câmera"
                          onClick={() => setPlateLookupOpen(true)}
                        >
                          <Camera className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">KM</Label>
                      <Input
                        type="number"
                        value={mileage}
                        onChange={(e) => setMileage(e.target.value)}
                        placeholder="0"
                        className="min-h-[44px] h-11 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Descrição */}
                <div className="space-y-1">
                  <Label className="text-xs">Descrição do serviço</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva o problema ou o serviço a ser feito..."
                    rows={2}
                  />
                </div>
              </div>
            )}

            {/* ETAPA 2: Itens */}
            {step === 2 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Adicionar Itens</Label>
                  <span className="text-xs text-muted-foreground">
                    {items.length} {items.length === 1 ? 'item' : 'itens'} na OS
                  </span>
                </div>

                <Tabs defaultValue="services" className="w-full">
                  <div
                    className="overflow-x-auto overflow-y-hidden -mx-4 sm:mx-0 px-4 sm:px-0"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
                  >
                    <TabsList className="grid grid-flow-col auto-cols-max sm:auto-cols-fr w-max sm:w-full h-9 items-stretch gap-1">
                      <TabsTrigger value="services" className="h-full w-full justify-center text-xs whitespace-nowrap">
                        <Wrench className="h-3 w-3 mr-1" />
                        <span>Serviços</span>
                      </TabsTrigger>
                      <TabsTrigger value="products" className="h-full w-full justify-center text-xs whitespace-nowrap">
                        <Package className="h-3 w-3 mr-1" />
                        <span>Produtos</span>
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* Serviços */}
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
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{filteredServices.length} serviços</span>
                      <button
                        type="button"
                        onClick={() => addManualItem('SERVICE')}
                        className="text-moria-orange hover:underline"
                      >
                        + Item manual
                      </button>
                    </div>
                    <ScrollArea className="h-44 border rounded-lg">
                      {filteredServices.length > 0 ? (
                        <div className="p-2 space-y-2">
                          {filteredServices.map((service) => {
                            const isAdded = items.some((i) => i.serviceId === service.id);
                            return (
                              <div
                                key={service.id}
                                className={`p-3 border rounded-lg transition-all ${
                                  isAdded ? 'bg-green-50 border-green-200' : 'hover:bg-muted cursor-pointer hover:border-moria-orange'
                                }`}
                                onClick={() => !isAdded && addCatalogItem(service, 'SERVICE')}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="font-medium">{service.name}</p>
                                      {isAdded && (
                                        <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                                          ✓ Adicionado
                                        </Badge>
                                      )}
                                    </div>
                                    {service.category && (
                                      <p className="text-xs text-muted-foreground mb-1">{service.category}</p>
                                    )}
                                    <p className="text-sm font-semibold text-moria-orange">
                                      {service.basePrice ? money(Number(service.basePrice)) : 'Sob consulta'}
                                    </p>
                                  </div>
                                  {!isAdded && <Plus className="h-5 w-5 text-moria-orange flex-shrink-0" />}
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
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  {/* Produtos */}
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
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{filteredProducts.length} produtos</span>
                      <button
                        type="button"
                        onClick={() => addManualItem('PRODUCT')}
                        className="text-moria-orange hover:underline"
                      >
                        + Item manual
                      </button>
                    </div>
                    <ScrollArea className="h-44 border rounded-lg">
                      {filteredProducts.length > 0 ? (
                        <div className="p-2 space-y-2">
                          {filteredProducts.map((product) => {
                            const isOutOfStock = product.stock === 0;
                            const isLowStock = product.stock > 0 && product.stock < 5;
                            const isAdded = items.some((i) => i.productId === product.id);
                            return (
                              <div
                                key={product.id}
                                className={`p-3 border rounded-lg transition-all ${
                                  isOutOfStock
                                    ? 'opacity-50 cursor-not-allowed bg-gray-50'
                                    : isAdded
                                    ? 'bg-green-50 border-green-200'
                                    : 'hover:bg-muted cursor-pointer hover:border-moria-orange'
                                }`}
                                onClick={() => !isOutOfStock && !isAdded && addCatalogItem(product, 'PRODUCT')}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="font-medium">{product.name}</p>
                                      {isAdded && (
                                        <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                                          ✓ Adicionado
                                        </Badge>
                                      )}
                                    </div>
                                    {product.category && (
                                      <p className="text-xs text-muted-foreground mb-1">{product.category}</p>
                                    )}
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="text-sm font-semibold text-moria-orange">
                                        {money(Number(product.promoPrice || product.salePrice))}
                                      </p>
                                      <span className="text-muted-foreground">•</span>
                                      <p
                                        className={`text-sm ${
                                          isOutOfStock
                                            ? 'text-red-600 font-semibold'
                                            : isLowStock
                                            ? 'text-yellow-600 font-medium'
                                            : 'text-muted-foreground'
                                        }`}
                                      >
                                        {isOutOfStock
                                          ? '❌ Sem estoque'
                                          : isLowStock
                                          ? `⚠️ Estoque baixo: ${product.stock}`
                                          : `✓ Estoque: ${product.stock}`}
                                      </p>
                                    </div>
                                  </div>
                                  {!isOutOfStock && !isAdded && <Plus className="h-5 w-5 text-moria-orange flex-shrink-0" />}
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
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                </Tabs>

                <Separator className="my-3" />

                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold">Itens da OS ({items.length})</Label>
                  {items.length > 0 && (
                    <span className="text-sm font-bold text-moria-orange">{money(totals.labor + totals.parts)}</span>
                  )}
                </div>

                {items.length > 0 ? (
                  <ScrollArea className="h-40 border rounded-lg">
                    <div className="p-2 space-y-1.5">
                      {items.map((item, idx) => {
                        const isManual =
                          item.type === 'PRODUCT' ? !item.productId : !item.serviceId;
                        return (
                          <div key={idx} className="p-2 bg-gray-50 rounded space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Badge
                                  variant="secondary"
                                  className={
                                    item.type === 'SERVICE'
                                      ? 'bg-orange-100 text-orange-800 text-[10px]'
                                      : 'bg-blue-100 text-blue-800 text-[10px]'
                                  }
                                >
                                  {item.type === 'SERVICE' ? 'Serviço' : 'Produto'}
                                </Badge>
                                {isManual ? (
                                  <Input
                                    className="h-8 text-sm"
                                    placeholder="Nome do item"
                                    value={item.name}
                                    onChange={(e) => patchItem(idx, { name: e.target.value })}
                                  />
                                ) : (
                                  <p className="font-medium text-sm truncate">{item.name}</p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(idx)}
                                className="min-h-[36px] min-w-[36px] h-9 w-9 p-0 flex-shrink-0 touch-manipulation"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => changeQuantity(idx, -1)}
                                  disabled={item.quantity <= 1}
                                  className="h-8 w-8 min-h-[32px] min-w-[32px] p-0 touch-manipulation"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </Button>
                                <span className="min-w-[28px] text-center text-sm font-medium">{item.quantity}</span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => changeQuantity(idx, 1)}
                                  className="h-8 w-8 min-h-[32px] min-w-[32px] p-0 touch-manipulation"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-muted-foreground">R$</span>
                                <Input
                                  className="h-8 w-24 text-sm text-right"
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={item.unitPrice}
                                  onChange={(e) =>
                                    patchItem(idx, { unitPrice: Math.max(0, Number(e.target.value) || 0) })
                                  }
                                />
                              </div>
                              <span className="font-bold text-sm w-24 text-right">
                                {money(item.unitPrice * item.quantity)}
                              </span>
                            </div>
                            {stockWarning(item) && (
                              <p className="text-xs text-amber-600 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> Quantidade acima do estoque disponível.
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-4 text-muted-foreground border border-dashed rounded-lg">
                    <Package className="h-8 w-8 mx-auto mb-1 opacity-20" />
                    <p className="text-sm">Nenhum item adicionado</p>
                  </div>
                )}
              </div>
            )}

            {/* ETAPA 3: Mecânico, desconto e resumo */}
            {step === 3 && (
              <div className="space-y-3">
                {/* Mecânico */}
                <div className="space-y-1">
                  <Label className="text-sm font-semibold">Mecânico responsável (opcional)</Label>
                  <Select value={mechanicId || 'none'} onValueChange={(v) => setMechanicId(v === 'none' ? '' : v)}>
                    <SelectTrigger className="min-h-[44px] h-11 text-sm">
                      <SelectValue placeholder="Sem mecânico" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem mecânico</SelectItem>
                      {mechanics.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator className="my-2" />

                {/* Resumo da OS */}
                <div className="bg-gray-50 p-3 rounded-lg border">
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                    <ClipboardList className="h-4 w-4" />
                    Resumo da OS
                  </h3>

                  <div className="space-y-2">
                    {/* Cliente e Veículo */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="p-2 bg-white rounded text-xs">
                        <p className="text-[10px] text-muted-foreground">Cliente</p>
                        <p className="font-medium truncate">{customerName || '—'}</p>
                        {customerPhone && <p className="text-muted-foreground truncate">{customerPhone}</p>}
                      </div>
                      <div className="p-2 bg-white rounded text-xs">
                        <p className="text-[10px] text-muted-foreground">Veículo</p>
                        <p className="font-medium truncate">{vehicleLabel || '—'}</p>
                        {(vehiclePlate || mileage) && (
                          <p className="text-muted-foreground truncate">
                            {vehiclePlate}
                            {vehiclePlate && mileage ? ' • ' : ''}
                            {mileage ? `${mileage} km` : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Itens */}
                    <div className="p-2 bg-white rounded">
                      <p className="text-[10px] text-muted-foreground mb-1">
                        {items.length} {items.length === 1 ? 'item' : 'itens'}
                      </p>
                      <ScrollArea className="h-16">
                        <div className="space-y-0.5">
                          {items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-xs">
                              <span className="truncate flex-1">
                                {item.quantity}x {item.name || '(sem nome)'}
                              </span>
                              <span className="font-medium ml-2">{money(item.unitPrice * item.quantity)}</span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>

                    {/* Totais */}
                    <div className="p-2 bg-white rounded space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Mão de obra</span>
                        <span>{money(totals.labor)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Produtos</span>
                        <span>{money(totals.parts)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Desconto</span>
                        <Input
                          className="h-7 w-28 text-right text-xs"
                          type="number"
                          min={0}
                          step="0.01"
                          value={discount}
                          onChange={(e) => setDiscount(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Total */}
                    <div className="flex items-center justify-between p-2 bg-moria-orange/10 rounded">
                      <p className="text-xs font-medium text-muted-foreground">Total</p>
                      <span className="text-lg font-bold text-moria-orange">{money(totals.total)}</span>
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
            onClick={step === 1 ? onClose : handlePreviousStep}
            className="min-h-[44px] h-11 touch-manipulation"
          >
            {step === 1 ? 'Cancelar' : 'Voltar'}
          </Button>

          {step < 3 ? (
            <Button onClick={handleNextStep} className="min-h-[44px] h-11 touch-manipulation">
              Próximo
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-moria-orange hover:bg-moria-orange/90 min-h-[44px] h-11 touch-manipulation"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Wrench className="h-4 w-4 mr-1.5" />
                  {isEditing ? 'Salvar alterações' : 'Criar OS'}
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>

      <CreateCustomerModal
        isOpen={createCustomerOpen}
        onClose={() => setCreateCustomerOpen(false)}
        onSuccess={handleCustomerCreated}
      />

      <RevisionVehicleLookupDialog
        isOpen={plateLookupOpen}
        onClose={() => setPlateLookupOpen(false)}
        onResolved={handlePlateResolved}
      />
    </Dialog>
  );
}
