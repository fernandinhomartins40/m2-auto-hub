import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Lock, MessageSquarePlus, Pencil, Plus, Star, Trash2 } from "lucide-react";

import adminService, {
  type RelationshipCategory,
  type RelationshipCategoryInput,
  type RelationshipRule,
  type RelationshipTemplate,
  type RelationshipTemplatePlaceholder,
} from "@/api/adminService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  RELATIONSHIP_ICON_NAMES,
  RELATIONSHIP_RULE_FIELDS,
  RELATIONSHIP_RULE_OPERATORS,
  RELATIONSHIP_SORT_FIELDS,
  getRelationshipIcon,
} from "./relationshipTemplates";

const ACCENT_PRESETS = [
  "#f97316",
  "#db2777",
  "#2563eb",
  "#059669",
  "#7c3aed",
  "#ea580c",
  "#0891b2",
  "#dc2626",
];

function operatorNeedsValue(operator: string) {
  return RELATIONSHIP_RULE_OPERATORS.find((op) => op.value === operator)?.needsValue ?? true;
}

function operatorNeedsSecondValue(operator: string) {
  return RELATIONSHIP_RULE_OPERATORS.find((op) => op.value === operator)?.needsSecondValue ?? false;
}

function fieldLabel(field: string) {
  return RELATIONSHIP_RULE_FIELDS.find((f) => f.value === field)?.label ?? field;
}

function operatorLabel(operator: string) {
  return RELATIONSHIP_RULE_OPERATORS.find((op) => op.value === operator)?.label ?? operator;
}

// ==================== EDITOR DE CATEGORIA ====================

interface CategoryFormState {
  name: string;
  description: string;
  icon: string;
  accentColor: string;
  isActive: boolean;
  rules: RelationshipRule[];
  sortBy: string;
  sortDir: string;
}

function emptyCategoryForm(): CategoryFormState {
  return {
    name: "",
    description: "",
    icon: "MessageCircle",
    accentColor: "#f97316",
    isActive: true,
    rules: [],
    sortBy: "daysSinceLastInteraction",
    sortDir: "asc",
  };
}

function CategoryDialog({
  open,
  onOpenChange,
  category,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: RelationshipCategory | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<CategoryFormState>(emptyCategoryForm());
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(category);
  const isSystem = category?.isSystem ?? false;

  useEffect(() => {
    if (open) {
      setForm(
        category
          ? {
              name: category.name,
              description: category.description,
              icon: category.icon,
              accentColor: category.accentColor,
              isActive: category.isActive,
              rules: category.rules ?? [],
              sortBy: category.sortBy,
              sortDir: category.sortDir,
            }
          : emptyCategoryForm()
      );
    }
  }, [open, category]);

  const update = (patch: Partial<CategoryFormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const updateRule = (index: number, patch: Partial<RelationshipRule>) => {
    setForm((prev) => ({
      ...prev,
      rules: prev.rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)),
    }));
  };

  const addRule = () => {
    update({
      rules: [...form.rules, { field: "daysSinceLastInteraction", operator: "gte", value: 30 }],
    });
  };

  const removeRule = (index: number) => {
    update({ rules: form.rules.filter((_, i) => i !== index) });
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Informe o nome da categoria", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload: RelationshipCategoryInput = {
        name: form.name.trim(),
        description: form.description.trim(),
        icon: form.icon,
        accentColor: form.accentColor,
        isActive: form.isActive,
        rules: form.rules,
        sortBy: form.sortBy,
        sortDir: form.sortDir,
      };

      if (category) {
        // Categorias de sistema: regras são calculadas automaticamente; não enviamos rules.
        const updatePayload = isSystem ? { ...payload, rules: undefined } : payload;
        await adminService.updateRelationshipCategory(category.id, updatePayload);
      } else {
        await adminService.createRelationshipCategory(payload);
      }
      toast({ title: isEditing ? "Categoria atualizada" : "Categoria criada" });
      onOpenChange(false);
      onSaved();
    } catch (error) {
      console.error("Erro ao salvar categoria:", error);
      toast({ title: "Não foi possível salvar a categoria", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar categoria" : "Nova categoria de interação"}</DialogTitle>
          <DialogDescription>
            {isSystem
              ? "Categoria de sistema: você pode ajustar aparência e nome, mas as regras de segmentação são automáticas."
              : "Defina um nome, aparência e as regras que determinam quais clientes entram nessa lista."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => update({ name: e.target.value })} placeholder="Ex: Clientes de troca de óleo" />
            </div>
            <div className="space-y-1.5">
              <Label>Ícone</Label>
              <Select value={form.icon} onValueChange={(value) => update({ icon: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIP_ICON_NAMES.map((name) => {
                    const Icon = getRelationshipIcon(name);
                    return (
                      <SelectItem key={name} value={name}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {name}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Input
              value={form.description}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="Texto de apoio exibido no card"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Cor de destaque</Label>
            <div className="flex flex-wrap items-center gap-2">
              {ACCENT_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => update({ accentColor: color })}
                  className={`h-7 w-7 rounded-full border-2 transition ${
                    form.accentColor === color ? "border-foreground" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Cor ${color}`}
                />
              ))}
              <Input
                type="color"
                value={form.accentColor}
                onChange={(e) => update({ accentColor: e.target.value })}
                className="h-8 w-12 cursor-pointer p-1"
              />
            </div>
          </div>

          {!isSystem && (
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Regras de segmentação</div>
                  <div className="text-xs text-muted-foreground">
                    O cliente precisa atender a todas as condições (E).
                  </div>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addRule}>
                  <Plus className="mr-1 h-4 w-4" />
                  Condição
                </Button>
              </div>

              {form.rules.length === 0 ? (
                <div className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                  Sem condições: todos os clientes entram nessa categoria.
                </div>
              ) : (
                <div className="space-y-2">
                  {form.rules.map((rule, index) => (
                    <div key={index} className="flex flex-wrap items-center gap-2 rounded-md bg-muted/40 p-2">
                      <Select value={rule.field} onValueChange={(value) => updateRule(index, { field: value })}>
                        <SelectTrigger className="h-9 w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RELATIONSHIP_RULE_FIELDS.map((field) => (
                            <SelectItem key={field.value} value={field.value}>
                              {field.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={rule.operator} onValueChange={(value) => updateRule(index, { operator: value as RelationshipRule["operator"] })}>
                        <SelectTrigger className="h-9 w-[160px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RELATIONSHIP_RULE_OPERATORS.map((op) => (
                            <SelectItem key={op.value} value={op.value}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {operatorNeedsValue(rule.operator) && (
                        <Input
                          className="h-9 w-24"
                          value={rule.value ?? ""}
                          onChange={(e) => updateRule(index, { value: e.target.value })}
                          placeholder="valor"
                        />
                      )}
                      {operatorNeedsSecondValue(rule.operator) && (
                        <>
                          <span className="text-xs text-muted-foreground">e</span>
                          <Input
                            className="h-9 w-24"
                            value={rule.value2 ?? ""}
                            onChange={(e) => updateRule(index, { value2: e.target.value })}
                            placeholder="valor"
                          />
                        </>
                      )}

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="ml-auto h-9 w-9 text-muted-foreground hover:text-destructive"
                        onClick={() => removeRule(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Ordenar por</Label>
                  <Select value={form.sortBy} onValueChange={(value) => update({ sortBy: value })}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIP_SORT_FIELDS.map((field) => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Direção</Label>
                  <Select value={form.sortDir} onValueChange={(value) => update({ sortDir: value })}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Crescente</SelectItem>
                      <SelectItem value="desc">Decrescente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="text-sm font-medium">Categoria ativa</div>
              <div className="text-xs text-muted-foreground">Desative para esconder da tela de relacionamento.</div>
            </div>
            <Switch checked={form.isActive} onCheckedChange={(checked) => update({ isActive: checked })} />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== EDITOR DE TEMPLATE ====================

function TemplateDialog({
  open,
  onOpenChange,
  categoryId,
  template,
  placeholders,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  template: RelationshipTemplate | null;
  placeholders: RelationshipTemplatePlaceholder[];
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(template);

  useEffect(() => {
    if (open) {
      setName(template?.name ?? "");
      setBody(template?.body ?? "");
      setIsDefault(template?.isDefault ?? false);
    }
  }, [open, template]);

  const insertPlaceholder = (token: string) => {
    setBody((prev) => `${prev}${token}`);
  };

  const handleSave = async () => {
    if (!name.trim() || !body.trim()) {
      toast({ title: "Preencha nome e mensagem", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (template) {
        await adminService.updateRelationshipTemplate(template.id, { name: name.trim(), body, isDefault });
      } else {
        await adminService.createRelationshipTemplate(categoryId, { name: name.trim(), body, isDefault });
      }
      toast({ title: isEditing ? "Template atualizado" : "Template criado" });
      onOpenChange(false);
      onSaved();
    } catch (error) {
      console.error("Erro ao salvar template:", error);
      toast({ title: "Não foi possível salvar o template", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar template" : "Novo template de mensagem"}</DialogTitle>
          <DialogDescription>Use os campos entre chaves para personalizar automaticamente.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome do template</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Convite para revisão" />
          </div>

          <div className="space-y-1.5">
            <Label>Mensagem</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="Olá {{firstName}}! ..." />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {placeholders.map((placeholder) => (
                <button
                  key={placeholder.token}
                  type="button"
                  title={placeholder.description}
                  onClick={() => insertPlaceholder(placeholder.token)}
                  className="rounded-full border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground transition hover:bg-muted"
                >
                  {placeholder.token}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="text-sm font-medium">Usar como padrão</div>
              <div className="text-xs text-muted-foreground">É o template pré-selecionado ao enviar WhatsApp.</div>
            </div>
            <Switch checked={isDefault} onCheckedChange={setIsDefault} />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== TELA PRINCIPAL DE CONFIGURAÇÃO ====================

export function RelationshipSettings() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<RelationshipCategory[]>([]);
  const [placeholders, setPlaceholders] = useState<RelationshipTemplatePlaceholder[]>([]);
  const [loading, setLoading] = useState(true);

  const [categoryDialog, setCategoryDialog] = useState<{ open: boolean; category: RelationshipCategory | null }>({
    open: false,
    category: null,
  });
  const [templateDialog, setTemplateDialog] = useState<{
    open: boolean;
    categoryId: string;
    template: RelationshipTemplate | null;
  }>({ open: false, categoryId: "", template: null });
  const [deleteTarget, setDeleteTarget] = useState<RelationshipCategory | null>(null);
  const [deleteTemplateTarget, setDeleteTemplateTarget] = useState<RelationshipTemplate | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminService.getRelationshipCategories();
      setCategories(response.categories);
      setPlaceholders(response.placeholders);
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
      toast({ title: "Não foi possível carregar as categorias", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const confirmDeleteCategory = async () => {
    if (!deleteTarget) return;
    try {
      await adminService.deleteRelationshipCategory(deleteTarget.id);
      toast({ title: "Categoria excluída" });
      setDeleteTarget(null);
      void load();
    } catch (error) {
      console.error("Erro ao excluir categoria:", error);
      toast({ title: "Não foi possível excluir a categoria", variant: "destructive" });
    }
  };

  const confirmDeleteTemplate = async () => {
    if (!deleteTemplateTarget) return;
    try {
      await adminService.deleteRelationshipTemplate(deleteTemplateTarget.id);
      toast({ title: "Template excluído" });
      setDeleteTemplateTarget(null);
      void load();
    } catch (error) {
      console.error("Erro ao excluir template:", error);
      toast({ title: "Não foi possível excluir o template", variant: "destructive" });
    }
  };

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  );

  if (loading) {
    return (
      <div className="flex h-56 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-moria-orange" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Tipos de interação e templates</h3>
          <p className="text-sm text-muted-foreground">
            Crie categorias com regras próprias e gerencie os modelos de mensagem de cada uma.
          </p>
        </div>
        <Button type="button" onClick={() => setCategoryDialog({ open: true, category: null })}>
          <Plus className="mr-2 h-4 w-4" />
          Nova categoria
        </Button>
      </div>

      <div className="grid gap-4">
        {sortedCategories.map((category) => {
          const Icon = getRelationshipIcon(category.icon);
          return (
            <Card key={category.id} className={category.isActive ? "" : "opacity-60"}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Icon className="h-4 w-4" style={{ color: category.accentColor }} />
                      {category.name}
                      {category.isSystem && (
                        <Badge variant="secondary" className="gap-1">
                          <Lock className="h-3 w-3" />
                          Sistema
                        </Badge>
                      )}
                      {!category.isActive && <Badge variant="outline">Inativa</Badge>}
                    </CardTitle>
                    <CardDescription>{category.description || "Sem descrição"}</CardDescription>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCategoryDialog({ open: true, category })}
                    >
                      <Pencil className="mr-1 h-4 w-4" />
                      Editar
                    </Button>
                    {!category.isSystem && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(category)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {!category.isSystem && category.rules.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {category.rules.map((rule, index) => (
                      <Badge key={index} variant="outline" className="font-normal">
                        {fieldLabel(rule.field)} {operatorLabel(rule.operator)}{" "}
                        {rule.value ?? ""}
                        {rule.value2 != null ? ` e ${rule.value2}` : ""}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="rounded-lg border">
                  <div className="flex items-center justify-between border-b px-3 py-2">
                    <span className="text-sm font-medium">
                      Templates ({category.templates.length})
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setTemplateDialog({ open: true, categoryId: category.id, template: null })}
                    >
                      <MessageSquarePlus className="mr-1 h-4 w-4" />
                      Adicionar
                    </Button>
                  </div>
                  {category.templates.length === 0 ? (
                    <div className="p-3 text-center text-xs text-muted-foreground">
                      Nenhum template. Adicione ao menos um para enviar mensagens.
                    </div>
                  ) : (
                    <ul className="divide-y">
                      {category.templates.map((template) => (
                        <li key={template.id} className="flex items-start justify-between gap-3 p-3">
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              {template.name}
                              {template.isDefault && (
                                <Badge variant="secondary" className="gap-1">
                                  <Star className="h-3 w-3" />
                                  Padrão
                                </Badge>
                              )}
                              {!template.isActive && <Badge variant="outline">Inativo</Badge>}
                            </div>
                            <p className="line-clamp-2 text-xs text-muted-foreground">{template.body}</p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setTemplateDialog({ open: true, categoryId: category.id, template })}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteTemplateTarget(template)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <CategoryDialog
        open={categoryDialog.open}
        onOpenChange={(open) => setCategoryDialog((prev) => ({ ...prev, open }))}
        category={categoryDialog.category}
        onSaved={load}
      />

      <TemplateDialog
        open={templateDialog.open}
        onOpenChange={(open) => setTemplateDialog((prev) => ({ ...prev, open }))}
        categoryId={templateDialog.categoryId}
        template={templateDialog.template}
        placeholders={placeholders}
        onSaved={load}
      />

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              A categoria "{deleteTarget?.name}" e todos os seus templates serão removidos. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDeleteCategory()}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(deleteTemplateTarget)}
        onOpenChange={(open) => !open && setDeleteTemplateTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription>
              O template "{deleteTemplateTarget?.name}" será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDeleteTemplate()}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
