// src/components/ProductSpecifications.tsx - Componente para exibir especificações técnicas

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ChevronDown,
  ChevronUp,
  Info,
  Ruler,
  Gauge,
  Layers,
  Car,
  Zap,
  Droplet,
  Settings
} from "lucide-react";
import {
  SpecificationValue,
  SPECIFICATION_CATEGORIES,
  COMMON_SPECIFICATIONS
} from "@/types/specifications";
import {
  parseSpecifications,
  formatSpecificationValue,
  groupSpecificationsByCategory
} from "@/utils/specifications";

interface ProductSpecificationsProps {
  specifications: string | SpecificationValue[];
  productName?: string;
  compact?: boolean;
  showCategories?: boolean;
  className?: string;
}

const CATEGORY_ICONS: Record<string, React.ComponentType> = {
  dimensions: Ruler,
  performance: Gauge,
  materials: Layers,
  compatibility: Car,
  electrical: Zap,
  fluid: Droplet,
  general: Settings
};

export function ProductSpecifications({
  specifications,
  productName = "produto",
  compact = false,
  showCategories = true,
  className = ""
}: ProductSpecificationsProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grouped' | 'list' | 'table'>('grouped');

  // Parse das especificações
  const parsedSpecs = typeof specifications === 'string'
    ? parseSpecifications(specifications)
    : specifications || [];

  if (!parsedSpecs.length) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Nenhuma especificação técnica disponível para este produto.</p>
        </CardContent>
      </Card>
    );
  }

  // Agrupar por categoria
  const groupedSpecs = groupSpecificationsByCategory(parsedSpecs);
  const categories = Object.keys(groupedSpecs).sort((a, b) => {
    const catA = SPECIFICATION_CATEGORIES.find(cat => cat.id === a);
    const catB = SPECIFICATION_CATEGORIES.find(cat => cat.id === b);
    return (catA?.order || 999) - (catB?.order || 999);
  });

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const getCategoryInfo = (categoryId: string) => {
    return SPECIFICATION_CATEGORIES.find(cat => cat.id === categoryId) || {
      id: categoryId,
      name: categoryId.charAt(0).toUpperCase() + categoryId.slice(1),
      order: 999
    };
  };

  const renderSpecificationValue = (spec: SpecificationValue) => {
    const definition = COMMON_SPECIFICATIONS[spec.key];
    const displayValue = spec.displayValue || formatSpecificationValue(spec.key, spec.value, spec.unit);

    return (
      <div key={spec.key} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
        <div className="space-y-1">
          <span className="font-medium text-sm">
            {definition?.name || spec.key}
          </span>
          {definition?.description && (
            <p className="text-xs text-muted-foreground">
              {definition.description}
            </p>
          )}
        </div>
        <div className="text-right">
          <span className="font-medium">{displayValue}</span>
          {definition?.unit && spec.unit && spec.unit !== definition.unit && (
            <span className="text-xs text-muted-foreground ml-1">
              (orig: {spec.unit})
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderGroupedView = () => (
    <div className="space-y-4">
      {categories.map(categoryId => {
        const categoryInfo = getCategoryInfo(categoryId);
        const specs = groupedSpecs[categoryId];
        const Icon = CATEGORY_ICONS[categoryId] || Settings;

        if (compact) {
          return (
            <Accordion key={categoryId} type="single" collapsible>
              <AccordionItem value={categoryId}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span>{categoryInfo.name}</span>
                    <Badge variant="secondary" className="ml-2">
                      {specs.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pt-2">
                    {specs.map(spec => renderSpecificationValue(spec))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          );
        }

        return (
          <Card key={categoryId}>
            <CardHeader
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => toggleCategory(categoryId)}
            >
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  <span>{categoryInfo.name}</span>
                  <Badge variant="secondary">
                    {specs.length}
                  </Badge>
                </div>
                {expandedCategories.includes(categoryId) ?
                  <ChevronUp className="h-5 w-5" /> :
                  <ChevronDown className="h-5 w-5" />
                }
              </CardTitle>
              {categoryInfo.description && (
                <p className="text-sm text-muted-foreground">
                  {categoryInfo.description}
                </p>
              )}
            </CardHeader>
            {expandedCategories.includes(categoryId) && (
              <CardContent className="pt-0">
                <div className="space-y-1">
                  {specs.map(spec => renderSpecificationValue(spec))}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );

  const renderListView = () => (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-1">
          {parsedSpecs.map(spec => renderSpecificationValue(spec))}
        </div>
      </CardContent>
    </Card>
  );

  const renderTableView = () => (
    <Card>
      <CardContent className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Especificação</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Categoria</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parsedSpecs.map(spec => {
              const definition = COMMON_SPECIFICATIONS[spec.key];
              const categoryInfo = getCategoryInfo(definition?.category || 'general');
              const displayValue = spec.displayValue || formatSpecificationValue(spec.key, spec.value, spec.unit);

              return (
                <TableRow key={spec.key}>
                  <TableCell>
                    <div className="space-y-1">
                      <span className="font-medium">
                        {definition?.name || spec.key}
                      </span>
                      {definition?.description && (
                        <p className="text-xs text-muted-foreground">
                          {definition.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {displayValue}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {categoryInfo.name}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  if (compact) {
    return (
      <div className={className}>
        {renderGroupedView()}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold">Especificações Técnicas</h3>
          <p className="text-sm text-muted-foreground">
            Detalhes técnicos de {productName}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grouped' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grouped')}
          >
            Agrupado
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            Lista
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
          >
            Tabela
          </Button>
        </div>
      </div>

      {viewMode === 'grouped' && renderGroupedView()}
      {viewMode === 'list' && renderListView()}
      {viewMode === 'table' && renderTableView()}
    </div>
  );
}