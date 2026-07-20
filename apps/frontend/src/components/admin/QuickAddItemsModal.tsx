import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { Loader2, Plus, Minus, Trash2, Wrench, Package, Search, Zap, AlertTriangle } from 'lucide-react';
import { useToast } from '../ui/use-toast';
import serviceOrderService, {
  ServiceOrder,
  ServiceOrderItemInput,
} from '@/api/serviceOrderService';
import productService from '@/api/productService';
import serviceService from '@/api/serviceService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  order: ServiceOrder | null;
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

const money = (v: number | string) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);

export function QuickAddItemsModal({ isOpen, onClose, onSaved, order }: Props) {
  const { toast } = useToast();

  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [saving, setSaving] = useState(false);

  // Apenas os itens NOVOS que serão anexados à OS
  const [newItems, setNewItems] = useState<ServiceOrderItemInput[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setNewItems([]);
    setProductSearch('');
    setServiceSearch('');
    void loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const loadCatalog = async () => {
    setLoadingCatalog(true);
    // Mesmos serviços públicos usados nos modais de OS/Pedidos (limit <= 100 exigido pela API)
    const [prodRes, servRes] = await Promise.all([
      productService.getProducts({ page: 1, limit: 100 }).catch(() => ({ products: [] as any[] })),
      serviceService.getServices({ page: 1, limit: 100 }).catch(() => ({ services: [] as any[] })),
    ]);

    setProducts(
      (prodRes.products || [])
        .filter((p: any) => p.status === 'ACTIVE' || p.isActive)
        .map((p: any) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          salePrice: Number(p.salePrice) || 0,
          promoPrice: p.promoPrice != null ? Number(p.promoPrice) : null,
          stock: Number(p.stock) || 0,
        })) as CatalogProduct[]
    );
    setServices(
      (servRes.services || [])
        .filter((s: any) => s.status === 'ACTIVE' || s.isActive)
        .map((s: any) => ({
          id: s.id,
          name: s.name,
          category: s.category,
          basePrice: s.basePrice != null ? Number(s.basePrice) : undefined,
        })) as CatalogService[]
    );
    setLoadingCatalog(false);
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

  const addCatalogItem = (item: CatalogProduct | CatalogService, type: 'PRODUCT' | 'SERVICE') => {
    const alreadyAdded = newItems.some(
      (i) => (type === 'PRODUCT' ? i.productId === item.id : i.serviceId === item.id)
    );
    if (alreadyAdded) {
      toast({
        title: 'Item já adicionado',
        description: 'Ajuste a quantidade se necessário.',
        variant: 'destructive',
      });
      return;
    }
    const unitPrice =
      type === 'PRODUCT'
        ? Number((item as CatalogProduct).promoPrice || (item as CatalogProduct).salePrice) || 0
        : Number((item as CatalogService).basePrice) || 0;

    setNewItems((prev) => [
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
    toast({ title: 'Item adicionado', description: item.name, duration: 1500 });
  };

  const removeItem = (idx: number) => setNewItems((prev) => prev.filter((_, i) => i !== idx));
  const patchItem = (idx: number, patch: Partial<ServiceOrderItemInput>) =>
    setNewItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const changeQuantity = (idx: number, delta: number) =>
    setNewItems((prev) =>
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

  const newItemsTotal = useMemo(
    () => newItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
    [newItems]
  );

  const handleSave = async () => {
    if (!order) return;
    if (newItems.length === 0) {
      toast({ title: 'Nenhum item novo', description: 'Adicione ao menos um produto ou serviço.', variant: 'destructive' });
      return;
    }
    if (newItems.some((i) => !i.name.trim())) {
      toast({ title: 'Item sem nome', description: 'Preencha o nome dos itens manuais.', variant: 'destructive' });
      return;
    }

    // O backend substitui a lista inteira ao receber `items`, então mesclamos
    // os itens já existentes na OS com os novos para não perder nada.
    const existingItems: ServiceOrderItemInput[] = order.items.map((i) => ({
      type: i.type,
      productId: i.productId,
      serviceId: i.serviceId,
      name: i.name,
      unitPrice: Number(i.unitPrice),
      quantity: i.quantity,
    }));

    setSaving(true);
    try {
      await serviceOrderService.update(order.id, {
        items: [...existingItems, ...newItems],
        discount: Number(order.discount) || 0,
      });
      toast({ title: 'Itens adicionados à OS!' });
      onSaved();
      onClose();
    } catch (err: any) {
      toast({
        title: 'Erro ao adicionar itens',
        description: err?.response?.data?.error ?? err?.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-3rem)] p-0 flex flex-col gap-0">
        <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b bg-gray-50/50 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-moria-orange" />
            Adição rápida de itens
          </DialogTitle>
          <DialogDescription>
            {order
              ? `OS #${order.number} · ${order.customerName}`
              : 'Adicione produtos e serviços a esta OS.'}
          </DialogDescription>
        </div>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-6 py-3 sm:py-4 space-y-3">
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
                <ScrollArea className="h-40 border rounded-lg">
                  {loadingCatalog ? (
                    <div className="text-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </div>
                  ) : filteredServices.length > 0 ? (
                    <div className="p-2 space-y-2">
                      {filteredServices.map((service) => {
                        const isAdded = newItems.some((i) => i.serviceId === service.id);
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
                                {service.category && <p className="text-xs text-muted-foreground mb-1">{service.category}</p>}
                                <p className="text-sm font-semibold text-moria-orange">
                                  {service.basePrice ? money(service.basePrice) : 'Sob consulta'}
                                </p>
                              </div>
                              {!isAdded && <Plus className="h-5 w-5 text-moria-orange flex-shrink-0" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-muted-foreground">
                      <Wrench className="h-12 w-12 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">Nenhum serviço disponível</p>
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
                <ScrollArea className="h-40 border rounded-lg">
                  {loadingCatalog ? (
                    <div className="text-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </div>
                  ) : filteredProducts.length > 0 ? (
                    <div className="p-2 space-y-2">
                      {filteredProducts.map((product) => {
                        const isOutOfStock = product.stock === 0;
                        const isLowStock = product.stock > 0 && product.stock < 5;
                        const isAdded = newItems.some((i) => i.productId === product.id);
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
                                {product.category && <p className="text-xs text-muted-foreground mb-1">{product.category}</p>}
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
                    <div className="text-center py-10 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">Nenhum produto disponível</p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>

            <Separator className="my-2" />

            <div className="flex items-center justify-between mb-1">
              <Label className="text-sm font-semibold">Itens a adicionar ({newItems.length})</Label>
              {newItems.length > 0 && <span className="text-sm font-bold text-moria-orange">+{money(newItemsTotal)}</span>}
            </div>

            {newItems.length > 0 ? (
              <div className="space-y-1.5">
                {newItems.map((item, idx) => {
                  const isManual = item.type === 'PRODUCT' ? !item.productId : !item.serviceId;
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
                            onChange={(e) => patchItem(idx, { unitPrice: Math.max(0, Number(e.target.value) || 0) })}
                          />
                        </div>
                        <span className="font-bold text-sm w-24 text-right">{money(item.unitPrice * item.quantity)}</span>
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
            ) : (
              <div className="text-center py-4 text-muted-foreground border border-dashed rounded-lg">
                <Zap className="h-8 w-8 mx-auto mb-1 opacity-20" />
                <p className="text-sm">Selecione itens acima para adicionar à OS</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-3 border-t bg-gray-50/50 flex-shrink-0">
          <Button variant="outline" onClick={onClose} className="min-h-[44px] h-11 touch-manipulation">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || newItems.length === 0}
            className="bg-moria-orange hover:bg-moria-orange/90 min-h-[44px] h-11 touch-manipulation"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Adicionando...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1.5" />
                Adicionar {newItems.length > 0 ? `(${newItems.length})` : ''}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
