import {
  Cake,
  CalendarClock,
  Crown,
  Gift,
  Heart,
  HeartHandshake,
  MessageCircle,
  Percent,
  ShoppingBag,
  Sparkles,
  Star,
  TrendingDown,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import type { CustomerRelationshipInsight } from "@/api/adminService";

/** Mapa de ícones disponíveis para categorias (nome salvo no banco -> componente). */
export const RELATIONSHIP_ICONS: Record<string, LucideIcon> = {
  Cake,
  CalendarClock,
  Crown,
  Gift,
  Heart,
  HeartHandshake,
  MessageCircle,
  Percent,
  ShoppingBag,
  Sparkles,
  Star,
  TrendingDown,
  Users,
  Wrench,
};

export const RELATIONSHIP_ICON_NAMES = Object.keys(RELATIONSHIP_ICONS);

export function getRelationshipIcon(name: string): LucideIcon {
  return RELATIONSHIP_ICONS[name] ?? MessageCircle;
}

function getFirstName(name: string) {
  return name.trim().split(" ")[0] || name;
}

/**
 * Renderiza um template substituindo placeholders {{campo}} pelos dados do
 * cliente. Espelha o renderizador do backend.
 */
export function renderTemplate(body: string, customer: CustomerRelationshipInsight): string {
  const context: Record<string, unknown> = {
    ...customer,
    firstName: getFirstName(customer.name),
  };

  return body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key: string) => {
    const value = context[key];
    if (value === null || value === undefined) return "";
    return String(value);
  });
}

/** Campos disponíveis para regras, com rótulo e tipo (para a UI de condições). */
export const RELATIONSHIP_RULE_FIELDS: Array<{
  value: string;
  label: string;
  type: "number" | "string";
}> = [
  { value: "totalSpent", label: "Total gasto (R$)", type: "number" },
  { value: "deliveredOrders", label: "Qtd. de vendas", type: "number" },
  { value: "completedRevisions", label: "Qtd. de revisões", type: "number" },
  { value: "daysSinceLastOrder", label: "Dias sem comprar", type: "number" },
  { value: "daysSinceLastRevision", label: "Dias sem revisar", type: "number" },
  { value: "daysSinceLastInteraction", label: "Dias sem retorno", type: "number" },
  { value: "daysUntilBirthday", label: "Dias até aniversário", type: "number" },
  { value: "level", label: "Nível do cliente", type: "string" },
  { value: "status", label: "Status do cliente", type: "string" },
  { value: "interactionType", label: "Tipo de interação", type: "string" },
];

export const RELATIONSHIP_RULE_OPERATORS: Array<{
  value: string;
  label: string;
  needsValue: boolean;
  needsSecondValue?: boolean;
}> = [
  { value: "gte", label: "maior ou igual a", needsValue: true },
  { value: "lte", label: "menor ou igual a", needsValue: true },
  { value: "gt", label: "maior que", needsValue: true },
  { value: "lt", label: "menor que", needsValue: true },
  { value: "eq", label: "igual a", needsValue: true },
  { value: "neq", label: "diferente de", needsValue: true },
  { value: "between", label: "entre", needsValue: true, needsSecondValue: true },
  { value: "notNull", label: "está preenchido", needsValue: false },
  { value: "isNull", label: "está vazio", needsValue: false },
];

export const RELATIONSHIP_SORT_FIELDS = RELATIONSHIP_RULE_FIELDS.filter(
  (field) => field.type === "number"
);
