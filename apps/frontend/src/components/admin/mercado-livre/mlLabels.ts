import type { MlListingType, MlPanelStatus, MlStockMode } from "@/api/marketplaceService";

export const ML_STATUS: Record<MlPanelStatus, { label: string; color: string }> = {
  READY: { label: "Apto", color: "bg-green-100 text-green-800" },
  PENDING: { label: "Pendente", color: "bg-amber-100 text-amber-800" },
  PUBLISHED: { label: "Publicado", color: "bg-blue-100 text-blue-800" },
  PAUSED: { label: "Pausado", color: "bg-gray-100 text-gray-700" },
  ERROR: { label: "Com erro", color: "bg-red-100 text-red-800" },
};

export const STOCK_MODE_LABEL: Record<MlStockMode, string> = {
  STORE_ONLY: "Só loja",
  STORE_PLUS_SUPPLIER: "Loja + fornecedor",
  MADE_TO_ORDER: "Sob encomenda",
};

export const LISTING_TYPE_LABEL: Record<MlListingType, string> = {
  gold_special: "Clássico (tarifa menor)",
  gold_pro: "Premium (parcelamento sem juros, tarifa maior)",
};

export const brl = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
