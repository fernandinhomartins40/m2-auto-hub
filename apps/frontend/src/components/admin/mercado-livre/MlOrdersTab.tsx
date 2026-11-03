import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { ExternalLink, Loader2, PackageCheck, Printer, RefreshCw, ShoppingCart, Truck } from "lucide-react";
import { mlPanelService, type MlOrder, type MlOrderAction, type MlOrderList, type MlOrderStage } from "@/api/marketplaceService";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";
import { brl } from "./mlLabels";

const PAGE_SIZE = 25;

const STAGES: Record<MlOrderStage, { label: string; color: string }> = {
  AWAITING_PAYMENT: { label: "Aguardando pagamento", color: "bg-gray-100 text-gray-700" },
  AWAITING_SUPPLIER: { label: "Aguardando fornecedor", color: "bg-orange-100 text-orange-800" },
  TO_PICK: { label: "Separar", color: "bg-amber-100 text-amber-800" },
  READY_TO_SHIP: { label: "Pronto para despachar", color: "bg-blue-100 text-blue-800" },
  SHIPPED: { label: "Despachado", color: "bg-indigo-100 text-indigo-800" },
  DELIVERED: { label: "Entregue", color: "bg-green-100 text-green-800" },
  CANCELLED: { label: "Cancelado", color: "bg-red-100 text-red-800" },
};

const FILTERS: Array<{ value: "OPEN" | "ALL" | MlOrderStage; label: string }> = [
  { value: "OPEN", label: "Em andamento" },
  { value: "AWAITING_SUPPLIER", label: "Aguardando fornecedor" },
  { value: "TO_PICK", label: "Separar" },
  { value: "READY_TO_SHIP", label: "Prontos" },
  { value: "SHIPPED", label: "Despachados" },
  { value: "DELIVERED", label: "Entregues" },
  { value: "CANCELLED", label: "Cancelados" },
  { value: "AWAITING_PAYMENT", label: "Sem pagamento" },
  { value: "ALL", label: "Todas" },
];

const dateTime = (value: string) =>
  new Date(value).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Tempo até o prazo de despacho, com a cor da urgência. */
function deadline(order: MlOrder, now: number) {
  if (!order.dispatchBy || !order.open) return null;
  const ms = new Date(order.dispatchBy).getTime() - now;
  const hours = Math.floor(Math.abs(ms) / 3_600_000);
  const minutes = Math.floor((Math.abs(ms) % 3_600_000) / 60_000);
  const span = hours >= 24 ? `${Math.floor(hours / 24)}d ${hours % 24}h` : `${hours}h ${minutes}min`;
  if (ms < 0) return { text: `Atrasado há ${span}`, color: "text-red-700 bg-red-50" };
  if (ms < 3 * 3_600_000) return { text: `Faltam ${span}`, color: "text-orange-700 bg-orange-50" };
  return { text: `Faltam ${span}`, color: "text-gray-700 bg-gray-50" };
}

/** Vendas do Mercado Livre: o que pedir ao fornecedor, o que separar e o prazo de cada envio. */
export function MlOrdersTab() {
  const { toast } = useToast();
  const [data, setData] = useState<MlOrderList | null>(null);
  const [stage, setStage] = useState<"OPEN" | "ALL" | MlOrderStage>("OPEN");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await mlPanelService.listOrders(stage, page));
    } catch (err) {
      toast({ title: "Erro ao carregar vendas", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [stage, page, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  // Contagem regressiva e lista sempre atual: relógio a cada minuto, vendas a cada 2.
  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 60_000);
    const refresh = setInterval(() => void load(), 120_000);
    return () => {
      clearInterval(clock);
      clearInterval(refresh);
    };
  }, [load]);

  const act = async (order: MlOrder, action: () => Promise<unknown>, success?: string) => {
    setBusyId(order.id);
    try {
      await action();
      if (success) toast({ title: success });
      void load();
    } catch (err) {
      toast({ title: "Não foi possível concluir", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const move = (order: MlOrder, action: MlOrderAction, success: string) =>
    act(order, () => mlPanelService.moveOrder(order.id, action), success);

  const syncAll = async () => {
    setLoading(true);
    try {
      await mlPanelService.syncOrders();
      await load();
      toast({ title: "Vendas conferidas com o Mercado Livre" });
    } catch (err) {
      toast({ title: "Erro ao conferir vendas", description: getErrorMessage(err), variant: "destructive" });
      setLoading(false);
    }
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(filter => (
            <Button
              key={filter.value}
              size="sm"
              variant={stage === filter.value ? "default" : "outline"}
              onClick={() => {
                setStage(filter.value);
                setPage(1);
              }}
            >
              {filter.label}
              {data && <span className="ml-1.5 opacity-70">{data.counts[filter.value] ?? 0}</span>}
            </Button>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={syncAll} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Conferir com o Mercado Livre
        </Button>
      </div>

      {data && data.supplierNeeds.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="h-4 w-4 text-orange-600" />
              Pedir ao fornecedor
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.supplierNeeds.map(group => (
              <div key={group.supplier} className="rounded-md border p-3">
                <p className="font-medium">{group.supplier}</p>
                <ul className="mt-1 space-y-0.5 text-sm text-gray-700">
                  {group.items.map(item => <li key={item.title}>{item.quantity} × {item.title}</li>)}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {loading && !data ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
          ) : !data || data.items.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <Truck className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-2">Nenhuma venda neste filtro.</p>
              <p className="text-sm">As vendas aparecem aqui sozinhas assim que o Mercado Livre avisa.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {data.items.map(order => {
                const badge = STAGES[order.stage];
                const due = deadline(order, now);
                const busy = busyId === order.id;
                return (
                  <li key={order.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-start">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={badge.color} variant="secondary">{badge.label}</Badge>
                        <span className="text-sm font-medium">Venda {order.externalOrderId}</span>
                        {due && <span className={`rounded px-2 py-0.5 text-xs font-medium ${due.color}`}>{due.text}</span>}
                      </div>
                      <p className="text-xs text-gray-500">
                        {order.buyerNickname ?? "Comprador"} · {brl(order.total)}
                        {order.soldAt && ` · vendido em ${dateTime(order.soldAt)}`}
                        {order.dispatchBy && order.open && ` · despachar até ${dateTime(order.dispatchBy)}`}
                        {order.trackingNumber && ` · rastreio ${order.trackingNumber}`}
                      </p>
                      <ul className="space-y-0.5 text-sm">
                        {order.items.map((item, index) => (
                          <li key={`${item.productId ?? item.title}-${index}`}>
                            {item.quantity} × {item.title}
                            {item.fromSupplier > 0 && (
                              <span className="ml-1 text-xs text-orange-700">
                                ({item.fromStore} da loja, {item.fromSupplier} do fornecedor{item.supplier ? `: ${item.supplier}` : ""})
                              </span>
                            )}
                            {!item.productId && <span className="ml-1 text-xs text-red-600">(produto não encontrado no cadastro)</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1 lg:justify-end">
                      {order.stage === "AWAITING_SUPPLIER" && (
                        <Button size="sm" disabled={busy} onClick={() => move(order, "SUPPLIER_RECEIVED", "Mercadoria recebida. Agora é separar.")}>
                          <PackageCheck className="h-4 w-4 mr-1" /> Mercadoria chegou
                        </Button>
                      )}
                      {order.stage === "TO_PICK" && (
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => move(order, "PICKED", "Pacote separado")}>
                          <PackageCheck className="h-4 w-4 mr-1" /> Separado
                        </Button>
                      )}
                      {order.stage === "READY_TO_SHIP" && (
                        <Button size="sm" variant="ghost" disabled={busy} onClick={() => move(order, "BACK_TO_PICK", "Voltou para separar")}>
                          Voltar para separar
                        </Button>
                      )}
                      {order.open && order.shipmentId && order.stage !== "AWAITING_SUPPLIER" && (
                        <Button size="sm" disabled={busy} onClick={() => act(order, () => mlPanelService.openLabel(order.id))}>
                          <Printer className="h-4 w-4 mr-1" /> Etiqueta
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" title="Atualizar com o Mercado Livre" disabled={busy}
                        onClick={() => act(order, () => mlPanelService.refreshOrder(order.id), "Venda atualizada")}>
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" title="Abrir no Mercado Livre"
                        onClick={() => window.open(`https://www.mercadolivre.com.br/vendas/${order.externalOrderId}/detalhe`, "_blank")}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
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
          <span>Página {page} de {totalPages} · {data.total} vendas</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Próxima</Button>
          </div>
        </div>
      )}
      <p className="text-xs text-gray-500">
        A venda reserva o estoque assim que o pagamento é aprovado. Cancelamentos devolvem o estoque sozinhos.
        O prazo de despacho é o informado pelo Mercado Livre.
      </p>
    </div>
  );
}
