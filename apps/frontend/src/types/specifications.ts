// src/types/specifications.ts - Tipos para especificações técnicas

export type SpecificationValueType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'range'
  | 'dimension'
  | 'weight'
  | 'volume'
  | 'color'
  | 'material'
  | 'warranty';

export type SpecificationPrimitiveValue = string | number | boolean;
export type SpecificationArrayValue = string[] | number[];
export type SpecificationRangeValue = { min: number; max: number };
export type SpecificationValueUnion = SpecificationPrimitiveValue | SpecificationArrayValue | SpecificationRangeValue;

export interface SpecificationDefinition {
  key: string;
  name: string;
  category: string;
  type: SpecificationValueType;
  unit?: string;
  required?: boolean;
  options?: string[]; // Para select/multiselect
  min?: number; // Para number/range
  max?: number; // Para number/range
  step?: number; // Para number
  description?: string;
  searchable?: boolean;
  filterable?: boolean;
  comparable?: boolean;
}

export interface SpecificationValue {
  key: string;
  value: SpecificationValueUnion;
  displayValue?: string;
  unit?: string;
}

export interface ProductSpecifications {
  productId: string;
  specifications: SpecificationValue[];
  categories: string[];
  updatedAt: string;
}

// Categorias de especificações por tipo de produto
export interface SpecificationCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  order: number;
  productTypes: string[];
}

// Especificações por categoria de produto
export const SPECIFICATION_CATEGORIES: SpecificationCategory[] = [
  {
    id: 'dimensions',
    name: 'Dimensões',
    description: 'Medidas físicas do produto',
    icon: 'ruler',
    order: 1,
    productTypes: ['all']
  },
  {
    id: 'performance',
    name: 'Performance',
    description: 'Características de desempenho',
    icon: 'gauge',
    order: 2,
    productTypes: ['motor', 'freios', 'suspensao', 'transmissao']
  },
  {
    id: 'materials',
    name: 'Materiais',
    description: 'Composição e materiais',
    icon: 'layers',
    order: 3,
    productTypes: ['all']
  },
  {
    id: 'compatibility',
    name: 'Compatibilidade',
    description: 'Veículos compatíveis',
    icon: 'car',
    order: 4,
    productTypes: ['all']
  },
  {
    id: 'electrical',
    name: 'Elétrico',
    description: 'Características elétricas',
    icon: 'zap',
    order: 5,
    productTypes: ['eletricos', 'iluminacao', 'bateria']
  },
  {
    id: 'fluid',
    name: 'Fluidos',
    description: 'Propriedades de fluidos',
    icon: 'droplet',
    order: 6,
    productTypes: ['oleos', 'fluidos', 'aditivos']
  }
];

// Definições de especificações comuns
export const COMMON_SPECIFICATIONS: Record<string, SpecificationDefinition> = {
  // Dimensões
  length: {
    key: 'length',
    name: 'Comprimento',
    category: 'dimensions',
    type: 'number',
    unit: 'mm',
    searchable: true,
    filterable: true,
    comparable: true
  },
  width: {
    key: 'width',
    name: 'Largura',
    category: 'dimensions',
    type: 'number',
    unit: 'mm',
    searchable: true,
    filterable: true,
    comparable: true
  },
  height: {
    key: 'height',
    name: 'Altura',
    category: 'dimensions',
    type: 'number',
    unit: 'mm',
    searchable: true,
    filterable: true,
    comparable: true
  },
  weight: {
    key: 'weight',
    name: 'Peso',
    category: 'dimensions',
    type: 'weight',
    unit: 'kg',
    searchable: true,
    filterable: true,
    comparable: true
  },

  // Materiais
  material: {
    key: 'material',
    name: 'Material',
    category: 'materials',
    type: 'select',
    options: ['Aço', 'Alumínio', 'Plástico', 'Borracha', 'Metal', 'Cerâmica', 'Composite'],
    searchable: true,
    filterable: true,
    comparable: true
  },
  finish: {
    key: 'finish',
    name: 'Acabamento',
    category: 'materials',
    type: 'select',
    options: ['Natural', 'Pintado', 'Galvanizado', 'Anodizado', 'Cromado', 'Polido'],
    searchable: true,
    filterable: true
  },

  // Performance
  maxPressure: {
    key: 'maxPressure',
    name: 'Pressão Máxima',
    category: 'performance',
    type: 'number',
    unit: 'bar',
    searchable: true,
    filterable: true,
    comparable: true
  },
  maxTemperature: {
    key: 'maxTemperature',
    name: 'Temperatura Máxima',
    category: 'performance',
    type: 'number',
    unit: '°C',
    searchable: true,
    filterable: true,
    comparable: true
  },
  capacity: {
    key: 'capacity',
    name: 'Capacidade',
    category: 'performance',
    type: 'volume',
    unit: 'L',
    searchable: true,
    filterable: true,
    comparable: true
  },

  // Elétrico
  voltage: {
    key: 'voltage',
    name: 'Voltagem',
    category: 'electrical',
    type: 'select',
    options: ['12V', '24V', '110V', '220V'],
    searchable: true,
    filterable: true,
    comparable: true
  },
  power: {
    key: 'power',
    name: 'Potência',
    category: 'electrical',
    type: 'number',
    unit: 'W',
    searchable: true,
    filterable: true,
    comparable: true
  },
  current: {
    key: 'current',
    name: 'Corrente',
    category: 'electrical',
    type: 'number',
    unit: 'A',
    searchable: true,
    filterable: true,
    comparable: true
  },

  // Fluidos
  viscosity: {
    key: 'viscosity',
    name: 'Viscosidade',
    category: 'fluid',
    type: 'text',
    unit: 'cSt',
    searchable: true,
    filterable: true,
    comparable: true
  },
  apiGrade: {
    key: 'apiGrade',
    name: 'Grau API',
    category: 'fluid',
    type: 'select',
    options: ['SN', 'SM', 'SL', 'SJ', 'CF', 'CG', 'CH'],
    searchable: true,
    filterable: true
  },
  saeGrade: {
    key: 'saeGrade',
    name: 'Grau SAE',
    category: 'fluid',
    type: 'select',
    options: ['0W-20', '5W-30', '5W-40', '10W-30', '10W-40', '15W-40', '20W-50'],
    searchable: true,
    filterable: true
  },

  // Compatibilidade
  vehicleMake: {
    key: 'vehicleMake',
    name: 'Marca do Veículo',
    category: 'compatibility',
    type: 'multiselect',
    options: ['Ford', 'Chevrolet', 'Volkswagen', 'Fiat', 'Honda', 'Toyota', 'Hyundai', 'Renault', 'Nissan', 'Peugeot'],
    searchable: true,
    filterable: true
  },
  yearRange: {
    key: 'yearRange',
    name: 'Ano do Veículo',
    category: 'compatibility',
    type: 'range',
    min: 1990,
    max: new Date().getFullYear() + 1,
    searchable: true,
    filterable: true
  },

  // Geral
  warranty: {
    key: 'warranty',
    name: 'Garantia',
    category: 'general',
    type: 'warranty',
    unit: 'meses',
    searchable: true,
    filterable: true,
    comparable: true
  },
  origin: {
    key: 'origin',
    name: 'Origem',
    category: 'general',
    type: 'select',
    options: ['Nacional', 'Importado'],
    searchable: true,
    filterable: true
  },
  brand: {
    key: 'brand',
    name: 'Marca',
    category: 'general',
    type: 'text',
    searchable: true,
    filterable: true
  }
};

// Especificações por categoria de produto
export const PRODUCT_SPECIFICATIONS: Record<string, string[]> = {
  // Filtros
  'filtros': [
    'length', 'width', 'height', 'material', 'vehicleMake', 'yearRange', 'warranty', 'brand'
  ],

  // Óleos
  'oleos': [
    'capacity', 'viscosity', 'apiGrade', 'saeGrade', 'maxTemperature', 'vehicleMake', 'yearRange', 'warranty', 'brand'
  ],

  // Pastilhas de freio
  'freios': [
    'length', 'width', 'height', 'material', 'finish', 'maxTemperature', 'maxPressure', 'vehicleMake', 'yearRange', 'warranty', 'brand'
  ],

  // Peças elétricas
  'eletricos': [
    'voltage', 'power', 'current', 'material', 'vehicleMake', 'yearRange', 'warranty', 'origin', 'brand'
  ],

  // Suspensão
  'suspensao': [
    'length', 'weight', 'material', 'maxPressure', 'vehicleMake', 'yearRange', 'warranty', 'brand'
  ],

  // Padrão para produtos não categorizados
  'default': [
    'length', 'width', 'height', 'weight', 'material', 'vehicleMake', 'yearRange', 'warranty', 'brand'
  ]
};

// Interface para filtros baseados em especificações
export interface SpecificationFilter {
  key: string;
  name: string;
  type: SpecificationValueType;
  values: SpecificationPrimitiveValue[];
  selectedValues: SpecificationPrimitiveValue[];
  unit?: string;
  options?: string[];
  min?: number;
  max?: number;
}

// Interface para comparação de produtos
export interface ProductComparison {
  productIds: string[];
  specifications: {
    key: string;
    name: string;
    values: { [productId: string]: SpecificationValue };
    category: string;
    comparable: boolean;
  }[];
  categories: string[];
}

export type SpecificationFilterOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'range';

export interface SpecificationFilterCondition {
  key: string;
  operator: SpecificationFilterOperator;
  value: SpecificationPrimitiveValue | SpecificationRangeValue;
  values?: SpecificationPrimitiveValue[];
}