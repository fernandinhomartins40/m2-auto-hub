// src/utils/specifications.ts - Utilitários para especificações técnicas

import {
  SpecificationDefinition,
  SpecificationValue,
  ProductSpecifications,
  SpecificationFilter,
  SpecificationFilterCondition,
  COMMON_SPECIFICATIONS,
  PRODUCT_SPECIFICATIONS,
  SPECIFICATION_CATEGORIES
} from '@/types/specifications';

/**
 * Parse especificações de JSON string para objeto
 */
export function parseSpecifications(specificationsJson: string): SpecificationValue[] {
  try {
    const parsed = JSON.parse(specificationsJson);

    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (typeof parsed === 'object') {
      // Converter objeto para array de SpecificationValue
      return Object.entries(parsed).map(([key, value]) => ({
        key,
        value,
        displayValue: formatSpecificationValue(key, value),
      }));
    }

    return [];
  } catch (error) {
    console.warn('Erro ao fazer parse das especificações:', error);
    return [];
  }
}

/**
 * Converte especificações para JSON string
 */
export function stringifySpecifications(specifications: SpecificationValue[]): string {
  try {
    return JSON.stringify(specifications);
  } catch (error) {
    console.warn('Erro ao converter especificações para JSON:', error);
    return '[]';
  }
}

/**
 * Formata valor de especificação para exibição
 */
export function formatSpecificationValue(key: string, value: unknown, unit?: string): string {
  const spec = COMMON_SPECIFICATIONS[key];
  const specUnit = unit || spec?.unit;

  if (value == null || value === '') {
    return 'N/A';
  }

  switch (spec?.type) {
    case 'boolean':
      return value ? 'Sim' : 'Não';

    case 'number':
    case 'weight':
    case 'volume': {
      const numValue = Number(value);
      if (isNaN(numValue)) return String(value);

      const formatted = numValue % 1 === 0 ? numValue.toString() : numValue.toFixed(2);
      return specUnit ? `${formatted} ${specUnit}` : formatted;
    }

    case 'range':
      if (Array.isArray(value) && value.length === 2) {
        const [min, max] = value;
        return specUnit ? `${min} - ${max} ${specUnit}` : `${min} - ${max}`;
      }
      return String(value);

    case 'multiselect':
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      return String(value);

    case 'warranty': {
      const months = Number(value);
      if (isNaN(months)) return String(value);

      if (months < 12) {
        return `${months} ${months === 1 ? 'mês' : 'meses'}`;
      } else {
        const years = months / 12;
        return `${years} ${years === 1 ? 'ano' : 'anos'}`;
      }
    }

    case 'dimension':
      return specUnit ? `${value} ${specUnit}` : String(value);

    default:
      return String(value);
  }
}

/**
 * Obtém especificações por categoria de produto
 */
export function getSpecificationsByCategory(category: string): SpecificationDefinition[] {
  const specKeys = PRODUCT_SPECIFICATIONS[category] || PRODUCT_SPECIFICATIONS['default'];

  return specKeys
    .map(key => COMMON_SPECIFICATIONS[key])
    .filter(Boolean);
}

/**
 * Filtra especificações por categoria
 */
export function groupSpecificationsByCategory(specifications: SpecificationValue[]): Record<string, SpecificationValue[]> {
  const grouped: Record<string, SpecificationValue[]> = {};

  specifications.forEach(spec => {
    const definition = COMMON_SPECIFICATIONS[spec.key];
    const category = definition?.category || 'general';

    if (!grouped[category]) {
      grouped[category] = [];
    }

    grouped[category].push(spec);
  });

  return grouped;
}

/**
 * Obtém definições de especificações organizadas por categoria
 */
export function getSpecificationDefinitionsByCategory(): Record<string, SpecificationDefinition[]> {
  const grouped: Record<string, SpecificationDefinition[]> = {};

  Object.values(COMMON_SPECIFICATIONS).forEach(spec => {
    const category = spec.category;

    if (!grouped[category]) {
      grouped[category] = [];
    }

    grouped[category].push(spec);
  });

  // Ordenar por ordem das categorias
  const orderedGrouped: Record<string, SpecificationDefinition[]> = {};

  SPECIFICATION_CATEGORIES
    .sort((a, b) => a.order - b.order)
    .forEach(cat => {
      if (grouped[cat.id]) {
        orderedGrouped[cat.id] = grouped[cat.id];
      }
    });

  // Adicionar categorias não definidas
  Object.keys(grouped).forEach(category => {
    if (!orderedGrouped[category]) {
      orderedGrouped[category] = grouped[category];
    }
  });

  return orderedGrouped;
}

/**
 * Valida valor de especificação
 */
export function validateSpecificationValue(
  definition: SpecificationDefinition,
  value: unknown
): { valid: boolean; error?: string } {
  if (definition.required && (value == null || value === '')) {
    return { valid: false, error: `${definition.name} é obrigatório` };
  }

  if (value == null || value === '') {
    return { valid: true };
  }

  switch (definition.type) {
    case 'number':
    case 'weight':
    case 'volume': {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        return { valid: false, error: `${definition.name} deve ser um número` };
      }

      if (definition.min != null && numValue < definition.min) {
        return { valid: false, error: `${definition.name} deve ser maior que ${definition.min}` };
      }

      if (definition.max != null && numValue > definition.max) {
        return { valid: false, error: `${definition.name} deve ser menor que ${definition.max}` };
      }

      return { valid: true };
    }

    case 'select':
      if (definition.options && !definition.options.includes(String(value))) {
        return { valid: false, error: `${definition.name} deve ser uma das opções válidas` };
      }
      return { valid: true };

    case 'multiselect':
      if (!Array.isArray(value)) {
        return { valid: false, error: `${definition.name} deve ser um array` };
      }

      if (definition.options) {
        const invalidValues = value.filter(v => !definition.options!.includes(String(v)));
        if (invalidValues.length > 0) {
          return { valid: false, error: `${definition.name} contém valores inválidos: ${invalidValues.join(', ')}` };
        }
      }
      return { valid: true };

    case 'range': {
      if (!Array.isArray(value) || value.length !== 2) {
        return { valid: false, error: `${definition.name} deve ser um range com dois valores` };
      }

      const [min, max] = value.map(Number);
      if (isNaN(min) || isNaN(max)) {
        return { valid: false, error: `${definition.name} deve conter números válidos` };
      }

      if (min >= max) {
        return { valid: false, error: `${definition.name}: valor mínimo deve ser menor que máximo` };
      }

      return { valid: true };
    }

    case 'boolean':
      if (typeof value !== 'boolean') {
        return { valid: false, error: `${definition.name} deve ser verdadeiro ou falso` };
      }
      return { valid: true };

    default:
      return { valid: true };
  }
}

/**
 * Aplica filtros de especificação em produtos
 */
interface ProductWithSpecs {
  specifications?: string;
  [key: string]: unknown;
}

export function filterProductsBySpecifications<T extends ProductWithSpecs>(
  products: T[],
  filters: SpecificationFilterCondition[]
): T[] {
  if (!filters.length) return products;

  return products.filter(product => {
    const specifications = parseSpecifications(product.specifications || '[]');
    const specMap = new Map(specifications.map(spec => [spec.key, spec.value]));

    return filters.every(filter => {
      const value = specMap.get(filter.key);

      if (value == null) {
        return false; // Produto não tem essa especificação
      }

      switch (filter.operator) {
        case 'eq':
          return value === filter.value;

        case 'ne':
          return value !== filter.value;

        case 'gt':
          return Number(value) > Number(filter.value);

        case 'gte':
          return Number(value) >= Number(filter.value);

        case 'lt':
          return Number(value) < Number(filter.value);

        case 'lte':
          return Number(value) <= Number(filter.value);

        case 'in':
          return filter.values?.includes(value) || false;

        case 'nin':
          return !filter.values?.includes(value) || false;

        case 'contains':
          return String(value).toLowerCase().includes(String(filter.value).toLowerCase());

        case 'range': {
          if (!filter.values || filter.values.length !== 2) return false;
          const numValue = Number(value);
          const [min, max] = filter.values.map(Number);
          return numValue >= min && numValue <= max;
        }

        default:
          return true;
      }
    });
  });
}

/**
 * Gera filtros disponíveis baseados em uma lista de produtos
 */
export function generateFiltersFromProducts(
  products: ProductWithSpecs[],
  category?: string
): SpecificationFilter[] {
  const specDefinitions = category
    ? getSpecificationsByCategory(category)
    : Object.values(COMMON_SPECIFICATIONS).filter(spec => spec.filterable);

  const filters: SpecificationFilter[] = [];

  specDefinitions.forEach(definition => {
    if (!definition.filterable) return;

    const values = new Set<string | number | boolean>();
    let min: number | undefined;
    let max: number | undefined;

    // Coletar valores de todos os produtos
    products.forEach(product => {
      const specifications = parseSpecifications(product.specifications || '[]');
      const spec = specifications.find(s => s.key === definition.key);

      if (spec?.value != null) {
        if (definition.type === 'multiselect' && Array.isArray(spec.value)) {
          spec.value.forEach((v: unknown) => {
            if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
              values.add(v);
            }
          });
        } else if (definition.type === 'number' || definition.type === 'weight' || definition.type === 'volume') {
          const numValue = Number(spec.value);
          if (!isNaN(numValue)) {
            values.add(numValue);
            min = min == null ? numValue : Math.min(min, numValue);
            max = max == null ? numValue : Math.max(max, numValue);
          }
        } else {
          values.add(spec.value);
        }
      }
    });

    if (values.size > 0) {
      filters.push({
        key: definition.key,
        name: definition.name,
        type: definition.type,
        values: Array.from(values).sort(),
        selectedValues: [],
        unit: definition.unit,
        options: definition.options,
        min,
        max
      });
    }
  });

  return filters;
}

/**
 * Cria dados de comparação entre produtos
 */
interface ProductComparison {
  productIds: string[];
  specifications: Array<{
    key: string;
    name: string;
    values: Record<string, unknown>;
    isDifferent: boolean;
  }>;
  categories: string[];
}

export function createProductComparison(
  products: ProductWithSpecs[],
  specificationsToCompare?: string[]
): ProductComparison {
  if (products.length === 0) {
    return {
      productIds: [],
      specifications: [],
      categories: []
    };
  }

  const productIds = products.map(p => (p as { id: string }).id);
  const allSpecifications = new Map<string, {
    key: string;
    name: string;
    values: Record<string, unknown>;
    category: string;
    comparable: boolean;
  }>();

  // Coletar todas as especificações
  products.forEach(product => {
    const specifications = parseSpecifications(product.specifications || '[]');
    specifications.forEach(spec => {
      if (!allSpecifications.has(spec.key)) {
        const definition = COMMON_SPECIFICATIONS[spec.key];
        if (!definition?.comparable) return;

        allSpecifications.set(spec.key, {
          key: spec.key,
          name: definition?.name || spec.key,
          values: {},
          category: definition?.category || 'general',
          comparable: true
        });
      }

      allSpecifications.get(spec.key).values[product.id] = spec;
    });
  });

  // Filtrar especificações se fornecida lista
  const specifications = Array.from(allSpecifications.values()).filter(spec => {
    if (specificationsToCompare) {
      return specificationsToCompare.includes(spec.key);
    }
    return true;
  });

  // Obter categorias únicas
  const categories = Array.from(new Set(specifications.map(spec => spec.category)));

  return {
    productIds,
    specifications,
    categories
  };
}

/**
 * Converte especificações legadas para o novo formato
 */
export function migrateSpecifications(oldSpecs: unknown): SpecificationValue[] {
  if (!oldSpecs) return [];

  try {
    if (typeof oldSpecs === 'string') {
      oldSpecs = JSON.parse(oldSpecs);
    }

    if (Array.isArray(oldSpecs)) {
      // Já está no formato correto ou próximo
      return oldSpecs.map(spec => ({
        key: spec.key || 'unknown',
        value: spec.value,
        displayValue: spec.displayValue || formatSpecificationValue(spec.key, spec.value),
        unit: spec.unit
      }));
    }

    if (typeof oldSpecs === 'object') {
      // Converter objeto simples
      return Object.entries(oldSpecs).map(([key, value]) => ({
        key,
        value,
        displayValue: formatSpecificationValue(key, value),
      }));
    }

    return [];
  } catch (error) {
    console.warn('Erro ao migrar especificações:', error);
    return [];
  }
}