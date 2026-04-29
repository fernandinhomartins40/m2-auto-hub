import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { AdminPageHeader } from './AdminPageHeader';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  Package, 
  Search, 
  RefreshCw, 
  Plus, 
  Eye, 
  Edit, 
  Trash2,
  AlertTriangle,
  Box,
  DollarSign,
  Warehouse,
  Tag,
  ToggleLeft,
  ToggleRight,
  Loader2
} from 'lucide-react';
import { useAdminProducts } from '../../hooks/useAdminProducts.js';
import { ProductModal } from './ProductModal';
import { ProductCategoriesModal } from './ProductCategoriesModal';
import productService, { type CategoryResponse } from '@/api/productService';
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

interface AdminProductsSectionProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
}

export function AdminProductsSection({ 
  searchTerm, 
  setSearchTerm, 
  statusFilter, 
  setStatusFilter 
}: AdminProductsSectionProps) {
  const {
    products,
    loading,
    error,
    updateLoading,
    deleteLoading,
    fetchProducts,
    deleteProduct,
    toggleProductStatus
  } = useAdminProducts();

  // Estados do modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);

  // Estados do dialog de confirmaÃ§Ã£o
  const [deleteDialog, setDeleteDialog] = useState({ open: false, productId: null, productName: '' });

  const categoryNames = useMemo(
    () => categories.map((category) => category.name).filter(Boolean),
    [categories]
  );

  const loadCategories = async () => {
    setCategoriesLoading(true);

    try {
      const response = await productService.getAdminCategories();
      setCategories(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar categorias de produtos:', error);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const refreshProductsView = async () => {
    await Promise.all([fetchProducts(), loadCategories()]);
  };

  useEffect(() => {
    void loadCategories();
  }, []);

  // Filtrar produtos
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Filtro por termo de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(product =>
        product.name?.toLowerCase().includes(term) ||
        product.sku?.toLowerCase().includes(term) ||
        product.category?.toLowerCase().includes(term) ||
        product.supplier?.toLowerCase().includes(term) ||
        product.description?.toLowerCase().includes(term)
      );
    }

    // Filtro por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(product => {
        switch (statusFilter) {
          case 'active':
            return product.status === 'ACTIVE';
          case 'inactive':
            return product.status === 'DISCONTINUED';
          case 'low_stock':
            return product.stock > 0 && product.stock <= (product.minStock || 5);
          case 'out_of_stock':
            return product.stock === 0 || product.status === 'OUT_OF_STOCK';
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [products, searchTerm, statusFilter]);

  // Handlers
  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleSaveProduct = async () => {
    handleCloseModal();

    try {
      await refreshProductsView();
    } catch (refreshError) {
      console.error('Erro ao atualizar lista de produtos apÃ³s salvar:', refreshError);
    }
  };

  const handleToggleStatus = async (productId, currentStatus) => {
    try {
      await toggleProductStatus(productId, currentStatus);
    } catch (error) {
      console.error('Erro ao alterar status do produto:', error);
    }
  };

  const handleDeleteClick = (product) => {
    setDeleteDialog({
      open: true,
      productId: product.id,
      productName: product.name
    });
  };

  const handleConfirmDelete = async () => {
    if (deleteDialog.productId) {
      try {
        await deleteProduct(deleteDialog.productId);
        setDeleteDialog({ open: false, productId: null, productName: '' });
      } catch (error) {
        console.error('Erro ao excluir produto:', error);
      }
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialog({ open: false, productId: null, productName: '' });
  };

  // Helper functions
  const formatPrice = (price) => {
    if (!price) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const getStockStatus = (product) => {
    if (product.stock === 0) {
      return { label: 'Sem Estoque', variant: 'bg-red-100 text-red-800' };
    }
    if (product.stock <= (product.minStock || 5)) {
      return { label: 'Estoque Baixo', variant: 'bg-yellow-100 text-yellow-800' };
    }
    return { label: 'Em Estoque', variant: 'bg-green-100 text-green-800' };
  };

  const getDiscountPercentage = (product) => {
    if (product.promoPrice && product.salePrice) {
      return Math.round(((product.salePrice - product.promoPrice) / product.salePrice) * 100);
    }
    return 0;
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      <Card className="w-full max-w-full">
        <CardHeader className="p-4 md:p-6">
          <AdminPageHeader
            icon={Package}
            title="Gerenciar Produtos"
            description="Controle seu estoque e catalogo de pecas automotivas."
            actions={
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void refreshProductsView();
                  }}
                  disabled={loading || categoriesLoading}
                  className="w-full sm:w-auto"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${(loading || categoriesLoading) ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Atualizar</span>
                  <span className="sm:hidden">Atualizar</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCategoriesModalOpen(true)}
                  disabled={categoriesLoading}
                  className="w-full sm:w-auto"
                >
                  {categoriesLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Tag className="h-4 w-4 mr-2" />
                  )}
                  Categorias
                </Button>
                <Button
                  size="sm"
                  onClick={handleOpenCreateModal}
                  className="w-full bg-moria-orange hover:bg-moria-orange/90 sm:w-auto"
                  disabled={loading || categoriesLoading}
                >
                  {(loading || categoriesLoading) ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Novo Produto
                </Button>
              </>
            }
          />
        </CardHeader>

        <CardContent className="w-full max-w-full overflow-x-hidden">
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por nome, SKU, categoria, fornecedor..."
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
                <SelectItem value="low_stock">Estoque Baixo</SelectItem>
                <SelectItem value="out_of_stock">Sem Estoque</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Mensagem de erro */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Erro ao carregar produtos</span>
              </div>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Loading state */}
          {loading && products.length === 0 && (
            <div className="text-center py-12">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-moria-orange mb-4" />
              <p className="text-gray-600">Carregando produtos...</p>
            </div>
          )}

          {/* Empty state */}
          {!loading && filteredProducts.length === 0 && !error && (
            <div className="text-center py-12 text-gray-500">
              <Package className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <p className="text-lg font-medium mb-2">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Nenhum produto encontrado'
                  : 'Nenhum produto cadastrado'
                }
              </p>
              <p>
                {searchTerm || statusFilter !== 'all'
                  ? 'Tente ajustar os filtros de busca'
                  : 'Adicione produtos ao seu catÃ¡logo'
                }
              </p>
            </div>
          )}

          {/* Lista de produtos */}
          {filteredProducts.length > 0 && (
            <div className="space-y-4">
              {filteredProducts.map((product) => {
                const stockStatus = getStockStatus(product);
                const discount = getDiscountPercentage(product);
                
                return (
                  <div key={product.id} className="border rounded-lg p-3 sm:p-4 md:p-6 hover:border-moria-orange/50 transition-colors w-full max-w-full overflow-hidden">
                    <div className="flex flex-col gap-2.5 mb-3 sm:gap-3 sm:mb-4">
                      {/* InformaÃ§Ãµes bÃ¡sicas */}
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2.5 sm:gap-3 w-full">
                        <div className="flex items-start gap-2.5 sm:gap-3 flex-1 min-w-0">
                          {/* Miniatura do produto */}
                          <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                            {product.images && product.images.length > 0 ? (
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Fallback para Ã­cone se a imagem falhar
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-moria-orange text-white"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-8 h-8"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg></div>';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-moria-orange text-white">
                                <Box className="w-8 h-8" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm sm:text-base md:text-lg font-semibold break-words leading-snug">{product.name}</h3>
                            <p className="text-xs sm:text-sm text-gray-600 mb-1.5 line-clamp-1 sm:line-clamp-2 break-words">{product.description}</p>
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                                {product.category}
                              </Badge>
                              {product.status !== 'ACTIVE' && (
                                <Badge variant="secondary" className="bg-red-100 text-red-800 text-xs">
                                  {product.status === 'DISCONTINUED' ? 'Inativo' : 'Sem Estoque'}
                                </Badge>
                              )}
                              {discount > 0 && (
                                <Badge className="bg-green-100 text-green-800 text-xs">
                                  -{discount}%
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status e SKU */}
                        <div className="flex flex-row md:flex-col items-start gap-1.5 md:gap-1 flex-shrink-0">
                          <Badge className={stockStatus.variant}>
                            {stockStatus.label}
                          </Badge>
                          {product.sku && (
                            <p className="text-xs md:text-sm text-gray-600">SKU: {product.sku}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* InformaÃ§Ãµes detalhadas */}
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-3 sm:mb-4">
                      <div className="flex items-start space-x-2 min-w-0">
                        <DollarSign className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <span className="text-xs md:text-sm text-gray-600">PreÃ§o: </span>
                          <span className="font-medium text-xs md:text-sm break-words">
                            {product.promoPrice
                              ? formatPrice(product.promoPrice)
                              : formatPrice(product.salePrice)
                            }
                          </span>
                          {product.promoPrice && product.salePrice && (
                            <span className="text-xs md:text-sm text-gray-500 line-through ml-1">
                              {formatPrice(product.salePrice)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start space-x-2 min-w-0">
                        <Warehouse className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <span className="text-xs md:text-sm text-gray-600">Estoque: </span>
                          <span className="font-medium text-xs md:text-sm">{product.stock || 0}</span>
                        </div>
                      </div>

                      {product.supplier && (
                        <div className="flex items-start space-x-2 min-w-0">
                          <Tag className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <span className="text-xs md:text-sm text-gray-600">Fornecedor: </span>
                            <span className="font-medium text-xs md:text-sm line-clamp-1 break-words block">{product.supplier}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center space-x-2 min-w-0">
                        <span className="text-xs md:text-sm text-gray-600">Status: </span>
                        {product.status === 'ACTIVE' ? (
                          <ToggleRight className="h-5 w-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <ToggleLeft className="h-5 w-5 text-gray-400 flex-shrink-0" />
                        )}
                      </div>
                    </div>

                    {/* AÃ§Ãµes */}
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(product.id, product.status === 'ACTIVE')}
                        disabled={updateLoading}
                        className="w-full text-xs md:text-sm"
                      >
                        {product.status === 'ACTIVE' ? 'Desativar' : 'Ativar'}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEditModal(product)}
                        disabled={updateLoading}
                        className="w-full text-xs md:text-sm"
                      >
                        <Edit className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                        Editar
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(product)}
                        disabled={deleteLoading}
                        className="col-span-2 text-red-600 hover:text-red-700 hover:border-red-300 w-full text-xs md:text-sm sm:col-span-1"
                      >
                        <Trash2 className="h-3 w-3 md:h-4 md:w-4 mr-2" />
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

      {/* Modal de produto */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveProduct}
        product={editingProduct}
        loading={loading || categoriesLoading}
        categories={categoryNames}
      />

      <ProductCategoriesModal
        isOpen={isCategoriesModalOpen}
        onClose={() => setIsCategoriesModalOpen(false)}
        categories={categories}
        onSaved={refreshProductsView}
      />

      {/* Dialog de confirmaÃ§Ã£o de exclusÃ£o */}
      <AlertDialog open={deleteDialog.open} onOpenChange={handleCancelDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusÃ£o</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o produto "{deleteDialog.productName}"? 
              Esta aÃ§Ã£o nÃ£o pode ser desfeita.
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
                'Excluir Produto'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


