import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { AdminPageHeader } from "./AdminPageHeader";
import { MarketplaceConnectWizard } from "./MarketplaceConnectWizard";
import {
  Store,
  RefreshCw,
  Loader2,
  ExternalLink,
  PauseCircle,
  PlayCircle,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Plug,
} from "lucide-react";
import {
  marketplaceService,
  type MarketplaceConnection,
  type MarketplaceListing,
  type MarketplaceProviderSlug,
} from "@/api/marketplaceService";
import { useToast } from "@/hooks/use-toast";

const PROVIDER_META: Record<
  "MERCADO_LIVRE" | "SHOPEE",
  { slug: MarketplaceProviderSlug; name: string; color: string }
> = {
  MERCADO_LIVRE: { slug: "mercadolivre", name: "Mercado Livre", color: "bg-yellow-400" },
  SHOPEE: { slug: "shopee", name: "Shopee", color: "bg-orange-500" },
};

function statusBadge(status: MarketplaceConnection["status"]) {
  switch (status) {
    case "CONNECTED":
      return { label: "Conectado", color: "bg-green-100 text-green-800", icon: CheckCircle2 };
    case "PENDING":
      return { label: "Pendente", color: "bg-amber-100 text-amber-800", icon: Clock };
    case "TOKEN_EXPIRED":
      return { label: "Token expirado", color: "bg-red-100 text-red-800", icon: AlertCircle };
    case "ERROR":
      return { label: "Erro", color: "bg-red-100 text-red-800", icon: AlertCircle };
    default:
      return { label: "Desconectado", color: "bg-gray-100 text-gray-700", icon: Plug };
  }
}

export function MarketplacesContent() {
  const { toast } = useToast();
  const [connections, setConnections] = useState<MarketplaceConnection[]>([]);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [wizardProvider, setWizardProvider] = useState<MarketplaceProviderSlug | null>(null);
  const [wizardConnection, setWizardConnection] = useState<MarketplaceConnection | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [conns, lists] = await Promise.all([
        marketplaceService.getConnections(),
        marketplaceService.getListings().catch(() => []),
      ]);
      setConnections(conns);
      setListings(lists);
    } catch {
      toast({ title: "Erro ao carregar marketplaces", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // Mostra feedback ao voltar do callback OAuth (?connected= / ?error=)
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected")) {
      toast({ title: "Conta conectada com sucesso!" });
    } else if (params.get("error")) {
      toast({
        title: "Falha ao conectar",
        description: decodeURIComponent(params.get("error") || ""),
        variant: "destructive",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openWizard = (conn: MarketplaceConnection) => {
    setWizardProvider(PROVIDER_META[conn.provider].slug);
    setWizardConnection(conn);
  };

  const handleDisconnect = async (conn: MarketplaceConnection) => {
    if (!confirm(`Desconectar ${PROVIDER_META[conn.provider].name}? Os anúncios não serão removidos.`)) return;
    try {
      await marketplaceService.disconnect(PROVIDER_META[conn.provider].slug);
      toast({ title: "Desconectado" });
      void load();
    } catch {
      toast({ title: "Erro ao desconectar", variant: "destructive" });
    }
  };

  const listingsFor = (provider: string) => listings.filter((l) => l.provider === provider);

  const syncListing = async (id: string) => {
    setBusyId(id);
    try {
      await marketplaceService.syncListing(id);
      toast({ title: "Anúncio sincronizado" });
      void load();
    } catch (err: any) {
      toast({ title: "Erro ao sincronizar", description: err?.response?.data?.error, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const pauseListing = async (id: string) => {
    setBusyId(id);
    try {
      await marketplaceService.pauseListing(id);
      void load();
    } catch {
      toast({ title: "Erro ao pausar", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const closeListing = async (id: string) => {
    if (!confirm("Encerrar este anúncio no marketplace?")) return;
    setBusyId(id);
    try {
      await marketplaceService.closeListing(id);
      void load();
    } catch {
      toast({ title: "Erro ao encerrar", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const listingStatusColor = (status: MarketplaceListing["status"]) => {
    switch (status) {
      case "PUBLISHED":
        return "bg-green-100 text-green-800";
      case "PAUSED":
        return "bg-gray-100 text-gray-700";
      case "OUT_OF_SYNC":
        return "bg-amber-100 text-amber-800";
      case "ERROR":
        return "bg-red-100 text-red-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={Store}
        title="Marketplaces"
        description="Conecte sua loja ao Mercado Livre e à Shopee, publique produtos e acompanhe as vendas."
        actions={
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        }
      />

      {/* Cards de conexão */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {connections.map((conn) => {
          const meta = PROVIDER_META[conn.provider];
          const badge = statusBadge(conn.status);
          const BadgeIcon = badge.icon;
          const providerListings = listingsFor(conn.provider);
          const active = providerListings.filter((l) => l.status === "PUBLISHED").length;

          return (
            <Card key={conn.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg ${meta.color} flex items-center justify-center`}>
                      <Store className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{meta.name}</CardTitle>
                      {conn.sellerNickname && (
                        <p className="text-sm text-gray-500">{conn.sellerNickname}</p>
                      )}
                    </div>
                  </div>
                  <Badge className={badge.color} variant="secondary">
                    <BadgeIcon className="h-3 w-3 mr-1" />
                    {badge.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Anúncios ativos</p>
                    <p className="font-semibold">{active}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Última sincronização</p>
                    <p className="font-semibold">
                      {conn.lastSyncAt ? new Date(conn.lastSyncAt).toLocaleString("pt-BR") : "—"}
                    </p>
                  </div>
                </div>

                {conn.lastError && (
                  <p className="text-xs text-red-600 break-words">{conn.lastError}</p>
                )}

                <Separator />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => openWizard(conn)}
                    className="bg-moria-orange hover:bg-moria-orange/90"
                  >
                    {conn.status === "CONNECTED" ? "Gerenciar" : "Conectar"}
                  </Button>
                  {conn.status === "CONNECTED" && (
                    <Button size="sm" variant="outline" onClick={() => handleDisconnect(conn)}>
                      Desconectar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Lista de anúncios */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Anúncios publicados</CardTitle>
        </CardHeader>
        <CardContent>
          {listings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Store className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-2">Nenhum produto publicado ainda.</p>
              <p className="text-sm">
                Abra um produto no catálogo e use a aba "Marketplaces" para publicar.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {listings.map((listing) => (
                <div
                  key={listing.id}
                  className="flex items-center justify-between border rounded-lg p-3 gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{PROVIDER_META[listing.provider].name}</Badge>
                      <Badge className={listingStatusColor(listing.status)} variant="secondary">
                        {listing.status}
                      </Badge>
                    </div>
                    <p className="font-medium truncate mt-1">{listing.product?.name ?? listing.productId}</p>
                    <p className="text-xs text-gray-500">
                      SKU {listing.product?.sku} · estoque {listing.product?.stock ?? "—"}
                      {listing.lastError && <span className="text-red-600"> · {listing.lastError}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {listing.externalUrl && (
                      <Button size="icon" variant="ghost" onClick={() => window.open(listing.externalUrl!, "_blank")}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={busyId === listing.id}
                      onClick={() => syncListing(listing.id)}
                      title="Sincronizar"
                    >
                      {busyId === listing.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                    {listing.status === "PAUSED" ? (
                      <Button size="icon" variant="ghost" onClick={() => syncListing(listing.id)} title="Reativar">
                        <PlayCircle className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button size="icon" variant="ghost" onClick={() => pauseListing(listing.id)} title="Pausar">
                        <PauseCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-red-600"
                      onClick={() => closeListing(listing.id)}
                      title="Encerrar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {wizardProvider && (
        <MarketplaceConnectWizard
          isOpen={!!wizardProvider}
          provider={wizardProvider}
          connection={wizardConnection}
          onClose={() => {
            setWizardProvider(null);
            setWizardConnection(null);
          }}
          onUpdated={load}
        />
      )}
    </div>
  );
}
