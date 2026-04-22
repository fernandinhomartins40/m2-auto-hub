import { useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, Plus, Save, Tag, X } from 'lucide-react';

import productService, { type CategoryResponse } from '@/api/productService';
import { useToast } from '@/hooks/use-toast';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import {
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitleRow,
} from '../ui/responsive-dialog';

interface ProductCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryResponse[];
  onSaved: () => Promise<void> | void;
}

export function ProductCategoriesModal({
  isOpen,
  onClose,
  categories,
  onSaved,
}: ProductCategoriesModalProps) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [editingCategory, setEditingCategory] = useState<CategoryResponse | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setEditingCategory(null);
      setIsSaving(false);
    }
  }, [isOpen]);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [categories]
  );

  const handleStartEdit = (category: CategoryResponse) => {
    setEditingCategory(category);
    setName(category.name);
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setName('');
  };

  const handleSubmit = async () => {
    const normalizedName = name.trim().replace(/\s+/g, ' ');

    if (normalizedName.length < 2) {
      toast({
        title: 'Categoria inválida',
        description: 'Informe um nome com pelo menos 2 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      if (editingCategory) {
        await productService.updateCategory(editingCategory.id, normalizedName);
        toast({
          title: 'Categoria atualizada',
          description: `A categoria foi renomeada para "${normalizedName}".`,
        });
      } else {
        await productService.createCategory(normalizedName);
        toast({
          title: 'Categoria criada',
          description: `A categoria "${normalizedName}" já está disponível para uso.`,
        });
      }

      setName('');
      setEditingCategory(null);
      await onSaved();
    } catch (error: any) {
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        'Não foi possível salvar a categoria.';

      toast({
        title: 'Erro ao salvar categoria',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <ResponsiveDialogContent size="lg" className="p-0 flex flex-col gap-0">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitleRow>
            <div>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Tag className="h-5 w-5 text-moria-orange" />
                Categorias de Produtos
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Crie novas categorias e renomeie as já existentes. Ao editar, os produtos vinculados são atualizados.
              </p>
            </div>
          </ResponsiveDialogTitleRow>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="space-y-5">
          <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">
                {editingCategory ? 'Editar categoria' : 'Nova categoria'}
              </p>
              <p className="text-xs text-muted-foreground">
                Use nomes curtos e consistentes para manter o catálogo organizado.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex: Injeção, Iluminação, Acessórios"
                disabled={isSaving}
                className="flex-1"
              />

              <div className="flex gap-2">
                {editingCategory ? (
                  <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                ) : null}

                <Button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={isSaving}
                  className="bg-moria-orange hover:bg-moria-orange/90"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : editingCategory ? <Save className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  {editingCategory ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Categorias cadastradas</p>
              <Badge variant="secondary">{sortedCategories.length}</Badge>
            </div>

            {sortedCategories.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                Nenhuma categoria cadastrada ainda.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {sortedCategories.map((category) => (
                  <div key={category.id} className="rounded-xl border p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium break-words">{category.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {category.count} produto{category.count === 1 ? '' : 's'} ativo{category.count === 1 ? '' : 's'}
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleStartEdit(category)}
                      disabled={isSaving}
                      className="shrink-0"
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </Dialog>
  );
}
