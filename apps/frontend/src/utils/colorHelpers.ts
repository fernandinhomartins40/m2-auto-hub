/**
 * Color Helpers - Utilitários para conversão e migração de cores
 * Sistema: Tailwind CSS → Hex → ColorOrGradientValue
 */

import { ColorOrGradientValue } from '@/types/landingPage';

interface LegacyColorValue {
  type?: unknown;
  solid?: unknown;
  gradient?: {
    type?: unknown;
    colors?: unknown;
    angle?: unknown;
    direction?: unknown;
  };
}

/**
 * Mapa completo de cores Tailwind → Hex
 * Baseado no Tailwind CSS v3.x
 */
export const TAILWIND_COLOR_MAP: Record<string, string> = {
  // Blue
  'text-blue-50': '#eff6ff',
  'text-blue-100': '#dbeafe',
  'text-blue-200': '#bfdbfe',
  'text-blue-300': '#93c5fd',
  'text-blue-400': '#60a5fa',
  'text-blue-500': '#3b82f6',
  'text-blue-600': '#2563eb',
  'text-blue-700': '#1d4ed8',
  'text-blue-800': '#1e40af',
  'text-blue-900': '#1e3a8a',

  // Green
  'text-green-50': '#f0fdf4',
  'text-green-100': '#dcfce7',
  'text-green-200': '#bbf7d0',
  'text-green-300': '#86efac',
  'text-green-400': '#4ade80',
  'text-green-500': '#22c55e',
  'text-green-600': '#16a34a',
  'text-green-700': '#15803d',
  'text-green-800': '#166534',
  'text-green-900': '#14532d',

  // Red
  'text-red-50': '#fef2f2',
  'text-red-100': '#fee2e2',
  'text-red-200': '#fecaca',
  'text-red-300': '#fca5a5',
  'text-red-400': '#f87171',
  'text-red-500': '#ef4444',
  'text-red-600': '#dc2626',
  'text-red-700': '#b91c1c',
  'text-red-800': '#991b1b',
  'text-red-900': '#7f1d1d',

  // Purple
  'text-purple-50': '#faf5ff',
  'text-purple-100': '#f3e8ff',
  'text-purple-200': '#e9d5ff',
  'text-purple-300': '#d8b4fe',
  'text-purple-400': '#c084fc',
  'text-purple-500': '#a855f7',
  'text-purple-600': '#9333ea',
  'text-purple-700': '#7e22ce',
  'text-purple-800': '#6b21a8',
  'text-purple-900': '#581c87',

  // Orange
  'text-orange-50': '#fff7ed',
  'text-orange-100': '#ffedd5',
  'text-orange-200': '#fed7aa',
  'text-orange-300': '#fdba74',
  'text-orange-400': '#fb923c',
  'text-orange-500': '#f97316',
  'text-orange-600': '#ea580c',
  'text-orange-700': '#c2410c',
  'text-orange-800': '#9a3412',
  'text-orange-900': '#7c2d12',

  // Yellow
  'text-yellow-50': '#fefce8',
  'text-yellow-100': '#fef9c3',
  'text-yellow-200': '#fef08a',
  'text-yellow-300': '#fde047',
  'text-yellow-400': '#facc15',
  'text-yellow-500': '#eab308',
  'text-yellow-600': '#ca8a04',
  'text-yellow-700': '#a16207',
  'text-yellow-800': '#854d0e',
  'text-yellow-900': '#713f12',

  // Gray
  'text-gray-50': '#f9fafb',
  'text-gray-100': '#f3f4f6',
  'text-gray-200': '#e5e7eb',
  'text-gray-300': '#d1d5db',
  'text-gray-400': '#9ca3af',
  'text-gray-500': '#6b7280',
  'text-gray-600': '#4b5563',
  'text-gray-700': '#374151',
  'text-gray-800': '#1f2937',
  'text-gray-900': '#111827',

  // Moria Custom Colors
  'text-moria-orange': '#2563eb',
  'text-moria-black': '#1a1a1a',
  'text-gold-accent': '#ffa600',
};

/**
 * Converte classe Tailwind CSS para cor Hex
 * @param tailwindClass - Classe Tailwind (ex: "text-blue-600")
 * @returns Cor Hex (ex: "#2563eb") ou cor padrão se não encontrada
 */
export const convertTailwindToHex = (tailwindClass: string): string => {
  // Remover espaços e pegar primeira classe (se houver múltiplas)
  const className = tailwindClass.trim().split(' ')[0];

  // Buscar no mapa
  const hexColor = TAILWIND_COLOR_MAP[className];

  if (hexColor) {
    return hexColor;
  }

  // Se já for hex, retornar
  if (className.startsWith('#')) {
    return className;
  }

  // Fallback: cor laranja Moria
  console.warn(`[colorHelpers] Cor Tailwind não mapeada: "${className}", usando fallback #2563eb`);
  return '#2563eb';
};

/**
 * Valida se um valor é ColorOrGradientValue válido
 * @param value - Valor a validar
 * @returns true se válido
 */
export const isValidColorOrGradient = (value: unknown): value is ColorOrGradientValue => {
  // Validação 1: deve ser objeto
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as LegacyColorValue;

  // Validação 2: deve ter propriedade 'type'
  if (typeof candidate.type !== 'string') {
    return false;
  }

  // Validação 3: tipo 'solid'
  if (candidate.type === 'solid') {
    return typeof candidate.solid === 'string' && candidate.solid.length > 0;
  }

  // Validação 4: tipo 'gradient'
  if (candidate.type === 'gradient') {
    // Gradiente deve ter objeto gradient
    if (!candidate.gradient || typeof candidate.gradient !== 'object') {
      return false;
    }

    // Gradiente deve ter colors como array com elementos
    // Proteção extra: verificar se gradient existe E se colors existe
    if (!candidate.gradient.colors || !Array.isArray(candidate.gradient.colors)) {
      return false;
    }

    if (candidate.gradient.colors.length === 0) {
      return false;
    }

    // Gradiente deve ter type válido
    if (!candidate.gradient.type || (candidate.gradient.type !== 'linear' && candidate.gradient.type !== 'radial')) {
      return false;
    }

    return true;
  }

  // Tipo desconhecido
  return false;
};

/**
 * Converte string de cor (Tailwind ou Hex) para ColorOrGradientValue
 * @param colorString - String de cor (ex: "text-blue-600" ou "#2563eb")
 * @returns ColorOrGradientValue completo
 */
export const stringToColorOrGradient = (colorString: string | ColorOrGradientValue | unknown): ColorOrGradientValue => {
  // Se for null ou undefined, retornar fallback
  if (colorString === null || colorString === undefined) {
    return {
      type: 'solid',
      solid: '#2563eb',
    };
  }

  // Se já for ColorOrGradientValue válido, retornar
  if (typeof colorString === 'object' && colorString !== null && 'type' in colorString) {
    const candidate = colorString as LegacyColorValue;
    // Validar se é um ColorOrGradientValue válido
    if (isValidColorOrGradient(colorString)) {
      return colorString;
    }
    // Se não for válido, tentar recuperar
    if (candidate.type === 'solid' && !candidate.solid) {
      return {
        type: 'solid',
        solid: '#2563eb',
      };
    }
    if (candidate.type === 'gradient' && (!candidate.gradient || !candidate.gradient.colors)) {
      return {
        type: 'solid',
        solid: '#2563eb',
      };
    }
  }

  // Se for string, converter para ColorOrGradientValue
  if (typeof colorString === 'string') {
    const hexColor = convertTailwindToHex(colorString);
    return {
      type: 'solid',
      solid: hexColor,
    };
  }

  // Fallback para qualquer outro caso
  return {
    type: 'solid',
    solid: '#2563eb',
  };
};

/**
 * Migra campo de cor de string para ColorOrGradientValue
 * Usado para garantir compatibilidade retroativa
 * @param color - Cor no formato antigo (string) ou novo (ColorOrGradientValue)
 * @returns ColorOrGradientValue
 */
export const migrateColorField = (color: unknown): ColorOrGradientValue => {
  // Se já é ColorOrGradientValue válido, retornar
  if (isValidColorOrGradient(color)) {
    return color;
  }

  // Se não é válido, converter
  return stringToColorOrGradient(color);
};

/**
 * Migra array de objetos com campo 'color'
 * @param items - Array de objetos com campo color
 * @returns Array com cores migradas
 */
export const migrateColorArray = <T extends { color?: unknown }>(items: T[]): T[] => {
  if (!items || !Array.isArray(items)) {
    return [];
  }

  return items.map(item => {
    // Se o item não existe ou é null, retornar como está
    if (!item || typeof item !== 'object') {
      return item;
    }

    // Se o item não tem campo color, retornar como está
    if (!('color' in item)) {
      return item;
    }

    // Migrar o campo color
    return {
      ...item,
      color: migrateColorField(item.color),
    };
  });
};

/**
 * Sanitiza um valor de cor para garantir que seja seguro usar
 * @param value - Valor a sanitizar
 * @returns ColorOrGradientValue válido ou null
 */
export const sanitizeColorValue = (value: unknown): ColorOrGradientValue | null => {
  // Se for null ou undefined, retornar null
  if (value === null || value === undefined) {
    return null;
  }

  // Se for string, converter
  if (typeof value === 'string') {
    return stringToColorOrGradient(value);
  }

  // Se for objeto, validar estrutura
  if (typeof value === 'object' && value !== null) {
    const candidate = value as LegacyColorValue;
    // Verificar se tem type
    if (!candidate.type) {
      return null;
    }

    // Tipo solid
    if (candidate.type === 'solid') {
      if (typeof candidate.solid === 'string' && candidate.solid.length > 0) {
        return {
          type: 'solid',
          solid: candidate.solid,
        };
      }
      return null;
    }

    // Tipo gradient
    if (candidate.type === 'gradient') {
      // Verificar se gradient existe e é objeto válido
      if (!candidate.gradient || typeof candidate.gradient !== 'object') {
        return null;
      }

      // Verificar se tem colors
      if (!candidate.gradient.colors || !Array.isArray(candidate.gradient.colors) || candidate.gradient.colors.length === 0) {
        return null;
      }

      // Verificar tipo do gradiente
      const gradientType = candidate.gradient.type;
      if (gradientType !== 'linear' && gradientType !== 'radial') {
        return null;
      }

      // Retornar gradiente válido
      return {
        type: 'gradient',
        gradient: {
          type: gradientType,
          colors: candidate.gradient.colors.filter((color): color is string => typeof color === 'string'),
          angle: typeof candidate.gradient.angle === 'number' ? candidate.gradient.angle : undefined,
          direction: typeof candidate.gradient.direction === 'string' ? candidate.gradient.direction : undefined,
        },
      };
    }
  }

  return null;
};
