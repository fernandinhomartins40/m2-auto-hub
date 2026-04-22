import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useCart } from "../../contexts/CartContext";
import { useFavoritesContext } from "../../contexts/FavoritesContext";
import { productService, favoriteService } from "../../api";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Alert, AlertDescription } from "../ui/alert";
import { Skeleton } from "../ui/skeleton";
import { FavoriteButton } from "../FavoriteButton";
import {
  Heart,
  ShoppingCart,
  AlertCircle,
  RefreshCw,
  Filter,
  SortAsc,
  SortDesc,
  Trash2,
  Share2,
  Download,
  TrendingUp,
  Package,
  Tag,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import type { Product } from "../../api/productService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface FavoriteProductData extends Product {
  favoriteId: string;
  addedAt: string;
}

type SortOption = 'date-desc' | 'date-asc' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc';
type FilterAvailability = 'all' | 'available' | 'unavailable';

export function CustomerFavorites() {
  const { isAuthenticated } = useAuth();
  const { addItem, openCart } = useCart();
  const { favorites, loading, error, fetchFavorites, clearError } = useFavoritesContext();

  const [favoriteProducts, setFavoriteProducts] = useState<FavoriteProductData[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);

  // Filter and sort states
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [filterAvailability, setFilterAvailability] = useState<FilterAvailability>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Bulk actions
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Statistics
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadFavoritesData();
      loadStats();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (favorites && favorites.length > 0) {
      loadProductData();
    } else {
      setFavoriteProducts([]);
    }
  }, [favorites]);

  const loadFavoritesData = async () => {
    try {
      await fetchFavorites();
    } catch (err) {
      console.error('Error loading favorites:', err);
    }
  };

  const loadStats = async () => {
    try {
      const response = await favoriteService.getFavoriteStats();
      setStats(response);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const loadProductData = async () => {
    setLoadingProducts(true);
    setProductError(null);

    try {
      // Otimização: Buscar todos os produtos de uma vez usando bulk endpoint
      const productIds = favorites.map(f => f.productId);

      if (productIds.length === 0) {
        setFavoriteProducts([]);
        return;
      }

      const products = await productService.getProductsByIds(productIds);

      // Mapear produtos com dados do favorito
      const productsWithFavoriteData = favorites.map(favorite => {
        const product = products.find(p => p.id === favorite.productId);
        if (!product) return null;

        return {
          ...product,
          favoriteId: favorite.id,
          addedAt: favorite.createdAt
        } as FavoriteProductData;
      }).filter((p): p is FavoriteProductData => p !== null);

      setFavoriteProducts(productsWithFavoriteData);
    } catch (err) {
      setProductError("Erro ao carregar dados dos produtos");
      console.error('Error loading product data:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(favoriteProducts.map(p => p.category));
    return Array.from(cats);
  }, [favoriteProducts]);

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = [...favoriteProducts];

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    // Filter by availability
    if (filterAvailability === 'available') {
      filtered = filtered.filter(p => p.status === 'ACTIVE' && p.stock > 0);
    } else if (filterAvailability === 'unavailable') {
      filtered = filtered.filter(p => p.status !== 'ACTIVE' || p.stock === 0);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.subcategory?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
        case 'date-asc':
          return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
        case 'price-asc':
          return (a.promoPrice || a.salePrice) - (b.promoPrice || b.salePrice);
        case 'price-desc':
          return (b.promoPrice || b.salePrice) - (a.promoPrice || a.salePrice);
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [favoriteProducts, selectedCategory, sortBy, filterAvailability, searchTerm]);

  const handleAddToCart = (product: FavoriteProductData) => {
    const price = product.promoPrice || product.salePrice;
    // Extract first image from array or use placeholder
    const imageUrl = product.images && Array.isArray(product.images) && product.images.length > 0
      ? product.images[0]
      : (typeof product.images === 'string' ? product.images : '/placeholder-product.jpg');

    addItem({
      id: product.id,
      name: product.name,
      price: price,
      image: imageUrl,
      category: product.category,
      type: 'product'
    });

    toast.success(`${product.name} adicionado ao carrinho`, {
      description: `Preço: ${formatPrice(price)}`,
      duration: 3000,
      icon: <ShoppingCart className="h-5 w-5" />,
    });

    openCart();
  };

  const handleBulkAddToCart = () => {
    const selectedProducts = filteredAndSortedProducts.filter(p =>
      selectedItems.has(p.id) && p.status === 'ACTIVE' && p.stock > 0
    );

    if (selectedProducts.length === 0) {
      toast.error('Nenhum produto disponível selecionado', {
        description: 'Selecione produtos com estoque disponível',
        duration: 3000,
      });
      return;
    }

    selectedProducts.forEach(product => {
      const price = product.promoPrice || product.salePrice;
      // Extract first image from array or use placeholder
      const imageUrl = product.images && Array.isArray(product.images) && product.images.length > 0
        ? product.images[0]
        : (typeof product.images === 'string' ? product.images : '/placeholder-product.jpg');

      addItem({
        id: product.id,
        name: product.name,
        price: price,
        image: imageUrl,
        category: product.category,
        type: 'product'
      });
    });

    toast.success(`${selectedProducts.length} produtos adicionados ao carrinho`, {
      description: 'Produtos disponíveis foram adicionados com sucesso',
      duration: 3000,
      icon: <CheckCircle2 className="h-5 w-5" />,
    });

    setSelectedItems(new Set());
    setShowBulkActions(false);
    openCart();
  };

  const handleBulkRemove = async () => {
    const promises = Array.from(selectedItems).map(productId => {
      const product = filteredAndSortedProducts.find(p => p.id === productId);
      return product ? favoriteService.removeFromFavorites(productId) : Promise.resolve();
    });

    try {
      await Promise.all(promises);
      toast.success('Favoritos removidos', {
        description: `${selectedItems.size} produtos foram removidos dos favoritos.`,
        duration: 3000,
      });
      setSelectedItems(new Set());
      setShowBulkActions(false);
      await loadFavoritesData();
    } catch (err) {
      toast.error('Erro ao remover favoritos', {
        description: 'Não foi possível remover alguns favoritos.',
        duration: 3000,
      });
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Tem certeza que deseja remover TODOS os favoritos? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      await favoriteService.clearAllFavorites();
      toast.success('Favoritos limpos', {
        description: 'Todos os favoritos foram removidos.',
        duration: 3000,
      });
      await loadFavoritesData();
    } catch (err) {
      toast.error('Erro ao limpar favoritos', {
        description: 'Não foi possível limpar os favoritos.',
        duration: 3000,
      });
    }
  };

  const handleExport = () => {
    const data = filteredAndSortedProducts.map(p => ({
      nome: p.name,
      categoria: p.category,
      subcategoria: p.subcategory || '',
      preco: (p.promoPrice || p.salePrice).toFixed(2),
      estoque: p.stock,
      disponivel: p.isActive ? 'Sim' : 'Não',
      adicionado_em: new Date(p.addedAt).toLocaleDateString('pt-BR')
    }));

    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `favoritos-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Lista exportada', {
      description: 'Lista de favoritos exportada com sucesso.',
      duration: 3000,
      icon: <Download className="h-5 w-5" />,
    });
  };

  const handleShare = async () => {
    const productNames = filteredAndSortedProducts.slice(0, 5).map(p => p.name).join(', ');
    const text = `Confira meus produtos favoritos: ${productNames}${filteredAndSortedProducts.length > 5 ? ` e mais ${filteredAndSortedProducts.length - 5}...` : ''}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Meus Favoritos - Moria',
          text: text,
          url: window.location.href
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Copiado', {
        description: 'Lista copiada para área de transferência.',
        duration: 3000,
        icon: <Share2 className="h-5 w-5" />,
      });
    }
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredAndSortedProducts.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredAndSortedProducts.map(p => p.id)));
    }
  };

  const toggleSelectItem = (id: string) => {
    const newSet = new Set(selectedItems);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedItems(newSet);
    setShowBulkActions(newSet.size > 0);
  };

  const handleRetry = () => {
    clearError();
    setProductError(null);
    loadFavoritesData();
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date(dateString));
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Heart className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">Login necessário</h3>
            <p className="mt-2 text-muted-foreground">
              Faça login para ver seus produtos favoritos
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading || loadingProducts) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Meus Favoritos</h1>
          <p className="text-muted-foreground">Produtos que você salvou para depois</p>
        </div>

        {/* Loading Header Actions */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>

        {/* Loading Filters */}
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-10 flex-1 min-w-[200px]" />
          <Skeleton className="h-10 w-[180px]" />
          <Skeleton className="h-10 w-[180px]" />
          <Skeleton className="h-10 w-[180px]" />
        </div>

        {/* Loading Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <Card key={index} className="overflow-hidden animate-pulse">
              <Skeleton className="w-full h-48" />
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="space-y-2 pt-2">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Loading Summary */}
        <div className="text-center">
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Meus Favoritos</h1>
          <p className="text-muted-foreground">Produtos que você salvou para depois</p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStats(!showStats)}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Estatísticas
          </Button>

          {favoriteProducts.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Share2 className="h-4 w-4 mr-2" />
                  Mais
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Compartilhar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleClearAll} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar Todos
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Statistics */}
      {showStats && stats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estatísticas dos Favoritos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total de Favoritos</p>
                <p className="text-2xl font-bold">{stats.totalFavorites}</p>
              </div>

              {stats.favoritesByCategory && Object.keys(stats.favoritesByCategory).length > 0 && (
                <div className="space-y-1 md:col-span-2">
                  <p className="text-sm text-muted-foreground">Por Categoria</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(stats.favoritesByCategory).map(([category, count]) => (
                      <Badge key={category} variant="secondary">
                        {category}: {count as number}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {(error || productError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error || productError}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="ml-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Filters and Actions */}
      {favoriteProducts.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-2 flex-1">
            {/* Search */}
            <input
              type="text"
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm flex-1 min-w-[200px]"
            />

            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Categorias</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Availability Filter */}
            <Select value={filterAvailability} onValueChange={(v) => setFilterAvailability(v as FilterAvailability)}>
              <SelectTrigger className="w-[180px]">
                <Package className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Disponibilidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="available">Disponíveis</SelectItem>
                <SelectItem value="unavailable">Indisponíveis</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[180px]">
                <SortAsc className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Mais Recentes</SelectItem>
                <SelectItem value="date-asc">Mais Antigos</SelectItem>
                <SelectItem value="price-asc">Menor Preço</SelectItem>
                <SelectItem value="price-desc">Maior Preço</SelectItem>
                <SelectItem value="name-asc">Nome A-Z</SelectItem>
                <SelectItem value="name-desc">Nome Z-A</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Select All */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all"
              checked={selectedItems.size === filteredAndSortedProducts.length && filteredAndSortedProducts.length > 0}
              onCheckedChange={toggleSelectAll}
            />
            <label htmlFor="select-all" className="text-sm cursor-pointer">
              Selecionar Todos
            </label>
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <Card className="bg-muted">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedItems.size} {selectedItems.size === 1 ? 'item selecionado' : 'itens selecionados'}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkAddToCart}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Adicionar ao Carrinho
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkRemove}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remover
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {filteredAndSortedProducts.length === 0 && !loading && !error && !productError ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Heart className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-2 text-lg font-medium">
                {favoriteProducts.length === 0
                  ? "Nenhum produto favorito"
                  : "Nenhum produto encontrado"
                }
              </h3>
              <p className="mt-1">
                {favoriteProducts.length === 0
                  ? "Adicione produtos aos favoritos para encontrá-los facilmente depois"
                  : "Tente ajustar os filtros para encontrar o que procura"
                }
              </p>
              {favoriteProducts.length === 0 && (
                <Button className="mt-4" onClick={() => window.location.hash = '#pecas'}>
                  Explorar Produtos
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAndSortedProducts.map((product) => {
              const hasPromo = product.promoPrice && product.promoPrice < product.salePrice;
              const finalPrice = product.promoPrice || product.salePrice;
              const discount = hasPromo ? Math.round(((product.salePrice - product.promoPrice!) / product.salePrice) * 100) : 0;
              const isSelected = selectedItems.has(product.id);
              // Extract first image from array or use placeholder
              const imageUrl = product.images && Array.isArray(product.images) && product.images.length > 0
                ? product.images[0]
                : (typeof product.images === 'string' ? product.images : '/placeholder.svg');

              return (
                <Card
                  key={product.id}
                  className={`product-hover overflow-hidden transition-all ${isSelected ? 'ring-2 ring-primary' : ''}`}
                >
                  <div className="relative">
                    <img
                      src={imageUrl}
                      alt={product.name}
                      className="w-full h-48 object-cover"
                    />

                    {/* Selection Checkbox - Top Left */}
                    <div className="absolute top-2 left-2 z-10">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelectItem(product.id)}
                        className="bg-white shadow-md"
                      />
                    </div>

                    {/* Discount Badge - Top Left (below checkbox if both exist) */}
                    {discount > 0 && (
                      <Badge className="absolute top-12 left-2 bg-red-500 text-white font-bold">
                        -{discount}%
                      </Badge>
                    )}

                    {/* Stock Status - Center overlay if unavailable */}
                    {(product.status !== 'ACTIVE' || product.stock === 0) && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Badge className="bg-gray-500 text-white text-lg px-4 py-2">
                          Indisponível
                        </Badge>
                      </div>
                    )}

                    {/* Favorite Button - Top Right */}
                    <div className="absolute top-2 right-2 z-10">
                      <FavoriteButton
                        productId={product.id}
                        productName={product.name}
                        className="bg-white/80 hover:bg-white"
                        onToggle={async () => {
                          await loadFavoritesData();
                        }}
                      />
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">
                          {product.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(product.addedAt)}
                        </span>
                      </div>

                      <h3 className="font-semibold text-sm line-clamp-2 min-h-[2.5rem]">
                        {product.name}
                      </h3>

                      {product.subcategory && (
                        <p className="text-xs text-muted-foreground">
                          {product.subcategory}
                        </p>
                      )}

                      <div className="space-y-1">
                        {hasPromo ? (
                          <div>
                            <span className="text-xs text-muted-foreground line-through">
                              {formatPrice(product.salePrice)}
                            </span>
                            <div className="text-lg font-bold text-red-600">
                              {formatPrice(finalPrice)}
                            </div>
                          </div>
                        ) : (
                          <div className="text-lg font-bold text-green-600">
                            {formatPrice(finalPrice)}
                          </div>
                        )}
                      </div>

                      {product.stock <= product.minStock && product.status === 'ACTIVE' && (
                        <Badge variant="outline" className="text-xs text-orange-600">
                          Estoque baixo ({product.stock} unidades)
                        </Badge>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleAddToCart(product)}
                        disabled={product.status !== 'ACTIVE' || product.stock === 0}
                      >
                        <ShoppingCart className="h-4 w-4 mr-1" />
                        {product.status === 'ACTIVE' && product.stock > 0
                          ? 'Adicionar ao Carrinho'
                          : 'Indisponível'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Summary */}
          <div className="text-center text-sm text-muted-foreground pt-4">
            Mostrando {filteredAndSortedProducts.length} de {favoriteProducts.length} produtos
          </div>
        </>
      )}
    </div>
  );
}
