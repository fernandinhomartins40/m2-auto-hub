// src/components/SmartFilters.tsx - Filtros inteligentes que se adaptam ao contexto

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sparkles,
  TrendingUp,
  Clock,
  Users,
  Target,
  Brain,
  Lightbulb,
  Filter,
  Search,
  Star
} from 'lucide-react';

import { AdvancedFilters, FilterState } from './AdvancedFilters';
import { useAdvancedFilters } from '@/hooks/useAdvancedFilters';
import { useAuth } from '@/contexts/AuthContext';

interface SmartSuggestion {
  id: string;
  type: 'popular' | 'trending' | 'personalized' | 'seasonal' | 'similar_users';
  title: string;
  description: string;
  filters: Partial<FilterState>;
  confidence: number; // 0-1
  reason: string;
  icon: React.ComponentType;
}

interface FilterableProduct {
  id: string;
  name: string;
  category?: string;
  price?: number;
  [key: string]: unknown;
}

interface UserBehavior {
  viewedCategories: Record<string, number>;
  searchedTerms: string[];
  appliedFilters: Record<string, number>;
  purchaseHistory: {
    categories: string[];
    brands: string[];
    priceRanges: [number, number][];
  };
  sessionData: {
    timeSpent: number;
    productsViewed: string[];
    cartAdditions: string[];
  };
}

export interface SmartFiltersProps {
  products: FilterableProduct[];
  onFiltersChange: (filters: FilterState, results: FilterableProduct[]) => void;
  initialFilters?: Partial<FilterState>;
  showVehicleFilters?: boolean;
  showSpecificationFilters?: boolean;
  enablePersonalization?: boolean;
  enableTrendingAnalysis?: boolean;
  className?: string;
}

export function SmartFilters({
  products,
  onFiltersChange,
  initialFilters = {},
  showVehicleFilters = true,
  showSpecificationFilters = true,
  enablePersonalization = true,
  enableTrendingAnalysis = true,
  className = ''
}: SmartFiltersProps) {
  const { customer, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'filters' | 'suggestions' | 'insights'>('filters');
  const [userBehavior, setUserBehavior] = useState<UserBehavior>({
    viewedCategories: {},
    searchedTerms: [],
    appliedFilters: {},
    purchaseHistory: { categories: [], brands: [], priceRanges: [] },
    sessionData: { timeSpent: 0, productsViewed: [], cartAdditions: [] }
  });

  const {
    filters,
    setFilters,
    filteredProducts,
    metadata,
    filterUsageStats
  } = useAdvancedFilters(products, {
    defaultFilters: initialFilters,
    onFiltersChange,
    persistFilters: true
  });

  // Gerar sugestões inteligentes
  const smartSuggestions = useMemo((): SmartSuggestion[] => {
    const suggestions: SmartSuggestion[] = [];

    // Sugestões baseadas em popularidade
    if (enableTrendingAnalysis) {
      const popularCategories = metadata.categories
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      popularCategories.forEach(category => {
        suggestions.push({
          id: `popular-${category.id}`,
          type: 'popular',
          title: `${category.name} - Categoria Popular`,
          description: `${category.count} produtos disponíveis`,
          filters: { category: category.id },
          confidence: 0.8,
          reason: 'Categoria com mais produtos',
          icon: TrendingUp
        });
      });
    }

    // Sugestões personalizadas baseadas no histórico
    if (enablePersonalization && customer) {
      // Baseado nas categorias mais visualizadas
      const topViewedCategories = Object.entries(userBehavior.viewedCategories)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 2);

      topViewedCategories.forEach(([category, count]) => {
        suggestions.push({
          id: `personalized-${category}`,
          type: 'personalized',
          title: `Mais ${category}`,
          description: 'Baseado no seu histórico de navegação',
          filters: { category },
          confidence: 0.9,
          reason: `Você visualizou ${count} produtos desta categoria`,
          icon: Users
        });
      });

      // Sugestões baseadas em compras anteriores
      if (userBehavior.purchaseHistory.brands.length > 0) {
        const favoriteBrand = userBehavior.purchaseHistory.brands[0];
        suggestions.push({
          id: `brand-loyalty-${favoriteBrand}`,
          type: 'personalized',
          title: `Produtos ${favoriteBrand}`,
          description: 'Sua marca favorita',
          filters: { brands: [favoriteBrand] },
          confidence: 0.85,
          reason: 'Baseado nas suas compras anteriores',
          icon: Star
        });
      }
    }

    // Sugestões sazonais/contextuais
    const currentMonth = new Date().getMonth();
    if (currentMonth >= 5 && currentMonth <= 7) { // Inverno
      suggestions.push({
        id: 'seasonal-winter',
        type: 'seasonal',
        title: 'Produtos para o Inverno',
        description: 'Itens essenciais para a estação fria',
        filters: { tags: ['inverno', 'frio'] },
        confidence: 0.7,
        reason: 'Produtos sazonais para o inverno',
        icon: Target
      });
    }

    // Sugestões baseadas em produtos similares (comportamento de outros usuários)
    const currentFilters = Object.keys(filters).length;
    if (currentFilters > 0) {
      suggestions.push({
        id: 'similar-users',
        type: 'similar_users',
        title: 'Usuários com filtros similares também viram',
        description: 'Baseado em comportamento de usuários similares',
        filters: { onSale: true },
        confidence: 0.6,
        reason: 'Análise de comportamento colaborativo',
        icon: Users
      });
    }

    // Sugestões baseadas em tendências de preço
    const avgPrice = products.reduce((sum, p) => sum + (p.salePrice || p.price || 0), 0) / products.length;
    suggestions.push({
      id: 'price-trend',
      type: 'trending',
      title: 'Produtos com Melhor Custo-Benefício',
      description: 'Produtos bem avaliados com preço atrativo',
      filters: {
        priceRange: [0, avgPrice * 1.2] as [number, number],
        rating: 4
      },
      confidence: 0.75,
      reason: 'Análise de preço vs. avaliação',
      icon: Target
    });

    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 8);
  }, [products, metadata, userBehavior, filters, customer, enablePersonalization, enableTrendingAnalysis]);

  // Insights de filtros
  const filterInsights = useMemo(() => {
    const insights = [];

    // Análise de efetividade dos filtros
    const filterEffectiveness = Object.entries(filterUsageStats)
      .map(([filter, usage]) => ({
        filter,
        usage,
        effectiveness: (metadata.filteredCount / metadata.totalProducts) * usage
      }))
      .sort((a, b) => b.effectiveness - a.effectiveness);

    if (filterEffectiveness.length > 0) {
      insights.push({
        title: 'Filtro Mais Efetivo',
        description: `O filtro "${filterEffectiveness[0].filter}" está ajudando a encontrar produtos mais relevantes`,
        type: 'effectiveness'
      });
    }

    // Análise de cobertura
    const coverageRatio = metadata.filteredCount / metadata.totalProducts;
    if (coverageRatio < 0.1) {
      insights.push({
        title: 'Filtros Muito Restritivos',
        description: 'Considere remover alguns filtros para ver mais opções',
        type: 'coverage'
      });
    } else if (coverageRatio > 0.8) {
      insights.push({
        title: 'Adicione Mais Filtros',
        description: 'Refine sua busca para encontrar produtos mais específicos',
        type: 'coverage'
      });
    }

    // Sugestão de filtros relacionados
    if (filters.category && !filters.subcategory) {
      insights.push({
        title: 'Refine por Subcategoria',
        description: `Especifique melhor sua busca em ${filters.category}`,
        type: 'refinement'
      });
    }

    return insights;
  }, [filterUsageStats, metadata, filters]);

  // Aplicar sugestão
  const applySuggestion = (suggestion: SmartSuggestion) => {
    setFilters(suggestion.filters);

    // Registrar aplicação da sugestão
    setUserBehavior(prev => ({
      ...prev,
      appliedFilters: {
        ...prev.appliedFilters,
        [suggestion.id]: (prev.appliedFilters[suggestion.id] || 0) + 1
      }
    }));
  };

  // Registrar comportamento do usuário
  useEffect(() => {
    const timer = setInterval(() => {
      setUserBehavior(prev => ({
        ...prev,
        sessionData: {
          ...prev.sessionData,
          timeSpent: prev.sessionData.timeSpent + 1
        }
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const renderSuggestions = () => (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-3">
        {smartSuggestions.map(suggestion => (
          <Card
            key={suggestion.id}
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => applySuggestion(suggestion)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <suggestion.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm">{suggestion.title}</h4>
                    <Badge
                      variant="outline"
                      className="text-xs"
                    >
                      {Math.round(suggestion.confidence * 100)}%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {suggestion.description}
                  </p>
                  <p className="text-xs text-muted-foreground italic">
                    {suggestion.reason}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {smartSuggestions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Navegue mais para receber sugestões personalizadas</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );

  const renderInsights = () => (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-4">
        {/* Estatísticas gerais */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h4 className="font-medium">Estatísticas dos Filtros</h4>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total de produtos:</span>
                <div className="font-medium">{metadata.totalProducts.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Produtos filtrados:</span>
                <div className="font-medium">{metadata.filteredCount.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Filtros ativos:</span>
                <div className="font-medium">{metadata.activeFilterCount}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Taxa de filtragem:</span>
                <div className="font-medium">
                  {((metadata.filteredCount / metadata.totalProducts) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Insights */}
        {filterInsights.map((insight, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-4 w-4 text-yellow-500 mt-1" />
                <div>
                  <h4 className="font-medium text-sm">{insight.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {insight.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Uso de filtros */}
        {Object.keys(filterUsageStats).length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-primary" />
                <h4 className="font-medium">Filtros Mais Usados</h4>
              </div>
              <div className="space-y-2">
                {Object.entries(filterUsageStats)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([filter, count]) => (
                    <div key={filter} className="flex justify-between items-center text-sm">
                      <span className="capitalize">{filter}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Filtros Inteligentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'filters' | 'suggestions' | 'trending')}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="filters" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtros
              </TabsTrigger>
              <TabsTrigger value="suggestions" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Sugestões
                {smartSuggestions.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {smartSuggestions.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="insights" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Insights
              </TabsTrigger>
            </TabsList>

            <TabsContent value="filters" className="mt-4">
              <AdvancedFilters
                products={products}
                categories={metadata.categories}
                brands={metadata.brands}
                onFiltersChange={onFiltersChange}
                initialFilters={filters}
                showVehicleFilters={showVehicleFilters}
                showSpecificationFilters={showSpecificationFilters}
                compact={true}
              />
            </TabsContent>

            <TabsContent value="suggestions" className="mt-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4" />
                  Clique em uma sugestão para aplicar os filtros automaticamente
                </div>
                {renderSuggestions()}
              </div>
            </TabsContent>

            <TabsContent value="insights" className="mt-4">
              {renderInsights()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}