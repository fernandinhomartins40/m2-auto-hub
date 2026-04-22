// src/hooks/useAdvancedFilters.ts - Hook para gerenciar filtros avançados

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  SpecificationFilterCondition,
  SpecificationFilter,
  filterProductsBySpecifications,
  generateFiltersFromProducts
} from '@/utils/specifications';
import {
  VehicleCompatibilityFilter,
  filterProductsByVehicleCompatibility
} from '@/utils/vehicles';

export interface FilterState {
  // Filtros básicos
  category?: string;
  subcategory?: string;
  priceRange?: [number, number];
  brands?: string[];
  inStock?: boolean;
  onSale?: boolean;

  // Filtros de especificações
  specifications?: SpecificationFilterCondition[];

  // Filtros de compatibilidade de veículos
  vehicleCompatibility?: VehicleCompatibilityFilter;

  // Filtros avançados
  rating?: number;
  tags?: string[];
  warranty?: number;

  // Meta filtros
  searchTerm?: string;
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'rating' | 'popularity';
}

export interface FilterMetadata {
  categories: { id: string; name: string; count: number }[];
  brands: { id: string; name: string; count: number }[];
  priceRange: { min: number; max: number };
  specificationFilters: SpecificationFilter[];
  totalProducts: number;
  filteredCount: number;
  activeFilterCount: number;
}

interface FilterableProduct {
  id: string;
  name: string;
  category?: string;
  subcategory?: string;
  price?: number;
  salePrice?: number;
  promoPrice?: number;
  specifications?: string;
  vehicleCompatibility?: string;
  [key: string]: unknown;
}

export interface UseAdvancedFiltersOptions {
  persistFilters?: boolean;
  defaultFilters?: Partial<FilterState>;
  onFiltersChange?: (filters: FilterState, results: FilterableProduct[]) => void;
  debounceMs?: number;
}

export interface UseAdvancedFiltersResult {
  // Estado dos filtros
  filters: FilterState;
  setFilters: (filters: Partial<FilterState>) => void;
  updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  clearFilters: () => void;
  clearFilter: (key: keyof FilterState) => void;

  // Resultados filtrados
  filteredProducts: FilterableProduct[];
  isFiltering: boolean;

  // Metadados
  metadata: FilterMetadata;
  availableFilters: SpecificationFilter[];

  // Filtros de especificações
  addSpecificationFilter: (condition: SpecificationFilterCondition) => void;
  removeSpecificationFilter: (index: number) => void;
  updateSpecificationFilter: (index: number, condition: SpecificationFilterCondition) => void;

  // Filtros de compatibilidade
  updateVehicleFilter: (filter: Partial<VehicleCompatibilityFilter>) => void;
  clearVehicleFilter: () => void;

  // Persistência
  saveFiltersToUrl: () => void;
  loadFiltersFromUrl: () => void;

  // Utilidades
  getActiveFilters: () => Array<{ key: string; label: string; value: string | number | boolean | string[] }>;
  exportFilters: () => string;
  importFilters: (filtersJson: string) => void;
  resetToDefaults: () => void;

  // Analytics
  filterUsageStats: Record<string, number>;
}

export function useAdvancedFilters(
  products: FilterableProduct[] = [],
  options: UseAdvancedFiltersOptions = {}
): UseAdvancedFiltersResult {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    persistFilters = false,
    defaultFilters = {},
    onFiltersChange,
    debounceMs = 300
  } = options;

  // Estado dos filtros
  const [filters, setFiltersState] = useState<FilterState>(() => {
    if (persistFilters) {
      return loadFiltersFromUrl() || defaultFilters;
    }
    return defaultFilters;
  });

  const [isFiltering, setIsFiltering] = useState(false);
  const [filterUsageStats, setFilterUsageStats] = useState<Record<string, number>>({});

  // Debounced filters para evitar muitas recomputações
  const [debouncedFilters, setDebouncedFilters] = useState(filters);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [filters, debounceMs]);

  // Filtros de especificações disponíveis
  const availableFilters = useMemo(() => {
    return generateFiltersFromProducts(products);
  }, [products]);

  // Aplicar filtros aos produtos
  const filteredProducts = useMemo(() => {
    if (!products.length) return [];

    setIsFiltering(true);

    let filtered = [...products];

    // Filtro de busca
    if (debouncedFilters.searchTerm) {
      const searchTerm = debouncedFilters.searchTerm.toLowerCase();
      filtered = filtered.filter(product =>
        product.name?.toLowerCase().includes(searchTerm) ||
        product.description?.toLowerCase().includes(searchTerm) ||
        product.category?.toLowerCase().includes(searchTerm) ||
        product.supplier?.toLowerCase().includes(searchTerm)
      );
    }

    // Filtro de categoria
    if (debouncedFilters.category) {
      filtered = filtered.filter(product => product.category === debouncedFilters.category);
    }

    // Filtro de subcategoria
    if (debouncedFilters.subcategory) {
      filtered = filtered.filter(product => product.subcategory === debouncedFilters.subcategory);
    }

    // Filtro de preço
    if (debouncedFilters.priceRange) {
      const [min, max] = debouncedFilters.priceRange;
      filtered = filtered.filter(product => {
        const price = product.salePrice || product.price || 0;
        return price >= min && price <= max;
      });
    }

    // Filtro de marcas
    if (debouncedFilters.brands?.length) {
      filtered = filtered.filter(product =>
        debouncedFilters.brands!.includes(product.supplier || product.brand)
      );
    }

    // Filtro de estoque
    if (debouncedFilters.inStock) {
      filtered = filtered.filter(product => product.stock > 0);
    }

    // Filtro de promoção
    if (debouncedFilters.onSale) {
      filtered = filtered.filter(product =>
        product.promoPrice && product.promoPrice < (product.salePrice || product.price)
      );
    }

    // Filtro de avaliação
    if (debouncedFilters.rating) {
      filtered = filtered.filter(product =>
        (product.rating || 0) >= debouncedFilters.rating!
      );
    }

    // Filtros de especificações
    if (debouncedFilters.specifications?.length) {
      filtered = filterProductsBySpecifications(filtered, debouncedFilters.specifications);
    }

    // Filtros de compatibilidade de veículos
    if (debouncedFilters.vehicleCompatibility) {
      filtered = filterProductsByVehicleCompatibility(filtered, debouncedFilters.vehicleCompatibility);
    }

    // Ordenação
    if (debouncedFilters.sortBy) {
      filtered.sort((a, b) => {
        switch (debouncedFilters.sortBy) {
          case 'price_asc':
            return (a.salePrice || a.price || 0) - (b.salePrice || b.price || 0);
          case 'price_desc':
            return (b.salePrice || b.price || 0) - (a.salePrice || a.price || 0);
          case 'newest':
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
          case 'rating':
            return (b.rating || 0) - (a.rating || 0);
          case 'popularity':
            return (b.views || 0) - (a.views || 0);
          default:
            return 0;
        }
      });
    }

    setIsFiltering(false);
    return filtered;
  }, [products, debouncedFilters]);

  // Metadados dos filtros
  const metadata = useMemo((): FilterMetadata => {
    // Categorias com contagem
    const categoryCount = new Map<string, number>();
    products.forEach(product => {
      if (product.category) {
        categoryCount.set(product.category, (categoryCount.get(product.category) || 0) + 1);
      }
    });

    const categories = Array.from(categoryCount.entries()).map(([id, count]) => ({
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      count
    }));

    // Marcas com contagem
    const brandCount = new Map<string, number>();
    products.forEach(product => {
      const brand = product.supplier || product.brand;
      if (brand) {
        brandCount.set(brand, (brandCount.get(brand) || 0) + 1);
      }
    });

    const brands = Array.from(brandCount.entries()).map(([id, count]) => ({
      id,
      name: id,
      count
    }));

    // Range de preços
    const prices = products.map(p => p.salePrice || p.price || 0).filter(p => p > 0);
    const priceRange = {
      min: prices.length ? Math.floor(Math.min(...prices)) : 0,
      max: prices.length ? Math.ceil(Math.max(...prices)) : 1000
    };

    // Contagem de filtros ativos
    let activeFilterCount = 0;
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value) && value.length > 0) {
          activeFilterCount += value.length;
        } else {
          activeFilterCount++;
        }
      }
    });

    return {
      categories,
      brands,
      priceRange,
      specificationFilters: availableFilters,
      totalProducts: products.length,
      filteredCount: filteredProducts.length,
      activeFilterCount
    };
  }, [products, availableFilters, filteredProducts.length, filters]);

  // Notificar mudanças
  useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange(debouncedFilters, filteredProducts);
    }
  }, [debouncedFilters, filteredProducts, onFiltersChange]);

  // Salvar filtros na URL se habilitado
  useEffect(() => {
    if (persistFilters && Object.keys(filters).length > 0) {
      saveFiltersToUrl();
    }
  }, [filters, persistFilters]);

  // Funções de manipulação de filtros
  const setFilters = useCallback((newFilters: Partial<FilterState>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));

    // Atualizar estatísticas de uso
    Object.keys(newFilters).forEach(key => {
      setFilterUsageStats(prev => ({
        ...prev,
        [key]: (prev[key] || 0) + 1
      }));
    });
  }, []);

  const updateFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters({ [key]: value });
  }, [setFilters]);

  const clearFilters = useCallback(() => {
    setFiltersState({});
  }, []);

  const clearFilter = useCallback((key: keyof FilterState) => {
    setFiltersState(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  }, []);

  const addSpecificationFilter = useCallback((condition: SpecificationFilterCondition) => {
    setFiltersState(prev => ({
      ...prev,
      specifications: [...(prev.specifications || []), condition]
    }));
  }, []);

  const removeSpecificationFilter = useCallback((index: number) => {
    setFiltersState(prev => ({
      ...prev,
      specifications: prev.specifications?.filter((_, i) => i !== index) || []
    }));
  }, []);

  const updateSpecificationFilter = useCallback((index: number, condition: SpecificationFilterCondition) => {
    setFiltersState(prev => ({
      ...prev,
      specifications: prev.specifications?.map((spec, i) => i === index ? condition : spec) || []
    }));
  }, []);

  const updateVehicleFilter = useCallback((filter: Partial<VehicleCompatibilityFilter>) => {
    setFiltersState(prev => ({
      ...prev,
      vehicleCompatibility: {
        ...prev.vehicleCompatibility,
        ...filter
      }
    }));
  }, []);

  const clearVehicleFilter = useCallback(() => {
    setFiltersState(prev => {
      const { vehicleCompatibility, ...rest } = prev;
      return rest;
    });
  }, []);

  // Persistência na URL
  const saveFiltersToUrl = useCallback(() => {
    if (!persistFilters) return;

    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (typeof value === 'object') {
          params.set(key, JSON.stringify(value));
        } else {
          params.set(key, String(value));
        }
      }
    });

    setSearchParams(params);
  }, [filters, persistFilters, setSearchParams]);

  const loadFiltersFromUrl = useCallback((): FilterState | null => {
    if (!persistFilters) return null;

    try {
      const filters: Partial<FilterState> = {};
      searchParams.forEach((value, key) => {
        try {
          // Tentar fazer parse como JSON primeiro
          const parsed = JSON.parse(value);
          filters[key as keyof FilterState] = parsed as FilterState[keyof FilterState];
        } catch {
          // Se falhar, usar como string
          filters[key as keyof FilterState] = value as FilterState[keyof FilterState];
        }
      });

      return Object.keys(filters).length > 0 ? filters : null;
    } catch (error) {
      console.warn('Erro ao carregar filtros da URL:', error);
      return null;
    }
  }, [persistFilters, searchParams]);

  const getActiveFilters = useCallback(() => {
    const active: Array<{ key: string; label: string; value: string | number | boolean | string[] }> = [];

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value) && value.length === 0) return;

        let label = key.charAt(0).toUpperCase() + key.slice(1);

        // Labels customizados
        switch (key) {
          case 'priceRange':
            label = 'Preço';
            break;
          case 'searchTerm':
            label = 'Busca';
            break;
          case 'vehicleCompatibility':
            label = 'Compatibilidade';
            break;
          case 'inStock':
            label = 'Em estoque';
            break;
          case 'onSale':
            label = 'Em promoção';
            break;
        }

        active.push({ key, label, value });
      }
    });

    return active;
  }, [filters]);

  const exportFilters = useCallback(() => {
    return JSON.stringify(filters, null, 2);
  }, [filters]);

  const importFilters = useCallback((filtersJson: string) => {
    try {
      const importedFilters = JSON.parse(filtersJson);
      setFiltersState(importedFilters);
    } catch (error) {
      console.error('Erro ao importar filtros:', error);
    }
  }, []);

  const resetToDefaults = useCallback(() => {
    setFiltersState(defaultFilters);
  }, [defaultFilters]);

  return {
    // Estado dos filtros
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    clearFilter,

    // Resultados filtrados
    filteredProducts,
    isFiltering,

    // Metadados
    metadata,
    availableFilters,

    // Filtros de especificações
    addSpecificationFilter,
    removeSpecificationFilter,
    updateSpecificationFilter,

    // Filtros de compatibilidade
    updateVehicleFilter,
    clearVehicleFilter,

    // Persistência
    saveFiltersToUrl,
    loadFiltersFromUrl,

    // Utilidades
    getActiveFilters,
    exportFilters,
    importFilters,
    resetToDefaults,

    // Analytics
    filterUsageStats
  };
}