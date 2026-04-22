// src/types/vehicles.ts - Tipos para compatibilidade de veículos

export interface VehicleMake {
  id: string;
  name: string;
  country: string;
  logo?: string;
  active: boolean;
}

export interface VehicleModel {
  id: string;
  makeId: string;
  name: string;
  segment: VehicleSegment;
  bodyType: VehicleBodyType;
  fuelType: FuelType[];
  active: boolean;
}

export interface VehicleVariant {
  id: string;
  modelId: string;
  name: string;
  engine: EngineInfo;
  transmission: TransmissionType;
  yearStart: number;
  yearEnd?: number;
  specifications: VehicleSpecifications;
  active: boolean;
}

export interface VehicleCompatibility {
  productId: string;
  compatibleVehicles: VehicleCompatibilityRule[];
  incompatibleVehicles?: VehicleCompatibilityRule[];
  notes?: string;
  verified: boolean;
  updatedAt: string;
}

export interface VehicleCompatibilityRule {
  makeId?: string;
  modelId?: string;
  variantId?: string;
  yearStart?: number;
  yearEnd?: number;
  engineCode?: string[];
  transmission?: TransmissionType[];
  fuelType?: FuelType[];
  bodyType?: VehicleBodyType[];
  exceptions?: VehicleException[];
}

export interface VehicleException {
  type: 'exclude' | 'include';
  description: string;
  makeId?: string;
  modelId?: string;
  variantId?: string;
  yearStart?: number;
  yearEnd?: number;
  engineCode?: string;
}

export interface EngineInfo {
  displacement: number; // em litros
  cylinders: number;
  configuration: EngineConfiguration;
  aspiration: AspirationType;
  fuelType: FuelType;
  power?: number; // em CV
  torque?: number; // em kgfm
  code?: string;
}

export interface VehicleSpecifications {
  weight: number;
  length: number;
  width: number;
  height: number;
  wheelbase: number;
  groundClearance?: number;
  fuelCapacity: number;
  trunkCapacity?: number;
}

export type VehicleSegment =
  | 'mini'
  | 'hatch'
  | 'sedan'
  | 'suv'
  | 'pickup'
  | 'van'
  | 'coupe'
  | 'convertible'
  | 'wagon'
  | 'commercial';

export type VehicleBodyType =
  | '2-door'
  | '4-door'
  | '5-door'
  | 'coupe'
  | 'convertible'
  | 'wagon'
  | 'suv'
  | 'pickup'
  | 'van';

export type FuelType =
  | 'gasoline'
  | 'ethanol'
  | 'flex'
  | 'diesel'
  | 'hybrid'
  | 'electric'
  | 'gnv'
  | 'hydrogen';

export type TransmissionType =
  | 'manual-5'
  | 'manual-6'
  | 'automatic-4'
  | 'automatic-5'
  | 'automatic-6'
  | 'automatic-7'
  | 'automatic-8'
  | 'automatic-9'
  | 'cvt'
  | 'dct'
  | 'amt';

export type EngineConfiguration =
  | 'inline-3'
  | 'inline-4'
  | 'inline-5'
  | 'inline-6'
  | 'v6'
  | 'v8'
  | 'v10'
  | 'v12'
  | 'boxer-4'
  | 'boxer-6'
  | 'rotary';

export type AspirationType =
  | 'naturally-aspirated'
  | 'turbocharged'
  | 'supercharged'
  | 'twin-turbo'
  | 'hybrid';

// Dados das montadoras brasileiras
export const BRAZILIAN_MAKES: VehicleMake[] = [
  { id: 'ford', name: 'Ford', country: 'USA', active: true },
  { id: 'chevrolet', name: 'Chevrolet', country: 'USA', active: true },
  { id: 'volkswagen', name: 'Volkswagen', country: 'Germany', active: true },
  { id: 'fiat', name: 'Fiat', country: 'Italy', active: true },
  { id: 'honda', name: 'Honda', country: 'Japan', active: true },
  { id: 'toyota', name: 'Toyota', country: 'Japan', active: true },
  { id: 'hyundai', name: 'Hyundai', country: 'South Korea', active: true },
  { id: 'renault', name: 'Renault', country: 'France', active: true },
  { id: 'nissan', name: 'Nissan', country: 'Japan', active: true },
  { id: 'peugeot', name: 'Peugeot', country: 'France', active: true },
  { id: 'jeep', name: 'Jeep', country: 'USA', active: true },
  { id: 'citroen', name: 'Citroën', country: 'France', active: true },
  { id: 'mitsubishi', name: 'Mitsubishi', country: 'Japan', active: true },
  { id: 'subaru', name: 'Subaru', country: 'Japan', active: true },
  { id: 'kia', name: 'Kia', country: 'South Korea', active: true },
  { id: 'bmw', name: 'BMW', country: 'Germany', active: true },
  { id: 'mercedes', name: 'Mercedes-Benz', country: 'Germany', active: true },
  { id: 'audi', name: 'Audi', country: 'Germany', active: true },
  { id: 'volvo', name: 'Volvo', country: 'Sweden', active: true },
  { id: 'land-rover', name: 'Land Rover', country: 'UK', active: true }
];

// Segmentos de veículos
export const VEHICLE_SEGMENTS: { id: VehicleSegment; name: string; description: string }[] = [
  { id: 'mini', name: 'Mini', description: 'Carros compactos urbanos' },
  { id: 'hatch', name: 'Hatch', description: 'Hatches compactos e médios' },
  { id: 'sedan', name: 'Sedan', description: 'Sedans compactos, médios e grandes' },
  { id: 'suv', name: 'SUV', description: 'Utilitários esportivos' },
  { id: 'pickup', name: 'Pickup', description: 'Caminhonetes' },
  { id: 'van', name: 'Van', description: 'Vans e comerciais leves' },
  { id: 'coupe', name: 'Cupê', description: 'Carros esportivos 2 portas' },
  { id: 'convertible', name: 'Conversível', description: 'Carros conversíveis' },
  { id: 'wagon', name: 'Perua', description: 'Peruas familiares' },
  { id: 'commercial', name: 'Comercial', description: 'Veículos comerciais' }
];

// Tipos de combustível
export const FUEL_TYPES: { id: FuelType; name: string; color: string }[] = [
  { id: 'gasoline', name: 'Gasolina', color: 'bg-red-500' },
  { id: 'ethanol', name: 'Etanol', color: 'bg-green-500' },
  { id: 'flex', name: 'Flex', color: 'bg-blue-500' },
  { id: 'diesel', name: 'Diesel', color: 'bg-yellow-500' },
  { id: 'hybrid', name: 'Híbrido', color: 'bg-purple-500' },
  { id: 'electric', name: 'Elétrico', color: 'bg-cyan-500' },
  { id: 'gnv', name: 'GNV', color: 'bg-orange-500' },
  { id: 'hydrogen', name: 'Hidrogênio', color: 'bg-gray-500' }
];

// Interface para filtro de compatibilidade
export interface VehicleCompatibilityFilter {
  makeIds?: string[];
  modelIds?: string[];
  yearRange?: [number, number];
  fuelTypes?: FuelType[];
  segments?: VehicleSegment[];
  bodyTypes?: VehicleBodyType[];
  transmissions?: TransmissionType[];
  engineDisplacement?: [number, number];
}

// Interface para resultado de busca de compatibilidade
export interface CompatibilitySearchResult {
  compatible: boolean;
  confidence: number; // 0-1
  matches: VehicleCompatibilityMatch[];
  warnings?: string[];
  suggestions?: string[];
}

export interface VehicleCompatibilityMatch {
  vehicleInfo: {
    make: string;
    model: string;
    variant?: string;
    years: string;
  };
  matchType: 'exact' | 'partial' | 'generic';
  matchScore: number; // 0-1
  matchedCriteria: string[];
  notes?: string;
}