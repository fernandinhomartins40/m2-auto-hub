import { useEffect, useRef, useState } from "react";
import { Dialog, DialogDescription, DialogFooter, DialogTitle } from "../../ui/dialog";
import { ResponsiveDialogBody, ResponsiveDialogContent, ResponsiveDialogHeader } from "../../ui/responsive-dialog";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { RadioGroup, RadioGroupItem } from "../../ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Separator } from "../../ui/separator";
import { Textarea } from "../../ui/textarea";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  ExternalLink,
  ImagePlus,
  Loader2,
  Ruler,
  Search,
  Trash2,
} from "lucide-react";
import {
  mlPanelService,
  type CategorySuggestion,
  type MlAttributeValue,
  type MlListingType,
  type MlProductDetail,
  type MlProfileUpdate,
  type MlStockMode,
} from "@/api/marketplaceService";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";
import { LISTING_TYPE_LABEL, ML_STATUS, brl } from "./mlLabels";
import { MlAiAssistant } from "./MlAiAssistant";

type PriceMode = "default" | "markup" | "fixed";

interface FormState {
  title: string;
  description: string;
  brand: string;
  partNumber: string;
  packageWeightG: string;
  packageHeightCm: string;
  packageWidthCm: string;
  packageLengthCm: string;
  stockMode: MlStockMode;
  supplierQuantity: string;
  manufacturingDays: string;
  priceMode: PriceMode;
  markupPercent: string;
  fixedPrice: string;
  listingTypeId: MlListingType | "default";
  attributes: Record<string, MlAttributeValue>;
}

const STOCK_MODES: Array<{ value: MlStockMode; title: string; description: string }> = [
  {
    value: "STORE_ONLY",
    title: "Só o estoque da loja",
    description: "Vende o que está na prateleira. Zerou o estoque, o anúncio pausa sozinho e volta quando o estoque voltar.",
  },
  {
    value: "STORE_PLUS_SUPPLIER",
    title: "Loja + fornecedor no mesmo dia",
    description: "Soma ao estoque da loja as unidades que o fornecedor entrega no mesmo dia. O despacho continua sendo no mesmo dia.",
  },
  {
    value: "MADE_TO_ORDER",
    title: "Sob encomenda",
    description: "Vende mesmo sem estoque, com prazo de disponibilidade em dias. O comprador vê \"disponível em X dias\".",
  },
];

const text = (value: unknown) => (value === null || value === undefined ? "" : String(value));
const numberOrNull = (value: string) => {
  const n = Number(value.replace(",", "."));
  return value.trim() && Number.isFinite(n) && n > 0 ? n : null;
};

function initialForm(detail: MlProductDetail): FormState {
  const { profile, effective } = detail;
  const markup = profile?.markupPercent;
  const fixed = profile?.fixedPrice;
  return {
    title: effective.title,
    description: profile?.description ?? "",
    brand: text(effective.brand),
    partNumber: text(effective.partNumber),
    packageWeightG: text(effective.packageWeightG),
    packageHeightCm: text(effective.packageHeightCm),
    packageWidthCm: text(effective.packageWidthCm),
    packageLengthCm: text(effective.packageLengthCm),
    stockMode: effective.stockMode,
    supplierQuantity: text(effective.supplierQuantity),
    manufacturingDays: text(profile?.manufacturingDays || 1),
    priceMode: fixed !== null && fixed !== undefined ? "fixed" : markup !== null && markup !== undefined ? "markup" : "default",
    markupPercent: text(markup ?? detail.settings.markupPercent),
    fixedPrice: text(fixed ?? effective.price),
    listingTypeId: profile?.listingTypeId ?? "default",
    attributes: Object.fromEntries((profile?.attributes ?? []).map(attr => [attr.id, attr])),
  };
}

function toUpdate(form: FormState): MlProfileUpdate {
  return {
    title: form.title.trim() || null,
    description: form.description.trim() || null,
    brand: form.brand.trim() || null,
    partNumber: form.partNumber.trim() || null,
    packageWeightG: numberOrNull(form.packageWeightG) ? Math.round(numberOrNull(form.packageWeightG)!) : null,
    packageHeightCm: numberOrNull(form.packageHeightCm),
    packageWidthCm: numberOrNull(form.packageWidthCm),
    packageLengthCm: numberOrNull(form.packageLengthCm),
    stockMode: form.stockMode,
    supplierQuantity: Math.max(0, Math.round(Number(form.supplierQuantity) || 0)),
    manufacturingDays: Math.max(0, Math.round(Number(form.manufacturingDays) || 0)),
    markupPercent: form.priceMode === "markup" ? Number(form.markupPercent) || 0 : null,
    fixedPrice: form.priceMode === "fixed" ? numberOrNull(form.fixedPrice) : null,
    listingTypeId: form.listingTypeId === "default" ? null : form.listingTypeId,
    attributes: Object.values(form.attributes).filter(attr => attr.valueId || attr.valueName?.trim()),
  };
}

interface Props {
  productId: string;
  onClose: () => void;
  onChanged: () => void;
}

/** Edição rápida do produto para o Mercado Livre, com aprovação no final. */
export function MlProductEditor({ productId, onClose, onChanged }: Props) {
  const { toast } = useToast();
  const [detail, setDetail] = useState<MlProductDetail | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [categoryResults, setCategoryResults] = useState<CategorySuggestion[] | null>(null);
  const [changingCategory, setChangingCategory] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const [findingPackage, setFindingPackage] = useState(false);
  const [packageSource, setPackageSource] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const apply = (next: MlProductDetail, resetForm = true) => {
    setDetail(next);
    if (resetForm) setForm(initialForm(next));
  };

  useEffect(() => {
    mlPanelService.detail(productId).then(next => apply(next)).catch(err => {
      toast({ title: "Erro ao abrir produto", description: getErrorMessage(err), variant: "destructive" });
      onClose();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(prev => (prev ? { ...prev, [key]: value } : prev));

  const setAttribute = (id: string, value: MlAttributeValue | null) =>
    setForm(prev => {
      if (!prev) return prev;
      const attributes = { ...prev.attributes };
      if (value) attributes[id] = value;
      else delete attributes[id];
      return { ...prev, attributes };
    });

  const save = async (): Promise<MlProductDetail | null> => {
    if (!form) return null;
    setSaving(true);
    try {
      const next = await mlPanelService.update(productId, toUpdate(form));
      apply(next);
      onChanged();
      return next;
    } catch (err) {
      toast({ title: "Erro ao salvar", description: getErrorMessage(err), variant: "destructive" });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const saveAndPublish = async () => {
    const saved = await save();
    if (!saved) return;
    const missing = saved.readiness.filter(check => !check.ok);
    if (missing.length) {
      toast({ title: "Ainda falta completar", description: missing.map(check => check.label).join(", "), variant: "destructive" });
      return;
    }
    if (!confirm(`Publicar "${saved.effective.title}" no Mercado Livre por ${brl(saved.effective.price)}? O anúncio fica visível na hora.`)) return;
    setSaving(true);
    try {
      apply(await mlPanelService.approve(productId));
      onChanged();
      toast({ title: "Produto publicado no Mercado Livre" });
    } catch (err) {
      toast({ title: "O Mercado Livre recusou", description: getErrorMessage(err), variant: "destructive" });
      void mlPanelService.detail(productId).then(next => apply(next, false));
    } finally {
      setSaving(false);
    }
  };

  const chooseCategory = async (category: CategorySuggestion) => {
    setSaving(true);
    try {
      // Salva o restante do formulário junto, para não perder o que foi digitado.
      const base = form ? toUpdate(form) : {};
      apply(await mlPanelService.update(productId, { ...base, attributes: undefined, categoryId: category.id, categoryName: category.name }));
      setChangingCategory(false);
      setCategoryResults(null);
      onChanged();
    } catch (err) {
      toast({ title: "Erro ao escolher categoria", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const searchCategories = async () => {
    try {
      setCategoryResults(await mlPanelService.searchCategories(productId, categoryQuery));
    } catch (err) {
      toast({ title: "Erro na busca", description: getErrorMessage(err), variant: "destructive" });
    }
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      apply(await mlPanelService.addImages(productId, Array.from(files)), false);
      onChanged();
    } catch (err) {
      toast({ title: "Erro ao enviar fotos", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  // Preenche o formulário com as medidas do catálogo ou da categoria; só vale depois de salvar.
  const findPackage = async () => {
    setFindingPackage(true);
    try {
      const found = await mlPanelService.packageSuggestion(productId);
      if (!found) {
        toast({ title: "O Mercado Livre não tem medidas de referência para este produto", description: "Escolha a categoria primeiro ou meça a peça." });
        return;
      }
      setForm(prev => (prev ? {
        ...prev,
        packageWeightG: String(Math.round(found.weightG)),
        packageHeightCm: String(found.heightCm),
        packageWidthCm: String(found.widthCm),
        packageLengthCm: String(found.lengthCm),
      } : prev));
      setPackageSource(found.source);
    } catch (err) {
      toast({ title: "Erro ao buscar medidas", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setFindingPackage(false);
    }
  };

  const reorder = async (paths: string[]) => {
    try {
      apply(await mlPanelService.setImages(productId, paths), false);
      onChanged();
    } catch (err) {
      toast({ title: "Erro ao atualizar fotos", description: getErrorMessage(err), variant: "destructive" });
    }
  };

  if (!detail || !form) {
    return (
      <Dialog open onOpenChange={open => !open && onClose()}>
        <ResponsiveDialogContent size="lg">
          <DialogTitle className="sr-only">Carregando</DialogTitle>
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
        </ResponsiveDialogContent>
      </Dialog>
    );
  }

  const paths = detail.product.images.map(image => image.path);
  const published = Boolean(detail.listing?.externalId);
  const badge = ML_STATUS[detail.status];
  const required = detail.categoryAttributes.filter(attr => attr.required);
  const optional = detail.categoryAttributes.filter(attr => !attr.required);
  const suggestions = categoryResults ?? detail.categorySuggestions;
  const supplierRisk = form.stockMode === "STORE_PLUS_SUPPLIER" && detail.settings.supplierDeadline >= detail.settings.dispatchCutoff;

  const renderAttribute = (attr: MlProductDetail["categoryAttributes"][number]) => {
    const current = form.attributes[attr.id];
    const selectOnly = (attr.type === "list" || attr.type === "boolean") && attr.values?.length;
    return (
      <div key={attr.id} className="space-y-1.5">
        <Label>{attr.name}{attr.required && <span className="text-red-600"> *</span>}</Label>
        {selectOnly ? (
          <Select
            value={current?.valueId ?? ""}
            onValueChange={valueId => setAttribute(attr.id, { id: attr.id, valueId, valueName: attr.values?.find(v => v.id === valueId)?.name })}
          >
            <SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger>
            <SelectContent>
              {attr.values!.map(value => <SelectItem key={value.id} value={value.id}>{value.name}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : (
          <>
            <Input
              list={attr.values?.length ? `ml-attr-${attr.id}` : undefined}
              value={current?.valueName ?? ""}
              placeholder={attr.type === "number_unit" ? "Ex.: 10 cm" : undefined}
              onChange={event => {
                const valueName = event.target.value;
                const match = attr.values?.find(v => v.name.toLowerCase() === valueName.trim().toLowerCase());
                setAttribute(attr.id, valueName ? { id: attr.id, valueId: match?.id ?? null, valueName } : null);
              }}
            />
            {attr.values?.length ? (
              <datalist id={`ml-attr-${attr.id}`}>
                {attr.values.slice(0, 200).map(value => <option key={value.id} value={value.name} />)}
              </datalist>
            ) : null}
          </>
        )}
      </div>
    );
  };

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <ResponsiveDialogContent size="2xl" className="flex flex-col gap-0 p-0">
        <ResponsiveDialogHeader>
          <div className="flex flex-wrap items-center gap-2 pr-8">
            <Badge className={badge.color} variant="secondary">{badge.label}</Badge>
            <span className="text-xs text-gray-500">{detail.product.sku}</span>
            {detail.listing?.externalUrl && (
              <a href={detail.listing.externalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center text-xs text-blue-600 hover:underline">
                Ver no Mercado Livre <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            )}
          </div>
          <DialogTitle className="truncate">{detail.product.name}</DialogTitle>
          <DialogDescription>
            Estoque na loja: {detail.product.stock} un · Preço no site: {brl(detail.effective.basePrice)}
          </DialogDescription>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="space-y-6">
          {/* Pendências */}
          <section className="grid gap-2 rounded-lg border p-3 sm:grid-cols-3">
            {detail.readiness.map(check => (
              <div key={check.key} className="flex items-start gap-2 text-sm" title={check.ok ? undefined : check.hint}>
                {check.ok
                  ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />}
                <div>
                  <p className={check.ok ? "text-gray-700" : "font-medium text-amber-800"}>{check.label}</p>
                  {!check.ok && check.hint && <p className="text-xs text-gray-500">{check.hint}</p>}
                </div>
              </div>
            ))}
          </section>
          {detail.listing?.lastError && (
            <p className="rounded-md bg-red-50 p-3 text-sm text-red-700 break-words">{detail.listing.lastError}</p>
          )}

          {/* Qualidade */}
          <section className="rounded-lg border p-3 text-sm">
            <div className="flex items-center justify-between">
              <p className="font-medium">Qualidade do anúncio</p>
              <span className={`text-lg font-bold ${detail.quality.score >= 80 ? "text-green-600" : detail.quality.score >= 50 ? "text-amber-600" : "text-red-600"}`}>
                {detail.quality.score}/100
              </span>
            </div>
            <ul className="mt-1 list-disc pl-5 text-xs text-gray-600">
              {detail.quality.tips.map(tip => <li key={tip}>{tip}</li>)}
            </ul>
          </section>

          <MlAiAssistant
            key={detail.ai?.updatedAt ?? "none"}
            detail={detail}
            beforeApply={async () => Boolean(await save())}
            onDetail={next => {
              apply(next);
              onChanged();
            }}
          />

          {/* Fotos */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Fotos</h3>
              <Button size="sm" variant="outline" disabled={uploading || paths.length >= 12} onClick={() => fileInput.current?.click()}>
                {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ImagePlus className="h-4 w-4 mr-2" />}
                Adicionar fotos
              </Button>
              <input
                ref={fileInput}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={event => upload(event.target.files)}
              />
            </div>
            {paths.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma foto. O Mercado Livre exige pelo menos uma. Use fundo claro e a peça inteira à vista.</p>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {detail.product.images.map((image, index) => (
                  <div key={image.path} className={`relative overflow-hidden rounded-md border ${index === 0 ? "ring-2 ring-blue-500" : ""}`}>
                    <img src={image.url} alt="" className="aspect-square w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/50 p-0.5">
                      <button type="button" className="p-1 text-white disabled:opacity-30" disabled={index === 0} aria-label="Mover para a esquerda"
                        onClick={() => { const next = [...paths]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; void reorder(next); }}>
                        <ArrowLeft className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" className="p-1 text-white" aria-label="Remover"
                        onClick={() => { if (confirm("Remover esta foto do produto?")) void reorder(paths.filter(path => path !== image.path)); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" className="p-1 text-white disabled:opacity-30" disabled={index === paths.length - 1} aria-label="Mover para a direita"
                        onClick={() => { const next = [...paths]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; void reorder(next); }}>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500">A primeira foto é a principal. As fotos também aparecem no site da loja.</p>
          </section>

          <Separator />

          {/* Anúncio */}
          <section className="space-y-4">
            <h3 className="font-semibold">Anúncio</h3>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Label htmlFor="ml-title">Título</Label>
                <span className={`text-xs ${form.title.length > 60 ? "text-red-600" : "text-gray-500"}`}>{form.title.length}/60</span>
              </div>
              <Input id="ml-title" value={form.title} maxLength={60} onChange={event => set("title", event.target.value)} />
              <p className="text-xs text-gray-500">Produto + marca + modelo. Ex.: "Filtro de Óleo Gol 1.6 Tecfil". O nome do ERP continua igual.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ml-description">Descrição do anúncio</Label>
              <Textarea
                id="ml-description"
                rows={6}
                value={form.description}
                placeholder="Vazio = usa a descrição do site. O assistente de IA pode escrever uma com aplicação e nomes regionais."
                onChange={event => set("description", event.target.value)}
              />
              <p className="text-xs text-gray-500">Texto puro: sem links, telefone ou preço (regra do Mercado Livre).</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ml-brand">Marca</Label>
                <Input id="ml-brand" value={form.brand} onChange={event => set("brand", event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ml-part">Número de peça</Label>
                <Input id="ml-part" value={form.partNumber} onChange={event => set("partNumber", event.target.value)} />
              </div>
            </div>
          </section>

          <Separator />

          {/* Categoria */}
          <section className="space-y-4">
            <h3 className="font-semibold">Categoria e características</h3>
            {!detail.connected ? (
              <p className="text-sm text-red-600">Conecte a conta do Mercado Livre para escolher a categoria.</p>
            ) : detail.category && !changingCategory ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                <div>
                  <p className="font-medium">{detail.category.name ?? detail.category.id}</p>
                  <p className="text-xs text-gray-500">{detail.category.id}</p>
                </div>
                {!published && <Button size="sm" variant="outline" onClick={() => setChangingCategory(true)}>Trocar</Button>}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={categoryQuery}
                    placeholder="Ex.: filtro de óleo"
                    onChange={event => setCategoryQuery(event.target.value)}
                    onKeyDown={event => event.key === "Enter" && searchCategories()}
                  />
                  <Button variant="outline" onClick={searchCategories}><Search className="h-4 w-4" /></Button>
                </div>
                {suggestions.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">Sugestões do Mercado Livre:</p>
                    {suggestions.map(category => (
                      <button
                        key={category.id}
                        type="button"
                        disabled={saving}
                        onClick={() => chooseCategory(category)}
                        className="block w-full rounded-md border p-2 text-left text-sm hover:bg-gray-50"
                      >
                        <span className="font-medium">{category.name}</span>
                        {category.path && <span className="block text-xs text-gray-500">{category.path}</span>}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Busque pelo tipo de peça para ver as categorias.</p>
                )}
              </div>
            )}

            {detail.category && required.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">{required.map(renderAttribute)}</div>
            )}
            {detail.category && optional.length > 0 && (
              <div className="space-y-3">
                <Button size="sm" variant="ghost" onClick={() => setShowOptional(v => !v)}>
                  {showOptional ? "Ocultar" : "Mostrar"} características opcionais ({optional.length})
                </Button>
                {showOptional && <div className="grid gap-4 sm:grid-cols-2">{optional.map(renderAttribute)}</div>}
                <p className="text-xs text-gray-500">Mais características preenchidas ajudam o anúncio a aparecer nas buscas.</p>
              </div>
            )}
            <p className="text-xs text-gray-500">Marca, número de peça, código de barras, SKU e embalagem são enviados automaticamente.</p>
          </section>

          <Separator />

          {/* Embalagem */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">Embalagem de envio</h3>
              <Button size="sm" variant="outline" onClick={findPackage} disabled={findingPackage || !detail.connected}>
                {findingPackage ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Ruler className="h-4 w-4 mr-2" />}
                Buscar medidas no Mercado Livre
              </Button>
            </div>
            {packageSource && <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-800">Preenchido com: {packageSource}. Confira na peça embalada e clique em Salvar.</p>}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="ml-weight">Peso (g)</Label>
                <Input id="ml-weight" inputMode="numeric" value={form.packageWeightG} onChange={event => set("packageWeightG", event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ml-height">Altura (cm)</Label>
                <Input id="ml-height" inputMode="decimal" value={form.packageHeightCm} onChange={event => set("packageHeightCm", event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ml-width">Largura (cm)</Label>
                <Input id="ml-width" inputMode="decimal" value={form.packageWidthCm} onChange={event => set("packageWidthCm", event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ml-length">Comprimento (cm)</Label>
                <Input id="ml-length" inputMode="decimal" value={form.packageLengthCm} onChange={event => set("packageLengthCm", event.target.value)} />
              </div>
            </div>
            <p className="text-xs text-gray-500">Meça o produto já embalado. Medidas menores que as reais geram cobrança extra de frete pelo Mercado Livre.</p>
          </section>

          <Separator />

          {/* Estoque e prazo */}
          <section className="space-y-4">
            <h3 className="font-semibold">Estoque e prazo</h3>
            <RadioGroup value={form.stockMode} onValueChange={value => set("stockMode", value as MlStockMode)} className="space-y-2">
              {STOCK_MODES.map(mode => (
                <label key={mode.value} className={`flex cursor-pointer gap-3 rounded-md border p-3 ${form.stockMode === mode.value ? "border-blue-500 bg-blue-50" : ""}`}>
                  <RadioGroupItem value={mode.value} className="mt-1" />
                  <div>
                    <p className="font-medium">{mode.title}</p>
                    <p className="text-xs text-gray-600">{mode.description}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
            {form.stockMode !== "STORE_ONLY" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ml-supplier-qty">Unidades que o fornecedor consegue</Label>
                  <Input id="ml-supplier-qty" type="number" min={0} value={form.supplierQuantity} onChange={event => set("supplierQuantity", event.target.value)} />
                  <p className="text-xs text-gray-500">Somadas às {detail.product.stock} da loja. É o máximo que pode ser vendido sem ter na prateleira.</p>
                </div>
                {form.stockMode === "MADE_TO_ORDER" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="ml-days">Prazo de disponibilidade (dias)</Label>
                    <Input id="ml-days" type="number" min={1} max={45} value={form.manufacturingDays} onChange={event => set("manufacturingDays", event.target.value)} />
                    <p className="text-xs text-gray-500">Dias além do prazo normal de despacho.</p>
                  </div>
                )}
              </div>
            )}
            {supplierRisk && (
              <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                Pelas regras da loja, o fornecedor entrega às {detail.settings.supplierDeadline} e o despacho vai até as {detail.settings.dispatchCutoff}.
                Se a mercadoria não chegar a tempo, o envio atrasa e a reputação cai. Considere "Sob encomenda" com 1 dia.
              </p>
            )}
          </section>

          <Separator />

          {/* Preço */}
          <section className="space-y-4">
            <h3 className="font-semibold">Preço</h3>
            <RadioGroup value={form.priceMode} onValueChange={value => set("priceMode", value as PriceMode)} className="grid gap-2 sm:grid-cols-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm">
                <RadioGroupItem value="default" /> Padrão da loja ({detail.settings.markupPercent}%)
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm">
                <RadioGroupItem value="markup" /> Acréscimo próprio
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm">
                <RadioGroupItem value="fixed" /> Preço fixo
              </label>
            </RadioGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              {form.priceMode === "markup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="ml-markup-own">Acréscimo sobre o site (%)</Label>
                  <Input id="ml-markup-own" type="number" step="0.5" value={form.markupPercent} onChange={event => set("markupPercent", event.target.value)} />
                </div>
              )}
              {form.priceMode === "fixed" && (
                <div className="space-y-1.5">
                  <Label htmlFor="ml-fixed">Preço no Mercado Livre (R$)</Label>
                  <Input id="ml-fixed" inputMode="decimal" value={form.fixedPrice} onChange={event => set("fixedPrice", event.target.value)} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Tipo de anúncio</Label>
                <Select value={form.listingTypeId} disabled={published} onValueChange={value => set("listingTypeId", value as FormState["listingTypeId"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Padrão da loja ({LISTING_TYPE_LABEL[detail.settings.listingTypeId]})</SelectItem>
                    {Object.entries(LISTING_TYPE_LABEL).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="rounded-md bg-gray-50 p-3 text-sm">
              <p>Preço no Mercado Livre: <strong>{brl(detail.effective.price)}</strong></p>
              {detail.fee ? (
                <p className="text-gray-600">
                  Tarifa estimada do Mercado Livre: {brl(detail.fee.saleFee)} · Você recebe cerca de <strong>{brl(detail.fee.net)}</strong>, antes do frete.
                </p>
              ) : (
                <p className="text-gray-500">A tarifa aparece depois de escolher a categoria.</p>
              )}
              <p className="text-xs text-gray-500">Valores do último salvamento.</p>
            </div>
          </section>
        </ResponsiveDialogBody>

        <DialogFooter className="flex-col-reverse gap-2 border-t px-4 py-3 sm:flex-row sm:px-6">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button variant="outline" onClick={() => void save()} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {published ? "Salvar e atualizar anúncio" : "Salvar"}
          </Button>
          {!published && (
            <Button onClick={saveAndPublish} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar e publicar
            </Button>
          )}
        </DialogFooter>
      </ResponsiveDialogContent>
    </Dialog>
  );
}
