import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Edit,
  Factory,
  Loader2,
  MessageCircle,
  Package,
  Phone,
  Save,
  Truck,
  type LucideIcon,
  User,
  X,
} from "lucide-react";
import adminService, { StoreOrder } from "../../api/adminService";
import { useToast } from "../../hooks/use-toast";
import { buildOrderStatusWhatsAppUrl, getOrderStatusLabel } from "../../utils/orderWhatsApp";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

interface OrderDetailsModalProps {
  order: StoreOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  onExportPdf?: (order: StoreOrder) => void;
  isExportingPdf?: boolean;
}

type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "IN_PRODUCTION"
  | "PREPARING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

type OrderStatusInfo = {
  label: string;
  color: string;
  icon: LucideIcon;
  actionLabel: string;
};

const ORDER_STATUS_INFO: Record<OrderStatus, OrderStatusInfo> = {
  PENDING: {
    label: "Pendente",
    color: "bg-yellow-100 text-yellow-800",
    icon: Clock,
    actionLabel: "Aguardando confirmação",
  },
  CONFIRMED: {
    label: "Confirmado",
    color: "bg-blue-100 text-blue-800",
    icon: CheckCircle,
    actionLabel: "Pedido confirmado",
  },
  IN_PRODUCTION: {
    label: "Em Produção",
    color: "bg-indigo-100 text-indigo-800",
    icon: Factory,
    actionLabel: "Em produção",
  },
  PREPARING: {
    label: "Preparando",
    color: "bg-orange-100 text-orange-800",
    icon: Package,
    actionLabel: "Preparando envio",
  },
  SHIPPED: {
    label: "Enviado",
    color: "bg-purple-100 text-purple-800",
    icon: Truck,
    actionLabel: "Em transporte",
  },
  DELIVERED: {
    label: "Entregue",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
    actionLabel: "Pedido concluído",
  },
  CANCELLED: {
    label: "Cancelado",
    color: "bg-red-100 text-red-800",
    icon: AlertCircle,
    actionLabel: "Fluxo encerrado",
  },
};

const DEFAULT_ORDER_FLOW: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "SHIPPED",
  "DELIVERED",
];

const SERVICE_ORDER_FLOW: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "IN_PRODUCTION",
  "PREPARING",
  "SHIPPED",
  "DELIVERED",
];

const CANCELLABLE_STATUSES = new Set<OrderStatus>([
  "PENDING",
  "CONFIRMED",
  "IN_PRODUCTION",
  "PREPARING",
]);

const TERMINAL_STATUSES = new Set<OrderStatus>(["DELIVERED", "CANCELLED"]);

const NEXT_STEP_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pedido criado",
  CONFIRMED: "Confirmar pedido",
  IN_PRODUCTION: "Mover para produção",
  PREPARING: "Iniciar preparação",
  SHIPPED: "Marcar como enviado",
  DELIVERED: "Marcar como entregue",
  CANCELLED: "Cancelar pedido",
};

const getStatusInfo = (status: string): OrderStatusInfo => {
  return ORDER_STATUS_INFO[status as OrderStatus] || ORDER_STATUS_INFO.PENDING;
};

const getOrderFlow = (order: StoreOrder): OrderStatus[] => {
  if (order.status === "IN_PRODUCTION" || order.hasServices) {
    return SERVICE_ORDER_FLOW;
  }

  return DEFAULT_ORDER_FLOW;
};

const getCurrentFlowIndex = (order: StoreOrder, flow: OrderStatus[]) => {
  return flow.indexOf(order.status as OrderStatus);
};

const getNextStatus = (order: StoreOrder, flow: OrderStatus[]) => {
  const currentIndex = getCurrentFlowIndex(order, flow);

  if (currentIndex < 0 || currentIndex >= flow.length - 1) {
    return null;
  }

  return flow[currentIndex + 1];
};

const canCancelOrder = (status: string) => {
  return CANCELLABLE_STATUSES.has(status as OrderStatus);
};

export function OrderDetailsModal({
  order,
  isOpen,
  onClose,
  onUpdate,
  onExportPdf,
  isExportingPdf = false,
}: OrderDetailsModalProps) {
  const { toast } = useToast();
  const [isEditingTracking, setIsEditingTracking] = useState(false);
  const [trackingCode, setTrackingCode] = useState("");
  const [estimatedDelivery, setEstimatedDelivery] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<StoreOrder | null>(order);
  const [updatingButton, setUpdatingButton] = useState<string | null>(null);

  useEffect(() => {
    if (order) {
      setCurrentOrder(order);
    }
  }, [order]);

  if (!currentOrder) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDateTime = (value: string) => {
    return new Date(value).toLocaleString("pt-BR");
  };

  const handleUpdateStatus = async (newStatus: OrderStatus) => {
    setIsUpdating(true);
    setUpdatingButton(newStatus);

    try {
      const updatedOrder = await adminService.updateOrderStatus(currentOrder.id, newStatus);
      setCurrentOrder(updatedOrder);

      toast({
        title: "Status atualizado",
        description: `Pedido #${currentOrder.id.slice(0, 8)} atualizado para ${getStatusInfo(newStatus).label}.`,
      });

      onUpdate();
    } catch (error: any) {
      console.error("Error updating order status:", error);
      toast({
        title: "Erro ao atualizar status",
        description: error.response?.data?.error || error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
      setUpdatingButton(null);
    }
  };

  const handleSaveTracking = () => {
    toast({
      title: "Informações salvas",
      description: "Código de rastreamento e observações foram salvos.",
    });
    setIsEditingTracking(false);
  };

  const handleSendWhatsApp = () => {
    const whatsappUrl = buildOrderStatusWhatsAppUrl(currentOrder, {
      trackingCode,
      estimatedDelivery,
    });
    window.open(whatsappUrl, "_blank");

    toast({
      title: "WhatsApp aberto",
      description: `Mensagem de status "${getOrderStatusLabel(currentOrder.status)}" pronta para envio.`,
    });
  };

  const statusInfo = getStatusInfo(currentOrder.status);
  const StatusIcon = statusInfo.icon;
  const orderFlow = getOrderFlow(currentOrder);
  const currentFlowIndex = getCurrentFlowIndex(currentOrder, orderFlow);
  const nextStatus = getNextStatus(currentOrder, orderFlow);
  const nextStatusInfo = nextStatus ? getStatusInfo(nextStatus) : null;
  const NextStatusIcon = nextStatusInfo?.icon;
  const reachedStatuses = currentFlowIndex >= 0 ? orderFlow.slice(1, currentFlowIndex + 1) : [];
  const showCancelAction = canCancelOrder(currentOrder.status);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] md:w-[calc(100vw-4rem)] max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-3rem)] p-0 flex flex-col gap-0">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b bg-gray-50/50 flex-shrink-0">
          <DialogTitle className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-lg min-w-0">
              <Package className="h-5 w-5 text-moria-orange flex-shrink-0" />
              <span className="truncate">Pedido #{currentOrder.id.slice(0, 8)}</span>
            </span>
            <Badge className={`${statusInfo.color} text-xs`} variant="secondary">
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusInfo.label}
            </Badge>
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Realizado em {formatDateTime(currentOrder.createdAt)}
          </p>
          {onExportPdf ? (
            <div className="mt-3 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExportPdf(currentOrder)}
                disabled={isExportingPdf}
              >
                {isExportingPdf ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {isExportingPdf ? "Gerando PDF..." : "Exportar PDF"}
              </Button>
            </div>
          ) : null}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 min-h-0">
          <div className="py-3 sm:py-4 space-y-3 sm:space-y-4">
            <div className="bg-muted p-3 sm:p-4 rounded-lg space-y-4">
              <div className="space-y-1">
                <Label className="text-sm font-semibold block">Fluxo do Pedido</Label>
                <p className="text-xs text-muted-foreground">
                  O status avança em etapas. Apenas a próxima transição lógica fica disponível.
                </p>
              </div>

              <div className={`grid gap-2 ${orderFlow.length > 5 ? "grid-cols-2 lg:grid-cols-3" : "grid-cols-2 sm:grid-cols-5"}`}>
                {orderFlow.map((stepStatus, index) => {
                  const stepInfo = getStatusInfo(stepStatus);
                  const StepIcon = stepInfo.icon;
                  const isCompleted = currentOrder.status !== "CANCELLED" && currentFlowIndex > index;
                  const isCurrent = currentOrder.status === stepStatus;
                  const stateClasses = isCurrent
                    ? "border-moria-orange/30 bg-orange-50"
                    : isCompleted
                      ? "border-green-200 bg-green-50"
                      : "border-border bg-background";
                  const iconClasses = isCurrent
                    ? "bg-moria-orange text-white"
                    : isCompleted
                      ? "bg-green-600 text-white"
                      : "bg-muted text-muted-foreground";

                  return (
                    <div key={stepStatus} className={`rounded-lg border p-3 ${stateClasses}`}>
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-full ${iconClasses}`}>
                          <StepIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{stepInfo.label}</p>
                          <p className="text-xs text-muted-foreground">{stepInfo.actionLabel}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {currentOrder.status === "CANCELLED" && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-900">Pedido cancelado</p>
                      <p className="text-xs text-red-700">
                        Este pedido foi encerrado e não aceita novas mudanças de status.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {currentOrder.status === "DELIVERED" && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-green-900">Fluxo concluído</p>
                      <p className="text-xs text-green-700">
                        O pedido já foi entregue e não possui novas etapas disponíveis.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!TERMINAL_STATUSES.has(currentOrder.status as OrderStatus) && nextStatus && nextStatusInfo && NextStatusIcon && (
                <div className="space-y-2">
                  <div className="rounded-lg border border-dashed border-moria-orange/30 bg-background p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-moria-orange">
                      Próxima etapa
                    </p>
                    <p className="text-sm font-medium mt-1">{nextStatusInfo.label}</p>
                    <p className="text-xs text-muted-foreground">
                      Depois de {statusInfo.label.toLowerCase()}, o pedido segue para {nextStatusInfo.label.toLowerCase()}.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={() => handleUpdateStatus(nextStatus)}
                      disabled={isUpdating}
                      className="min-h-[44px] h-11 text-sm flex-1"
                    >
                      {updatingButton === nextStatus ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <NextStatusIcon className="h-4 w-4 mr-2" />
                      )}
                      {NEXT_STEP_LABELS[nextStatus]}
                    </Button>

                    {showCancelAction && (
                      <Button
                        variant="destructive"
                        onClick={() => handleUpdateStatus("CANCELLED")}
                        disabled={isUpdating}
                        className="min-h-[44px] h-11 text-sm sm:w-auto"
                      >
                        {updatingButton === "CANCELLED" ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <X className="h-4 w-4 mr-2" />
                        )}
                        Cancelar pedido
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-moria-orange" />
                Informações do Cliente
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Nome</p>
                    <p className="text-sm font-medium truncate">{currentOrder.customerName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">WhatsApp</p>
                    <p className="text-sm font-medium truncate">{currentOrder.customerWhatsApp}</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-moria-orange" />
                Itens do Pedido ({currentOrder.items.length})
              </Label>
              <div className="space-y-1.5">
                {currentOrder.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 border rounded">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity}x {item.type === "service" ? "(Serviço)" : "(Produto)"}
                      </p>
                    </div>
                    <div className="text-right ml-2">
                      <p className="text-sm font-bold">{formatCurrency(item.price * item.quantity)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatCurrency(item.price)} cada
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-3 p-2 bg-moria-orange/10 rounded">
                <span className="text-sm font-semibold">Total do Pedido</span>
                <span className="text-base font-bold text-moria-orange">{formatCurrency(currentOrder.total)}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-moria-orange" />
                  Rastreamento e Observações
                </Label>
                {!isEditingTracking && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditingTracking(true)}
                    className="min-h-[36px] h-9 text-xs"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                )}
              </div>

              <div className="space-y-3 p-3 bg-muted rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="trackingCode" className="text-xs">Código de Rastreamento</Label>
                    <Input
                      id="trackingCode"
                      placeholder="Ex: BR123456789BR"
                      value={trackingCode}
                      onChange={(e) => setTrackingCode(e.target.value)}
                      disabled={!isEditingTracking}
                      className="mt-1 min-h-[44px] h-11 text-sm"
                    />
                  </div>

                  <div>
                    <Label htmlFor="estimatedDelivery" className="text-xs">Data Estimada de Entrega</Label>
                    <Input
                      id="estimatedDelivery"
                      type="date"
                      value={estimatedDelivery}
                      onChange={(e) => setEstimatedDelivery(e.target.value)}
                      disabled={!isEditingTracking}
                      className="mt-1 min-h-[44px] h-11 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="internalNotes" className="text-xs">Notas Internas</Label>
                  <Textarea
                    id="internalNotes"
                    placeholder="Adicione observações sobre este pedido..."
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    disabled={!isEditingTracking}
                    className="mt-1 text-sm"
                    rows={2}
                  />
                </div>

                {isEditingTracking && (
                  <div className="flex gap-2">
                    <Button onClick={handleSaveTracking} size="sm" className="flex-1 min-h-[44px] h-11 text-xs">
                      <Save className="h-4 w-4 mr-1" />
                      Salvar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditingTracking(false)}
                      size="sm"
                      className="flex-1 min-h-[44px] h-11 text-xs"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-moria-orange" />
                Histórico do Pedido
              </Label>
              <div className="space-y-2 p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <div>
                    <p className="text-xs font-medium">Pedido criado</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDateTime(currentOrder.createdAt)}
                    </p>
                  </div>
                </div>

                {reachedStatuses.map((status) => {
                  const historyStatusInfo = getStatusInfo(status);
                  const HistoryIcon = historyStatusInfo.icon;
                  const isCurrentStatus = currentOrder.status === status;

                  return (
                    <div key={status} className="flex items-center gap-2">
                      <HistoryIcon className="h-3 w-3 text-moria-orange" />
                      <div>
                        <p className="text-xs font-medium">{historyStatusInfo.label}</p>
                        {isCurrentStatus && (
                          <p className="text-[10px] text-muted-foreground">
                            Última atualização em {formatDateTime(currentOrder.updatedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}

                {currentOrder.status === "CANCELLED" && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-3 w-3 text-red-600" />
                    <div>
                      <p className="text-xs font-medium">Pedido cancelado</p>
                      <p className="text-[10px] text-muted-foreground">
                        Última atualização em {formatDateTime(currentOrder.updatedAt)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-3 border-t bg-gray-50/50 flex-shrink-0">
          <Button
            onClick={handleSendWhatsApp}
            size="sm"
            className="bg-green-600 hover:bg-green-700 min-h-[44px] h-11 text-xs sm:text-sm"
          >
            <MessageCircle className="h-4 w-4 mr-1.5" />
            Notificar: {statusInfo.label}
          </Button>
          <Button variant="outline" onClick={onClose} size="sm" className="min-h-[44px] h-11 text-xs sm:text-sm">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
