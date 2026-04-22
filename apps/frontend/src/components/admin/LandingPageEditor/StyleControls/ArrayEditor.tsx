/**
 * ArrayEditor - Editor genérico para arrays de objetos
 */

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface ArrayEditorProps<T> {
  label: string;
  items: T[];
  onChange: (items: T[]) => void;
  renderItem: (item: T, index: number, updateItem: (updates: Partial<T>) => void) => React.ReactNode;
  createNew: () => T;
  getItemLabel?: (item: T, index: number) => string;
  description?: string;
  maxItems?: number;
}

export function ArrayEditor<T extends { id: string }>({
  label,
  items,
  onChange,
  renderItem,
  createNew,
  getItemLabel = (_, index) => `Item ${index + 1}`,
  description,
  maxItems,
}: ArrayEditorProps<T>) {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Proteção contra undefined - garantir que items seja sempre um array
  const safeItems = items || [];

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const addItem = () => {
    if (maxItems && safeItems.length >= maxItems) {
      alert(`Máximo de ${maxItems} itens permitidos`);
      return;
    }

    const newItem = createNew();
    onChange([...safeItems, newItem]);
    setExpandedItems((prev) => [...prev, newItem.id]);
  };

  const removeItem = (index: number) => {
    const newItems = safeItems.filter((_, i) => i !== index);
    onChange(newItems);
  };

  const updateItem = (index: number, updates: Partial<T>) => {
    const newItems = [...safeItems];
    newItems[index] = { ...newItems[index], ...updates };
    onChange(newItems);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= safeItems.length) return;

    const newItems = [...safeItems];
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    onChange(newItems);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label>{label}</Label>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
        <Button onClick={addItem} size="sm" disabled={maxItems ? safeItems.length >= maxItems : false}>
          <Plus className="h-4 w-4 mr-1" />
          Adicionar
        </Button>
      </div>

      <div className="space-y-2">
        {safeItems.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhum item adicionado</p>
            <Button onClick={addItem} variant="outline" size="sm" className="mt-4">
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Primeiro Item
            </Button>
          </Card>
        ) : (
          safeItems.map((item, index) => {
            const isExpanded = expandedItems.includes(item.id);

            return (
              <Card key={item.id} className="overflow-hidden">
                <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(item.id)}>
                  <div className="flex items-center gap-2 p-3 bg-muted/50">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />

                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="flex-1 justify-start">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 mr-2" />
                        ) : (
                          <ChevronDown className="h-4 w-4 mr-2" />
                        )}
                        <span className="font-medium">{getItemLabel(item, index)}</span>
                      </Button>
                    </CollapsibleTrigger>

                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => moveItem(index, 'up')}
                        disabled={index === 0}
                        className="h-8 w-8"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => moveItem(index, 'down')}
                        disabled={index === safeItems.length - 1}
                        className="h-8 w-8"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm('Deseja realmente remover este item?')) {
                            removeItem(index);
                          }
                        }}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <CollapsibleContent>
                    <div className="p-4 space-y-4 border-t">
                      {renderItem(item, index, (updates) => updateItem(index, updates))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })
        )}
      </div>

      {maxItems && (
        <p className="text-xs text-muted-foreground text-right">
          {safeItems.length} / {maxItems} itens
        </p>
      )}
    </div>
  );
}
