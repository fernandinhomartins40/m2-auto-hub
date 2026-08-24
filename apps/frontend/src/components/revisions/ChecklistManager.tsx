import { useState } from 'react';
import { Settings, Plus, Edit, Trash2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { useRevisions } from '../../contexts/RevisionsContext';
import { cn } from '../../lib/utils';
import { ChecklistCategory, ChecklistItem } from '../../types/revisions';

interface ChecklistManagerProps {
  /** Avisa quem exibe a lista para recarregar apos criar/desabilitar itens. */
  onChanged?: () => void;
}

/**
 * Mensagem de erro vinda da API. O backend responde `{ error: { message } }` ou
 * `{ message }` conforme a camada que barrou; sem isso o usuario so via
 * "erro" generico e nao entendia, por exemplo, que a categoria tem itens.
 */
function mensagemDeErro(erro: unknown, padrao: string): string {
  const resposta = (erro as { response?: { data?: unknown } })?.response?.data as
    | { error?: { message?: string }; message?: string }
    | undefined;
  return resposta?.error?.message || resposta?.message || padrao;
}

export function ChecklistManager({ onChanged }: ChecklistManagerProps = {}) {
  const {
    categories,
    isLoadingCategories,
    reloadCategories,
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
  // Uma gravacao por vez: trava os botoes enquanto a API responde para nao
  // disparar duas criacoes com duplo clique.
  const [salvando, setSalvando] = useState(false);

  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    icon: '🔧'
  });

  const [newItem, setNewItem] = useState({
    name: '',
    description: ''
  });

  /** Executa a operacao, avisa o resultado e mantem a lista em dia. */
  const executar = async (
    acao: () => Promise<unknown>,
    sucesso: string,
    erroPadrao: string
  ): Promise<boolean> => {
    setSalvando(true);
    try {
      await acao();
      toast.success(sucesso);
      onChanged?.();
      return true;
    } catch (erro) {
      toast.error(mensagemDeErro(erro, erroPadrao));
      return false;
    } finally {
      setSalvando(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      toast.error('Digite o nome da categoria');
      return;
    }

    const ok = await executar(
      () =>
        addCategory({
          ...newCategory,
          name: newCategory.name.trim(),
          isDefault: false,
          isEnabled: true,
          order: categories.length,
          items: []
        }),
      'Categoria criada',
      'Não foi possível criar a categoria'
    );

    if (ok) {
      setNewCategory({ name: '', description: '', icon: '🔧' });
      setIsAddingCategory(false);
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;

    const ok = await executar(
      () =>
        updateCategory(editingCategory.id, {
          name: editingCategory.name,
          description: editingCategory.description,
          icon: editingCategory.icon
        }),
      'Categoria atualizada',
      'Não foi possível atualizar a categoria'
    );

    if (ok) setEditingCategory(null);
  };

  const handleDeleteCategory = async (categoryId: string, isDefault: boolean) => {
    if (isDefault) {
      toast.error(
        'Categorias padrão não podem ser excluídas. Use o botão de visibilidade para desabilitá-las.'
      );
      return;
    }

    if (!confirm('Deseja realmente excluir esta categoria e todos os seus itens?')) return;

    await executar(
      () => deleteCategory(categoryId),
      'Categoria excluída',
      'Não foi possível excluir a categoria'
    );
  };

  const handleToggleCategory = (category: ChecklistCategory) =>
    executar(
      () => toggleCategoryEnabled(category.id),
      category.isEnabled ? 'Categoria desabilitada' : 'Categoria habilitada',
      'Não foi possível alterar a categoria'
    );

  const handleAddItem = async (categoryId: string) => {
    if (!newItem.name.trim()) {
      toast.error('Digite o nome do item');
      return;
    }

    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    const ok = await executar(
      () =>
        addItemToCategory(categoryId, {
          ...newItem,
          name: newItem.name.trim(),
          isDefault: false,
          isEnabled: true,
          order: category.items.length
        }),
      'Item adicionado',
      'Não foi possível adicionar o item'
    );

    if (ok) {
      setNewItem({ name: '', description: '' });
      setIsAddingItem(null);
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;

    const ok = await executar(
      () =>
        updateItem(editingItem.category.id, editingItem.item.id, {
          name: editingItem.item.name,
          description: editingItem.item.description
        }),
      'Item atualizado',
      'Não foi possível atualizar o item'
    );

    if (ok) setEditingItem(null);
  };

  const handleDeleteItem = async (categoryId: string, itemId: string, isDefault: boolean) => {
    if (isDefault) {
      toast.error(
        'Itens padrão não podem ser excluídos. Use o botão de visibilidade para desabilitá-los.'
      );
      return;
    }

    if (!confirm('Deseja realmente excluir este item?')) return;

    await executar(
      () => deleteItem(categoryId, itemId),
      'Item excluído',
      'Não foi possível excluir o item'
    );
  };

  const handleToggleItem = (category: ChecklistCategory, item: ChecklistItem) =>
    executar(
      () => toggleItemEnabled(category.id, item.id),
      item.isEnabled ? 'Item desabilitado' : 'Item habilitado',
      'Não foi possível alterar o item'
    );

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

      <Dialog
        open={isOpen}
        onOpenChange={(aberto) => {
          setIsOpen(aberto);
          if (aberto) {
            // Outro usuario pode ter mexido no catalogo desde o ultimo load.
            reloadCategories();
          } else {
            onChanged?.();
          }
        }}
      >
        {/* A rolagem e a altura maxima vem do DialogContent base; repetir aqui
            criava dois containers roláveis aninhados. */}
        <DialogContent className="sm:max-w-4xl">
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
                disabled={salvando}
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
                    <Button
                      onClick={handleAddCategory}
                      disabled={salvando}
                      className="bg-moria-orange hover:bg-moria-orange/90"
                    >
                      {salvando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Adicionar
                    </Button>
                    <Button
                      variant="outline"
                      disabled={salvando}
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

            {isLoadingCategories && categories.length === 0 && (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Categories List */}
            <div className="space-y-4">
              {sortedCategories.map((category) => (
                <Card key={category.id} className={cn('border-2', !category.isEnabled && 'opacity-50')}>
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <span className="text-2xl">{category.icon}</span>
                        <div className="min-w-0 flex-1">
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
                                <Button size="sm" onClick={handleUpdateCategory} disabled={salvando}>
                                  Salvar
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingCategory(null)}>
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <h3 className="font-semibold text-lg flex flex-wrap items-center gap-2">
                                <span className="break-words">{category.name}</span>
                                {category.isDefault && (
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                    Padrão
                                  </span>
                                )}
                                {!category.isEnabled && (
                                  <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                                    Desabilitada
                                  </span>
                                )}
                              </h3>
                              {category.description && (
                                <p className="text-sm text-gray-600 break-words">{category.description}</p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={salvando}
                          onClick={() => handleToggleCategory(category)}
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
                            disabled={salvando}
                            onClick={() => setEditingCategory(category)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {!category.isDefault && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={salvando}
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
                    {[...category.items]
                      .sort((a, b) => a.order - b.order)
                      .map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            'flex flex-wrap items-center justify-between gap-2 p-2 rounded border',
                            !item.isEnabled && 'opacity-50'
                          )}
                        >
                          <div className="min-w-0 flex-1">
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
                                  <Button size="sm" onClick={handleUpdateItem} disabled={salvando}>
                                    Salvar
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => setEditingItem(null)}>
                                    Cancelar
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="font-medium text-sm flex flex-wrap items-center gap-2">
                                  <span className="break-words">{item.name}</span>
                                  {item.isDefault && (
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                      Padrão
                                    </span>
                                  )}
                                  {!item.isEnabled && (
                                    <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                                      Oculto
                                    </span>
                                  )}
                                </p>
                                {item.description && (
                                  <p className="text-xs text-gray-600 break-words">{item.description}</p>
                                )}
                              </>
                            )}
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={salvando}
                              onClick={() => handleToggleItem(category, item)}
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
                                disabled={salvando}
                                onClick={() => setEditingItem({ category, item })}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            )}
                            {!item.isDefault && (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={salvando}
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
                          />
                          <Input
                            value={newItem.description}
                            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                            placeholder="Descrição (opcional)"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              disabled={salvando}
                              onClick={() => handleAddItem(category.id)}
                            >
                              {salvando && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
                              Adicionar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={salvando}
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
                        disabled={salvando}
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
