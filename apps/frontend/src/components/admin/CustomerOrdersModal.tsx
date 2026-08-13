import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import {
  Package,
  User,
  Phone,
  ShoppingBag,
  Calendar,
  DollarSign,
  Eye,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  Factory,
  Truck,
  X as XIcon
} from "lucide-react";
import adminService, { type ProvisionalUser as AdminCustomer, type StoreOrder } from "../../api/adminService";
import { useToast } from "../../hooks/use-toast";
import { OrderDetailsModal } from "./OrderDetailsModal";

interface CustomerOrdersModalProps {
  customer: AdminCustomer | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CustomerOrdersModal({ customer, isOpen, onClose }: CustomerOrdersModalProps) {
  const { toast } = useToast();
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<StoreOrder | null>(null);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);

  useEffect(() => {
    if (isOpen && customer) {
      loadCustomerOrders();
    }
  }, [isOpen, customer]);

  const loadCustomerOrders = async () => {
    if (!customer) return;

    setIsLoading(true);
    try {
      // Buscar todos os pedidos e filtrar pelo nome ou telefone do cliente
      const response = await adminService.getOrders({ page: 1, limit: 100 });
      const customerOrders = response.orders.filter(
        order =>
          order.customerName.toLowerCase().includes(customer.name.toLowerCase()) ||
          order.customerWhatsApp.includes(customer.whatsapp)
      );
      setOrders(customerOrders);
    } catch (error: any) {
      console.error('Error loading customer orders:', error);
      toast({
        title: "❌ Erro ao carregar pedidos",
        description: error.response?.data?.error || error.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; icon: any }> = {
      PENDING: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      CONFIRMED: { label: 'Confirmado', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      IN_PRODUCTION: { label: 'Em Produção', color: 'bg-indigo-100 text-indigo-800', icon: Factory },
      PREPARING: { label: 'Preparando', color: 'bg-orange-100 text-orange-800', icon: Package },
      SHIPPED: { label: 'Enviado', color: 'bg-purple-100 text-purple-800', icon: Truck },
      DELIVERED: { label: 'Entregue', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      CANCELLED: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: AlertCircle },
    };
    return statusMap[status] || statusMap.PENDING;
  };

  const handleViewOrderDetails = (order: StoreOrder) => {
    setSelectedOrder(order);
    setIsOrderDetailsOpen(true);
  };

  const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);
  const completedOrders = orders.filter(order => order.status === 'DELIVERED').length;

  if (!customer) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-4xl sm:w-[calc(100%-4rem)] sm:max-h-[calc(100vh-4rem)] p-0 flex flex-col gap-0">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b bg-gray-50/50 flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-moria-orange" />
              Pedidos de {customer.name}
            </DialogTitle>
            <DialogDescription className="text-xs mt-1">
              Histórico completo de pedidos do cliente
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 min-h-0">
            <div className="py-3 sm:py-4 space-y-4">
              {/* Informações do Cliente */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">WhatsApp</p>
                    <p className="text-sm font-medium truncate">{customer.whatsapp}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Cliente desde</p>
                    <p className="text-sm font-medium truncate">
                      {new Date(customer.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Total de Pedidos</p>
                    <p className="text-sm font-medium truncate">{orders.length}</p>
                  </div>
                </div>
              </div>

              {/* Estatísticas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-green-700 font-medium">Total Gasto</p>
                      <p className="text-2xl font-bold text-green-800">{formatCurrency(totalSpent)}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-600 opacity-80" />
                  </div>
                </div>
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-blue-700 font-medium">Pedidos Completos</p>
                      <p className="text-2xl font-bold text-blue-800">{completedOrders}</p>
                      <p className="text-xs text-blue-600">de {orders.length} total</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-blue-600 opacity-80" />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Lista de Pedidos */}
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-moria-orange mb-2" />
                  <p className="text-sm text-muted-foreground">Carregando pedidos...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Package className="h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-sm font-medium text-gray-900">Nenhum pedido encontrado</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Este cliente ainda não realizou nenhum pedido
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Package className="h-4 w-4 text-moria-orange" />
                    Histórico de Pedidos ({orders.length})
                  </h3>
                  {orders.map((order) => {
                    const statusInfo = getStatusInfo(order.status);
                    const StatusIcon = statusInfo.icon;

                    return (
                      <div
                        key={order.id}
                        className="border rounded-lg p-4 hover:border-moria-orange/50 transition-colors bg-white"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <StatusIcon className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-semibold text-sm">Pedido #{order.id.slice(0, 8)}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(order.createdAt).toLocaleDateString('pt-BR')} às{' '}
                                {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                          <Badge className={`${statusInfo.color} text-xs`} variant="secondary">
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusInfo.label}
                          </Badge>
                        </div>

                        <div className="space-y-2 mb-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Itens:</span>
                            <span className="font-medium">{order.items.length} produto(s)</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-muted-foreground">Total:</span>
                            <span className="text-base font-bold text-moria-orange">
                              {formatCurrency(order.total)}
                            </span>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full min-h-[40px] h-10 text-xs"
                          onClick={() => handleViewOrderDetails(order)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1.5" />
                          Ver Detalhes do Pedido
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-4 sm:px-6 py-3 border-t bg-gray-50/50 flex-shrink-0">
            <Button
              variant="outline"
              onClick={onClose}
              size="sm"
              className="min-h-[44px] h-11 text-xs sm:text-sm touch-manipulation"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes do Pedido */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={isOrderDetailsOpen}
        onClose={() => {
          setIsOrderDetailsOpen(false);
          setSelectedOrder(null);
        }}
        onUpdate={loadCustomerOrders}
      />
    </>
  );
}
