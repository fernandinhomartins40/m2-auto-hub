import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
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
  Eye,
  Edit,
  AlertCircle,
  MessageCircle,
  Trash2,
  Loader2
} from 'lucide-react';
import { usePromotions } from '../../hooks/usePromotions';
import { PromotionModal } from './PromotionModal';
import type { AdvancedPromotion } from '../../types/promotions';

export function PromotionsManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
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
    refreshAnalytics
  } = usePromotions({ includeInactive: true });

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

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
      console.error('Error saving promotion:', error);
    }
  };

  const handleDeletePromotion = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta promoção?')) {
      try {
        await deletePromotion(id);
      } catch (error) {
        console.error('Error deleting promotion:', error);
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
      console.error('Error toggling promotion:', error);
    }
  };

  const getPromotionTypeIcon = (type: string) => {
    switch (type) {
      case 'PERCENTAGE':
      case 'FIXED':
        return <TrendingUp className="h-6 w-6" />;
      case 'BUY_ONE_GET_ONE':
      case 'BUNDLE_DISCOUNT':
        return <Package className="h-6 w-6" />;
      case 'FREE_SHIPPING':
        return <Truck className="h-6 w-6" />;
      default:
        return <Gift className="h-6 w-6" />;
    }
  };

  const getPromotionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      PERCENTAGE: 'Desconto %',
      FIXED: 'Desconto Fixo',
      BUY_ONE_GET_ONE: 'Leve 2 Pague 1',
      FREE_SHIPPING: 'Frete Grátis',
      BUNDLE_DISCOUNT: 'Combo',
      TIERED_DISCOUNT: 'Escalonado'
    };
    return labels[type] || 'Promoção';
  };

  // Filter promotions
  const filteredPromotions = promotions.filter(promotion => {
    const matchesSearch = promotion.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         promotion.description.toLowerCase().includes(searchTerm.toLowerCase());

    const now = new Date();
    const start = new Date(promotion.schedule.startDate);
    const end = new Date(promotion.schedule.endDate);
    const isExpired = now > end;
    const isUpcoming = now < start;

    let matchesStatus = true;
    if (statusFilter === 'active') {
      matchesStatus = promotion.isActive && !isExpired && !isUpcoming;
    } else if (statusFilter === 'inactive') {
      matchesStatus = !promotion.isActive;
    } else if (statusFilter === 'expired') {
      matchesStatus = isExpired;
    }

    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Gerenciar Promoções</CardTitle>
                <CardDescription>Configure campanhas de marketing e ofertas especiais</CardDescription>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refreshAnalytics()}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
                <Button
                  size="sm"
                  className="bg-moria-orange hover:bg-moria-orange/90"
                  onClick={() => handleOpenModal()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Promoção
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
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
              <div className="text-center py-12 bg-muted/30 rounded-lg">
                <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Nenhuma promoção encontrada</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => handleOpenModal()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar primeira promoção
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPromotions.map((promotion) => {
                  const now = new Date();
                  const start = new Date(promotion.schedule.startDate);
                  const end = new Date(promotion.schedule.endDate);
                  const isExpired = now > end;
                  const isUpcoming = now < start;
                  const usage = promotion.usageLimit
                    ? (promotion.usedCount / promotion.usageLimit) * 100
                    : 0;

                  return (
                    <div key={promotion.id} className="border rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div className="bg-moria-orange text-white rounded-lg p-3">
                            {getPromotionTypeIcon(promotion.type)}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">{promotion.name}</h3>
                            <p className="text-sm text-gray-600 mb-2">{promotion.description}</p>
                            <div className="flex items-center gap-4">
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
                              {promotion.isDraft && (
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                  Rascunho
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {promotion.rewards?.primary?.type === 'PERCENTAGE' && (
                            <p className="text-2xl font-bold text-green-600">
                              {promotion.rewards.primary.value}%
                            </p>
                          )}
                          {promotion.rewards?.primary?.type === 'FIXED' && (
                            <p className="text-xl font-bold text-green-600">
                              {formatPrice(promotion.rewards.primary.value)}
                            </p>
                          )}
                          {promotion.rewards?.primary?.type === 'FREE_SHIPPING' && (
                            <p className="text-lg font-bold text-blue-600">Frete Grátis</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium">Período</span>
                          </div>
                          <div className="text-sm">
                            <p>Início: {new Date(promotion.schedule.startDate).toLocaleDateString('pt-BR')}</p>
                            <p>Fim: {new Date(promotion.schedule.endDate).toLocaleDateString('pt-BR')}</p>
                          </div>
                        </div>
                        {promotion.usageLimit && (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <Users className="h-4 w-4 text-gray-500" />
                              <span className="text-sm font-medium">Uso</span>
                            </div>
                            <div className="text-sm">
                              <p>{promotion.usedCount} / {promotion.usageLimit}</p>
                              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                <div
                                  className="bg-moria-orange h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${Math.min(usage, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <Tag className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium">Alvo</span>
                          </div>
                          <div className="text-sm">
                            {promotion.target === 'ALL_PRODUCTS' && <p className="text-gray-600">Todos os produtos</p>}
                            {promotion.target === 'SPECIFIC_PRODUCTS' && promotion.targetProductIds && (
                              <p className="text-gray-600">{(promotion.targetProductIds as string[]).length} produto(s)</p>
                            )}
                            {promotion.target === 'CATEGORY' && promotion.targetCategories && (
                              <p className="text-gray-600">{(promotion.targetCategories as string[]).join(', ')}</p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <BarChart3 className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium">Prioridade</span>
                          </div>
                          <div className="text-sm">
                            <p className="font-medium text-moria-orange">Nível {promotion.priority}</p>
                            {promotion.canCombineWithOthers ? (
                              <p className="text-green-600 text-xs">Combina com outras</p>
                            ) : (
                              <p className="text-gray-500 text-xs">Exclusiva</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <Separator className="mb-4" />

                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-600">
                          <p>Criado: {new Date(promotion.createdAt).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant={promotion.isActive ? "secondary" : "outline"}
                            size="sm"
                            disabled={isExpired}
                            onClick={() => handleTogglePromotion(promotion)}
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenModal(promotion)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:border-red-300"
                            onClick={() => handleDeletePromotion(promotion.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Excluir
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const link = `${window.location.origin}/promocoes`;
                              const message = `🎯 Promoção especial: ${promotion.name}! ${promotion.description}. Acesse: ${link}`;
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
