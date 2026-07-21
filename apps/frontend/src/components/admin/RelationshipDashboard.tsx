import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CheckCircle2, Loader2, MessageCircle, Send, Users } from "lucide-react";

import adminService, {
  type RelationshipDashboard as RelationshipDashboardData,
  type RelationshipMessage,
  type RelationshipMessagesResponse,
} from "@/api/adminService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { RELATIONSHIP_OUTCOMES, outcomeBadgeClass, outcomeLabel } from "./relationshipTemplates";

// Paleta categórica validada (colorblind-safe, ver dataviz).
const CATEGORY_COLORS = ["#4f7cff", "#12a594", "#e8963a", "#e5544b", "#8b5cf6"];
// Cores por resultado (semânticas), alinhadas aos badges.
const OUTCOME_COLORS: Record<string, string> = {
  PENDING: "#94a3b8",
  REPLIED: "#4f7cff",
  SCHEDULED: "#e8963a",
  PURCHASED: "#12a594",
  NO_REPLY: "#e5544b",
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(value: string) {
  const [, month, day] = value.split("-");
  return `${day}/${month}`;
}

function StatTile({
  label,
  value,
  icon: Icon,
  colorClass,
}: {
  label: string;
  value: number;
  icon: typeof Send;
  colorClass: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <Icon className={`h-8 w-8 ${colorClass}`} />
          <div>
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="text-2xl font-bold">{value}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function RelationshipDashboard() {
  const { toast } = useToast();
  const [days, setDays] = useState("30");
  const [dashboard, setDashboard] = useState<RelationshipDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const [history, setHistory] = useState<RelationshipMessagesResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [outcomeFilter, setOutcomeFilter] = useState("all");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.getRelationshipDashboard({ days: Number(days) });
      setDashboard(data);
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
      toast({ title: "Não foi possível carregar o dashboard", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [days, toast]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await adminService.getRelationshipMessages({
        page,
        limit: 15,
        categoryKey: categoryFilter === "all" ? undefined : categoryFilter,
        outcome: outcomeFilter === "all" ? undefined : outcomeFilter,
      });
      setHistory(data);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    } finally {
      setHistoryLoading(false);
    }
  }, [page, categoryFilter, outcomeFilter]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const categoryOptions = useMemo(
    () => dashboard?.coverage.map((c) => ({ key: c.key, name: c.name })) ?? [],
    [dashboard]
  );

  if (loading && !dashboard) {
    return (
      <div className="flex h-56 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-moria-orange" />
      </div>
    );
  }

  const summary = dashboard?.summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Dashboard de relacionamento</h3>
          <p className="text-sm text-muted-foreground">
            Mensagens enviadas, clientes impactados e cobertura das oportunidades.
          </p>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="180">Últimos 180 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Mensagens enviadas" value={summary?.totalSent ?? 0} icon={Send} colorClass="text-blue-600" />
        <StatTile
          label="Clientes impactados"
          value={summary?.customersImpacted ?? 0}
          icon={Users}
          colorClass="text-violet-600"
        />
        <StatTile
          label="Com retorno"
          value={summary?.replied ?? 0}
          icon={CheckCircle2}
          colorClass="text-emerald-600"
        />
        <StatTile
          label="Aguardando confirmação"
          value={summary?.pendingConfirmation ?? 0}
          icon={MessageCircle}
          colorClass="text-orange-600"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Envios por dia</CardTitle>
            <CardDescription>Evolução dos contatos confirmados no período.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dashboard?.timeline ?? []} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatShortDate}
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                    minTickGap={24}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    labelFormatter={(value) => `Dia ${formatShortDate(String(value))}`}
                    formatter={(value: number) => [value, "Envios"]}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#4f7cff"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Envios por categoria</CardTitle>
            <CardDescription>Onde os contatos estão concentrados.</CardDescription>
          </CardHeader>
          <CardContent>
            {(dashboard?.byCategory.length ?? 0) === 0 ? (
              <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                Nenhum envio no período.
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dashboard?.byCategory ?? []}
                    layout="vertical"
                    margin={{ top: 4, right: 16, bottom: 0, left: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tick={{ fontSize: 11 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip formatter={(value: number) => [value, "Envios"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                      {(dashboard?.byCategory ?? []).map((entry, index) => (
                        <Cell key={entry.key} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultado dos contatos</CardTitle>
            <CardDescription>Como os clientes reagiram após o envio.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(dashboard?.byOutcome ?? []).map((entry) => {
                const total = dashboard?.summary.totalSent || 0;
                const pct = total > 0 ? Math.round((entry.total / total) * 100) : 0;
                return (
                  <div key={entry.outcome} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: OUTCOME_COLORS[entry.outcome] }}
                        />
                        {outcomeLabel(entry.outcome)}
                      </span>
                      <span className="font-medium">
                        {entry.total} <span className="text-muted-foreground">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: OUTCOME_COLORS[entry.outcome] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cobertura das oportunidades</CardTitle>
            <CardDescription>Clientes em cada lista já contatados vs. pendentes.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(dashboard?.coverage ?? []).map((item) => {
                const pct =
                  item.totalOpportunities > 0
                    ? Math.round((item.contacted / item.totalOpportunities) * 100)
                    : 0;
                return (
                  <div key={item.key} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: item.accentColor }}
                        />
                        {item.name}
                      </span>
                      <span className="text-muted-foreground">
                        {item.contacted}/{item.totalOpportunities} contatados
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: item.accentColor }}
                      />
                    </div>
                  </div>
                );
              })}
              {(dashboard?.coverage.length ?? 0) === 0 && (
                <div className="text-sm text-muted-foreground">Nenhuma oportunidade ativa no momento.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Histórico de mensagens</CardTitle>
              <CardDescription>Todos os contatos registrados, do mais recente ao mais antigo.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select
                value={categoryFilter}
                onValueChange={(value) => {
                  setCategoryFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-[180px] text-sm">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={outcomeFilter}
                onValueChange={(value) => {
                  setOutcomeFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-[150px] text-sm">
                  <SelectValue placeholder="Resultado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os resultados</SelectItem>
                  {RELATIONSHIP_OUTCOMES.map((outcome) => (
                    <SelectItem key={outcome.value} value={outcome.value}>
                      {outcome.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (history?.items.length ?? 0) === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Nenhuma mensagem registrada com esses filtros.
            </div>
          ) : (
            <>
              <div className="divide-y">
                {history?.items.map((message) => (
                  <HistoryRow key={message.id} message={message} />
                ))}
              </div>

              {history && history.pagination.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Página {history.pagination.page} de {history.pagination.totalPages} · {history.pagination.total}{" "}
                    registros
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Anterior
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page >= history.pagination.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function HistoryRow({ message }: { message: RelationshipMessage }) {
  return (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{message.customerName}</span>
          <Badge variant="outline" className="font-normal">
            {message.categoryName}
          </Badge>
          {message.status === "PENDING" && <Badge variant="secondary">Aguardando confirmação</Badge>}
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">{message.messageBody}</p>
        <div className="text-xs text-muted-foreground">
          {formatDateTime(message.createdAt)}
          {message.adminName ? ` · por ${message.adminName}` : ""}
          {message.templateName ? ` · ${message.templateName}` : ""}
        </div>
      </div>
      <div className="shrink-0">
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${outcomeBadgeClass(message.outcome)}`}>
          {outcomeLabel(message.outcome)}
        </span>
      </div>
    </div>
  );
}
