import { useState } from 'react';
import { ClipboardCheck, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, XCircle, MinusCircle, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { cn } from '../../lib/utils';
import { useRevisions } from '../../contexts/RevisionsContext';
import { ItemStatus, RevisionChecklistItem } from '../../types/revisions';

interface RevisionChecklistProps {
  revisionItems: RevisionChecklistItem[];
  onUpdateItem: (itemId: string, updates: Partial<RevisionChecklistItem>) => void;
}

const statusConfig = {
  [ItemStatus.NOT_CHECKED]: {
    icon: Circle,
    label: 'Não verificado',
    color: 'text-gray-400',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300'
  },
  [ItemStatus.OK]: {
    icon: CheckCircle2,
    label: 'OK',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300'
  },
  [ItemStatus.ATTENTION]: {
    icon: AlertTriangle,
    label: 'Atenção',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300'
  },
  [ItemStatus.CRITICAL]: {
    icon: XCircle,
    label: 'Crítico',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300'
  },
  [ItemStatus.NOT_APPLICABLE]: {
    icon: MinusCircle,
    label: 'Não se aplica',
    color: 'text-gray-500',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-300'
  }
};

export function RevisionChecklist({ revisionItems, onUpdateItem }: RevisionChecklistProps) {
  const { categories } = useRevisions();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editingNotes, setEditingNotes] = useState<string | null>(null);

  console.log('RevisionChecklist received items:', revisionItems);
  console.log('Categories:', categories);

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const getItemStatus = (itemId: string): RevisionChecklistItem | undefined => {
    return revisionItems.find(item => item.itemId === itemId);
  };

  const handleStatusChange = (itemId: string, status: ItemStatus) => {
    onUpdateItem(itemId, {
      status,
      checkedAt: new Date(),
      checkedBy: 'Lojista' // Em produção, seria o usuário autenticado
    });
  };

  const handleNotesChange = (itemId: string, notes: string) => {
    onUpdateItem(itemId, { notes });
  };

  const getCategoryProgress = (categoryId: string) => {
    const categoryItems = categories.find(cat => cat.id === categoryId)?.items.filter(item => item.isEnabled) || [];
    const checkedItems = categoryItems.filter(item => {
      const status = getItemStatus(item.id);
      return status && status.status !== ItemStatus.NOT_CHECKED;
    });
    return {
      checked: checkedItems.length,
      total: categoryItems.length,
      percentage: categoryItems.length > 0 ? Math.round((checkedItems.length / categoryItems.length) * 100) : 0
    };
  };

  // Ordenar categorias habilitadas
  const enabledCategories = categories
    .filter(cat => cat.isEnabled)
    .sort((a, b) => a.order - b.order);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <ClipboardCheck className="h-4 w-4 sm:h-5 sm:w-5" />
          Checklist de Revisão
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6">
        {enabledCategories.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <ClipboardCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma categoria habilitada</p>
          </div>
        ) : (
          enabledCategories.map(category => {
            const isExpanded = expandedCategories.has(category.id);
            const progress = getCategoryProgress(category.id);
            const enabledItems = category.items
              .filter(item => item.isEnabled)
              .sort((a, b) => a.order - b.order);

            return (
              <Card key={category.id} className="border-2">
                <CardHeader
                  className="cursor-pointer hover:bg-gray-50 transition-colors p-3 sm:p-6"
                  onClick={() => toggleCategory(category.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <span className="text-xl sm:text-2xl flex-shrink-0">{category.icon}</span>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm sm:text-lg truncate">{category.name}</h3>
                        {category.description && (
                          <p className="text-xs sm:text-sm text-gray-600 truncate">{category.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-xs sm:text-sm font-medium whitespace-nowrap">
                          {progress.checked} / {progress.total}
                        </div>
                        <div className="text-xs text-gray-500 whitespace-nowrap">
                          {progress.percentage}%
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5" />
                      ) : (
                        <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5" />
                      )}
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                    <div
                      className="bg-moria-orange h-1.5 sm:h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="space-y-2 sm:space-y-3 pt-3 sm:pt-4 px-3 sm:px-6">
                    {enabledItems.length === 0 ? (
                      <p className="text-xs sm:text-sm text-gray-500 text-center py-3 sm:py-4">
                        Nenhum item habilitado nesta categoria
                      </p>
                    ) : (
                      enabledItems.map(item => {
                        const foundStatus = getItemStatus(item.id);
                        console.log(`Item ${item.name} (${item.id}):`, foundStatus ? `Found with status ${foundStatus.status}` : 'Not found, using NOT_CHECKED');
                        const itemStatus = foundStatus || {
                          itemId: item.id,
                          status: ItemStatus.NOT_CHECKED
                        };
                        const config = statusConfig[itemStatus.status];
                        const StatusIcon = config.icon;

                        return (
                          <Card
                            key={item.id}
                            className={cn(
                              'border-2 transition-all',
                              config.borderColor,
                              config.bgColor
                            )}
                          >
                            <CardContent className="p-2.5 sm:p-4 space-y-2 sm:space-y-3">
                              <div className="flex items-start justify-between gap-2 sm:gap-4">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-sm sm:text-base">{item.name}</h4>
                                  {item.description && (
                                    <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                                <StatusIcon className={cn('h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0', config.color)} />
                              </div>

                              {/* Status Buttons */}
                              <div className="flex gap-1 sm:gap-2 flex-wrap">
                                {Object.entries(statusConfig).map(([status, conf]) => {
                                  const Icon = conf.icon;
                                  const isActive = itemStatus.status === status;

                                  return (
                                    <Button
                                      key={status}
                                      size="sm"
                                      variant={isActive ? 'default' : 'outline'}
                                      onClick={() => handleStatusChange(item.id, status as ItemStatus)}
                                      className={cn(
                                        'text-xs h-7 sm:h-8 px-2 sm:px-3',
                                        isActive && conf.bgColor,
                                        isActive && conf.color,
                                        isActive && 'border-2',
                                        isActive && conf.borderColor
                                      )}
                                    >
                                      <Icon className="h-3 w-3 sm:mr-1" />
                                      <span className="hidden sm:inline">{conf.label}</span>
                                      <span className="sm:hidden ml-1">{conf.label}</span>
                                    </Button>
                                  );
                                })}
                              </div>

                              {/* Notes */}
                              {itemStatus.status !== ItemStatus.NOT_CHECKED && (
                                <div className="space-y-1.5 sm:space-y-2">
                                  {editingNotes === item.id ? (
                                    <>
                                      <Textarea
                                        value={itemStatus.notes || ''}
                                        onChange={(e) => handleNotesChange(item.id, e.target.value)}
                                        placeholder="Adicionar observações..."
                                        rows={2}
                                        className="text-xs sm:text-sm"
                                      />
                                      <div className="flex gap-1.5 sm:gap-2">
                                        <Button
                                          size="sm"
                                          onClick={() => setEditingNotes(null)}
                                          className="bg-moria-orange hover:bg-moria-orange/90 h-7 sm:h-8 text-xs"
                                        >
                                          Salvar
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setEditingNotes(null)}
                                          className="h-7 sm:h-8 text-xs"
                                        >
                                          Cancelar
                                        </Button>
                                      </div>
                                    </>
                                  ) : (
                                    <div>
                                      {itemStatus.notes ? (
                                        <div
                                          className="text-xs sm:text-sm text-gray-700 p-1.5 sm:p-2 bg-white rounded border cursor-pointer hover:border-moria-orange"
                                          onClick={() => setEditingNotes(item.id)}
                                        >
                                          {itemStatus.notes}
                                        </div>
                                      ) : (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setEditingNotes(item.id)}
                                          className="text-xs h-7 sm:h-8"
                                        >
                                          Adicionar observações
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Timestamp */}
                              {itemStatus.checkedAt && (
                                <p className="text-xs text-gray-500">
                                  Verificado em: {new Date(itemStatus.checkedAt).toLocaleString('pt-BR')}
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
