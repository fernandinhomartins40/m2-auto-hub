import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Clock, Loader2, ThumbsDown, ThumbsUp, Wrench } from "lucide-react";

import customerService, { type PublicQuotePayload } from "@/api/customerService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

const formatDateTime = (value?: string | null) => {
  if (!value) return "Nao informado";
  return new Date(value).toLocaleString("pt-BR");
};

export default function PublicQuoteApprovalPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PublicQuotePayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<"approve" | "reject" | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setError("Link invalido.");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const payload = await customerService.getPublicQuoteByToken(token);
        setData(payload);
      } catch (fetchError: any) {
        setError(
          fetchError.response?.data?.error ||
            fetchError.message ||
            "Nao foi possivel carregar o orcamento."
        );
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [token]);

  const handleDecision = async (decision: "approve" | "reject") => {
    if (!token) return;

    try {
      setIsSubmitting(decision);
      const response =
        decision === "approve"
          ? await customerService.approvePublicQuote(token)
          : await customerService.rejectPublicQuote(token);

      setResultMessage(response.message);
      if (data) {
        setData({
          ...data,
          quote: {
            ...data.quote,
            status: decision === "approve" ? "APPROVED" : "REJECTED",
            orderStatus: decision === "approve" ? response.orderStatus || "IN_PRODUCTION" : data.quote.orderStatus,
            quoteApprovedAt: decision === "approve" ? new Date().toISOString() : data.quote.quoteApprovedAt,
          },
          canApprove: false,
          approvalExpired: false,
        });
      }
    } catch (submitError: any) {
      setError(
        submitError.response?.data?.error ||
          submitError.message ||
          "Nao foi possivel registrar sua decisao."
      );
    } finally {
      setIsSubmitting(null);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-16">
        <div className="mx-auto flex max-w-3xl items-center justify-center">
          <Loader2 className="mr-3 h-6 w-6 animate-spin text-primary" />
          <span>Carregando orcamento...</span>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>Link indisponivel</CardTitle>
              <CardDescription>{error || "Nao foi possivel abrir o orcamento."}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/" className="text-primary underline">
                Voltar para a pagina inicial
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const { quote, approvalExpired, canApprove } = data;
  const total = quote.items.reduce((sum, item) => {
    const price = item.quotedPrice ?? item.price ?? 0;
    return sum + price * item.quantity;
  }, 0);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-3">
                <Wrench className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Aprovacao de orcamento</CardTitle>
                <CardDescription>
                  Orcamento #{quote.id.slice(0, 8).toUpperCase()} para {data.customer.name}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border bg-white p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Status
                </p>
                <p className="mt-2 text-lg font-semibold">{quote.status}</p>
              </div>
              <div className="rounded-lg border bg-white p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Respondido em
                </p>
                <p className="mt-2 text-lg font-semibold">{formatDateTime(quote.quotedAt)}</p>
              </div>
              <div className="rounded-lg border bg-white p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Valido ate
                </p>
                <p className="mt-2 text-lg font-semibold">
                  {formatDateTime(quote.publicApprovalExpiresAt)}
                </p>
              </div>
            </div>

            {resultMessage ? (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
                {resultMessage}
              </div>
            ) : null}

            {approvalExpired ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
                Este link de aprovacao expirou. Entre em contato com a loja para receber um novo link.
              </div>
            ) : null}

            {quote.status === "APPROVED" ? (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-5 w-5" />
                  Orcamento ja aprovado
                </div>
                <p className="mt-2 text-sm">
                  Seu orcamento ja foi convertido em pedido. Status atual: {quote.orderStatus || "IN_PRODUCTION"}.
                </p>
              </div>
            ) : null}

            {quote.status === "REJECTED" ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
                Este orcamento foi recusado.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Itens do orcamento</CardTitle>
            <CardDescription>Confira os servicos e valores antes de decidir.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {quote.items.map((item) => {
              const unitPrice = item.quotedPrice ?? item.price ?? 0;
              return (
                <div key={item.id} className="rounded-lg border bg-white p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">
                        {item.quantity}x {item.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Valor unitario: {formatCurrency(unitPrice)}
                      </p>
                    </div>
                    <div className="text-right font-semibold">{formatCurrency(unitPrice * item.quantity)}</div>
                  </div>
                </div>
              );
            })}

            <div className="flex items-center justify-between rounded-lg bg-primary/5 p-4">
              <span className="font-medium">Total</span>
              <span className="text-xl font-bold text-primary">{formatCurrency(total)}</span>
            </div>

            {quote.quoteNotes ? (
              <div className="rounded-lg border bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Observacoes da loja
                </p>
                <p className="mt-2 text-sm">{quote.quoteNotes}</p>
              </div>
            ) : null}

            {canApprove ? (
              <div className="flex flex-col gap-3 pt-4 sm:flex-row">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={isSubmitting !== null}
                  onClick={() => void handleDecision("approve")}
                >
                  {isSubmitting === "approve" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ThumbsUp className="mr-2 h-4 w-4" />
                  )}
                  Aprovar e virar pedido
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 text-red-600 hover:text-red-700"
                  disabled={isSubmitting !== null}
                  onClick={() => void handleDecision("reject")}
                >
                  {isSubmitting === "reject" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ThumbsDown className="mr-2 h-4 w-4" />
                  )}
                  Rejeitar
                </Button>
              </div>
            ) : quote.status === "QUOTED" && approvalExpired ? (
              <div className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <Clock className="mr-2 h-4 w-4" />
                Link expirado. Solicite um novo envio para a loja.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
