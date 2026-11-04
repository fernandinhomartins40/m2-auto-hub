import { useEffect, useState } from "react";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Checkbox } from "../../ui/checkbox";
import { Textarea } from "../../ui/textarea";
import { Check, Copy, ImageDown, Loader2, Sparkles } from "lucide-react";
import {
  mlPanelService,
  type AiApplyField,
  type AiListingSuggestion,
  type AiPhotoCandidate,
  type MlProductDetail,
} from "@/api/marketplaceService";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";

interface Props {
  detail: MlProductDetail;
  /** Salva o que foi digitado no editor antes de aplicar (senão seria perdido). */
  beforeApply: () => Promise<boolean>;
  onDetail: (detail: MlProductDetail) => void;
}

const SOURCE_LABEL: Record<string, string> = {
  erp: "Ellon",
  aplicacao: "aplicação",
  nome: "nome",
  catalogo: "catálogo ML",
};

const formatWeight = (grams: number) => (grams >= 1000 ? `${(grams / 1000).toLocaleString("pt-BR")} kg` : `${grams} g`);

/** Assistente de IA do editor: gera, mostra e aplica a sugestão; busca fotos. */
export function MlAiAssistant({ detail, beforeApply, onDetail }: Props) {
  const { toast } = useToast();
  const productId = detail.product.id;
  // Só a sugestão pendente aparece; aplicada ou descartada, some.
  const [suggestion, setSuggestion] = useState<AiListingSuggestion | null>(detail.ai?.status === "READY" ? detail.ai.payload ?? null : null);
  const [busy, setBusy] = useState<"generate" | "apply" | "dismiss" | "photos" | "import" | null>(null);
  const [useTitle, setUseTitle] = useState(true);
  const [usePackage, setUsePackage] = useState(true);
  const [useCategory, setUseCategory] = useState(true);
  const [useDescription, setUseDescription] = useState(true);
  const [description, setDescription] = useState("");
  const [attributes, setAttributes] = useState<Set<string>>(new Set());
  const [photos, setPhotos] = useState<AiPhotoCandidate[] | null>(null);
  const [chosenPhotos, setChosenPhotos] = useState<Set<string>>(new Set());

  // Nova sugestão: pré-marca o que a IA tem alta confiança.
  useEffect(() => {
    if (!suggestion) return;
    setDescription(suggestion.description);
    setAttributes(new Set(suggestion.attributes.filter(attr => attr.confidence === "alta").map(attr => attr.id)));
    setUseCategory(Boolean(suggestion.categoryId && suggestion.categoryId !== detail.category?.id));
    // Medidas já digitadas são reais; a sugestão só vem marcada quando falta alguma.
    const { packageWeightG, packageHeightCm, packageWidthCm, packageLengthCm } = detail.effective;
    setUsePackage(Boolean(suggestion.package) && !(packageWeightG && packageHeightCm && packageWidthCm && packageLengthCm));
  }, [suggestion, detail.category?.id, detail.effective]);

  const generate = async () => {
    setBusy("generate");
    try {
      setSuggestion(await mlPanelService.aiGenerate(productId));
      toast({ title: "Sugestão pronta. Revise antes de aplicar." });
    } catch (err) {
      toast({ title: "A IA não conseguiu preparar", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const apply = async () => {
    if (!suggestion) return;
    const fields: AiApplyField[] = [];
    if (useTitle && suggestion.title) fields.push("title");
    if (useCategory && suggestion.categoryId) fields.push("category");
    if (attributes.size > 0) fields.push("attributes");
    if (useDescription && suggestion.description && description.trim()) fields.push("description");
    if (usePackage && suggestion.package) fields.push("package");
    if (fields.length === 0) {
      toast({ title: "Marque ao menos um item para aplicar" });
      return;
    }
    setBusy("apply");
    try {
      if (!(await beforeApply())) return;
      const next = await mlPanelService.aiApply(productId, fields, [...attributes], description);
      setSuggestion(next.ai?.status === "READY" ? next.ai.payload ?? null : null);
      onDetail(next);
      toast({ title: "Sugestão aplicada", description: "Confira os campos e publique quando estiver tudo certo." });
    } catch (err) {
      toast({ title: "Erro ao aplicar", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const dismiss = async () => {
    setBusy("dismiss");
    try {
      const next = await mlPanelService.aiDismiss(productId);
      setSuggestion(null);
      onDetail(next);
    } catch (err) {
      toast({ title: "Erro ao descartar", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const findPhotos = async () => {
    setBusy("photos");
    try {
      const found = await mlPanelService.photoCandidates(productId);
      setPhotos(found);
      setChosenPhotos(new Set(found.filter(photo => photo.recommended).map(photo => photo.url)));
      if (found.length === 0) toast({ title: "Nenhuma foto nova no catálogo do Mercado Livre para este produto" });
    } catch (err) {
      toast({ title: "Erro ao buscar fotos", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const importPhotos = async () => {
    setBusy("import");
    try {
      const result = await mlPanelService.photoImport(productId, [...chosenPhotos]);
      onDetail(result.detail);
      setPhotos(null);
      toast({
        title: `${result.added} foto(s) adicionada(s) em 1200 × 1200`,
        description: result.failed.length ? `${result.failed.length} não puderam ser usadas.` : undefined,
      });
    } catch (err) {
      toast({ title: "Erro ao adicionar fotos", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const copy = (value: string) => {
    void navigator.clipboard?.writeText(value);
    toast({ title: "Copiado" });
  };

  const toggleAttribute = (id: string) =>
    setAttributes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const status = detail.ai?.status;

  return (
    <section className="space-y-4 rounded-lg border border-purple-200 bg-purple-50/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-purple-600" /> Assistente de IA</h3>
          <p className="text-xs text-gray-600">
            Usa os dados do Ellon, as buscas em alta da categoria e o catálogo do Mercado Livre. Nada é salvo sem você aplicar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={findPhotos} disabled={busy !== null || !detail.connected}>
            {busy === "photos" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ImageDown className="h-4 w-4 mr-2" />}
            Buscar fotos
          </Button>
          <Button size="sm" onClick={generate} disabled={busy !== null || !detail.connected} className="bg-purple-600 hover:bg-purple-700">
            {busy === "generate" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {suggestion ? "Gerar de novo" : "Preparar com IA"}
          </Button>
        </div>
      </div>

      {busy === "generate" && <p className="text-sm text-purple-700">Analisando o produto, a categoria e o catálogo. Leva de 10 a 60 segundos…</p>}
      {status === "QUEUED" || status === "RUNNING" ? <p className="text-sm text-purple-700">Este produto está na fila do preparo em lote.</p> : null}
      {status === "FAILED" && detail.ai?.error && <p className="text-sm text-red-600">Última tentativa falhou: {detail.ai.error}</p>}

      {photos && photos.length > 0 && (
        <div className="space-y-3 rounded-md border bg-white p-3">
          <p className="text-sm font-medium">Fotos do catálogo do Mercado Livre, conferidas pela IA</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {photos.map(photo => {
              const chosen = chosenPhotos.has(photo.url);
              return (
                <button
                  key={photo.url}
                  type="button"
                  onClick={() => setChosenPhotos(prev => {
                    const next = new Set(prev);
                    if (next.has(photo.url)) next.delete(photo.url);
                    else next.add(photo.url);
                    return next;
                  })}
                  className={`relative overflow-hidden rounded-md border text-left ${chosen ? "ring-2 ring-purple-600" : ""}`}
                >
                  <img src={photo.url} alt="" className="aspect-square w-full bg-white object-contain" />
                  {chosen && <span className="absolute right-1 top-1 rounded-full bg-purple-600 p-0.5 text-white"><Check className="h-3 w-3" /></span>}
                  <div className="space-y-0.5 p-1.5 text-[11px] leading-tight">
                    <p className={photo.verdict?.sameProduct ? "text-green-700" : "text-red-600"}>
                      {photo.verdict ? (photo.verdict.sameProduct ? "Mesma peça" : "Peça diferente") : "Sem conferência"}
                    </p>
                    {photo.verdict?.watermark && <p className="text-red-600">Marca d'água ou logo</p>}
                    <p className="text-gray-500">{photo.width && photo.height ? `${photo.width} × ${photo.height}` : "tamanho ?"}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-500">
            As fotos são do catálogo oficial do Mercado Livre e ficam padronizadas em 1200 × 1200, fundo branco. Confira se mostram exatamente a sua peça.
          </p>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setPhotos(null)}>Cancelar</Button>
            <Button size="sm" onClick={importPhotos} disabled={busy !== null || chosenPhotos.size === 0}>
              {busy === "import" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adicionar {chosenPhotos.size} foto(s)
            </Button>
          </div>
        </div>
      )}

      {suggestion && (
        <div className="space-y-4 rounded-md border bg-white p-3 text-sm">
          {suggestion.title && (
            <label className="flex items-start gap-2">
              <Checkbox checked={useTitle} onCheckedChange={checked => setUseTitle(Boolean(checked))} className="mt-0.5" />
              <span>
                <span className="font-medium">Título:</span> {suggestion.title}
                <span className="ml-1 text-xs text-gray-500">({suggestion.title.length}/60)</span>
              </span>
            </label>
          )}

          {suggestion.package && (
            <label className="flex items-start gap-2">
              <Checkbox checked={usePackage} onCheckedChange={checked => setUsePackage(Boolean(checked))} className="mt-0.5" />
              <span>
                <span className="font-medium">Medidas da embalagem:</span>{" "}
                {suggestion.package.heightCm} × {suggestion.package.widthCm} × {suggestion.package.lengthCm} cm, {formatWeight(suggestion.package.weightG)}
                <span className="block text-xs text-gray-500">{suggestion.package.source}. Confira na peça: medida errada muda o frete.</span>
              </span>
            </label>
          )}

          {suggestion.categoryId && suggestion.categoryId !== detail.category?.id && (
            <label className="flex items-start gap-2">
              <Checkbox checked={useCategory} onCheckedChange={checked => setUseCategory(Boolean(checked))} className="mt-0.5" />
              <span><span className="font-medium">Categoria:</span> {suggestion.categoryName ?? suggestion.categoryId}</span>
            </label>
          )}

          {suggestion.attributes.length > 0 && <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="font-medium">Ficha técnica ({attributes.size} de {suggestion.attributes.length} marcadas)</p>
              <Button size="sm" variant="ghost" onClick={() => setAttributes(new Set(suggestion.attributes.map(attr => attr.id)))}>Marcar todas</Button>
            </div>
            <div className="grid gap-1 sm:grid-cols-2">
              {suggestion.attributes.map(attr => (
                <label key={attr.id} className="flex items-start gap-2 rounded px-1 py-0.5 hover:bg-gray-50">
                  <Checkbox checked={attributes.has(attr.id)} onCheckedChange={() => toggleAttribute(attr.id)} className="mt-0.5" />
                  <span>
                    {attr.name}: <strong>{attr.valueName}</strong>
                    <span className={`ml-1 text-xs ${attr.confidence === "alta" ? "text-green-700" : "text-amber-700"}`}>
                      {SOURCE_LABEL[attr.source] ?? attr.source} · {attr.confidence === "alta" ? "certeza alta" : "conferir"}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            {suggestion.discarded.length > 0 && (
              <details className="text-xs text-gray-500">
                <summary>{suggestion.discarded.length} sugestão(ões) descartada(s) por não valerem nesta categoria</summary>
                <ul className="mt-1 list-disc pl-4">{suggestion.discarded.map(item => <li key={item}>{item}</li>)}</ul>
              </details>
            )}
          </div>}

          {suggestion.description && (
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 font-medium">
                <Checkbox checked={useDescription} onCheckedChange={checked => setUseDescription(Boolean(checked))} />
                Descrição (pode editar)
              </label>
              <Textarea value={description} onChange={event => setDescription(event.target.value)} rows={10} />
            </div>
          )}

          {suggestion.regionalNames.length > 0 && (
            <div>
              <p className="font-medium">Nomes regionais e sinônimos</p>
              <div className="mt-1 flex flex-wrap gap-1">{suggestion.regionalNames.map(name => <Badge key={name} variant="secondary">{name}</Badge>)}</div>
            </div>
          )}
          {suggestion.trends.length > 0 && (
            <div>
              <p className="font-medium">Buscas em alta nesta categoria</p>
              <div className="mt-1 flex flex-wrap gap-1">{suggestion.trends.slice(0, 12).map(term => <Badge key={term} variant="outline">{term}</Badge>)}</div>
            </div>
          )}

          {suggestion.clipScript && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="font-medium">Roteiro de clip (vertical, 30 a 59 s)</p>
                <Button size="sm" variant="ghost" onClick={() => copy(suggestion.clipScript)}><Copy className="h-3.5 w-3.5 mr-1" /> Copiar</Button>
              </div>
              <p className="whitespace-pre-line rounded bg-gray-50 p-2 text-xs text-gray-700">{suggestion.clipScript}</p>
              <p className="text-xs text-gray-500">Grave com a peça real e envie pelo app do Mercado Livre (o envio de clips por sistema não é liberado para esta conta).</p>
            </div>
          )}
          {suggestion.photoChecklist.length > 0 && (
            <div>
              <p className="font-medium">Fotos para tirar</p>
              <ul className="list-disc pl-5 text-xs text-gray-700">{suggestion.photoChecklist.map(item => <li key={item}>{item}</li>)}</ul>
            </div>
          )}
          {suggestion.notes && <p className="rounded bg-amber-50 p-2 text-xs text-amber-800">Conferir: {suggestion.notes}</p>}

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={dismiss} disabled={busy !== null}>
              {busy === "dismiss" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Descartar sugestão
            </Button>
            <Button onClick={apply} disabled={busy !== null}>
              {busy === "apply" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Aplicar selecionados
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
