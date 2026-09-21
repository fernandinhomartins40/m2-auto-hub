import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Separator } from "../ui/separator";
import {
  Plus,
  Search,
  RefreshCw,
  TrendingUp,
  Package,
  Truck,
  Gift,
  Calendar,
  Users,
  Tag,
  BarChart3,
  CheckCircle,
  Clock,
  Edit,
  MessageCircle,
  Trash2,
  Loader2,
} from "lucide-react";
import { usePromotions } from "../../hooks/usePromotions";
import { AdminPageHeader } from "./AdminPageHeader";
import { PromotionModal } from "./PromotionModal";
import type { AdvancedPromotion } from "../../types/promotions";

function formatPrice(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function getPromotionTypeIcon(type: string) {
  switch (type) {
    case "PERCENTAGE":
    case "FIXED":
    case "TIERED_DISCOUNT":
    case "PROGRESSIVE_DISCOUNT":
      return <TrendingUp className="h-6 w-6" />;
    case "BUY_ONE_GET_ONE":
    case "BUY_X_GET_Y":
    case "BUNDLE_DISCOUNT":
    case "CATEGORY_COMBO":
      return <Package className="h-6 w-6" />;
    case "FREE_SHIPPING":
      return <Truck className="h-6 w-6" />;
    default:
      return <Gift className="h-6 w-6" />;
  }
}

function getPromotionTypeLabel(type: string) {
  const labels: Record<string, string> = {
    PERCENTAGE: "Desconto em %",
    FIXED: "Desconto fixo",
    BUY_ONE_GET_ONE: "Leve 2 pague 1",
    BUY_X_GET_Y: "Compre e ganhe",
    TIERED_DISCOUNT: "Desconto escalonado",
    CASHBACK: "Cashback",
    FREE_SHIPPING: "Frete grátis",
    BUNDLE_DISCOUNT: "Combo promocional",
    LOYALTY_POINTS: "Pontos de fidelidade",
    PROGRESSIVE_DISCOUNT: "Desconto progressivo",
    TIME_LIMITED_FLASH: "Oferta relâmpago",
    QUANTITY_BASED: "Por quantidade",
    CATEGORY_COMBO: "Combo por categoria",
  };

  return labels[type] || "Promoção";
}

function getPromotionDates(promotion: AdvancedPromotion) {
  const fallback = promotion as unknown as { startDate?: string; endDate?: string };
  return {
    startDate: promotion.schedule?.startDate || fallback.startDate,
    endDate: promotion.schedule?.endDate || fallback.endDate,
  };
}

function getRewardLabel(promotion: AdvancedPromotion) {
  const rewardType = promotion.rewards?.primary?.type;
  const rewardValue = promotion.rewards?.primary?.value ?? 0;

  switch (rewardType) {
    case "PERCENTAGE":
      return `${rewardValue}% OFF`;
    case "FIXED":
      return formatPrice(rewardValue);
    case "FREE_SHIPPING":
      return "Frete grátis";
    case "LOYALTY_POINTS":
      return `${rewardValue} pontos`;
    case "CASHBACK":
      return `${formatPrice(rewardValue)} de cashback`;
    case "BUY_ONE_GET_ONE":
      return "Leve 2 pague 1";
    case "BUY_X_GET_Y":
      return "Compre e ganhe";
    case "BUNDLE_DISCOUNT":
      return "Combo com desconto";
    case "TIERED_DISCOUNT":
    case "PROGRESSIVE_DISCOUNT":
      return "Desconto progressivo";
    default:
      return promotion.badgeText || "Campanha ativa";
  }
}

function getTargetLabel(promotion: AdvancedPromotion) {
  switch (promotion.target) {
    case "ALL_PRODUCTS":
      return "Todos os produtos";
    case "SPECIFIC_PRODUCTS":
      return promotion.targetProductIds?.length
        ? `${promotion.targetProductIds.length} produto(s) selecionado(s)`
        : "Produtos específicos";
    case "CATEGORY":
      return promotion.targetCategories?.length
        ? promotion.targetCategories.join(", ")
        : "Categorias específicas";
    case "BRAND":
      return promotion.targetBrands?.length ? promotion.targetBrands.join(", ") : "Marcas específicas";
    case "PRICE_RANGE":
      return "Faixa de preço";
    case "NEW_ARRIVALS":
      return "Novidades";
    case "CLEARANCE":
      return "Queima de estoque";
    case "CUSTOMER_SEGMENT":
      return promotion.customerSegments?.length
        ? promotion.customerSegments.join(", ")
        : "Segmentos de clientes";
    default:
      return "Regra personalizada";
  }
}

export function PromotionsManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<AdvancedPromotion | null>(null);

  const {
    promotions,
    isLoading,
    createPromotion,
    updatePromotion,
    deletePromotion,
    activatePromotion,
    deactivatePromotion,
    refreshAnalytics,
  } = usePromotions({ includeInactive: true });

  const handleOpenModal = (promotion?: AdvancedPromotion) => {
    setEditingPromotion(promotion || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPromotion(null);
  };

  const handleSavePromotion = async (promotionData: Partial<any>) => {
    try {
      if (editingPromotion) {
        await updatePromotion(editingPromotion.id, promotionData);
      } else {
        await createPromotion(promotionData as any);
      }
      handleCloseModal();
    } catch (error) {
      console.error("Error saving promotion:", error);
    }
  };

  const handleDeletePromotion = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta promoção?")) {
      try {
        await deletePromotion(id);
      } catch (error) {
        console.error("Error deleting promotion:", error);
      }
    }
  };

  const handleTogglePromotion = async (promotion: AdvancedPromotion) => {
    try {
      if (promotion.isActive) {
        await deactivatePromotion(promotion.id);
      } else {
        await activatePromotion(promotion.id);
      }
    } catch (error) {
      console.error("Error toggling promotion:", error);
    }
  };

  const filteredPromotions = promotions.filter((promotion) => {
    const matchesSearch =
      promotion.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      promotion.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (promotion.code || "").toLowerCase().includes(searchTerm.toLowerCase());

    const now = new Date();
    const { startDate, endDate } = getPromotionDates(promotion);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    const isExpired = end ? now > end : false;
    const isUpcoming = start ? now < start : false;

    let matchesStatus = true;
    if (statusFilter === "active") {
      matchesStatus = promotion.isActive && !isExpired && !isUpcoming;
    } else if (statusFilter === "inactive") {
      matchesStatus = !promotion.isActive;
    } else if (statusFilter === "expired") {
      matchesStatus = isExpired;
    } else if (statusFilter === "scheduled") {
      matchesStatus = isUpcoming;
    }

    return matchesSearch && matchesStatus;
  });

  const summary = {
    total: filteredPromotions.length,
    active: filteredPromotions.filter((promotion) => {
      const now = new Date();
      const { startDate, endDate } = getPromotionDates(promotion);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      return promotion.isActive && (!start || now >= start) && (!end || now <= end);
    }).length,
    scheduled: filteredPromotions.filter((promotion) => {
      const { startDate } = getPromotionDates(promotion);
      return startDate ? new Date() < new Date(startDate) : false;
    }).length,
    usage: filteredPromotions.reduce((sum, promotion) => sum + (promotion.usedCount || 0), 0),
  };

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <AdminPageHeader
              icon={TrendingUp}
              title="Gerenciar Promoções"
              description="Configure campanhas de marketing e ofertas especiais."
              actions={
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refreshAnalytics()}
                    disabled={isLoading}
                    className="gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                    Atualizar
                  </Button>
                  <Button
                    size="sm"
                    className="bg-moria-orange hover:bg-moria-orange/90"
                    onClick={() => handleOpenModal()}
                  >
                    <Plus className="h-4 w-4 shrink-0" />
                    Nova Promoção
                  </Button>
                </>
              }
            />
          </CardHeader>
          <CardContent>
            <div className="mb-6 grid grid-cols-2 gap-4 nb:grid-cols-4">
              <div className="rounded-lg border bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Promoções</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{summary.total}</p>
              </div>
              <div className="rounded-lg border bg-green-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-green-700">Ativas agora</p>
                <p className="mt-2 text-2xl font-bold text-green-700">{summary.active}</p>
              </div>
              <div className="rounded-lg border bg-blue-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-blue-700">Programadas</p>
                <p className="mt-2 text-2xl font-bold text-blue-700">{summary.scheduled}</p>
              </div>
              <div className="rounded-lg border bg-amber-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Usos acumulados</p>
                <p className="mt-2 text-2xl font-bold text-amber-700">{summary.usage}</p>
              </div>
            </div>

            <div className="mb-6 flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                <Input
                  placeholder="Buscar promoções..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="active">Ativas</SelectItem>
                  <SelectItem value="inactive">Inativas</SelectItem>
                  <SelectItem value="scheduled">Programadas</SelectItem>
                  <SelectItem value="expired">Expiradas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-moria-orange" />
                <span className="ml-3 text-muted-foreground">Carregando promoções...</span>
              </div>
            ) : filteredPromotions.length === 0 ? (
              <div className="rounded-lg bg-muted/30 py-12 text-center">
                <Gift className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">Nenhuma promoção encontrada</p>
                <Button variant="outline" className="mt-4" onClick={() => handleOpenModal()}>
                  <Plus className="h-4 w-4 shrink-0" />
                  Criar primeira promoção
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPromotions.map((promotion) => {
                  const now = new Date();
                  const { startDate, endDate } = getPromotionDates(promotion);
                  const start = startDate ? new Date(startDate) : null;
                  const end = endDate ? new Date(endDate) : null;
                  const isExpired = end ? now > end : false;
                  const isUpcoming = start ? now < start : false;
                  const usage = promotion.usageLimit
                    ? ((promotion.usedCount || 0) / promotion.usageLimit) * 100
                    : 0;

                  return (
                    <div key={promotion.id} className="rounded-lg border p-4 sm:p-5 lg:p-6">
                      <div className="mb-4 flex flex-col gap-3 sm:gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                          <div className="rounded-lg bg-moria-orange p-2.5 text-white sm:p-3">
                            {getPromotionTypeIcon(promotion.type)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="break-words text-base font-semibold sm:text-lg">{promotion.name}</h3>
                            <p className="mb-2 break-words text-sm text-gray-600">{promotion.description}</p>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                                {getPromotionTypeLabel(promotion.type)}
                              </Badge>
                              {isExpired ? (
                                <Badge variant="secondary" className="bg-red-100 text-red-800">
                                  Expirada
                                </Badge>
                              ) : isUpcoming ? (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                  Programada
                                </Badge>
                              ) : promotion.isActive ? (
                                <Badge variant="secondary" className="bg-green-100 text-green-800">
                                  Ativa
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                                  Inativa
                                </Badge>
                              )}
                              {promotion.isDraft ? (
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                  Rascunho
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className="min-w-0 xl:text-right">
                          <p className="break-words text-lg font-bold text-green-600 sm:text-xl">{getRewardLabel(promotion)}</p>
                          {promotion.code ? (
                            <p className="mt-1 break-all text-xs font-medium uppercase tracking-wide text-slate-500">
                              Código: {promotion.code}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium">Período</span>
                          </div>
                          <div className="text-sm">
                            <p>Início: {start ? start.toLocaleDateString("pt-BR") : "Não definido"}</p>
                            <p>Fim: {end ? end.toLocaleDateString("pt-BR") : "Não definido"}</p>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium">Uso</span>
                          </div>
                          <div className="text-sm">
                            <p>
                              {promotion.usedCount || 0}
                              {promotion.usageLimit ? ` / ${promotion.usageLimit}` : " uso(s)"}
                            </p>
                            {promotion.usageLimit ? (
                              <div className="mt-1 h-2 w-full rounded-full bg-gray-200">
                                <div
                                  className="h-2 rounded-full bg-moria-orange transition-all duration-300"
                                  style={{ width: `${Math.min(usage, 100)}%` }}
                                />
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <Tag className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium">Alvo</span>
                          </div>
                          <div className="text-sm">
                            <p className="break-words text-gray-600">{getTargetLabel(promotion)}</p>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <BarChart3 className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium">Prioridade</span>
                          </div>
                          <div className="text-sm">
                            <p className="font-medium text-moria-orange">Nível {promotion.priority ?? 0}</p>
                            {promotion.canCombineWithOthers ? (
                              <p className="text-xs text-green-600">Combina com outras</p>
                            ) : (
                              <p className="text-xs text-gray-500">Exclusiva</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <Separator className="mb-4" />

                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="text-sm text-gray-600">
                          <p>Criado: {new Date(promotion.createdAt).toLocaleDateString("pt-BR")}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                          <Button
                            variant={promotion.isActive ? "secondary" : "outline"}
                            size="sm"
                            disabled={isExpired}
                            onClick={() => handleTogglePromotion(promotion)}
                            className="w-full sm:w-auto"
                          >
                            {promotion.isActive ? (
                              <>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Ativa
                              </>
                            ) : (
                              <>
                                <Clock className="h-4 w-4 mr-1" />
                                Inativa
                              </>
                            )}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleOpenModal(promotion)} className="w-full sm:w-auto">
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-red-600 hover:border-red-300 hover:text-red-700 sm:w-auto"
                            onClick={() => handleDeletePromotion(promotion.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Excluir
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="col-span-2 w-full sm:col-span-1 sm:w-auto"
                            onClick={() => {
                              const link = `${window.location.origin}/#promocoes`;
                              const message = `Promoção especial: ${promotion.name}. ${promotion.description}. Confira: ${link}`;
                              navigator.clipboard.writeText(message);
                            }}
                          >
                            <MessageCircle className="h-4 w-4 mr-1" />
                            Compartilhar
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <PromotionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSavePromotion}
        promotion={editingPromotion}
      />
    </>
  );
}


