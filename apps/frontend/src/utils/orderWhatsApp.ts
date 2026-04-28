import type { StoreOrder } from "@/api/adminService";

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  IN_PRODUCTION: "Em produção",
  PREPARING: "Preparando",
  SHIPPED: "Enviado",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
  pending: "Pendente",
  quote_requested: "Orçamento solicitado",
  confirmed: "Confirmado",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

export const getOrderStatusLabel = (status: string) =>
  ORDER_STATUS_LABELS[status] || ORDER_STATUS_LABELS.PENDING;

export const buildOrderStatusWhatsAppMessage = (
  order: Pick<StoreOrder, "id" | "customerName" | "status" | "total">,
  options?: {
    trackingCode?: string;
    estimatedDelivery?: string;
  }
) => {
  const statusLabel = getOrderStatusLabel(order.status);

  return (
    `Olá ${order.customerName}!\n\n` +
    `Atualização do seu pedido #${order.id}\n\n` +
    `Status atual: ${statusLabel}\n` +
    `Total do pedido: ${formatCurrency(order.total)}` +
    `${options?.trackingCode ? `\nCódigo de rastreio: ${options.trackingCode}` : ""}` +
    `${
      options?.estimatedDelivery
        ? `\nPrevisão de entrega: ${new Date(options.estimatedDelivery).toLocaleDateString("pt-BR")}`
        : ""
    }` +
    `\n\nSe precisar de qualquer apoio, seguimos à disposição.`
  );
};

export const buildOrderStatusWhatsAppUrl = (
  order: Pick<StoreOrder, "id" | "customerName" | "status" | "total" | "customerWhatsApp">,
  options?: {
    trackingCode?: string;
    estimatedDelivery?: string;
  }
) => {
  const phone = order.customerWhatsApp.replace(/\D/g, "");
  const message = buildOrderStatusWhatsAppMessage(order, options);
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
};
