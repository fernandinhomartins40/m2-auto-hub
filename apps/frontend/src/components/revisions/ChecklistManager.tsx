import { useState } from 'react';
import { Settings, Plus, Edit, Trash2, Eye, EyeOff, GripVertical } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { useRevisions } from '../../contexts/RevisionsContext';
import { cn } from '../../lib/utils';
import { ChecklistCategory, ChecklistItem } from '../../types/revisions';

export function ChecklistManager() {
  const {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    toggleCategoryEnabled,
    addItemToCategory,
    updateItem,
    deleteItem,
    toggleItemEnabled
  } = useRevisions();

  const [isOpen, setIsOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ChecklistCategory | null>(null);
  const [editingItem, setEditingItem] = useState<{ category: ChecklistCategory; item: ChecklistItem } | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState<string | null>(null);

  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    icon: '🔧'
  });

  const [newItem, setNewItem] = useState({
    name: '',
    description: ''
  });

  const handleAddCategory = () => {
    if (!newCategory.name) {
      alert('Digite o nome da categoria');
      return;
    }

    const maxOrder = Math.max(...categories.map(c => c.order), 0);
    addCategory({
      ...newCategory,
      isDefault: false,
      isEnabled: true,
      order: maxOrder + 1,
      items: []
    });

    setNewCategory({ name: '', description: '', icon: '🔧' });
    setIsAddingCategory(false);
  };

  const handleUpdateCategory = () => {
    if (!editingCategory) return;

    updateCategory(editingCategory.id, {
      name: editingCategory.name,
      description: editingCategory.description,
      icon: editingCategory.icon
    });

    setEditingCategory(null);
  };

  const handleDeleteCategory = (categoryId: string, isDefault: boolean) => {
    if (isDefault) {
      alert('Categorias padrão não podem ser excluídas. Use o botão de visibilidade para desabilitá-las.');
      return;
    }

    if (confirm('Deseja realmente excluir esta categoria e todos os seus itens?')) {
      deleteCategory(categoryId);
    }
  };

  const handleAddItem = (categoryId: string) => {
    if (!newItem.name) {
      alert('Digite o nome do item');
      return;
    }

    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    const maxOrder = Math.max(...category.items.map(i => i.order), 0);
    addItemToCategory(categoryId, {
      ...newItem,
      isDefault: false,
      isEnabled: true,
      order: maxOrder + 1
    });

    setNewItem({ name: '', description: '' });
    setIsAddingItem(null);
  };

  const handleUpdateItem = () => {
    if (!editingItem) return;

    updateItem(editingItem.category.id, editingItem.item.id, {
      name: editingItem.item.name,
      description: editingItem.item.description
    });

    setEditingItem(null);
  };

  const handleDeleteItem = (categoryId: string, itemId: string, isDefault: boolean) => {
    if (isDefault) {
      alert('Itens padrão não podem ser excluídos. Use o botão de visibilidade para desabilitá-los.');
      return;
    }

    if (confirm('Deseja realmente excluir este item?')) {
      deleteItem(categoryId, itemId);
    }
  };

  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="border-moria-orange text-moria-orange hover:bg-moria-orange hover:text-white"
      >
        <Settings className="h-4 w-4 mr-2" />
        Gerenciar Checklist
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Gerenciar Categorias e Itens do Checklist
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Add Category Button */}
            {!isAddingCategory && (
              <Button
                onClick={() => setIsAddingCategory(true)}
                className="w-full bg-moria-orange hover:bg-moria-orange/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Categoria Personalizada
              </Button>
            )}

            {/* Add Category Form */}
            {isAddingCategory && (
              <Card className="border-2 border-moria-orange">
                <CardHeader>
                  <CardTitle>Nova Categoria</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome *</Label>
                    <Input
                      value={newCategory.name}
                      onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                      placeholder="Ex: Sistema de Transmissão"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea
                      value={newCategory.description}
                      onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                      placeholder="Descrição da categoria..."
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ícone (Emoji)</Label>
                    <Input
                      value={newCategory.icon}
                      onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                      placeholder="🔧"
                      maxLength={2}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddCategory} className="bg-moria-orange hover:bg-moria-orange/90">
                      Adicionar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsAddingCategory(false);
                        setNewCategory({ name: '', description: '', icon: '🔧' });
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Categories List */}
            <div className="space-y-4">
              {sortedCategories.map((category) => (
                <Card key={category.id} className={cn('border-2', !category.isEnabled && 'opacity-50')}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <GripVertical className="h-5 w-5 text-gray-400 mt-1" />
                        <div className="flex items-start gap-3 flex-1">
                          <span className="text-2xl">{category.icon}</span>
                          <div className="flex-1">
                            {editingCategory?.id === category.id ? (
                              <div className="space-y-2">
                                <Input
                                  value={editingCategory.name}
                                  onChange={(e) =>
                                    setEditingCategory({ ...editingCategory, name: e.target.value })
                                  }
                                />
                                <Input
                                  value={editingCategory.description || ''}
                                  onChange={(e) =>
                                    setEditingCategory({ ...editingCategory, description: e.target.value })
                                  }
                                  placeholder="Descrição"
                                />
                                <Input
                                  value={editingCategory.icon || ''}
                                  onChange={(e) =>
                                    setEditingCategory({ ...editingCategory, icon: e.target.value })
                                  }
                                  placeholder="Ícone"
                                  maxLength={2}
                                  className="w-20"
                                />
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={handleUpdateCategory}>
                                    Salvar
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => setEditingCategory(null)}>
                                    Cancelar
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                  {category.name}
                                  {category.isDefault && (
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                      Padrão
                                    </span>
                                  )}
                                </h3>
                                {category.description && (
                                  <p className="text-sm text-gray-600">{category.description}</p>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleCategoryEnabled(category.id)}
                          title={category.isEnabled ? 'Desabilitar' : 'Habilitar'}
                        >
                          {category.isEnabled ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </Button>
                        {editingCategory?.id !== category.id && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingCategory(category)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {!category.isDefault && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteCategory(category.id, category.isDefault)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-2">
                    {/* Items */}
                    {category.items
                      .sort((a, b) => a.order - b.order)
                      .map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            'flex items-center justify-between gap-4 p-2 rounded border',
                            !item.isEnabled && 'opacity-50'
                          )}
                        >
                          <div className="flex-1">
                            {editingItem?.item.id === item.id ? (
                              <div className="space-y-2">
                                <Input
                                  value={editingItem.item.name}
                                  onChange={(e) =>
                                    setEditingItem({
                                      ...editingItem,
                                      item: { ...editingItem.item, name: e.target.value }
                                    })
                                  }
                                />
                                <Input
                                  value={editingItem.item.description || ''}
                                  onChange={(e) =>
                                    setEditingItem({
                                      ...editingItem,
                                      item: { ...editingItem.item, description: e.target.value }
                                    })
                                  }
                                  placeholder="Descrição"
                                />
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={handleUpdateItem}>
                                    Salvar
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => setEditingItem(null)}>
                                    Cancelar
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="font-medium text-sm flex items-center gap-2">
                                  {item.name}
                                  {item.isDefault && (
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                      Padrão
                                    </span>
                                  )}
                                </p>
                                {item.description && (
                                  <p className="text-xs text-gray-600">{item.description}</p>
                                )}
                              </>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleItemEnabled(category.id, item.id)}
                              title={item.isEnabled ? 'Desabilitar' : 'Habilitar'}
                            >
                              {item.isEnabled ? (
                                <Eye className="h-3 w-3" />
                              ) : (
                                <EyeOff className="h-3 w-3" />
                              )}
                            </Button>
                            {editingItem?.item.id !== item.id && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingItem({ category, item })}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            )}
                            {!item.isDefault && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteItem(category.id, item.id, item.isDefault)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}

                    {/* Add Item Form */}
                    {isAddingItem === category.id ? (
                      <Card className="border-2 border-moria-orange/30 bg-moria-orange/5">
                        <CardContent className="p-3 space-y-2">
                          <Input
                            value={newItem.name}
                            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                            placeholder="Nome do item *"
                            size={1}
                          />
                          <Input
                            value={newItem.description}
                            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                            placeholder="Descrição (opcional)"
                            size={1}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleAddItem(category.id)}>
                              Adicionar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setIsAddingItem(null);
                                setNewItem({ name: '', description: '' });
                              }}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsAddingItem(category.id)}
                        className="w-full"
                      >
                        <Plus className="h-3 w-3 mr-2" />
                        Adicionar Item
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
