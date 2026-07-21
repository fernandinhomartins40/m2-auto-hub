/**
 * Motor de regras e renderização de templates para o módulo de Relacionamento.
 *
 * As categorias de relacionamento (aniversariantes, inativos, VIP, etc.) deixam
 * de ser hardcoded e passam a ser definidas por um conjunto de regras avaliadas
 * em memória sobre o "insight" já calculado de cada cliente.
 */

/** Campos numéricos/derivados disponíveis para montar regras. */
export const RELATIONSHIP_RULE_FIELDS = [
  'totalSpent',
  'deliveredOrders',
  'completedRevisions',
  'daysSinceLastOrder',
  'daysSinceLastRevision',
  'daysSinceLastInteraction',
  'daysUntilBirthday',
  'level',
  'status',
  'interactionType',
] as const;

export type RelationshipRuleField = (typeof RELATIONSHIP_RULE_FIELDS)[number];

export const RELATIONSHIP_RULE_OPERATORS = [
  'gte',
  'lte',
  'gt',
  'lt',
  'eq',
  'neq',
  'between',
  'isNull',
  'notNull',
] as const;

export type RelationshipRuleOperator = (typeof RELATIONSHIP_RULE_OPERATORS)[number];

export interface RelationshipRule {
  field: RelationshipRuleField;
  operator: RelationshipRuleOperator;
  value?: number | string | null;
  value2?: number | string | null;
}

/** Objeto plano com os dados de cada cliente sobre o qual as regras rodam. */
export interface RelationshipInsightLike {
  totalSpent: number;
  deliveredOrders: number;
  completedRevisions: number;
  daysSinceLastOrder: number | null;
  daysSinceLastRevision: number | null;
  daysSinceLastInteraction: number | null;
  daysUntilBirthday: number | null;
  level: string;
  status: string;
  interactionType: string;
  [key: string]: unknown;
}

const STRING_FIELDS = new Set<RelationshipRuleField>(['level', 'status', 'interactionType']);

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

/** Avalia uma única regra contra um cliente. */
function evaluateRule(rule: RelationshipRule, insight: RelationshipInsightLike): boolean {
  const raw = insight[rule.field];

  switch (rule.operator) {
    case 'isNull':
      return raw === null || raw === undefined;
    case 'notNull':
      return raw !== null && raw !== undefined;
    case 'eq':
      if (STRING_FIELDS.has(rule.field)) {
        return String(raw) === String(rule.value ?? '');
      }
      return toNumber(raw) === toNumber(rule.value);
    case 'neq':
      if (STRING_FIELDS.has(rule.field)) {
        return String(raw) !== String(rule.value ?? '');
      }
      return toNumber(raw) !== toNumber(rule.value);
    default:
      break;
  }

  // Operadores numéricos exigem valor presente no cliente.
  const current = toNumber(raw);
  if (current === null) return false;

  switch (rule.operator) {
    case 'gte': {
      const v = toNumber(rule.value);
      return v !== null && current >= v;
    }
    case 'lte': {
      const v = toNumber(rule.value);
      return v !== null && current <= v;
    }
    case 'gt': {
      const v = toNumber(rule.value);
      return v !== null && current > v;
    }
    case 'lt': {
      const v = toNumber(rule.value);
      return v !== null && current < v;
    }
    case 'between': {
      const min = toNumber(rule.value);
      const max = toNumber(rule.value2);
      return min !== null && max !== null && current >= min && current <= max;
    }
    default:
      return false;
  }
}

/**
 * Retorna true se o cliente casa com TODAS as regras (AND). Uma lista vazia de
 * regras casa com todos os clientes (equivale a "sem filtro").
 */
export function matchesRules(rules: RelationshipRule[], insight: RelationshipInsightLike): boolean {
  if (!Array.isArray(rules) || rules.length === 0) return true;
  return rules.every((rule) => evaluateRule(rule, insight));
}

/** Normaliza o JSON de regras vindo do banco, descartando entradas inválidas. */
export function parseRules(raw: unknown): RelationshipRule[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is RelationshipRule => {
    if (!item || typeof item !== 'object') return false;
    const rule = item as Partial<RelationshipRule>;
    return (
      typeof rule.field === 'string' &&
      RELATIONSHIP_RULE_FIELDS.includes(rule.field as RelationshipRuleField) &&
      typeof rule.operator === 'string' &&
      RELATIONSHIP_RULE_OPERATORS.includes(rule.operator as RelationshipRuleOperator)
    );
  });
}

/**
 * Ordena os clientes de uma categoria por um campo. Nulos vão sempre para o fim.
 */
export function sortInsights<T extends RelationshipInsightLike>(
  items: T[],
  sortBy: string,
  sortDir: 'asc' | 'desc'
): T[] {
  const dir = sortDir === 'desc' ? -1 : 1;
  return [...items].sort((a, b) => {
    const av = toNumber((a as RelationshipInsightLike)[sortBy]);
    const bv = toNumber((b as RelationshipInsightLike)[sortBy]);
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    return (av - bv) * dir;
  });
}

/**
 * Renderiza um template substituindo placeholders {{campo}} pelos dados do
 * cliente. Campos desconhecidos são substituídos por string vazia.
 */
export function renderTemplate(
  body: string,
  data: Record<string, unknown> & { name?: string }
): string {
  const firstName = (data.name ?? '').toString().trim().split(' ')[0] || (data.name ?? '').toString();
  const context: Record<string, unknown> = { ...data, firstName };

  return body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key: string) => {
    const value = context[key];
    if (value === null || value === undefined) return '';
    return String(value);
  });
}

/** Placeholders documentados para exibir na UI de edição de template. */
export const RELATIONSHIP_TEMPLATE_PLACEHOLDERS = [
  { token: '{{firstName}}', description: 'Primeiro nome do cliente' },
  { token: '{{name}}', description: 'Nome completo do cliente' },
  { token: '{{level}}', description: 'Nível do cliente (BRONZE, PRATA, ...)' },
  { token: '{{totalSpent}}', description: 'Total gasto (número)' },
  { token: '{{deliveredOrders}}', description: 'Qtd. de vendas entregues' },
  { token: '{{completedRevisions}}', description: 'Qtd. de revisões concluídas' },
  { token: '{{daysSinceLastOrder}}', description: 'Dias desde a última venda' },
  { token: '{{daysSinceLastRevision}}', description: 'Dias desde a última revisão' },
  { token: '{{daysUntilBirthday}}', description: 'Dias até o aniversário' },
] as const;
