import { useState, useEffect } from "react";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import { useStoreSettings } from "../hooks/useStoreSettings";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  User,
  Phone,
  MessageCircle,
  ShoppingBag,
  Loader2,
  CheckCircle,
  Package,
  Wrench,
  Mail,
  Home,
  Search,
  MapPin,
  Plus,
  Gift
} from "lucide-react";
import { toast } from "sonner";
import type { CartItem, Address } from "@moria/types";
import guestOrderService from "../api/guestOrderService";
import orderService from "../api/orderService";
import addressService from "../api/addressService";
import { CouponInput } from "./CouponInput";

interface CheckoutDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CheckoutForm {
  name: string;
  email: string;
  whatsapp: string;
  address: {
    zipCode: string;
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  paymentMethod: string;
}

export function CheckoutDrawer({ open, onOpenChange }: CheckoutDrawerProps) {
  const { items, totalPrice, clearCart, closeCart, autoPromotions, promotionDiscount } = useCart();
  const { customer, isAuthenticated } = useAuth();
  const { settings: storeSettings } = useStoreSettings();

  const [form, setForm] = useState<CheckoutForm>({
    name: "",
    email: "",
    whatsapp: "",
    address: {
      zipCode: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
    },
    paymentMethod: "pix",
  });

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);

  // ✅ ETAPA 1.1: Estado para cupom aplicado
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
  } | null>(null);

  // Pré-preencher dados do cliente logado
  useEffect(() => {
    if (isAuthenticated && customer && open) {
      setForm(prev => ({
        ...prev,
        name: customer.name || "",
        email: customer.email || "",
        whatsapp: customer.phone ? formatWhatsApp(customer.phone) : "",
      }));

      // Selecionar endereço padrão se existir
      if (customer.addresses && customer.addresses.length > 0) {
        const defaultAddress = customer.addresses.find(addr => addr.isDefault) || customer.addresses[0];
        setSelectedAddressId(defaultAddress.id);
        setUseNewAddress(false);
      } else {
        setUseNewAddress(true);
      }
    } else if (!isAuthenticated && open) {
      // Reset para convidados
      setSelectedAddressId(null);
      setUseNewAddress(true);
    }
  }, [isAuthenticated, customer, open]);

  // Pré-preencher endereço quando selecionar da lista
  useEffect(() => {
    if (selectedAddressId && customer?.addresses) {
      const address = customer.addresses.find(addr => addr.id === selectedAddressId);
      if (address) {
        setForm(prev => ({
          ...prev,
          address: {
            zipCode: address.zipCode || "",
            street: address.street || "",
            number: address.number || "",
            complement: address.complement || "",
            neighborhood: address.neighborhood || "",
            city: address.city || "",
            state: address.state || "",
          }
        }));
      }
    }
  }, [selectedAddressId, customer]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, '');

    if (numbers.length <= 2) {
      return `(${numbers}`;
    } else if (numbers.length <= 7) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  const formatZipCode = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 5) {
      return numbers;
    }
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  const fetchAddressByCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');

    if (cleanCep.length !== 8) {
      return;
    }

    setIsLoadingCep(true);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast.error("CEP não encontrado");
        return;
      }

      setForm(prev => ({
        ...prev,
        address: {
          ...prev.address,
          street: data.logradouro || '',
          neighborhood: data.bairro || '',
          city: data.localidade || '',
          state: data.uf || '',
        }
      }));

      toast.success("Endereço encontrado!");
    } catch (error) {
      toast.error("Erro ao buscar CEP. Tente novamente.");
      console.error('Error fetching CEP:', error);
    } finally {
      setIsLoadingCep(false);
    }
  };

  const generateWhatsAppMessage = (order: any): string => {
    const { customer, items, total, hasProducts, hasServices, quoteStatus } = order;

    let message = `🔧 *Moria Peças e Serviços*\n`;
    message += `📋 *Pedido:* #${order.id.slice(0, 8)}\n`;
    message += `👤 *Cliente:* ${customer.name}\n`;
    message += `📞 *WhatsApp:* ${customer.phone}\n\n`;

    if (hasProducts) {
      const productItems = items.filter((item: any) => item.type === 'PRODUCT');
      message += `🛒 *PRODUTOS:*\n`;
      productItems.forEach((item: any, index: number) => {
        message += `${index + 1}. ${item.name}\n`;
        message += `   • Quantidade: ${item.quantity}x\n`;
        message += `   • Valor: ${formatPrice(item.price)}\n`;
        message += `   • Subtotal: ${formatPrice(item.subtotal)}\n\n`;
      });
    }

    if (hasServices) {
      const serviceItems = items.filter((item: any) => item.type === 'SERVICE');
      message += `🔧 *SERVIÇOS:*\n`;
      serviceItems.forEach((item: any, index: number) => {
        message += `${index + 1}. ${item.name}\n`;
        message += `   • Quantidade: ${item.quantity}x\n`;
        if (item.priceQuoted) {
          message += `   • Valor: ${formatPrice(item.price)}\n`;
        } else {
          message += `   • *Aguardando orçamento*\n`;
        }
        message += `\n`;
      });
    }

    if (hasProducts) {
      message += `💰 *Total: ${formatPrice(total)}*\n\n`;
    }

    if (quoteStatus === 'PENDING') {
      message += `⏳ Alguns serviços aguardam orçamento. Em breve retornaremos com os valores.\n\n`;
    }

    message += `🕒 *Data:* ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}\n\n`;
    message += `Aguardo confirmação e próximos passos!`;

    return message;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!form.name.trim() || !form.email.trim() || !form.whatsapp.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (form.whatsapp.replace(/\D/g, '').length < 10) {
      toast.error("WhatsApp deve ter pelo menos 10 dígitos");
      return;
    }

    if (!form.address.street || !form.address.number || !form.address.neighborhood || !form.address.city || !form.address.state || !form.address.zipCode) {
      toast.error("Preencha todos os campos de endereço");
      return;
    }

    setIsLoading(true);

    try {
      let order: any;

      // CLIENTE AUTENTICADO - usar rota /orders
      if (isAuthenticated && customer) {
        let addressId = selectedAddressId;

        // Se precisa criar novo endereço
        if (useNewAddress || !selectedAddressId) {
          toast.info("Criando novo endereço...");

          // ✅ CORREÇÃO: Usar addressService para criar endereço
          const newAddress = await addressService.createAddress({
            street: form.address.street,
            number: form.address.number,
            complement: form.address.complement || '',
            neighborhood: form.address.neighborhood,
            city: form.address.city,
            state: form.address.state,
            zipCode: form.address.zipCode.replace(/\D/g, ''),
            type: 'HOME',
            isDefault: false,
          });

          addressId = newAddress.id;
          toast.success("Endereço criado!");
        }

        // ✅ Agora sempre usa rota autenticada com addressId válido
        const authenticatedOrderData = {
          addressId: addressId!,
          items: items.map(item => {
            // Normalização defensiva: assume 'product' se type não estiver definido
            const itemType = item.type || 'product';
            const isService = itemType === 'service';
            return {
              productId: !isService ? item.id : undefined,
              serviceId: isService ? item.id : undefined,
              type: (isService ? 'SERVICE' : 'PRODUCT') as 'PRODUCT' | 'SERVICE',
              quantity: item.quantity,
            };
          }),
          paymentMethod: form.paymentMethod,
          source: 'WEB' as const,
          couponCode: appliedCoupon?.code, // ✅ ETAPA 1.4: Incluir cupom
          appliedPromotions: autoPromotions.map(promo => promo.promotionId), // ✅ ETAPA 2.4: Incluir promoções aplicadas
        };

        order = await orderService.createOrder(authenticatedOrderData);
      } else {
        // CONVIDADO - usar rota /orders/guest
        const guestOrderData = {
          customerName: form.name,
          customerEmail: form.email,
          customerPhone: form.whatsapp.replace(/\D/g, ''),
          address: {
            street: form.address.street,
            number: form.address.number,
            complement: form.address.complement || undefined,
            neighborhood: form.address.neighborhood,
            city: form.address.city,
            state: form.address.state,
            zipCode: form.address.zipCode.replace(/\D/g, ''),
            type: 'HOME' as const,
          },
          items: items.map(item => {
            // Normalização defensiva: assume 'product' se type não estiver definido
            const itemType = item.type || 'product';
            const isService = itemType === 'service';
            return {
              productId: !isService ? item.id : undefined,
              serviceId: isService ? item.id : undefined,
              type: (isService ? 'SERVICE' : 'PRODUCT') as 'PRODUCT' | 'SERVICE',
              quantity: item.quantity,
            };
          }),
          paymentMethod: form.paymentMethod,
          couponCode: appliedCoupon?.code, // ✅ ETAPA 1.4: Incluir cupom
          appliedPromotions: autoPromotions.map(promo => promo.promotionId), // ✅ ETAPA 2.4: Incluir promoções aplicadas
        };

        order = await guestOrderService.createGuestOrder(guestOrderData);
      }

      console.log('Order created:', order);

      setIsSuccess(true);

      // Gerar mensagem WhatsApp
      const message = generateWhatsAppMessage(order);
      const whatsappNumber = storeSettings?.whatsapp || "5511999999999";
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${encodeURIComponent(message)}`;

      // Abrir WhatsApp após sucesso
      setTimeout(() => {
        window.open(whatsappUrl, '_blank');

        // Limpar carrinho e fechar
        setTimeout(() => {
          clearCart();
          closeCart();
          onOpenChange(false);
          setIsSuccess(false);

          // Reset form apenas para convidados
          if (!isAuthenticated) {
            setForm({
              name: "",
              email: "",
              whatsapp: "",
              address: {
                zipCode: "",
                street: "",
                number: "",
                complement: "",
                neighborhood: "",
                city: "",
                state: "",
              },
              paymentMethod: "pix",
            });
          }

          toast.success("Pedido criado com sucesso! Você será contatado em breve.");
        }, 1000);
      }, 2000);

    } catch (error: any) {
      console.error('Error creating order:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      // Mensagens de erro mais específicas
      let errorMessage = "Erro ao processar pedido. Tente novamente.";

      if (error.response?.status === 400) {
        errorMessage = error.response?.data?.message || "Dados inválidos. Verifique os campos.";
      } else if (error.response?.status === 404) {
        errorMessage = "Produto ou serviço não encontrado.";
      } else if (error.response?.status === 500) {
        errorMessage = "Erro no servidor. Tente novamente mais tarde.";
      } else if (error.message === 'Network Error') {
        errorMessage = "Erro de conexão. Verifique sua internet.";
      }

      toast.error(errorMessage);
      setIsLoading(false);
    }
  };

  const products = items.filter(item => item.type !== 'service');
  const services = items.filter(item => item.type === 'service');
  const hasProducts = products.length > 0;
  const hasServices = services.length > 0;

  if (isSuccess) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md">
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-6">
              <div className="bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-bold">Pedido Criado!</h3>
                <p className="text-muted-foreground">
                  Redirecionando para o WhatsApp...
                </p>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="h-5 w-5 animate-spin text-moria-orange" />
                <span className="text-sm font-medium">Abrindo WhatsApp</span>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-4xl flex flex-col p-0">
        <SheetHeader className="p-6 pb-4 flex-shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-moria-orange" />
            Finalizar Pedido
            {isAuthenticated && (
              <Badge variant="outline" className="ml-2">
                Logado como {customer?.name?.split(' ')[0]}
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            {isAuthenticated
              ? "Seus dados foram preenchidos automaticamente. Confirme ou edite se necessário."
              : "Preencha seus dados para finalizar o pedido via WhatsApp"
            }
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 pt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Resumo do Pedido */}
              <div className="flex flex-col">
                <h3 className="font-semibold mb-4">Resumo do Pedido</h3>

                {/* Container com scroll para itens - ALTURA FIXA */}
                <div className="overflow-y-auto space-y-3 pr-2 scrollbar-thin border rounded-lg p-2" style={{ height: '350px' }}>
                  {hasProducts && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">Produtos</span>
                      </div>
                      {products.map((item) => (
                        <div key={`product-${item.id}`} className="border rounded-lg p-3 mb-2">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">{item.name}</h4>
                              <Badge variant="secondary" className="text-xs mt-1">
                                {item.category}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-moria-orange">
                                {item.quantity}x {formatPrice(item.price)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatPrice(item.price * item.quantity)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {hasServices && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Wrench className="h-4 w-4 text-orange-600" />
                        <span className="font-medium">Serviços (Orçamento)</span>
                      </div>
                      {services.map((item) => (
                        <div key={`service-${item.id}`} className="border rounded-lg p-3 bg-orange-50 mb-2">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">{item.name}</h4>
                              {item.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {item.description}
                                </p>
                              )}
                              <Badge variant="outline" className="text-xs mt-1">
                                Orçamento necessário
                              </Badge>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">
                                {item.quantity}x
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {hasProducts && (
                  <div className="border-t pt-4 mt-4 space-y-4">
                    {/* ✅ ETAPA 1.2: Componente CouponInput */}
                    <CouponInput
                      orderTotal={totalPrice}
                      appliedCoupon={appliedCoupon}
                      onCouponApplied={(code, discount) => {
                        setAppliedCoupon({ code, discountAmount: discount });
                        toast.success(`Cupom ${code} aplicado com sucesso!`);
                      }}
                      onCouponRemoved={() => {
                        setAppliedCoupon(null);
                        toast.info('Cupom removido');
                      }}
                      disabled={isLoading || !hasProducts}
                    />

                    {/* ✅ ETAPA 1.3: Cálculo de total com desconto */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span>Subtotal dos Produtos:</span>
                        <span>{formatPrice(totalPrice)}</span>
                      </div>

                      {/* Promoções automáticas */}
                      {autoPromotions && autoPromotions.length > 0 && (
                        <div className="space-y-1 bg-green-50 border border-green-200 rounded-lg p-2">
                          <div className="flex items-center gap-1 text-xs font-semibold text-green-700">
                            <Gift className="h-3 w-3" />
                            <span>Promoções Aplicadas:</span>
                          </div>
                          {autoPromotions.map((promo, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs text-green-700">
                              <span className="flex-1">• {promo.promotionName}</span>
                              <span className="font-semibold">-{formatPrice(promo.discountAmount)}</span>
                            </div>
                          ))}
                          <div className="flex justify-between items-center text-sm font-bold text-green-600 pt-1 border-t border-green-300">
                            <span>Desconto Total (Promoções):</span>
                            <span>-{formatPrice(promotionDiscount)}</span>
                          </div>
                        </div>
                      )}

                      {appliedCoupon && (
                        <div className="flex justify-between items-center text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-lg p-2">
                          <span>Cupom ({appliedCoupon.code}):</span>
                          <span className="font-semibold">-{formatPrice(appliedCoupon.discountAmount)}</span>
                        </div>
                      )}

                      <Separator />

                      <div className="flex justify-between items-center font-bold">
                        <span>Total Final:</span>
                        <span className="text-lg text-moria-orange">
                          {formatPrice(totalPrice - promotionDiscount - (appliedCoupon?.discountAmount || 0))}
                        </span>
                      </div>

                      {(promotionDiscount > 0 || appliedCoupon) && (
                        <p className="text-xs text-green-600 font-medium">
                          🎉 Você economizou {formatPrice(promotionDiscount + (appliedCoupon?.discountAmount || 0))}!
                        </p>
                      )}

                      {hasServices && (
                        <p className="text-xs text-muted-foreground">
                          * Serviços serão orçados separadamente
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Formulário */}
              <div className="flex flex-col">
                <h3 className="font-semibold mb-4">Seus Dados</h3>

                <div className="space-y-4 flex-1">
                  {/* Dados Pessoais */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm">Nome Completo *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="name"
                        placeholder="Seu nome completo"
                        className="pl-10 h-10"
                        value={form.name}
                        onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                        disabled={isLoading || (isAuthenticated && !!customer?.name)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm">Email *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        className="pl-10 h-10"
                        value={form.email}
                        onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                        disabled={isLoading || (isAuthenticated && !!customer?.email)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whatsapp" className="text-sm">WhatsApp *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="whatsapp"
                        placeholder="(11) 99999-9999"
                        className="pl-10 h-10"
                        value={form.whatsapp}
                        onChange={(e) => {
                          const formatted = formatWhatsApp(e.target.value);
                          setForm(prev => ({ ...prev, whatsapp: formatted }));
                        }}
                        disabled={isLoading}
                        required
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Seleção de Endereço - APENAS PARA CLIENTES LOGADOS */}
                  {isAuthenticated && customer?.addresses && customer.addresses.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold">Endereço de Entrega</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setUseNewAddress(!useNewAddress)}
                          className="h-8 text-xs"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          {useNewAddress ? "Usar endereço salvo" : "Novo endereço"}
                        </Button>
                      </div>

                      {!useNewAddress && (
                        <div className="space-y-2">
                          <Select
                            value={selectedAddressId || undefined}
                            onValueChange={setSelectedAddressId}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um endereço" />
                            </SelectTrigger>
                            <SelectContent>
                              {customer.addresses.map((addr) => (
                                <SelectItem key={addr.id} value={addr.id}>
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-3 w-3" />
                                    <span>
                                      {addr.street}, {addr.number} - {addr.neighborhood}
                                      {addr.isDefault && " (Padrão)"}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Formulário de Endereço - Para convidados ou novo endereço */}
                  {(!isAuthenticated || useNewAddress || !customer?.addresses?.length) && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4" />
                        <Label className="text-sm font-semibold">Endereço de Entrega</Label>
                      </div>

                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-1">
                            <div className="relative">
                              <Input
                                placeholder="CEP *"
                                value={form.address.zipCode}
                                onChange={(e) => {
                                  const formatted = formatZipCode(e.target.value);
                                  setForm(prev => ({
                                    ...prev,
                                    address: { ...prev.address, zipCode: formatted }
                                  }));

                                  // Buscar endereço automaticamente quando tiver 8 dígitos
                                  if (formatted.replace(/\D/g, '').length === 8) {
                                    fetchAddressByCep(formatted);
                                  }
                                }}
                                disabled={isLoading || isLoadingCep}
                                maxLength={9}
                                required
                                className="pr-10"
                              />
                              {isLoadingCep && (
                                <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-moria-orange" />
                              )}
                              {!isLoadingCep && form.address.zipCode.replace(/\D/g, '').length === 8 && (
                                <Search className="absolute right-3 top-3 h-4 w-4 text-green-600" />
                              )}
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Digite o CEP para preencher o endereço automaticamente
                        </p>
                      </div>

                      <Input
                        placeholder="Rua *"
                        value={form.address.street}
                        onChange={(e) => setForm(prev => ({
                          ...prev,
                          address: { ...prev.address, street: e.target.value }
                        }))}
                        disabled={isLoading}
                        required
                      />

                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-1">
                          <Input
                            placeholder="Número *"
                            value={form.address.number}
                            onChange={(e) => setForm(prev => ({
                              ...prev,
                              address: { ...prev.address, number: e.target.value }
                            }))}
                            disabled={isLoading}
                            required
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            placeholder="Complemento"
                            value={form.address.complement}
                            onChange={(e) => setForm(prev => ({
                              ...prev,
                              address: { ...prev.address, complement: e.target.value }
                            }))}
                            disabled={isLoading}
                          />
                        </div>
                      </div>

                      <Input
                        placeholder="Bairro *"
                        value={form.address.neighborhood}
                        onChange={(e) => setForm(prev => ({
                          ...prev,
                          address: { ...prev.address, neighborhood: e.target.value }
                        }))}
                        disabled={isLoading}
                        required
                      />

                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <Input
                            placeholder="Cidade *"
                            value={form.address.city}
                            onChange={(e) => setForm(prev => ({
                              ...prev,
                              address: { ...prev.address, city: e.target.value }
                            }))}
                            disabled={isLoading}
                            required
                          />
                        </div>
                        <div className="col-span-1">
                          <Input
                            placeholder="UF *"
                            maxLength={2}
                            value={form.address.state}
                            onChange={(e) => setForm(prev => ({
                              ...prev,
                              address: { ...prev.address, state: e.target.value.toUpperCase() }
                            }))}
                            disabled={isLoading}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-muted rounded-lg p-3">
                    <h4 className="font-medium text-sm mb-2">Como funciona:</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>✅ Seu pedido é registrado em nosso sistema</li>
                      <li>📱 Você será redirecionado para o WhatsApp</li>
                      <li>💬 A mensagem será gerada automaticamente</li>
                      <li>🤝 Nossa equipe entrará em contato em breve</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t p-6 flex-shrink-0">
            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 h-11"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Finalizar via WhatsApp
                </>
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
