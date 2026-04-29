import { useEffect, useState } from "react";
import {
  Cake,
  CalendarClock,
  Crown,
  HeartHandshake,
  Loader2,
  MessageCircle,
  RefreshCw,
  ShoppingBag,
  TrendingDown,
  Wrench,
} from "lucide-react";

import adminService, {
  type CustomerRelationshipInsight,
  type CustomerRelationshipInsightsResponse,
} from "@/api/adminService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

function getFirstName(name: string) {
  return name.trim().split(" ")[0] || name;
}

function buildWhatsAppMessage(kind: "birthday" | "inactive-sales" | "inactive-revisions" | "post-sale" | "vip", customer: CustomerRelationshipInsight) {
  const firstName = getFirstName(customer.name);

  switch (kind) {
    case "birthday":
      return `Olá ${firstName}! Passando para desejar um feliz aniversário em nome de toda a equipe. Que seu dia seja excelente e conte com a gente sempre que precisar.`;
    case "inactive-sales":
      return `Olá ${firstName}! Tudo bem? Percebemos que faz um tempo desde sua última compra com a gente e gostaríamos de nos colocar à disposição para ajudar no que precisar para o seu veículo.`;
    case "inactive-revisions":
      return `Olá ${firstName}! Tudo certo? Faz um tempo desde sua última revisão conosco. Se quiser, podemos te ajudar a programar a próxima manutenção do seu veículo.`;
    case "vip":
      return `Olá ${firstName}! Sentimos sua falta por aqui. Como cliente especial, queremos reforçar que seguimos à disposição para cuidar do seu veículo com prioridade no atendimento.`;
    default:
      return `Olá ${firstName}! Tudo bem? Estamos entrando em contato no pós-venda para saber se ficou tudo certo com seu atendimento recente e nos colocar à disposição.`;
  }
}

function openWhatsApp(kind: "birthday" | "inactive-sales" | "inactive-revisions" | "post-sale" | "vip", customer: CustomerRelationshipInsight) {
  const url = `https://api.whatsapp.com/send?phone=${getWhatsappNumber(customer.whatsapp)}&text=${encodeURIComponent(
    buildWhatsAppMessage(kind, customer)
  )}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function RelationshipListCard({
  title,
  description,
  icon: Icon,
  items,
  emptyMessage,
  accentClass,
  whatsappKind,
  metricLabel,
}: {
  title: string;
  description: string;
  icon: typeof Cake;
  items: CustomerRelationshipInsight[];
  emptyMessage: string;
  accentClass: string;
  whatsappKind: "birthday" | "inactive-sales" | "inactive-revisions" | "post-sale" | "vip";
  metricLabel: (customer: CustomerRelationshipInsight) => string;
}) {
  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className={`h-4 w-4 ${accentClass}`} />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((customer) => (
              <div key={customer.id} className="rounded-xl border p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium text-foreground">{customer.name}</div>
                      <Badge variant="secondary">{customer.level}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">{customer.email}</div>
                    <div className="text-sm text-muted-foreground">{formatPhone(customer.whatsapp)}</div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                        {metricLabel(customer)}
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

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openWhatsApp(whatsappKind, customer)}
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      WhatsApp
                    </Button>
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

export function CustomerRelationshipContent() {
  const [data, setData] = useState<CustomerRelationshipInsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [inactivityDays, setInactivityDays] = useState("90");
  const [postSaleDays, setPostSaleDays] = useState("15");
  const [birthdayWindowDays, setBirthdayWindowDays] = useState("30");

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
    void loadInsights();
  }, [inactivityDays, postSaleDays, birthdayWindowDays]);

  const summary = data?.summary;

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <Card>
        <CardHeader>
          <AdminPageHeader
            icon={HeartHandshake}
            title="Relacionamento com o Cliente"
            description="Acompanhe oportunidades de pos-venda, retencao e contato ativo com clientes."
            actions={
              <>
            <div className="hidden">
              <CardTitle className="flex items-center gap-2">
                <HeartHandshake className="h-5 w-5 text-moria-orange" />
                Relacionamento com o Cliente
              </CardTitle>
              <CardDescription>
                Acompanhe oportunidades de pós-venda, retenção e contato ativo com clientes.
              </CardDescription>
            </div>

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

              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => void loadInsights()} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Atualizar
              </Button>
            </div>
              </>
            }
          />
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <Cake className="h-8 w-8 text-pink-600" />
              <div>
                <div className="text-sm text-muted-foreground">Aniversariantes</div>
                <div className="text-2xl font-bold">{summary?.birthdays ?? 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <ShoppingBag className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-sm text-muted-foreground">Sem vendas</div>
                <div className="text-2xl font-bold">{summary?.inactiveSales ?? 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <Wrench className="h-8 w-8 text-orange-600" />
              <div>
                <div className="text-sm text-muted-foreground">Sem revisões</div>
                <div className="text-2xl font-bold">{summary?.inactiveRevisions ?? 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <CalendarClock className="h-8 w-8 text-emerald-600" />
              <div>
                <div className="text-sm text-muted-foreground">Pós-venda</div>
                <div className="text-2xl font-bold">{summary?.postSaleFollowUps ?? 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <Crown className="h-8 w-8 text-violet-600" />
              <div>
                <div className="text-sm text-muted-foreground">VIP em risco</div>
                <div className="text-2xl font-bold">{summary?.vipAtRisk ?? 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading && !data ? (
        <div className="flex h-56 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-moria-orange" />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <RelationshipListCard
            title="Aniversariantes próximos"
            description="Use essa lista para fortalecer o vínculo com clientes em datas especiais."
            icon={Cake}
            items={data?.birthdays || []}
            emptyMessage="Nenhum aniversariante encontrado para a janela selecionada."
            accentClass="text-pink-600"
            whatsappKind="birthday"
            metricLabel={(customer) =>
              customer.daysUntilBirthday === 0
                ? "Aniversaria hoje"
                : `Faltam ${customer.daysUntilBirthday} dias`
            }
          />

          <RelationshipListCard
            title="Clientes sem novas vendas"
            description="Clientes com histórico de compra, mas sem nova venda dentro do período."
            icon={TrendingDown}
            items={data?.inactiveSales || []}
            emptyMessage="Nenhum cliente com vendas inativas nesse período."
            accentClass="text-blue-600"
            whatsappKind="inactive-sales"
            metricLabel={(customer) => `${customer.daysSinceLastOrder || 0} dias sem comprar`}
          />

          <RelationshipListCard
            title="Clientes sem novas revisões"
            description="Clientes que já revisaram conosco, mas estão sem retorno de oficina."
            icon={Wrench}
            items={data?.inactiveRevisions || []}
            emptyMessage="Nenhum cliente com revisões inativas nesse período."
            accentClass="text-orange-600"
            whatsappKind="inactive-revisions"
            metricLabel={(customer) => `${customer.daysSinceLastRevision || 0} dias sem revisão`}
          />

          <RelationshipListCard
            title="Fila de pós-venda"
            description="Clientes com atendimento recente para confirmar satisfação e abrir nova conversa."
            icon={CalendarClock}
            items={data?.postSaleFollowUps || []}
            emptyMessage="Nenhum cliente em janela de pós-venda recente."
            accentClass="text-emerald-600"
            whatsappKind="post-sale"
            metricLabel={(customer) =>
              customer.daysSinceLastInteraction === 0
                ? "Atendimento hoje"
                : `${customer.daysSinceLastInteraction || 0} dias do atendimento`
            }
          />

          <RelationshipListCard
            title="Clientes VIP em risco"
            description="Clientes de maior valor que estão há bastante tempo sem retornar."
            icon={Crown}
            items={data?.vipAtRisk || []}
            emptyMessage="Nenhum cliente VIP em risco na faixa atual."
            accentClass="text-violet-600"
            whatsappKind="vip"
            metricLabel={(customer) => `${customer.daysSinceLastInteraction || 0} dias sem retorno`}
          />
        </div>
      )}
    </div>
  );
}
