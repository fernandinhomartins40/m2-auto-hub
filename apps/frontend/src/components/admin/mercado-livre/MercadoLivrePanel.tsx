import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Input } from "../../ui/input";
import { Checkbox } from "../../ui/checkbox";
import { Switch } from "../../ui/switch";
import { Label } from "../../ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "../../ui/alert";
import { AdminPageHeader } from "../AdminPageHeader";
import { MlProductEditor } from "./MlProductEditor";
import { MlSettingsCard } from "./MlSettingsCard";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ImageOff,
  Loader2,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Search,
  Send,
  Store,
} from "lucide-react";
import {
  marketplaceService,
  mlPanelService,
  type MlPanelList,
  type MlPanelRow,
  type MlPanelStatus,
} from "@/api/marketplaceService";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";
import { ML_STATUS, STOCK_MODE_LABEL, brl } from "./mlLabels";

const PAGE_SIZE = 25;

const FILTERS: Array<{ value: "ALL" | MlPanelStatus; label: string }> = [
  { value: "ALL", label: "Todos" },
  { value: "READY", label: "Aptos" },
  { value: "PENDING", label: "Pendentes" },
  { value: "PUBLISHED", label: "Publicados" },
  { value: "PAUSED", label: "Pausados" },
  { value: "ERROR", label: "Com erro" },
];

/** Painel do Mercado Livre: produtos aptos, pendências, aprovação e regras da loja. */
export function MercadoLivrePanel() {
  const { toast } = useToast();
  const [data, setData] = useState<MlPanelList | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"ALL" | MlPanelStatus>("ALL");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [includeAll, setIncludeAll] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await mlPanelService.list({
        q: query || undefined,
        scope: includeAll ? "all" : "default",
        status,
        page,
        pageSize: PAGE_SIZE,
      }));
    } catch (err) {
      toast({ title: "Erro ao carregar produtos", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [query, includeAll, status, page, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  // Busca com pequena espera para não consultar a cada tecla.
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setQuery(search.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const readyOnPage = (data?.items ?? []).filter(row => row.status === "READY");
  const allReadySelected = readyOnPage.length > 0 && readyOnPage.every(row => selected.has(row.productId));

  const publishSelected = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Publicar ${selected.size} produto(s) no Mercado Livre? Os anúncios ficam visíveis para os compradores na hora.`)) return;
    setPublishing(true);
    try {
      const results = await mlPanelService.approveMany([...selected]);
      const failed = results.filter(result => !result.ok);
      toast({
        title: `${results.length - failed.length} produto(s) publicado(s)`,
        description: failed.length ? `${failed.length} com erro: ${failed[0].error}` : undefined,
        variant: failed.length ? "destructive" : "default",
      });
      setSelected(new Set());
      void load();
    } catch (err) {
      toast({ title: "Erro ao publicar", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  };

  const run = async (row: MlPanelRow, action: () => Promise<unknown>, success: string) => {
    setBusyId(row.productId);
    try {
      await action();
      toast({ title: success });
      void load();
    } catch (err) {
      toast({ title: "Não foi possível concluir", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const publishOne = (row: MlPanelRow) => {
    if (!confirm(`Publicar "${row.title}" no Mercado Livre por ${brl(row.price)}?`)) return;
    void run(row, () => mlPanelService.approve(row.productId), "Produto publicado no Mercado Livre");
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={Store}
        title="Mercado Livre"
        description="Complete os dados dos produtos, aprove o que vai para o Mercado Livre e defina as regras de preço, estoque e prazo."
        actions={
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        }
      />

      {data && !data.connected && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Conta do Mercado Livre desconectada</AlertTitle>
          <AlertDescription>
            Conecte a conta em Catálogo → Marketplaces para consultar categorias e publicar.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="rules">Regras da loja</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map(filter => (
              <Button
                key={filter.value}
                size="sm"
                variant={status === filter.value ? "default" : "outline"}
                onClick={() => {
                  setStatus(filter.value);
                  setPage(1);
                }}
              >
                {filter.label}
                {data && <span className="ml-1.5 opacity-70">{data.counts[filter.value]}</span>}
              </Button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Buscar por nome, código ou marca"
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="ml-include-all"
                checked={includeAll}
                onCheckedChange={checked => {
                  setIncludeAll(checked);
                  setPage(1);
                }}
              />
              <Label htmlFor="ml-include-all" className="text-sm">Incluir produtos sem estoque</Label>
            </div>
          </div>

          {readyOnPage.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-green-50 p-3">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={allReadySelected}
                  onCheckedChange={checked => {
                    setSelected(prev => {
                      const next = new Set(prev);
                      readyOnPage.forEach(row => (checked ? next.add(row.productId) : next.delete(row.productId)));
                      return next;
                    });
                  }}
                />
                Selecionar os aptos desta página
              </label>
              <Button size="sm" disabled={selected.size === 0 || publishing} onClick={publishSelected}>
                {publishing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Aprovar e publicar {selected.size > 0 ? `(${selected.size})` : ""}
              </Button>
            </div>
          )}

          <Card>
            <CardContent className="p-0">
              {loading && !data ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
              ) : !data || data.items.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <Store className="mx-auto h-10 w-10 text-gray-300" />
                  <p className="mt-2">Nenhum produto neste filtro.</p>
                </div>
              ) : (
                <ul className="divide-y">
                  {data.items.map(row => {
                    const badge = ML_STATUS[row.status];
                    const busy = busyId === row.productId;
                    return (
                      <li key={row.productId} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <Checkbox
                            checked={selected.has(row.productId)}
                            disabled={row.status !== "READY"}
                            onCheckedChange={() => toggle(row.productId)}
                            aria-label="Selecionar"
                          />
                          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-gray-100">
                            {row.image ? (
                              <img src={row.image} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center"><ImageOff className="h-5 w-5 text-gray-300" /></div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className={badge.color} variant="secondary">{badge.label}</Badge>
                              <Badge variant="outline">{STOCK_MODE_LABEL[row.stockMode]}</Badge>
                            </div>
                            <button
                              type="button"
                              onClick={() => setEditing(row.productId)}
                              className="mt-1 block max-w-full truncate text-left font-medium hover:underline"
                            >
                              {row.title}
                            </button>
                            <p className="text-xs text-gray-500">
                              {row.sku} · loja {row.stock} un · à venda {row.quantity} un · site {brl(row.sitePrice)} → ML {brl(row.price)}
                            </p>
                            {row.status === "PENDING" && (
                              <p className="text-xs text-amber-700">Falta: {row.missing.join(", ")}</p>
                            )}
                            {row.listing?.lastError && (
                              <p className="text-xs text-red-600 break-words">{row.listing.lastError}</p>
                            )}
                            {row.status === "PAUSED" && row.listing?.pausedBySystem && (
                              <p className="text-xs text-gray-500">Pausado automaticamente por falta de estoque. Volta sozinho quando o estoque voltar.</p>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-1 sm:justify-end">
                          <Button size="sm" variant="outline" onClick={() => setEditing(row.productId)}>Editar</Button>
                          {row.status === "READY" && (
                            <Button size="sm" disabled={busy} onClick={() => publishOne(row)}>
                              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                              Publicar
                            </Button>
                          )}
                          {row.listing?.externalId && row.status === "PAUSED" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Reativar"
                              disabled={busy}
                              onClick={() => run(row, () => mlPanelService.activateListing(row.listing!.id), "Anúncio reativado")}
                            >
                              <PlayCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {row.listing?.externalId && row.status === "PUBLISHED" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Pausar"
                              disabled={busy}
                              onClick={() => run(row, () => marketplaceService.pauseListing(row.listing!.id), "Anúncio pausado")}
                            >
                              <PauseCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {row.listing?.externalUrl && (
                            <Button size="icon" variant="ghost" title="Ver no Mercado Livre" onClick={() => window.open(row.listing!.externalUrl!, "_blank")}>
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {data && data.total > PAGE_SIZE && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Página {page} de {totalPages} · {data.total} produtos</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Próxima</Button>
              </div>
            </div>
          )}
          {data?.truncated && (
            <p className="text-xs text-gray-500">Mostrando os primeiros 3.000 produtos. Use a busca para encontrar os demais.</p>
          )}
        </TabsContent>

        <TabsContent value="rules" className="mt-4">
          <MlSettingsCard />
        </TabsContent>
      </Tabs>

      {editing && (
        <MlProductEditor
          productId={editing}
          onClose={() => setEditing(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}
