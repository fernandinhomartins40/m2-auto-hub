// src/components/AdvancedFilters.tsx - Filtros avançados baseados em especificações

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Search,
  RotateCcw,
  Settings2,
  Tag,
  Layers,
  Car,
  Zap,
  Droplet,
  Ruler,
  Package,
  Star
} from 'lucide-react';

import {
  SpecificationFilter,
  SpecificationFilterCondition,
  SPECIFICATION_CATEGORIES
} from '@/types/specifications';
import {
  VehicleCompatibilityFilter,
  BRAZILIAN_MAKES,
  FUEL_TYPES,
  VEHICLE_SEGMENTS
} from '@/types/vehicles';
import { generateFiltersFromProducts, filterProductsBySpecifications } from '@/utils/specifications';
import { filterProductsByVehicleCompatibility } from '@/utils/vehicles';
import type { Product } from '@moria/types';

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

export interface AdvancedFiltersProps {
  products: Product[];
  categories?: { id: string; name: string; count: number }[];
  brands?: { id: string; name: string; count: number }[];
  onFiltersChange: (filters: FilterState) => void;
  initialFilters?: Partial<FilterState>;
  showVehicleFilters?: boolean;
  showSpecificationFilters?: boolean;
  compact?: boolean;
  className?: string;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dimensions: Ruler,
  performance: Package,
  materials: Layers,
  compatibility: Car,
  electrical: Zap,
  fluid: Droplet,
  general: Settings2
};

export function AdvancedFilters({
  products,
  categories = [],
  brands = [],
  onFiltersChange,
  initialFilters = {},
  showVehicleFilters = true,
  showSpecificationFilters = true,
  compact = false,
  className = ''
}: AdvancedFiltersProps) {
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  // Filtros gerados dinamicamente dos produtos
  const generatedFilters = useMemo(() => {
    if (!showSpecificationFilters) return [];
    return generateFiltersFromProducts(products);
  }, [products, showSpecificationFilters]);

  // Filtros de especificações agrupados por categoria
  const specificationFiltersByCategory = useMemo(() => {
    const grouped: Record<string, SpecificationFilter[]> = {};

    generatedFilters.forEach(filter => {
      const category = SPECIFICATION_CATEGORIES.find(cat =>
        cat.productTypes.includes('all') ||
        products.some(p => p.category && cat.productTypes.includes(p.category))
      )?.id || 'general';

      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(filter);
    });

    return grouped;
  }, [generatedFilters, products]);

  // Calcular range de preços dos produtos
  const priceRange = useMemo(() => {
    if (!products.length) return { min: 0, max: 1000 };

    const prices = products.map(p => p.salePrice || p.price || 0).filter(p => p > 0);
    if (!prices.length) return { min: 0, max: 1000 };

    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices))
    };
  }, [products]);

  // Contar filtros ativos
  useEffect(() => {
    let count = 0;

    if (filters.category) count++;
    if (filters.subcategory) count++;
    if (filters.priceRange) count++;
    if (filters.brands?.length) count++;
    if (filters.inStock) count++;
    if (filters.onSale) count++;
    if (filters.specifications?.length) count += filters.specifications.length;
    if (filters.vehicleCompatibility) {
      if (filters.vehicleCompatibility.makeIds?.length) count++;
      if (filters.vehicleCompatibility.yearRange) count++;
      if (filters.vehicleCompatibility.fuelTypes?.length) count++;
    }
    if (filters.rating) count++;
    if (filters.tags?.length) count += filters.tags.length;
    if (filters.searchTerm) count++;

    setActiveFilterCount(count);
  }, [filters]);

  // Notificar mudanças nos filtros
  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const updateFilter = useCallback((key: keyof FilterState, value: FilterState[keyof FilterState]) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const addSpecificationFilter = useCallback((condition: SpecificationFilterCondition) => {
    setFilters(prev => ({
      ...prev,
      specifications: [...(prev.specifications || []), condition]
    }));
  }, []);

  const removeSpecificationFilter = useCallback((index: number) => {
    setFilters(prev => ({
      ...prev,
      specifications: prev.specifications?.filter((_, i) => i !== index) || []
    }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({});
  }, []);

  const clearFilter = useCallback((key: keyof FilterState) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  }, []);

  const renderBasicFilters = () => (
    <div className="space-y-4">
      {/* Busca */}
      <div className="space-y-2">
        <Label>Buscar produtos</Label>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Digite para buscar..."
            value={filters.searchTerm || ''}
            onChange={(e) => updateFilter('searchTerm', e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Categoria */}
      {categories.length > 0 && (
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select
            value={filters.category || ''}
            onValueChange={(value) => updateFilter('category', value || undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas as categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas as categorias</SelectItem>
              {categories.map(category => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name} ({category.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Marcas */}
      {brands.length > 0 && (
        <div className="space-y-3">
          <Label>Marcas</Label>
          <ScrollArea className="h-32">
            <div className="space-y-2">
              {brands.map(brand => (
                <div key={brand.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`brand-${brand.id}`}
                    checked={filters.brands?.includes(brand.id) || false}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        updateFilter('brands', [...(filters.brands || []), brand.id]);
                      } else {
                        updateFilter('brands', filters.brands?.filter(b => b !== brand.id) || []);
                      }
                    }}
                  />
                  <Label htmlFor={`brand-${brand.id}`} className="text-sm">
                    {brand.name} ({brand.count})
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Faixa de Preço */}
      <div className="space-y-3">
        <Label>Preço</Label>
        <div className="px-2">
          <Slider
            value={filters.priceRange || [priceRange.min, priceRange.max]}
            onValueChange={(value) => updateFilter('priceRange', value as [number, number])}
            max={priceRange.max}
            min={priceRange.min}
            step={10}
            className="w-full"
          />
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>R$ {filters.priceRange?.[0] || priceRange.min}</span>
          <span>R$ {filters.priceRange?.[1] || priceRange.max}</span>
        </div>
      </div>

      {/* Filtros booleanos */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Switch
            id="in-stock"
            checked={filters.inStock || false}
            onCheckedChange={(checked) => updateFilter('inStock', checked || undefined)}
          />
          <Label htmlFor="in-stock">Apenas em estoque</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="on-sale"
            checked={filters.onSale || false}
            onCheckedChange={(checked) => updateFilter('onSale', checked || undefined)}
          />
          <Label htmlFor="on-sale">Em promoção</Label>
        </div>
      </div>

      {/* Rating */}
      <div className="space-y-2">
        <Label>Avaliação mínima</Label>
        <RadioGroup
          value={filters.rating?.toString() || ''}
          onValueChange={(value) => updateFilter('rating', value ? parseInt(value) : undefined)}
        >
          {[5, 4, 3, 2, 1].map(rating => (
            <div key={rating} className="flex items-center space-x-2">
              <RadioGroupItem value={rating.toString()} id={`rating-${rating}`} />
              <Label htmlFor={`rating-${rating}`} className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
                  />
                ))}
                <span className="ml-1 text-sm">e acima</span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    </div>
  );

  const renderSpecificationFilters = () => {
    if (!showSpecificationFilters || !Object.keys(specificationFiltersByCategory).length) {
      return null;
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4" />
          <Label className="font-medium">Especificações Técnicas</Label>
        </div>

        <Accordion type="multiple" className="w-full">
          {Object.entries(specificationFiltersByCategory).map(([categoryId, categoryFilters]) => {
            const categoryInfo = SPECIFICATION_CATEGORIES.find(cat => cat.id === categoryId);
            const Icon = CATEGORY_ICONS[categoryId] || Settings2;

            return (
              <AccordionItem key={categoryId} value={categoryId}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span>{categoryInfo?.name || categoryId}</span>
                    <Badge variant="secondary">{categoryFilters.length}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    {categoryFilters.map(filter => renderSpecificationFilter(filter))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    );
  };

  const renderSpecificationFilter = (filter: SpecificationFilter) => {
    switch (filter.type) {
      case 'select':
        return (
          <div key={filter.key} className="space-y-2">
            <Label className="text-sm">{filter.name}</Label>
            <Select
              value={filters.specifications?.find(s => s.key === filter.key)?.value || ''}
              onValueChange={(value) => {
                if (value) {
                  removeSpecificationFilter(
                    filters.specifications?.findIndex(s => s.key === filter.key) || -1
                  );
                  addSpecificationFilter({
                    key: filter.key,
                    operator: 'eq',
                    value
                  });
                }
              }}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                {filter.values.map(value => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'multiselect':
        return (
          <div key={filter.key} className="space-y-2">
            <Label className="text-sm">{filter.name}</Label>
            <ScrollArea className="h-20">
              <div className="space-y-1">
                {filter.values.map(value => (
                  <div key={value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${filter.key}-${value}`}
                      checked={
                        filters.specifications?.some(s =>
                          s.key === filter.key &&
                          s.operator === 'in' &&
                          s.values?.includes(value)
                        ) || false
                      }
                      onCheckedChange={(checked) => {
                        const existingIndex = filters.specifications?.findIndex(s =>
                          s.key === filter.key && s.operator === 'in'
                        ) || -1;

                        if (existingIndex >= 0) {
                          const existing = filters.specifications![existingIndex];
                          const newValues = checked
                            ? [...(existing.values || []), value]
                            : (existing.values || []).filter(v => v !== value);

                          if (newValues.length > 0) {
                            const newSpec = { ...existing, values: newValues };
                            setFilters(prev => ({
                              ...prev,
                              specifications: prev.specifications?.map((s, i) =>
                                i === existingIndex ? newSpec : s
                              )
                            }));
                          } else {
                            removeSpecificationFilter(existingIndex);
                          }
                        } else if (checked) {
                          addSpecificationFilter({
                            key: filter.key,
                            operator: 'in',
                            values: [value]
                          });
                        }
                      }}
                    />
                    <Label htmlFor={`${filter.key}-${value}`} className="text-xs">
                      {value}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        );

      case 'range':
      case 'number':
        if (filter.min !== undefined && filter.max !== undefined) {
          const currentRange = filters.specifications?.find(s =>
            s.key === filter.key && s.operator === 'range'
          )?.values as [number, number] | undefined;

          return (
            <div key={filter.key} className="space-y-2">
              <Label className="text-sm">
                {filter.name}
                {filter.unit && ` (${filter.unit})`}
              </Label>
              <Slider
                value={currentRange || [filter.min, filter.max]}
                onValueChange={(value) => {
                  removeSpecificationFilter(
                    filters.specifications?.findIndex(s =>
                      s.key === filter.key && s.operator === 'range'
                    ) || -1
                  );
                  addSpecificationFilter({
                    key: filter.key,
                    operator: 'range',
                    values: value
                  });
                }}
                min={filter.min}
                max={filter.max}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{currentRange?.[0] || filter.min}</span>
                <span>{currentRange?.[1] || filter.max}</span>
              </div>
            </div>
          );
        }
        break;

      default:
        return null;
    }
  };

  const renderVehicleFilters = () => {
    if (!showVehicleFilters) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Car className="h-4 w-4" />
          <Label className="font-medium">Compatibilidade de Veículos</Label>
        </div>

        {/* Marcas de veículos */}
        <div className="space-y-2">
          <Label className="text-sm">Marca do Veículo</Label>
          <ScrollArea className="h-32">
            <div className="space-y-2">
              {BRAZILIAN_MAKES.filter(make => make.active).map(make => (
                <div key={make.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`vehicle-make-${make.id}`}
                    checked={filters.vehicleCompatibility?.makeIds?.includes(make.id) || false}
                    onCheckedChange={(checked) => {
                      const currentMakes = filters.vehicleCompatibility?.makeIds || [];
                      const newMakes = checked
                        ? [...currentMakes, make.id]
                        : currentMakes.filter(id => id !== make.id);

                      updateFilter('vehicleCompatibility', {
                        ...filters.vehicleCompatibility,
                        makeIds: newMakes.length > 0 ? newMakes : undefined
                      });
                    }}
                  />
                  <Label htmlFor={`vehicle-make-${make.id}`} className="text-xs">
                    {make.name}
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Ano do veículo */}
        <div className="space-y-2">
          <Label className="text-sm">Ano do Veículo</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="De"
              min={1990}
              max={new Date().getFullYear() + 1}
              value={filters.vehicleCompatibility?.yearRange?.[0] || ''}
              onChange={(e) => {
                const year = parseInt(e.target.value);
                if (year) {
                  updateFilter('vehicleCompatibility', {
                    ...filters.vehicleCompatibility,
                    yearRange: [year, filters.vehicleCompatibility?.yearRange?.[1] || year]
                  });
                }
              }}
            />
            <Input
              type="number"
              placeholder="Até"
              min={1990}
              max={new Date().getFullYear() + 1}
              value={filters.vehicleCompatibility?.yearRange?.[1] || ''}
              onChange={(e) => {
                const year = parseInt(e.target.value);
                if (year) {
                  updateFilter('vehicleCompatibility', {
                    ...filters.vehicleCompatibility,
                    yearRange: [filters.vehicleCompatibility?.yearRange?.[0] || year, year]
                  });
                }
              }}
            />
          </div>
        </div>

        {/* Combustível */}
        <div className="space-y-2">
          <Label className="text-sm">Combustível</Label>
          <div className="space-y-2">
            {FUEL_TYPES.map(fuelType => (
              <div key={fuelType.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`fuel-${fuelType.id}`}
                  checked={filters.vehicleCompatibility?.fuelTypes?.includes(fuelType.id) || false}
                  onCheckedChange={(checked) => {
                    const currentFuels = filters.vehicleCompatibility?.fuelTypes || [];
                    const newFuels = checked
                      ? [...currentFuels, fuelType.id]
                      : currentFuels.filter(id => id !== fuelType.id);

                    updateFilter('vehicleCompatibility', {
                      ...filters.vehicleCompatibility,
                      fuelTypes: newFuels.length > 0 ? newFuels : undefined
                    });
                  }}
                />
                <Label htmlFor={`fuel-${fuelType.id}`} className="text-xs">
                  {fuelType.name}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderActiveFilters = () => {
    if (activeFilterCount === 0) return null;

    const activeFilters: { key: string; label: string; onRemove: () => void }[] = [];

    if (filters.category) {
      const category = categories.find(c => c.id === filters.category);
      activeFilters.push({
        key: 'category',
        label: `Categoria: ${category?.name || filters.category}`,
        onRemove: () => clearFilter('category')
      });
    }

    if (filters.brands?.length) {
      filters.brands.forEach(brandId => {
        const brand = brands.find(b => b.id === brandId);
        activeFilters.push({
          key: `brand-${brandId}`,
          label: `Marca: ${brand?.name || brandId}`,
          onRemove: () => {
            updateFilter('brands', filters.brands?.filter(b => b !== brandId) || []);
          }
        });
      });
    }

    if (filters.priceRange) {
      activeFilters.push({
        key: 'price',
        label: `Preço: R$ ${filters.priceRange[0]} - R$ ${filters.priceRange[1]}`,
        onRemove: () => clearFilter('priceRange')
      });
    }

    if (filters.specifications?.length) {
      filters.specifications.forEach((spec, index) => {
        activeFilters.push({
          key: `spec-${index}`,
          label: `${spec.key}: ${spec.value || spec.values?.join(', ')}`,
          onRemove: () => removeSpecificationFilter(index)
        });
      });
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Filtros ativos ({activeFilterCount})</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-6 px-2 text-xs"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Limpar todos
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeFilters.map(filter => (
            <Badge
              key={filter.key}
              variant="secondary"
              className="text-xs flex items-center gap-1"
            >
              {filter.label}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={filter.onRemove}
              />
            </Badge>
          ))}
        </div>
      </div>
    );
  };

  if (compact) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtros
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {activeFilterCount}
                  </Badge>
                )}
              </div>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="mt-2">
              <CardContent className="p-4 space-y-4">
                {renderActiveFilters()}
                <Separator />
                {renderBasicFilters()}
                {renderSpecificationFilters()}
                {renderVehicleFilters()}
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {renderActiveFilters()}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros Avançados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {renderBasicFilters()}

          <Separator />

          {renderSpecificationFilters()}

          <Separator />

          {renderVehicleFilters()}
        </CardContent>
      </Card>
    </div>
  );
}