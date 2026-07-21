import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Cake,
  CalendarClock,
  Check,
  Crown,
  HeartHandshake,
  History,
  Loader2,
  MessageCircle,
  RefreshCw,
  RotateCw,
  Settings2,
  ShoppingBag,
  TrendingDown,
  Wrench,
} from "lucide-react";

import adminService, {
  type CustomerRelationshipInsight,
  type CustomerRelationshipInsightsResponse,
  type RelationshipCategoryResult,
  type RelationshipMessageOutcome,
} from "@/api/adminService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { AdminPageHeader } from "./AdminPageHeader";
import { RelationshipSettings } from "./RelationshipSettings";
import { RelationshipDashboard } from "./RelationshipDashboard";
import {
  RELATIONSHIP_OUTCOMES,
  getRelationshipIcon,
  outcomeBadgeClass,
  outcomeLabel,
  renderTemplate,
} from "./relationshipTemplates";

function formatDate(value: string | null) {
  if (!value) return "Sem registro";
  return new Date(value).toLocaleDateString("pt-BR");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }
  if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  if (digits.length === 13 && digits.startsWith("55")) {
    const national = digits.slice(2);
    return formatPhone(national);
  }
  return phone;
}

function getWhatsappNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function openWhatsApp(message: string, customer: CustomerRelationshipInsight) {
  const url = `https://api.whatsapp.com/send?phone=${getWhatsappNumber(customer.whatsapp)}&text=${encodeURIComponent(
    message
  )}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

type CategoryTemplate = RelationshipCategoryResult["templates"][number];

function pickTemplate(templates: CategoryTemplate[], selectedId: string | undefined): CategoryTemplate | null {
  if (templates.length === 0) return null;
  if (selectedId) {
    const found = templates.find((template) => template.id === selectedId);
    if (found) return found;
  }
  return templates.find((template) => template.isDefault) ?? templates[0];
}

function metricLabelFor(category: RelationshipCategoryResult, customer: CustomerRelationshipInsight): string {
  switch (category.key) {
    case "birthdays":
      return customer.daysUntilBirthday === 0
        ? "Aniversaria hoje"
        : `Faltam ${customer.daysUntilBirthday} dias`;
    case "inactive-sales":
      return `${customer.daysSinceLastOrder ?? 0} dias sem comprar`;
    case "inactive-revisions":
      return `${customer.daysSinceLastRevision ?? 0} dias sem revisão`;
    case "post-sale":
      return customer.daysSinceLastInteraction === 0
        ? "Atendimento hoje"
        : `${customer.daysSinceLastInteraction ?? 0} dias do atendimento`;
    case "vip":
      return `${customer.daysSinceLastInteraction ?? 0} dias sem retorno`;
    default: {
      const sortBy = category.sortBy as keyof CustomerRelationshipInsight;
      const value = customer[sortBy];
      if (typeof value === "number") return `${value}`;
      return category.name;
    }
  }
}

function lastContactLabel(customer: CustomerRelationshipInsight): string | null {
  if (customer.daysSinceLastContact === null) return null;
  if (customer.daysSinceLastContact === 0) return "Contatado hoje";
  if (customer.daysSinceLastContact === 1) return "Contatado ontem";
  return `Contatado há ${customer.daysSinceLastContact} dias`;
}

/** Estado do fluxo de envio por cliente dentro do card. */
type SendState = {
  status: "idle" | "pending" | "sent";
  messageId?: string;
  outcome?: RelationshipMessageOutcome;
};

function CategoryCard({ category }: { category: RelationshipCategoryResult }) {
  const { toast } = useToast();
  const Icon = getRelationshipIcon(category.icon);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(
    () => category.templates.find((t) => t.isDefault)?.id ?? category.templates[0]?.id
  );
  const [sendState, setSendState] = useState<Record<string, SendState>>({});

  const activeTemplate = pickTemplate(category.templates, selectedTemplateId);
  const hasMultipleTemplates = category.templates.length > 1;

  const buildMessage = (customer: CustomerRelationshipInsight) => {
    const body = activeTemplate?.body ?? `Olá ${customer.name.split(" ")[0]}!`;
    return renderTemplate(body, customer);
  };

  // 1º clique: registra o envio (PENDING), abre o WhatsApp, botão vira "Confirmar".
  const handleSend = async (customer: CustomerRelationshipInsight) => {
    const message = buildMessage(customer);
    openWhatsApp(message, customer);
    try {
      const record = await adminService.createRelationshipMessage({
        customerId: customer.id,
        categoryId: category.id,
        templateId: activeTemplate?.id ?? null,
        messageBody: message,
      });
      setSendState((prev) => ({ ...prev, [customer.id]: { status: "pending", messageId: record.id } }));
    } catch (error) {
      console.error("Erro ao registrar envio:", error);
      toast({ title: "Não foi possível registrar o envio", variant: "destructive" });
    }
  };

  const handleResend = (customer: CustomerRelationshipInsight) => {
    openWhatsApp(buildMessage(customer), customer);
  };

  const handleConfirm = async (customerId: string) => {
    const state = sendState[customerId];
    if (!state?.messageId) return;
    try {
      await adminService.confirmRelationshipMessage(state.messageId);
      setSendState((prev) => ({ ...prev, [customerId]: { ...state, status: "sent" } }));
      toast({ title: "Envio confirmado" });
    } catch (error) {
      console.error("Erro ao confirmar envio:", error);
      toast({ title: "Não foi possível confirmar o envio", variant: "destructive" });
    }
  };

  const handleOutcome = async (customerId: string, outcome: RelationshipMessageOutcome) => {
    const state = sendState[customerId];
    if (!state?.messageId) return;
    setSendState((prev) => ({ ...prev, [customerId]: { ...state, outcome } }));
    try {
      await adminService.updateRelationshipMessageOutcome(state.messageId, { outcome });
    } catch (error) {
      console.error("Erro ao registrar resultado:", error);
      toast({ title: "Não foi possível registrar o resultado", variant: "destructive" });
    }
  };

  return (
    <Card className="border-border/70">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon className="h-4 w-4" style={{ color: category.accentColor }} />
              {category.name}
              <Badge variant="secondary">{category.count}</Badge>
            </CardTitle>
            <CardDescription>{category.description}</CardDescription>
          </div>
          {hasMultipleTemplates && (
            <div className="w-full sm:w-56">
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Template" />
                </SelectTrigger>
                <SelectContent>
                  {category.templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                      {template.isDefault ? " (padrão)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {category.customers.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            Nenhum cliente nesta categoria no momento.
          </div>
        ) : (
          <div className="space-y-3">
            {category.customers.map((customer) => (
              <div key={customer.id} className="rounded-xl border p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium text-foreground">{customer.name}</div>
                      <Badge variant="secondary">{customer.level}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">{customer.email}</div>
                    <div className="text-sm text-muted-foreground">{formatPhone(customer.whatsapp)}</div>
                    {sendState[customer.id]?.status !== "sent" && lastContactLabel(customer) && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                          <History className="h-3 w-3" />
                          {lastContactLabel(customer)}
                        </span>
                        {customer.lastContactOutcome && customer.lastContactOutcome !== "PENDING" && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${outcomeBadgeClass(
                              customer.lastContactOutcome
                            )}`}
                          >
                            {outcomeLabel(customer.lastContactOutcome)}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                        {metricLabelFor(category, customer)}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                        {customer.deliveredOrders} vendas
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                        {customer.completedRevisions} revisões
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                        {formatCurrency(customer.totalSpent)}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {(() => {
                      const state = sendState[customer.id]?.status ?? "idle";
                      if (state === "idle") {
                        return (
                          <Button type="button" size="sm" variant="outline" onClick={() => void handleSend(customer)}>
                            <MessageCircle className="mr-2 h-4 w-4" />
                            WhatsApp
                          </Button>
                        );
                      }
                      return (
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {state === "pending" ? (
                            <Button type="button" size="sm" onClick={() => void handleConfirm(customer.id)}>
                              <Check className="mr-2 h-4 w-4" />
                              Confirmar envio
                            </Button>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <Check className="h-3 w-3" />
                              Enviado
                            </Badge>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleResend(customer)}
                          >
                            <RotateCw className="mr-2 h-4 w-4" />
                            Reenviar
                          </Button>
                        </div>
                      );
                    })()}

                    {sendState[customer.id]?.status === "sent" && (
                      <Select
                        value={sendState[customer.id]?.outcome ?? "PENDING"}
                        onValueChange={(value) => void handleOutcome(customer.id, value as RelationshipMessageOutcome)}
                      >
                        <SelectTrigger className="h-8 w-[150px] text-xs">
                          <SelectValue placeholder="Resultado" />
                        </SelectTrigger>
                        <SelectContent>
                          {RELATIONSHIP_OUTCOMES.map((outcome) => (
                            <SelectItem key={outcome.value} value={outcome.value}>
                              {outcome.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                  <div>Última venda: {formatDate(customer.lastOrderAt)}</div>
                  <div>Última revisão: {formatDate(customer.lastRevisionAt)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const SUMMARY_TILES: Array<{
  key: string;
  label: string;
  icon: typeof Cake;
  colorClass: string;
}> = [
  { key: "birthdays", label: "Aniversariantes", icon: Cake, colorClass: "text-pink-600" },
  { key: "inactive-sales", label: "Sem vendas", icon: ShoppingBag, colorClass: "text-blue-600" },
  { key: "inactive-revisions", label: "Sem revisões", icon: Wrench, colorClass: "text-orange-600" },
  { key: "post-sale", label: "Pós-venda", icon: CalendarClock, colorClass: "text-emerald-600" },
  { key: "vip", label: "VIP em risco", icon: Crown, colorClass: "text-violet-600" },
];

export function CustomerRelationshipContent() {
  const [data, setData] = useState<CustomerRelationshipInsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [inactivityDays, setInactivityDays] = useState("90");
  const [postSaleDays, setPostSaleDays] = useState("15");
  const [birthdayWindowDays, setBirthdayWindowDays] = useState("30");
  const [tab, setTab] = useState("opportunities");

  const loadInsights = async () => {
    setLoading(true);
    try {
      const response = await adminService.getCustomerRelationshipInsights({
        inactivityDays: Number(inactivityDays),
        postSaleDays: Number(postSaleDays),
        birthdayWindowDays: Number(birthdayWindowDays),
      });
      setData(response);
    } catch (error) {
      console.error("Error loading relationship insights:", error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "opportunities") {
      void loadInsights();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inactivityDays, postSaleDays, birthdayWindowDays, tab]);

  const categories = useMemo(() => data?.categories ?? [], [data]);

  const summaryByKey = (key: string) =>
    categories.find((category) => category.key === key)?.count ?? 0;

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <Card>
        <CardHeader>
          <AdminPageHeader
            icon={HeartHandshake}
            title="Relacionamento com o Cliente"
            description="Acompanhe oportunidades de pos-venda, retencao e contato ativo com clientes."
            actions={
              tab === "opportunities" ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Sem retorno em</div>
                    <Select value={inactivityDays} onValueChange={setInactivityDays}>
                      <SelectTrigger className="w-full sm:w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 dias</SelectItem>
                        <SelectItem value="60">60 dias</SelectItem>
                        <SelectItem value="90">90 dias</SelectItem>
                        <SelectItem value="120">120 dias</SelectItem>
                        <SelectItem value="180">180 dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Pós-venda recente</div>
                    <Select value={postSaleDays} onValueChange={setPostSaleDays}>
                      <SelectTrigger className="w-full sm:w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 dias</SelectItem>
                        <SelectItem value="15">15 dias</SelectItem>
                        <SelectItem value="21">21 dias</SelectItem>
                        <SelectItem value="30">30 dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Aniversários em</div>
                    <Select value={birthdayWindowDays} onValueChange={setBirthdayWindowDays}>
                      <SelectTrigger className="w-full sm:w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 dias</SelectItem>
                        <SelectItem value="15">15 dias</SelectItem>
                        <SelectItem value="30">30 dias</SelectItem>
                        <SelectItem value="45">45 dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full self-end sm:w-auto"
                    onClick={() => void loadInsights()}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Atualizar
                  </Button>
                </div>
              ) : null
            }
          />
        </CardHeader>
      </Card>

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="opportunities">
            <HeartHandshake className="mr-2 h-4 w-4" />
            Oportunidades
          </TabsTrigger>
          <TabsTrigger value="dashboard">
            <BarChart3 className="mr-2 h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings2 className="mr-2 h-4 w-4" />
            Tipos e mensagens
          </TabsTrigger>
        </TabsList>

        <TabsContent value="opportunities" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {SUMMARY_TILES.map((tile) => (
              <Card key={tile.key}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <tile.icon className={`h-8 w-8 ${tile.colorClass}`} />
                    <div>
                      <div className="text-sm text-muted-foreground">{tile.label}</div>
                      <div className="text-2xl font-bold">{summaryByKey(tile.key)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {loading && !data ? (
            <div className="flex h-56 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-moria-orange" />
            </div>
          ) : (
            <div className="grid gap-6 xl:grid-cols-2">
              {categories.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="dashboard">
          {tab === "dashboard" && <RelationshipDashboard />}
        </TabsContent>

        <TabsContent value="settings">
          <RelationshipSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
