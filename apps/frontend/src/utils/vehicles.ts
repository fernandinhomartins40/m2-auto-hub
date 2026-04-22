// src/utils/vehicles.ts - Utilitários para compatibilidade de veículos

import {
  VehicleCompatibility,
  VehicleCompatibilityRule,
  VehicleCompatibilityFilter,
  CompatibilitySearchResult,
  VehicleCompatibilityMatch,
  BRAZILIAN_MAKES,
  VehicleMake,
  FuelType,
  TransmissionType,
  VehicleSegment
} from '@/types/vehicles';

/**
 * Parse compatibilidade de veículos de JSON string
 */
export function parseVehicleCompatibility(compatibilityJson: string): VehicleCompatibilityRule[] {
  try {
    const parsed = JSON.parse(compatibilityJson);

    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (typeof parsed === 'object') {
      // Converter formato legado para novo formato
      return convertLegacyCompatibility(parsed);
    }

    return [];
  } catch (error) {
    console.warn('Erro ao fazer parse da compatibilidade:', error);
    return [];
  }
}

/**
 * Converte compatibilidade para JSON string
 */
export function stringifyVehicleCompatibility(compatibility: VehicleCompatibilityRule[]): string {
  try {
    return JSON.stringify(compatibility);
  } catch (error) {
    console.warn('Erro ao converter compatibilidade para JSON:', error);
    return '[]';
  }
}

/**
 * Interface para formato legado de compatibilidade
 */
interface LegacyCompatibilityFormat {
  makes?: Array<{
    id?: string;
    name?: string;
    yearStart?: number;
    yearEnd?: number;
    models?: string[];
  }>;
  make?: string;
  model?: string;
  yearStart?: number;
  yearEnd?: number;
  [key: string]: unknown;
}

interface LegacyMake {
  id?: string;
  name?: string;
  yearStart?: number;
  yearEnd?: number;
  models?: string[];
}

/**
 * Converte formato legado de compatibilidade
 */
function convertLegacyCompatibility(legacy: LegacyCompatibilityFormat): VehicleCompatibilityRule[] {
  if (legacy.makes && Array.isArray(legacy.makes)) {
    return legacy.makes.map((make: LegacyMake) => ({
      makeId: make.id || make.name?.toLowerCase(),
      yearStart: make.yearStart || legacy.yearStart,
      yearEnd: make.yearEnd || legacy.yearEnd,
      modelId: make.models?.[0],
    }));
  }

  return [{
    makeId: legacy.make,
    modelId: legacy.model,
    yearStart: legacy.yearStart,
    yearEnd: legacy.yearEnd,
  }];
}

/**
 * Verifica se um produto é compatível com um veículo específico
 */
export function isVehicleCompatible(
  compatibility: VehicleCompatibilityRule[],
  vehicle: {
    makeId: string;
    modelId?: string;
    variantId?: string;
    year: number;
    engineCode?: string;
    transmission?: TransmissionType;
    fuelType?: FuelType;
  }
): CompatibilitySearchResult {
  if (!compatibility.length) {
    return {
      compatible: false,
      confidence: 0,
      matches: [],
      warnings: ['Nenhuma informação de compatibilidade disponível']
    };
  }

  const matches: VehicleCompatibilityMatch[] = [];
  let bestMatch: { rule: VehicleCompatibilityRule; score: number } | null = null;

  for (const rule of compatibility) {
    const match = checkRuleMatch(rule, vehicle);
    if (match.score > 0) {
      matches.push({
        vehicleInfo: {
          make: getMakeName(rule.makeId || vehicle.makeId),
          model: rule.modelId || 'Todos os modelos',
          variant: rule.variantId,
          years: formatYearRange(rule.yearStart, rule.yearEnd)
        },
        matchType: match.score === 1 ? 'exact' : match.score > 0.7 ? 'partial' : 'generic',
        matchScore: match.score,
        matchedCriteria: match.criteria,
        notes: match.notes
      });

      if (!bestMatch || match.score > bestMatch.score) {
        bestMatch = { rule, score: match.score };
      }
    }
  }

  const compatible = bestMatch !== null && bestMatch.score >= 0.5;
  const confidence = bestMatch?.score || 0;

  return {
    compatible,
    confidence,
    matches,
    warnings: compatible ? undefined : ['Veículo não encontrado na lista de compatibilidade'],
    suggestions: generateCompatibilitySuggestions(compatibility, vehicle)
  };
}

/**
 * Verifica match de uma regra específica
 */
function checkRuleMatch(
  rule: VehicleCompatibilityRule,
  vehicle: {
    makeId: string;
    modelId?: string;
    variantId?: string;
    year: number;
    engineCode?: string;
    transmission?: TransmissionType;
    fuelType?: FuelType;
  }
): { score: number; criteria: string[]; notes?: string } {
  let score = 0;
  let totalCriteria = 0;
  const matchedCriteria: string[] = [];

  // Check make
  if (rule.makeId) {
    totalCriteria++;
    if (rule.makeId === vehicle.makeId) {
      score++;
      matchedCriteria.push('Marca');
    }
  } else {
    // Se não especifica marca, assume compatibilidade universal
    score += 0.2;
    matchedCriteria.push('Marca (universal)');
  }

  // Check model
  if (rule.modelId && vehicle.modelId) {
    totalCriteria++;
    if (rule.modelId === vehicle.modelId) {
      score++;
      matchedCriteria.push('Modelo');
    }
  } else if (rule.modelId) {
    totalCriteria++;
  }

  // Check variant
  if (rule.variantId && vehicle.variantId) {
    totalCriteria++;
    if (rule.variantId === vehicle.variantId) {
      score++;
      matchedCriteria.push('Versão');
    }
  }

  // Check year range
  const yearInRange = isYearInRange(vehicle.year, rule.yearStart, rule.yearEnd);
  if (rule.yearStart || rule.yearEnd) {
    totalCriteria++;
    if (yearInRange) {
      score++;
      matchedCriteria.push('Ano');
    }
  }

  // Check engine code
  if (rule.engineCode && vehicle.engineCode) {
    totalCriteria++;
    if (rule.engineCode.includes(vehicle.engineCode)) {
      score++;
      matchedCriteria.push('Motor');
    }
  }

  // Check transmission
  if (rule.transmission && vehicle.transmission) {
    totalCriteria++;
    if (rule.transmission.includes(vehicle.transmission)) {
      score++;
      matchedCriteria.push('Transmissão');
    }
  }

  // Check fuel type
  if (rule.fuelType && vehicle.fuelType) {
    totalCriteria++;
    if (rule.fuelType.includes(vehicle.fuelType)) {
      score++;
      matchedCriteria.push('Combustível');
    }
  }

  // Normalize score
  const normalizedScore = totalCriteria > 0 ? score / Math.max(totalCriteria, 1) : 0;

  return {
    score: normalizedScore,
    criteria: matchedCriteria,
    notes: yearInRange ? undefined : `Ano ${vehicle.year} fora do range de compatibilidade`
  };
}

/**
 * Verifica se ano está no range
 */
function isYearInRange(year: number, yearStart?: number, yearEnd?: number): boolean {
  const start = yearStart || 1900;
  const end = yearEnd || new Date().getFullYear() + 5;

  return year >= start && year <= end;
}

/**
 * Formata range de anos
 */
function formatYearRange(yearStart?: number, yearEnd?: number): string {
  if (!yearStart && !yearEnd) return 'Todos os anos';
  if (yearStart && !yearEnd) return `${yearStart} em diante`;
  if (!yearStart && yearEnd) return `Até ${yearEnd}`;
  if (yearStart === yearEnd) return `${yearStart}`;
  return `${yearStart} - ${yearEnd}`;
}

/**
 * Obtém nome da marca pelo ID
 */
export function getMakeName(makeId: string): string {
  const make = BRAZILIAN_MAKES.find(m => m.id === makeId);
  return make?.name || makeId.charAt(0).toUpperCase() + makeId.slice(1);
}

/**
 * Gera sugestões de compatibilidade
 */
function generateCompatibilitySuggestions(
  compatibility: VehicleCompatibilityRule[],
  vehicle: {
    makeId: string;
    modelId?: string;
    year: number;
  }
): string[] {
  const suggestions: string[] = [];

  // Verifica se há compatibilidade com anos próximos
  const nearYears = compatibility.filter(rule => {
    if (!rule.yearStart && !rule.yearEnd) return false;

    const start = rule.yearStart || 1900;
    const end = rule.yearEnd || new Date().getFullYear() + 5;

    return Math.abs(vehicle.year - start) <= 3 || Math.abs(vehicle.year - end) <= 3;
  });

  if (nearYears.length > 0) {
    suggestions.push('Verifique compatibilidade para anos próximos');
  }

  // Verifica compatibilidade com mesma marca
  const sameMake = compatibility.filter(rule => rule.makeId === vehicle.makeId);
  if (sameMake.length > 0 && !sameMake.some(rule => isYearInRange(vehicle.year, rule.yearStart, rule.yearEnd))) {
    suggestions.push('Produto compatível com outros modelos da mesma marca');
  }

  // Verifica compatibilidade universal
  const universal = compatibility.filter(rule => !rule.makeId);
  if (universal.length > 0) {
    suggestions.push('Produto com compatibilidade universal - consulte especificações');
  }

  return suggestions;
}

/**
 * Interface para produtos com compatibilidade de veículos
 */
export interface ProductWithCompatibility {
  vehicleCompatibility?: string;
  [key: string]: unknown;
}

/**
 * Filtra produtos por compatibilidade de veículo
 */
export function filterProductsByVehicleCompatibility<T extends ProductWithCompatibility>(
  products: T[],
  filter: VehicleCompatibilityFilter
): T[] {
  if (!Object.keys(filter).length) return products;

  return products.filter(product => {
    const compatibility = parseVehicleCompatibility(product.vehicleCompatibility || '[]');

    if (!compatibility.length) return false;

    return compatibility.some(rule => {
      // Check makes
      if (filter.makeIds?.length && rule.makeId) {
        if (!filter.makeIds.includes(rule.makeId)) return false;
      }

      // Check models
      if (filter.modelIds?.length && rule.modelId) {
        if (!filter.modelIds.includes(rule.modelId)) return false;
      }

      // Check year range
      if (filter.yearRange) {
        const [filterStart, filterEnd] = filter.yearRange;
        const ruleStart = rule.yearStart || 1900;
        const ruleEnd = rule.yearEnd || new Date().getFullYear() + 5;

        // Verifica se há sobreposição entre os ranges
        if (filterEnd < ruleStart || filterStart > ruleEnd) return false;
      }

      // Check fuel types
      if (filter.fuelTypes?.length && rule.fuelType) {
        if (!rule.fuelType.some(ft => filter.fuelTypes!.includes(ft))) return false;
      }

      // Check transmissions
      if (filter.transmissions?.length && rule.transmission) {
        if (!rule.transmission.some(t => filter.transmissions!.includes(t))) return false;
      }

      return true;
    });
  });
}

/**
 * Gera estatísticas de compatibilidade
 */
export function generateCompatibilityStats(products: ProductWithCompatibility[]): {
  totalProducts: number;
  withCompatibility: number;
  byMake: Record<string, number>;
  byYearRange: Record<string, number>;
  byFuelType: Record<string, number>;
} {
  const stats = {
    totalProducts: products.length,
    withCompatibility: 0,
    byMake: {} as Record<string, number>,
    byYearRange: {} as Record<string, number>,
    byFuelType: {} as Record<string, number>
  };

  products.forEach(product => {
    const compatibility = parseVehicleCompatibility(product.vehicleCompatibility || '[]');

    if (compatibility.length > 0) {
      stats.withCompatibility++;

      compatibility.forEach(rule => {
        // By make
        if (rule.makeId) {
          const makeName = getMakeName(rule.makeId);
          stats.byMake[makeName] = (stats.byMake[makeName] || 0) + 1;
        }

        // By year range
        const yearRange = formatYearRange(rule.yearStart, rule.yearEnd);
        stats.byYearRange[yearRange] = (stats.byYearRange[yearRange] || 0) + 1;

        // By fuel type
        if (rule.fuelType) {
          rule.fuelType.forEach(ft => {
            stats.byFuelType[ft] = (stats.byFuelType[ft] || 0) + 1;
          });
        }
      });
    }
  });

  return stats;
}

/**
 * Valida regra de compatibilidade
 */
export function validateCompatibilityRule(rule: VehicleCompatibilityRule): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validar anos
  if (rule.yearStart && rule.yearEnd && rule.yearStart > rule.yearEnd) {
    errors.push('Ano de início deve ser menor que ano de fim');
  }

  if (rule.yearStart && (rule.yearStart < 1900 || rule.yearStart > new Date().getFullYear() + 5)) {
    errors.push('Ano de início inválido');
  }

  if (rule.yearEnd && (rule.yearEnd < 1900 || rule.yearEnd > new Date().getFullYear() + 5)) {
    errors.push('Ano de fim inválido');
  }

  // Validar make
  if (rule.makeId && !BRAZILIAN_MAKES.find(m => m.id === rule.makeId)) {
    errors.push('Marca não encontrada na base de dados');
  }

  // Pelo menos um critério deve ser especificado
  const hasCriteria = !!(
    rule.makeId ||
    rule.modelId ||
    rule.variantId ||
    rule.yearStart ||
    rule.yearEnd ||
    rule.engineCode?.length ||
    rule.transmission?.length ||
    rule.fuelType?.length
  );

  if (!hasCriteria) {
    errors.push('Pelo menos um critério de compatibilidade deve ser especificado');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Cria regra de compatibilidade padrão
 */
export function createDefaultCompatibilityRule(): VehicleCompatibilityRule {
  return {
    yearStart: 2010,
    yearEnd: new Date().getFullYear() + 1,
  };
}

/**
 * Cria filtro de veículos a partir de uma lista de produtos
 */
export function createVehicleFilterFromProducts(products: ProductWithCompatibility[]): {
  makes: Array<{ id: string; name: string; count: number }>;
  yearRange: { min: number; max: number };
  fuelTypes: Array<{ id: FuelType; name: string; count: number }>;
} {
  const makeCount = new Map<string, number>();
  const fuelTypeCount = new Map<FuelType, number>();
  let minYear = new Date().getFullYear();
  let maxYear = 1900;

  products.forEach(product => {
    const compatibility = parseVehicleCompatibility(product.vehicleCompatibility || '[]');

    compatibility.forEach(rule => {
      if (rule.makeId) {
        makeCount.set(rule.makeId, (makeCount.get(rule.makeId) || 0) + 1);
      }

      if (rule.yearStart) {
        minYear = Math.min(minYear, rule.yearStart);
      }

      if (rule.yearEnd) {
        maxYear = Math.max(maxYear, rule.yearEnd);
      }

      if (rule.fuelType) {
        rule.fuelType.forEach(ft => {
          fuelTypeCount.set(ft, (fuelTypeCount.get(ft) || 0) + 1);
        });
      }
    });
  });

  const makes = Array.from(makeCount.entries()).map(([makeId, count]) => ({
    id: makeId,
    name: getMakeName(makeId),
    count
  })).sort((a, b) => b.count - a.count);

  const fuelTypes = Array.from(fuelTypeCount.entries()).map(([fuelType, count]) => ({
    id: fuelType,
    name: fuelType.charAt(0).toUpperCase() + fuelType.slice(1),
    count
  })).sort((a, b) => b.count - a.count);

  return {
    makes,
    yearRange: { min: minYear, max: maxYear },
    fuelTypes
  };
}