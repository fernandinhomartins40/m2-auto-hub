import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Switch } from "../ui/switch";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Alert, AlertDescription } from "../ui/alert";
import { Separator } from "../ui/separator";
import { ExternalLink, Loader2, Search, Store, AlertCircle } from "lucide-react";
import {
  marketplaceService,
  type MarketplaceConnection,
  type MarketplaceListing,
  type MarketplaceProviderSlug,
  type CategorySuggestion,
} from "@/api/marketplaceService";
import { useToast } from "../ui/use-toast";

interface Props {
  productId?: string;
  productName?: string;
}

const PROVIDERS: Array<{ slug: MarketplaceProviderSlug; enumKey: "MERCADO_LIVRE" | "SHOPEE"; name: string }> = [
  { slug: "mercadolivre", enumKey: "MERCADO_LIVRE", name: "Mercado Livre" },
  { slug: "shopee", enumKey: "SHOPEE", name: "Shopee" },
];

export function ProductMarketplacePanel({ productId, productName }: Props) {
  const { toast } = useToast();
  const [connections, setConnections] = useState<MarketplaceConnection[]>([]);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState<MarketplaceProviderSlug | null>(null);

  // estado por provider do assistente de categoria
  const [categoryQuery, setCategoryQuery] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<Record<string, CategorySuggestion[]>>({});
  const [selectedCategory, setSelectedCategory] = useState<Record<string, CategorySuggestion | null>>({});
  const [searching, setSearching] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const load = async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const [conns, lists] = await Promise.all([
        marketplaceService.getConnections(),
        marketplaceService.getProductListings(productId).catch(() => []),
      ]);
      setConnections(conns);
      setListings(lists);
    } finally {
      setLoading(false);
    }
  };

  const connFor = (enumKey: string) => connections.find((c) => c.provider === enumKey);
  const listingFor = (enumKey: string) => listings.find((l) => l.provider === enumKey);

  const searchCategories = async (slug: MarketplaceProviderSlug) => {
    const q = categoryQuery[slug] || productName || "";
    if (q.trim().length < 2) {
      toast({ title: "Digite ao menos 2 caracteres para buscar a categoria", variant: "destructive" });
      return;
    }
    setSearching(slug);
    try {
      const data = await marketplaceService.suggestCategories(slug, q);
      setSuggestions((s) => ({ ...s, [slug]: data }));
    } catch (err: any) {
      toast({ title: "Erro ao buscar categorias", description: err?.response?.data?.error, variant: "destructive" });
    } finally {
      setSearching(null);
    }
  };

  const publish = async (slug: MarketplaceProviderSlug) => {
    if (!productId) return;
    const category = selectedCategory[slug];
    setPublishing(slug);
    try {
      await marketplaceService.publish(productId, [slug], category ? { categoryId: category.id } : undefined);
      toast({ title: "Produto publicado!" });
      await load();
    } catch (err: any) {
      toast({
        title: "Falha ao publicar",
        description: err?.response?.data?.error ?? err?.message,
        variant: "destructive",
      });
    } finally {
      setPublishing(null);
    }
  };

  if (!productId) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Salve o produto primeiro para poder publicá-lo nos marketplaces.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {PROVIDERS.map(({ slug, enumKey, name }) => {
        const conn = connFor(enumKey);
        const listing = listingFor(enumKey);
        const connected = conn?.status === "CONNECTED";
        const published = listing?.status === "PUBLISHED";

        return (
          <div key={slug} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-gray-500" />
                <span className="font-medium">{name}</span>
                {published && <Badge className="bg-green-100 text-green-800">Publicado</Badge>}
                {listing?.status === "ERROR" && <Badge className="bg-red-100 text-red-800">Erro</Badge>}
                {listing?.status === "PAUSED" && <Badge className="bg-gray-100 text-gray-700">Pausado</Badge>}
              </div>
              {listing?.externalUrl && (
                <Button size="sm" variant="ghost" onClick={() => window.open(listing.externalUrl!, "_blank")}>
                  <ExternalLink className="h-4 w-4 mr-1" /> Ver anúncio
                </Button>
              )}
            </div>

            {!connected ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Conecte sua conta {name} na aba <strong>Marketplaces</strong> do menu antes de publicar.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {listing?.lastError && (
                  <p className="text-xs text-red-600 break-words">{listing.lastError}</p>
                )}

                {!published && (
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">
                      Categoria no {name} (deixe em branco para detecção automática)
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder={productName || "Buscar categoria..."}
                        value={categoryQuery[slug] ?? ""}
                        onChange={(e) => setCategoryQuery((q) => ({ ...q, [slug]: e.target.value }))}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => searchCategories(slug)}
                        disabled={searching === slug}
                      >
                        {searching === slug ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      </Button>
                    </div>
                    {(suggestions[slug] ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {suggestions[slug].map((cat) => (
                          <Badge
                            key={cat.id}
                            variant={selectedCategory[slug]?.id === cat.id ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => setSelectedCategory((s) => ({ ...s, [slug]: cat }))}
                          >
                            {cat.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch checked={!!published} disabled />
                    <span className="text-sm text-gray-600">
                      {published ? "Anúncio ativo" : "Ainda não publicado"}
                    </span>
                  </div>
                  <Button size="sm" onClick={() => publish(slug)} disabled={publishing === slug}>
                    {publishing === slug && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {published ? "Atualizar anúncio" : "Publicar agora"}
                  </Button>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
