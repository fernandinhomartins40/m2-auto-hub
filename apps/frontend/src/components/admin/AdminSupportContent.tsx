import { useEffect, useMemo, useState, type ComponentType } from "react";
import { MessageCircle, Phone, RefreshCw, Send, UserCheck, Users, Clock3, AlertCircle, Shield, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { ScrollArea } from "../ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { supportService, type SupportTicket, type AdminSupportStats, TicketPriority, TicketStatus } from "@/api/supportService";
import { faqService, type SupportConfig } from "@/api/faqService";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

const statusOptions = [
  { value: "ALL", label: "Todos os status" },
  { value: TicketStatus.OPEN, label: "Aberto" },
  { value: TicketStatus.IN_PROGRESS, label: "Em andamento" },
  { value: TicketStatus.WAITING_CUSTOMER, label: "Aguardando cliente" },
  { value: TicketStatus.WAITING_SUPPORT, label: "Aguardando suporte" },
  { value: TicketStatus.RESOLVED, label: "Resolvido" },
  { value: TicketStatus.CLOSED, label: "Fechado" },
];

const priorityOptions = [
  { value: "ALL", label: "Todas as prioridades" },
  { value: TicketPriority.LOW, label: "Baixa" },
  { value: TicketPriority.MEDIUM, label: "Média" },
  { value: TicketPriority.HIGH, label: "Alta" },
  { value: TicketPriority.URGENT, label: "Urgente" },
];

const categoryLabels: Record<string, string> = {
  ORDER_ISSUE: "Pedido",
  PRODUCT_QUESTION: "Produto",
  PAYMENT_ISSUE: "Pagamento",
  DELIVERY_ISSUE: "Entrega",
  REVISION_QUESTION: "Revisão",
  TECHNICAL_SUPPORT: "Suporte técnico",
  SUGGESTION: "Sugestão",
  COMPLAINT: "Reclamação",
  OTHER: "Outro",
};

const priorityLabels: Record<string, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  URGENT: "Urgente",
};

const statusLabels: Record<string, string> = {
  OPEN: "Aberto",
  IN_PROGRESS: "Em andamento",
  WAITING_CUSTOMER: "Aguardando cliente",
  WAITING_SUPPORT: "Aguardando suporte",
  RESOLVED: "Resolvido",
  CLOSED: "Fechado",
};

const statusBadgeClass: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-indigo-100 text-indigo-800",
  WAITING_CUSTOMER: "bg-amber-100 text-amber-800",
  WAITING_SUPPORT: "bg-orange-100 text-orange-800",
  RESOLVED: "bg-emerald-100 text-emerald-800",
  CLOSED: "bg-slate-100 text-slate-800",
};

const priorityBadgeClass: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-blue-100 text-blue-800",
  HIGH: "bg-orange-100 text-orange-800",
  URGENT: "bg-red-100 text-red-800",
};

export function AdminSupportContent() {
  const { admin } = useAdminAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<AdminSupportStats | null>(null);
  const [config, setConfig] = useState<SupportConfig | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingTicketId, setLoadingTicketId] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [savingTicket, setSavingTicket] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [assignedFilter, setAssignedFilter] = useState<"ALL" | "ME" | "UNASSIGNED">("ALL");
  const [replyMessage, setReplyMessage] = useState("");
  const [internalOnly, setInternalOnly] = useState(false);
  const [draftStatus, setDraftStatus] = useState<TicketStatus | "">("");
  const [draftPriority, setDraftPriority] = useState<TicketPriority | "">("");
  const [draftAssignedToId, setDraftAssignedToId] = useState<string>("");

  useEffect(() => {
    void loadInitialData();
  }, []);

  useEffect(() => {
    if (!selectedTicket) {
      setDraftStatus("");
      setDraftPriority("");
      setDraftAssignedToId("");
      return;
    }

    setDraftStatus(selectedTicket.status);
    setDraftPriority(selectedTicket.priority);
    setDraftAssignedToId(selectedTicket.assignedToId || "");
  }, [selectedTicket]);

  useEffect(() => {
    void reloadTickets();
  }, [statusFilter, priorityFilter, assignedFilter, admin?.id]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [ticketsResult, statsResult, configResult] = await Promise.all([
        supportService.getAdminTickets({ limit: 100 }),
        supportService.getAdminStats(),
        faqService.getSupportConfig(),
      ]);

      setTickets(ticketsResult.data);
      setStats(statsResult);
      setConfig(configResult);

      if (ticketsResult.data.length > 0) {
        void openTicket(ticketsResult.data[0].id);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar suporte",
        description: error.response?.data?.error || "Não foi possível carregar a central de suporte.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const reloadTickets = async () => {
    const filters = {
      limit: 100,
      status: statusFilter !== "ALL" ? (statusFilter as TicketStatus) : undefined,
      priority: priorityFilter !== "ALL" ? (priorityFilter as TicketPriority) : undefined,
      assignedToId:
        assignedFilter === "ME"
          ? admin?.id
          : assignedFilter === "UNASSIGNED"
          ? "__unassigned__"
          : undefined,
    };

    const result = await supportService.getAdminTickets(filters);
    setTickets(result.data);
  };

  const reloadStats = async () => {
    const result = await supportService.getAdminStats();
    setStats(result);
  };

  const openTicket = async (ticketId: string) => {
    try {
      setLoadingTicketId(ticketId);
      const ticket = await supportService.getAdminTicketById(ticketId);
      setSelectedTicket(ticket);
    } catch (error: any) {
      toast({
        title: "Erro ao abrir ticket",
        description: error.response?.data?.error || "Não foi possível carregar a conversa.",
        variant: "destructive",
      });
    } finally {
      setLoadingTicketId(null);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await Promise.all([reloadTickets(), reloadStats()]);
      if (selectedTicket) {
        await openTicket(selectedTicket.id);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTicket = async () => {
    if (!selectedTicket) {
      return;
    }

    setSavingTicket(true);
    try {
      const payload: {
        status?: TicketStatus;
        priority?: TicketPriority;
        assignedToId?: string;
      } = {};

      if (draftStatus && draftStatus !== selectedTicket.status) {
        payload.status = draftStatus;
      }

      if (draftPriority && draftPriority !== selectedTicket.priority) {
        payload.priority = draftPriority;
      }

      if ((draftAssignedToId || "") !== (selectedTicket.assignedToId || "")) {
        payload.assignedToId = draftAssignedToId;
      }

      if (Object.keys(payload).length === 0) {
        toast({
          title: "Nenhuma alteração",
          description: "Não há mudanças pendentes para salvar.",
        });
        return;
      }

      const updated = await supportService.updateAdminTicket(selectedTicket.id, payload);
      setSelectedTicket((current) =>
        current
          ? {
              ...current,
              ...updated,
              messages: current.messages || [],
            }
          : updated
      );
      await Promise.all([reloadTickets(), reloadStats()]);

      toast({
        title: "Ticket atualizado",
        description: "As informações do ticket foram salvas com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar ticket",
        description: error.response?.data?.error || "Não foi possível atualizar o ticket.",
        variant: "destructive",
      });
    } finally {
      setSavingTicket(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || !replyMessage.trim()) {
      return;
    }

    setSendingMessage(true);
    try {
      await supportService.addAdminMessage(selectedTicket.id, {
        message: replyMessage.trim(),
        isInternal: internalOnly,
      });

      setReplyMessage("");
      setInternalOnly(false);
      await Promise.all([openTicket(selectedTicket.id), reloadTickets(), reloadStats()]);

      toast({
        title: internalOnly ? "Nota interna adicionada" : "Mensagem enviada",
        description: internalOnly
          ? "A observação ficou registrada apenas para a equipe."
          : "O cliente já pode visualizar a resposta no painel dele.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao enviar mensagem",
        description: error.response?.data?.error || "Não foi possível enviar a mensagem.",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleAssignToMe = () => {
    if (!admin?.id) {
      return;
    }
    setDraftAssignedToId(admin.id);
  };

  const openCustomerWhatsApp = () => {
    if (!selectedTicket?.customer?.phone) {
      toast({
        title: "WhatsApp indisponível",
        description: "Esse cliente não possui telefone cadastrado.",
        variant: "destructive",
      });
      return;
    }

    const phone = selectedTicket.customer.phone.replace(/\D/g, "");
    const message = `Olá ${selectedTicket.customer.name}! Aqui é da equipe M2 Auto Center sobre o ticket "${selectedTicket.subject}". Vamos continuar por aqui se preferir.`;
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`, "_blank");
  };

  const openSupportWhatsApp = () => {
    if (!config) {
      return;
    }

    const baseMessage = selectedTicket
      ? `Olá! Quero transferir o atendimento do ticket ${selectedTicket.id.slice(0, 8)} para o WhatsApp.`
      : config.contacts.whatsapp.message;

    window.open(
      `https://api.whatsapp.com/send?phone=${config.contacts.whatsapp.number}&text=${encodeURIComponent(baseMessage)}`,
      "_blank"
    );
  };

  const filteredTickets = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return tickets.filter((ticket) => {
      if (assignedFilter === "ME" && ticket.assignedToId !== admin?.id) {
        return false;
      }

      if (assignedFilter === "UNASSIGNED" && ticket.assignedToId) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return (
        ticket.subject.toLowerCase().includes(normalizedSearch) ||
        ticket.customer?.name?.toLowerCase().includes(normalizedSearch) ||
        ticket.customer?.email?.toLowerCase().includes(normalizedSearch) ||
        ticket.customer?.phone?.includes(searchTerm)
      );
    });
  }, [tickets, searchTerm, assignedFilter, admin?.id]);

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Central de Suporte</h2>
          <p className="text-muted-foreground">
            Atenda tickets do painel do cliente, responda dentro da plataforma e migre para WhatsApp quando necessário.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={openSupportWhatsApp} disabled={!config}>
            <ExternalLink className="mr-2 h-4 w-4" />
            WhatsApp do suporte
          </Button>
          <Button variant="outline" onClick={() => void handleRefresh()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {stats ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <MetricCard title="Total de tickets" value={stats.total} icon={MessageCircle} />
          <MetricCard title="Em aberto" value={stats.open} icon={AlertCircle} />
          <MetricCard title="Sem responsável" value={stats.unassigned} icon={Users} />
          <MetricCard title="SLA médio" value={stats.avgResponseTime || 0} suffix="h" icon={Clock3} />
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="min-h-[720px] min-w-0">
          <CardHeader className="space-y-4">
            <div>
              <CardTitle>Fila de atendimento</CardTitle>
              <CardDescription>Filtre os tickets e abra a conversa correspondente.</CardDescription>
            </div>

            <div className="space-y-3">
              <Input
                placeholder="Buscar por assunto, cliente, e-mail ou telefone"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />

              <div className="grid grid-cols-1 gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={assignedFilter} onValueChange={(value) => setAssignedFilter(value as "ALL" | "ME" | "UNASSIGNED")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos os tickets</SelectItem>
                    <SelectItem value="ME">Atribuídos a mim</SelectItem>
                    <SelectItem value="UNASSIGNED">Sem responsável</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <ScrollArea className="h-[520px] pr-4">
              <div className="space-y-3">
                {filteredTickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => void openTicket(ticket.id)}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      selectedTicket?.id === ticket.id ? "border-moria-orange bg-orange-50/60" : "hover:border-slate-300"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-semibold">{ticket.subject}</p>
                      <Badge className={statusBadgeClass[ticket.status] || "bg-slate-100 text-slate-800"}>
                        {statusLabels[ticket.status] || ticket.status}
                      </Badge>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="secondary">{categoryLabels[ticket.category] || ticket.category}</Badge>
                      <Badge className={priorityBadgeClass[ticket.priority] || "bg-slate-100 text-slate-800"}>
                        {priorityLabels[ticket.priority] || ticket.priority}
                      </Badge>
                    </div>

                    <p className="mt-3 text-sm text-slate-700">{ticket.customer?.name}</p>
                    <p className="text-xs text-slate-500">{ticket.customer?.email}</p>
                    <p className="mt-2 text-xs text-slate-400">
                      {ticket._count?.messages || 0} mensagens • {new Date(ticket.updatedAt).toLocaleString("pt-BR")}
                    </p>
                  </button>
                ))}

                {!loading && filteredTickets.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">
                    Nenhum ticket encontrado com os filtros atuais.
                  </div>
                ) : null}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle>
                    {selectedTicket ? selectedTicket.subject : "Selecione um ticket"}
                  </CardTitle>
                  <CardDescription>
                    {selectedTicket
                      ? `Ticket #${selectedTicket.id.slice(0, 8)} • ${selectedTicket.customer?.name || "Cliente"}`
                      : "Abra um ticket à esquerda para conversar e gerenciar o atendimento."}
                  </CardDescription>
                </div>

                {selectedTicket ? (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={handleAssignToMe}>
                      <UserCheck className="mr-2 h-4 w-4" />
                      Assumir ticket
                    </Button>
                    <Button variant="outline" size="sm" onClick={openCustomerWhatsApp}>
                      <Phone className="mr-2 h-4 w-4" />
                      WhatsApp do cliente
                    </Button>
                  </div>
                ) : null}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {selectedTicket ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <InfoBlock label="Cliente" value={selectedTicket.customer?.name || "Não informado"} />
                    <InfoBlock label="Telefone" value={selectedTicket.customer?.phone || "Não informado"} />
                    <InfoBlock label="E-mail" value={selectedTicket.customer?.email || "Não informado"} />
                    <InfoBlock
                      label="Responsável"
                      value={selectedTicket.assignedTo?.name || "Ainda não atribuído"}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <Select value={draftStatus} onValueChange={(value) => setDraftStatus(value as TicketStatus)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions
                          .filter((option) => option.value !== "ALL")
                          .map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>

                    <Select value={draftPriority} onValueChange={(value) => setDraftPriority(value as TicketPriority)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Prioridade" />
                      </SelectTrigger>
                      <SelectContent>
                        {priorityOptions
                          .filter((option) => option.value !== "ALL")
                          .map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>

                    <Select value={draftAssignedToId || "__unassigned__"} onValueChange={(value) => setDraftAssignedToId(value === "__unassigned__" ? "" : value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__unassigned__">Sem responsável</SelectItem>
                        {admin ? <SelectItem value={admin.id}>{admin.name} (eu)</SelectItem> : null}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => void handleSaveTicket()} disabled={savingTicket}>
                      {savingTicket ? "Salvando..." : "Salvar status e atribuição"}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed p-10 text-center text-slate-500">
                  Escolha um ticket para iniciar o atendimento.
                </div>
              )}
            </CardContent>
          </Card>

          {selectedTicket ? (
            <Card>
              <CardHeader>
                <CardTitle>Conversa</CardTitle>
                <CardDescription>
                  Responda no painel para manter o histórico entre lojista e cliente. Se precisar, registre observações internas só para a equipe.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <ScrollArea className="h-[360px] rounded-xl border p-4">
                  <div className="space-y-4">
                    {(selectedTicket.messages || []).map((message) => {
                      const isAdminMessage = message.senderType === "admin";
                      return (
                        <div
                          key={message.id}
                          className={`max-w-full sm:max-w-[85%] rounded-2xl px-4 py-3 ${
                            message.isInternal
                              ? "border border-dashed border-amber-300 bg-amber-50 text-amber-900"
                              : isAdminMessage
                              ? "ml-auto bg-moria-orange text-white"
                              : "bg-slate-100 text-slate-900"
                          }`}
                        >
                          <div className="mb-1 flex items-center gap-2 text-xs font-medium">
                            <span>
                              {message.isInternal
                                ? "Observação interna"
                                : isAdminMessage
                                ? selectedTicket.assignedTo?.name || "Equipe"
                                : selectedTicket.customer?.name || "Cliente"}
                            </span>
                            {message.isInternal ? <Shield className="h-3.5 w-3.5" /> : null}
                          </div>
                          <p className="whitespace-pre-wrap text-sm">{message.message}</p>
                          <p className={`mt-2 text-[11px] ${message.isInternal || !isAdminMessage ? "text-slate-500" : "text-white/80"}`}>
                            {new Date(message.createdAt).toLocaleString("pt-BR")}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>

                <div className="space-y-3">
                  <Textarea
                    value={replyMessage}
                    onChange={(event) => setReplyMessage(event.target.value)}
                    placeholder="Escreva a resposta para o cliente ou uma observação interna..."
                    rows={5}
                  />

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <Checkbox checked={internalOnly} onCheckedChange={(checked) => setInternalOnly(Boolean(checked))} />
                      Registrar como observação interna
                    </label>

                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={openSupportWhatsApp} disabled={!config}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Mudar para WhatsApp
                      </Button>
                      <Button onClick={() => void handleSendMessage()} disabled={sendingMessage || !replyMessage.trim()}>
                        <Send className="mr-2 h-4 w-4" />
                        {sendingMessage ? "Enviando..." : internalOnly ? "Salvar observação" : "Enviar resposta"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  suffix = "",
}: {
  title: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
  suffix?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">
              {value}
              {suffix}
            </p>
          </div>
          <Icon className="h-8 w-8 text-moria-orange" />
        </div>
      </CardContent>
    </Card>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}
