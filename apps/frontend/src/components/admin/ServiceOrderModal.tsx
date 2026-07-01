import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Loader2, Plus, Trash2, Wrench, Package, User, Car, AlertTriangle, Search, X, UserPlus, Camera } from 'lucide-react';
import { useToast } from '../ui/use-toast';
import serviceOrderService, {
  ServiceOrder,
  ServiceOrderInput,
  ServiceOrderItemInput,
} from '@/api/serviceOrderService';
import adminService, { type ProvisionalUser } from '@/api/adminService';
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
  salePrice: number;
  stock: number;
}
interface CatalogService {
  id: string;
  name: string;
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

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [plateLookupOpen, setPlateLookupOpen] = useState(false);

  // Busca de clientes cadastrados
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<ProvisionalUser[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);
  const [vehicleLabel, setVehicleLabel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [mileage, setMileage] = useState<string>('');
  const [description, setDescription] = useState('');
  const [mechanicId, setMechanicId] = useState<string>('');
  const [discount, setDiscount] = useState<string>('0');
  const [items, setItems] = useState<ServiceOrderItemInput[]>([]);

  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
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
    }
    setCustomerSearch('');
    setCustomerResults([]);
    setShowResults(false);
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

  const selectCustomer = (c: ProvisionalUser) => {
    setCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerPhone(c.whatsapp ?? '');
    setShowResults(false);
    setCustomerSearch('');
    setCustomerResults([]);
  };

  const clearCustomer = () => {
    setCustomerId(null);
    setCustomerName('');
    setCustomerPhone('');
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
    toast({ title: 'Veículo identificado pela placa', description: payload.vehicle.plate });
  };

  const loadCatalog = async () => {
    try {
      const [prodRes, servRes, mechRes] = await Promise.all([
        adminService.getProducts({ page: 1, limit: 200 }).catch(() => ({ products: [] })),
        adminService.getServices({ page: 1, limit: 200 }).catch(() => ({ services: [] })),
        revisionService.getMechanicsWorkload().catch(() => []),
      ]);
      setProducts((prodRes.products || []) as CatalogProduct[]);
      setServices((servRes.services || []) as CatalogService[]);
      setMechanics((mechRes || []) as Mechanic[]);
    } catch {
      /* silencioso */
    }
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

  const addService = () => setItems((prev) => [...prev, { type: 'SERVICE', name: '', unitPrice: 0, quantity: 1 }]);
  const addProduct = () => setItems((prev) => [...prev, { type: 'PRODUCT', name: '', unitPrice: 0, quantity: 1 }]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const patchItem = (idx: number, patch: Partial<ServiceOrderItemInput>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const onSelectCatalog = (idx: number, item: ServiceOrderItemInput, value: string) => {
    if (item.type === 'PRODUCT') {
      const p = products.find((x) => x.id === value);
      if (p) patchItem(idx, { productId: p.id, name: p.name, unitPrice: Number(p.salePrice) || 0 });
    } else {
      const s = services.find((x) => x.id === value);
      if (s) patchItem(idx, { serviceId: s.id, name: s.name, unitPrice: Number(s.basePrice) || 0 });
    }
  };

  const stockWarning = (item: ServiceOrderItemInput): boolean => {
    if (item.type !== 'PRODUCT' || !item.productId) return false;
    const p = products.find((x) => x.id === item.productId);
    return !!p && item.quantity > p.stock;
  };

  const handleSave = async () => {
    if (!customerName.trim()) {
      toast({ title: 'Informe o nome do cliente', variant: 'destructive' });
      return;
    }
    if (items.some((i) => !i.name.trim())) {
      toast({ title: 'Preencha o nome de todos os itens', variant: 'destructive' });
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

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? `Editar OS #${order?.number}` : 'Nova Ordem de Serviço'}</DialogTitle>
          <DialogDescription>
            Registre cliente, veículo, serviços e produtos usados. O total é calculado automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Cliente */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4" /> Cliente
              </h4>
              <Button type="button" size="sm" variant="outline" onClick={() => setCreateCustomerOpen(true)}>
                <UserPlus className="h-3.5 w-3.5 mr-1" /> Cadastrar cliente
              </Button>
            </div>

            {customerId ? (
              // Cliente selecionado
              <div className="flex items-center justify-between rounded-lg border bg-gray-50 p-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{customerName}</p>
                  {customerPhone && <p className="text-sm text-gray-500">{customerPhone}</p>}
                </div>
                <Button type="button" size="sm" variant="ghost" onClick={clearCustomer}>
                  <X className="h-4 w-4 mr-1" /> Trocar
                </Button>
              </div>
            ) : (
              // Busca de cliente cadastrado
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    className="pl-10"
                    placeholder="Buscar cliente por nome, e-mail ou telefone..."
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowResults(true);
                    }}
                    onFocus={() => setShowResults(true)}
                  />
                </div>

                {showResults && customerSearch.trim().length >= 2 && (
                  <div className="absolute z-20 mt-1 w-full rounded-lg border bg-white shadow-lg max-h-56 overflow-y-auto">
                    {searchingCustomers ? (
                      <div className="flex items-center gap-2 p-3 text-sm text-gray-500">
                        <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
                      </div>
                    ) : customerResults.length === 0 ? (
                      <div className="p-3 text-sm text-gray-500">
                        Nenhum cliente encontrado.
                        <button
                          type="button"
                          className="ml-1 text-moria-orange hover:underline"
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
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0"
                          onClick={() => selectCustomer(c)}
                        >
                          <p className="text-sm font-medium">{c.name}</p>
                          <p className="text-xs text-gray-500">
                            {c.whatsapp || c.email}
                            {c.cpf ? ` · ${c.cpf}` : ''}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Selecione um cliente cadastrado ou clique em "Cadastrar cliente".
                </p>
              </div>
            )}
          </section>

          {/* Veículo */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Car className="h-4 w-4" /> Veículo
              </h4>
              <Button type="button" size="sm" variant="outline" onClick={() => setPlateLookupOpen(true)}>
                <Camera className="h-3.5 w-3.5 mr-1" /> Ler placa
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1 sm:col-span-1">
                <Label className="text-xs">Modelo / descrição</Label>
                <Input value={vehicleLabel} onChange={(e) => setVehicleLabel(e.target.value)} placeholder="Ex.: Gol 2018" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Placa</Label>
                <div className="flex gap-1">
                  <Input value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)} placeholder="ABC1D23" />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="shrink-0"
                    title="Ler placa com a câmera"
                    onClick={() => setPlateLookupOpen(true)}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">KM</Label>
                <Input type="number" value={mileage} onChange={(e) => setMileage(e.target.value)} placeholder="0" />
              </div>
            </div>
          </section>

          {/* Descrição */}
          <section className="space-y-1">
            <Label className="text-xs">Descrição do serviço</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o problema ou o serviço a ser feito..."
              rows={2}
            />
          </section>

          <Separator />

          {/* Itens */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Itens (serviços e produtos)</h4>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={addService}>
                  <Wrench className="h-3.5 w-3.5 mr-1" /> Serviço
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={addProduct}>
                  <Package className="h-3.5 w-3.5 mr-1" /> Produto
                </Button>
              </div>
            </div>

            {items.length === 0 && (
              <p className="text-sm text-gray-500 py-2">Nenhum item adicionado ainda.</p>
            )}

            <div className="space-y-2">
              {items.map((item, idx) => {
                const catalog = item.type === 'PRODUCT' ? products : services;
                const selectedId = item.type === 'PRODUCT' ? item.productId : item.serviceId;
                return (
                  <div key={idx} className="rounded-lg border p-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={item.type === 'SERVICE' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}>
                        {item.type === 'SERVICE' ? 'Serviço' : 'Produto'}
                      </Badge>
                      <Select value={selectedId ?? 'manual'} onValueChange={(v) => v !== 'manual' && onSelectCatalog(idx, item, v)}>
                        <SelectTrigger className="h-8 flex-1">
                          <SelectValue placeholder="Selecionar do catálogo ou digitar abaixo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Item manual</SelectItem>
                          {catalog.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" size="icon" variant="ghost" className="text-red-600 h-8 w-8" onClick={() => removeItem(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <Input
                        className="col-span-6 h-8"
                        placeholder="Nome do item"
                        value={item.name}
                        onChange={(e) => patchItem(idx, { name: e.target.value })}
                      />
                      <div className="col-span-2">
                        <Input
                          className="h-8"
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => patchItem(idx, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                        />
                      </div>
                      <div className="col-span-4">
                        <Input
                          className="h-8"
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => patchItem(idx, { unitPrice: Math.max(0, Number(e.target.value) || 0) })}
                        />
                      </div>
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
          </section>

          {/* Totais */}
          <section className="rounded-lg bg-gray-50 p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Mão de obra</span>
              <span>{money(totals.labor)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Produtos</span>
              <span>{money(totals.parts)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Desconto</span>
              <Input
                className="h-7 w-28 text-right"
                type="number"
                min={0}
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>
            <Separator className="my-1" />
            <div className="flex justify-between font-semibold text-base">
              <span>Total</span>
              <span className="text-moria-orange">{money(totals.total)}</span>
            </div>
          </section>

          {/* Mecânico */}
          <section className="space-y-1">
            <Label className="text-xs">Mecânico responsável (opcional)</Label>
            <Select value={mechanicId || 'none'} onValueChange={(v) => setMechanicId(v === 'none' ? '' : v)}>
              <SelectTrigger>
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
          </section>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-moria-orange hover:bg-moria-orange/90">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? 'Salvar alterações' : 'Criar OS'}
          </Button>
        </DialogFooter>
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
