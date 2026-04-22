import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Copy,
  Edit,
  Gift,
  Loader2,
  Percent,
  Plus,
  RefreshCw,
  Search,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Users,
} from 'lucide-react';

import type { Coupon, CouponUpsertInput } from '@/api/couponService';

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
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { CouponModal } from './CouponModal';
import { useAdminCoupons } from '../../hooks/useAdminCoupons';

interface AdminCouponsSectionProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
}

export function AdminCouponsSection({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
}: AdminCouponsSectionProps) {
  const {
    coupons,
    loading,
    error,
    createLoading,
    updateLoading,
    deleteLoading,
    fetchCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    toggleCouponStatus,
  } = useAdminCoupons();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    couponId: string | null;
    couponCode: string;
  }>({
    open: false,
    couponId: null,
    couponCode: '',
  });

  const filteredCoupons = useMemo(() => {
    if (!Array.isArray(coupons)) {
      return [];
    }

    let filtered = coupons;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (coupon) =>
          coupon.code?.toLowerCase().includes(term) ||
          coupon.description?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((coupon) => {
        switch (statusFilter) {
          case 'active':
            return coupon.isActive && new Date(coupon.expiresAt) > new Date();
          case 'inactive':
            return !coupon.isActive;
          case 'expired':
            return new Date(coupon.expiresAt) <= new Date();
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [coupons, searchTerm, statusFilter]);

  const handleOpenCreateModal = () => {
    setEditingCoupon(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCoupon(null);
  };

  const handleSaveCoupon = async (couponData: CouponUpsertInput | Partial<CouponUpsertInput>) => {
    if (editingCoupon) {
      await updateCoupon(editingCoupon.id, couponData);
      return;
    }

    await createCoupon(couponData as CouponUpsertInput);
  };

  const handleToggleStatus = async (couponId: string, currentStatus: boolean) => {
    try {
      await toggleCouponStatus(couponId, currentStatus);
    } catch (toggleError) {
      console.error('Erro ao alterar status do cupom:', toggleError);
    }
  };

  const handleDeleteClick = (coupon: Coupon) => {
    setDeleteDialog({
      open: true,
      couponId: coupon.id,
      couponCode: coupon.code,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteDialog.couponId) {
      return;
    }

    try {
      await deleteCoupon(deleteDialog.couponId);
      setDeleteDialog({ open: false, couponId: null, couponCode: '' });
    } catch (deleteError) {
      console.error('Erro ao excluir cupom:', deleteError);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialog({ open: false, couponId: null, couponCode: '' });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (copyError) {
      console.error('Erro ao copiar:', copyError);
    }
  };

  const formatPrice = (price?: number | string | null) => {
    if (price === undefined || price === null) {
      return 'R$ 0,00';
    }

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(price));
  };

  const formatDiscount = (coupon: Coupon) => {
    if (coupon.discountType === 'PERCENTAGE') {
      return `${coupon.discountValue}%`;
    }

    return formatPrice(coupon.discountValue);
  };

  const getCouponStatus = (coupon: Coupon) => {
    if (!coupon.isActive) {
      return { label: 'Inativo', variant: 'bg-gray-100 text-gray-800' };
    }

    if (new Date(coupon.expiresAt) <= new Date()) {
      return { label: 'Expirado', variant: 'bg-red-100 text-red-800' };
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return { label: 'Esgotado', variant: 'bg-orange-100 text-orange-800' };
    }

    return { label: 'Ativo', variant: 'bg-green-100 text-green-800' };
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) {
      return 'Sem expiracao';
    }

    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gerenciar Cupons</CardTitle>
              <CardDescription>Controle cupons de desconto e promocoes</CardDescription>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchCoupons()}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button
                size="sm"
                onClick={handleOpenCreateModal}
                disabled={createLoading}
                className="bg-moria-orange hover:bg-moria-orange/90 gap-2"
              >
                {createLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Novo Cupom
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por codigo, descricao..."
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
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
                <SelectItem value="expired">Expirados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Erro ao carregar cupons</span>
              </div>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          )}

          {loading && coupons.length === 0 && (
            <div className="text-center py-12">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-moria-orange mb-4" />
              <p className="text-gray-600">Carregando cupons...</p>
            </div>
          )}

          {!loading && filteredCoupons.length === 0 && !error && (
            <div className="text-center py-12 text-gray-500">
              <Gift className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <p className="text-lg font-medium mb-2">
                {searchTerm || statusFilter !== 'all'
                  ? 'Nenhum cupom encontrado'
                  : 'Nenhum cupom cadastrado'}
              </p>
              <p>
                {searchTerm || statusFilter !== 'all'
                  ? 'Tente ajustar os filtros de busca'
                  : 'Adicione cupons para oferecer promocoes'}
              </p>
            </div>
          )}

          {filteredCoupons.length > 0 && (
            <div className="space-y-4">
              {filteredCoupons.map((coupon) => {
                const status = getCouponStatus(coupon);

                return (
                  <div
                    key={coupon.id}
                    className="border rounded-lg p-6 hover:border-moria-orange/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="bg-moria-orange text-white rounded-lg p-3">
                          <Gift className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold font-mono">{coupon.code}</h3>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(coupon.code)}
                              className="h-6 w-6 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{coupon.description}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={status.variant}>{status.label}</Badge>
                            <Badge variant="outline">
                              {coupon.discountType === 'PERCENTAGE' ? 'Percentual' : 'Valor fixo'}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">Ativo: </span>
                          {coupon.isActive ? (
                            <ToggleRight className="h-5 w-5 text-green-600" />
                          ) : (
                            <ToggleLeft className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <Percent className="h-4 w-4 text-gray-500" />
                        <div>
                          <span className="text-sm text-gray-600">Desconto: </span>
                          <span className="font-medium">{formatDiscount(coupon)}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <div>
                          <span className="text-sm text-gray-600">Uso: </span>
                          <span className="font-medium">
                            {coupon.usedCount || 0}/{coupon.usageLimit || '∞'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <div>
                          <span className="text-sm text-gray-600">Expira: </span>
                          <span className="font-medium">{formatDate(coupon.expiresAt)}</span>
                        </div>
                      </div>

                      {coupon.minValue !== undefined && coupon.minValue !== null && (
                        <div>
                          <span className="text-sm text-gray-600">Min: </span>
                          <span className="font-medium">{formatPrice(coupon.minValue)}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(coupon.id, coupon.isActive)}
                      >
                        {coupon.isActive ? 'Desativar' : 'Ativar'}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEditModal(coupon)}
                        disabled={updateLoading}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(coupon)}
                        disabled={deleteLoading}
                        className="text-red-600 hover:text-red-700 hover:border-red-300"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
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

      <AlertDialog open={deleteDialog.open} onOpenChange={handleCancelDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusao</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cupom "{deleteDialog.couponCode}"? Esta acao nao
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>Cancelar</AlertDialogCancel>
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
                'Excluir Cupom'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CouponModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveCoupon}
        coupon={editingCoupon}
        loading={editingCoupon ? updateLoading : createLoading}
      />
    </div>
  );
}
