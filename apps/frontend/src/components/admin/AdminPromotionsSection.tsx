import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  TrendingUp, 
  Search, 
  RefreshCw, 
  Plus, 
  Edit, 
  Trash2,
  AlertTriangle,
  Percent,
  Calendar,
  Target,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Star
} from 'lucide-react';
import { useAdminPromotions } from '../../hooks/useAdminPromotions.js';
import { PromotionModal } from './PromotionModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

interface AdminPromotionsSectionProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
}

export function AdminPromotionsSection({ 
  searchTerm, 
  setSearchTerm, 
  statusFilter, 
  setStatusFilter 
}: AdminPromotionsSectionProps) {
  const {
    promotions,
    loading,
    error,
    createLoading,
    updateLoading,
    deleteLoading,
    fetchPromotions,
    createPromotion,
    updatePromotion,
    deletePromotion,
    togglePromotionStatus,
    isPromotionActive
  } = useAdminPromotions();

  // Estados do modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState(null);

  // Estados do dialog de confirmação
  const [deleteDialog, setDeleteDialog] = useState({ open: false, promotionId: null, promotionName: '' });

  // Filtrar promoções
  const filteredPromotions = useMemo(() => {
    let filtered = promotions;

    // Filtro por termo de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(promotion => 
        promotion.name?.toLowerCase().includes(term) ||
        promotion.description?.toLowerCase().includes(term) ||
        promotion.type?.toLowerCase().includes(term)
      );
    }

    // Filtro por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(promotion => {
        switch (statusFilter) {
          case 'active':
            return isPromotionActive(promotion);
          case 'inactive':
            return !promotion.isActive;
          case 'scheduled':
            return promotion.isActive && promotion.startsAt && new Date(promotion.startsAt) > new Date();
          case 'expired':
            return promotion.endsAt && new Date(promotion.endsAt) <= new Date();
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [promotions, searchTerm, statusFilter, isPromotionActive]);

  // Handlers
  const handleOpenCreateModal = () => {
    setEditingPromotion(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (promotion) => {
    setEditingPromotion(promotion);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPromotion(null);
  };

  const handleSavePromotion = async (promotionData) => {
    if (editingPromotion) {
      await updatePromotion(editingPromotion.id, promotionData);
    } else {
      await createPromotion(promotionData);
    }
  };

  const handleToggleStatus = async (promotionId, currentStatus) => {
    try {
      await togglePromotionStatus(promotionId, currentStatus);
    } catch (error) {
      console.error('Erro ao alterar status da promoção:', error);
    }
  };

  const handleDeleteClick = (promotion) => {
    setDeleteDialog({
      open: true,
      promotionId: promotion.id,
      promotionName: promotion.name
    });
  };

  const handleConfirmDelete = async () => {
    if (deleteDialog.promotionId) {
      try {
        await deletePromotion(deleteDialog.promotionId);
        setDeleteDialog({ open: false, promotionId: null, promotionName: '' });
      } catch (error) {
        console.error('Erro ao excluir promoção:', error);
      }
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialog({ open: false, promotionId: null, promotionName: '' });
  };

  // Helper functions
  const formatPrice = (price) => {
    if (!price) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const formatDiscount = (promotion) => {
    if (promotion.discountType === 'percentage') {
      return `${promotion.discountValue}%`;
    } else {
      return formatPrice(promotion.discountValue);
    }
  };

  const getPromotionStatus = (promotion) => {
    if (!promotion.isActive) {
      return { label: 'Inativa', variant: 'bg-gray-100 text-gray-800', icon: ToggleLeft };
    }
    
    const now = new Date();
    const starts = promotion.startsAt ? new Date(promotion.startsAt) : null;
    const ends = promotion.endsAt ? new Date(promotion.endsAt) : null;
    
    if (starts && now < starts) {
      return { label: 'Agendada', variant: 'bg-blue-100 text-blue-800', icon: Calendar };
    }
    
    if (ends && now > ends) {
      return { label: 'Expirada', variant: 'bg-red-100 text-red-800', icon: AlertTriangle };
    }
    
    return { label: 'Ativa', variant: 'bg-green-100 text-green-800', icon: ToggleRight };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Indefinido';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Indefinido';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getPromotionTypeIcon = (type) => {
    switch (type) {
      case 'product': return Target;
      case 'category': return Star;
      case 'general': return TrendingUp;
      default: return TrendingUp;
    }
  };

  const getPromotionTypeLabel = (type) => {
    switch (type) {
      case 'product': return 'Produto específico';
      case 'category': return 'Categoria';
      case 'general': return 'Geral';
      default: return type;
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      <Card className="w-full max-w-full">
        <CardHeader className="p-4 md:p-6">
          <div className="flex flex-col gap-4">
            <div>
              <CardTitle className="text-xl md:text-2xl">Gerenciar Promoções</CardTitle>
              <CardDescription>
                Controle promoções e campanhas especiais
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 w-full md:flex-row md:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchPromotions()}
                disabled={loading}
                className="w-full md:w-auto"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button
                size="sm"
                onClick={handleOpenCreateModal}
                disabled={createLoading}
                className="bg-moria-orange hover:bg-moria-orange/90 w-full md:w-auto"
              >
                {createLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Nova Promoção
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="w-full max-w-full overflow-x-hidden">
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por nome, descrição, tipo..."
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
                <SelectItem value="scheduled">Agendadas</SelectItem>
                <SelectItem value="expired">Expiradas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Mensagem de erro */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Erro ao carregar promoções</span>
              </div>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Loading state */}
          {loading && promotions.length === 0 && (
            <div className="text-center py-12">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-moria-orange mb-4" />
              <p className="text-gray-600">Carregando promoções...</p>
            </div>
          )}

          {/* Empty state */}
          {!loading && filteredPromotions.length === 0 && !error && (
            <div className="text-center py-12 text-gray-500">
              <TrendingUp className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <p className="text-lg font-medium mb-2">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Nenhuma promoção encontrada'
                  : 'Nenhuma promoção cadastrada'
                }
              </p>
              <p>
                {searchTerm || statusFilter !== 'all'
                  ? 'Tente ajustar os filtros de busca'
                  : 'Crie promoções para aumentar suas vendas'
                }
              </p>
            </div>
          )}

          {/* Lista de promoções */}
          {filteredPromotions.length > 0 && (
            <div className="space-y-4">
              {filteredPromotions.map((promotion) => {
                const status = getPromotionStatus(promotion);
                const TypeIcon = getPromotionTypeIcon(promotion.type);
                const StatusIcon = status.icon;
                
                return (
                  <div key={promotion.id} className="border rounded-lg p-3 md:p-6 hover:border-moria-orange/50 transition-colors w-full max-w-full overflow-hidden">
                    <div className="flex flex-col gap-3 mb-4">
                      {/* Informações básicas */}
                      <div className="flex items-start gap-3 w-full">
                        <div className="bg-moria-orange text-white rounded-lg p-2 flex-shrink-0">
                          <TypeIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base md:text-lg font-semibold break-words">{promotion.name}</h3>
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2 break-words">{promotion.description}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={`${status.variant} text-xs`}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {status.label}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {getPromotionTypeLabel(promotion.type)}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {promotion.discountType === 'percentage' ? 'Percentual' : 'Valor fixo'}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="flex flex-col items-start gap-1 flex-shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Ativa: </span>
                          {promotion.isActive ? (
                            <ToggleRight className="h-5 w-5 text-green-600" />
                          ) : (
                            <ToggleLeft className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Informações detalhadas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                      <div className="flex items-start space-x-2">
                        <Percent className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <span className="text-sm text-gray-600">Desconto: </span>
                          <span className="font-medium text-sm break-words">
                            {formatDiscount(promotion)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start space-x-2">
                        <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <span className="text-sm text-gray-600">Início: </span>
                          <span className="font-medium text-sm">{formatDate(promotion.startsAt)}</span>
                        </div>
                      </div>

                      <div className="flex items-start space-x-2">
                        <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <span className="text-sm text-gray-600">Fim: </span>
                          <span className="font-medium text-sm">{formatDate(promotion.endsAt)}</span>
                        </div>
                      </div>

                      {promotion.maxDiscount && (
                        <div className="flex items-start space-x-2">
                          <div className="min-w-0">
                            <span className="text-sm text-gray-600">Máx: </span>
                            <span className="font-medium text-sm">{formatPrice(promotion.maxDiscount)}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex flex-col gap-2 md:flex-row md:justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(promotion.id, promotion.isActive)}
                        className="w-full md:w-auto text-sm"
                      >
                        {promotion.isActive ? 'Desativar' : 'Ativar'}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEditModal(promotion)}
                        disabled={updateLoading}
                        className="w-full md:w-auto text-sm"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(promotion)}
                        disabled={deleteLoading}
                        className="text-red-600 hover:text-red-700 hover:border-red-300 w-full md:w-auto text-sm"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialog.open} onOpenChange={handleCancelDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a promoção "{deleteDialog.promotionName}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir Promoção'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de promoção */}
      <PromotionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSavePromotion}
        promotion={editingPromotion}
        loading={editingPromotion ? updateLoading : createLoading}
      />
    </div>
  );
}