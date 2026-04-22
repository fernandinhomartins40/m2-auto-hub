import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Gift, Tag, Clock, TrendingUp, Package, Truck, Search, Calendar, Loader2, ArrowRight } from 'lucide-react';
import promotionService from '../api/promotionService';
import type { AdvancedPromotion } from '../types/promotions';
import { useNavigate } from 'react-router-dom';

export default function Promocoes() {
  const navigate = useNavigate();
  const [promotions, setPromotions] = useState<AdvancedPromotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    setIsLoading(true);
    try {
      const result = await promotionService.getActivePromotions();
      setPromotions(result || []);
    } catch (error) {
      console.error('Error loading promotions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PERCENTAGE':
      case 'FIXED':
        return <TrendingUp className="h-5 w-5" />;
      case 'BUY_ONE_GET_ONE':
      case 'BUNDLE_DISCOUNT':
        return <Package className="h-5 w-5" />;
      case 'FREE_SHIPPING':
        return <Truck className="h-5 w-5" />;
      default:
        return <Gift className="h-5 w-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      PERCENTAGE: 'Desconto Percentual',
      FIXED: 'Desconto Fixo',
      BUY_ONE_GET_ONE: 'Leve 2 Pague 1',
      FREE_SHIPPING: 'Frete Grátis',
      BUNDLE_DISCOUNT: 'Combo Promocional',
      TIERED_DISCOUNT: 'Desconto Escalonado'
    };
    return labels[type] || 'Promoção';
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  // Filtrar promoções
  const filteredPromotions = promotions.filter(promo => {
    const matchesSearch = promo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         promo.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || promo.type === filterType;

    return matchesSearch && matchesType;
  });

  return (
    <>
      <Helmet>
        <title>Promoções Ativas - Moria Peças e Serviços</title>
        <meta name="description" content="Confira todas as promoções ativas e economize na compra de peças e serviços automotivos" />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Header da Página */}
        <div className="bg-gradient-to-r from-moria-orange to-orange-600 text-white py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-4">
                <Gift className="h-10 w-10" />
              </div>
              <h1 className="text-4xl font-bold mb-4">Promoções Ativas</h1>
              <p className="text-xl opacity-90">
                Aproveite nossas ofertas especiais e economize em peças e serviços automotivos
              </p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="container mx-auto px-4 -mt-8">
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    placeholder="Buscar promoções..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-full md:w-64">
                    <SelectValue placeholder="Filtrar por tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Tipos</SelectItem>
                    <SelectItem value="PERCENTAGE">Desconto %</SelectItem>
                    <SelectItem value="FIXED">Desconto Fixo</SelectItem>
                    <SelectItem value="FREE_SHIPPING">Frete Grátis</SelectItem>
                    <SelectItem value="BUY_ONE_GET_ONE">Leve 2 Pague 1</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Grid de Promoções */}
        <div className="container mx-auto px-4 py-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-moria-orange mr-3" />
              <span className="text-lg text-gray-600">Carregando promoções...</span>
            </div>
          ) : filteredPromotions.length === 0 ? (
            <div className="text-center py-20">
              <Gift className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Nenhuma promoção encontrada
              </h3>
              <p className="text-gray-500">
                {searchTerm || filterType !== 'all'
                  ? 'Tente ajustar os filtros de busca'
                  : 'Não há promoções ativas no momento'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPromotions.map((promo) => {
                const daysRemaining = getDaysRemaining(promo.schedule.endDate);
                const isExpiringSoon = daysRemaining <= 3;

                return (
                  <Card key={promo.id} className="hover:shadow-xl transition-shadow duration-300 overflow-hidden">
                    <div className="bg-gradient-to-br from-moria-orange to-orange-600 text-white p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="bg-white/20 p-3 rounded-lg">
                          {getTypeIcon(promo.type)}
                        </div>
                        {isExpiringSoon && (
                          <Badge className="bg-red-500 animate-pulse">
                            ⏰ {daysRemaining}d
                          </Badge>
                        )}
                      </div>
                      <div className="text-center">
                        {promo.rewards?.primary?.type === 'PERCENTAGE' && (
                          <div className="text-5xl font-bold mb-2">
                            {promo.rewards.primary.value}%
                          </div>
                        )}
                        {promo.rewards?.primary?.type === 'FIXED' && (
                          <div className="text-3xl font-bold mb-2">
                            {formatPrice(promo.rewards.primary.value)}
                          </div>
                        )}
                        {promo.rewards?.primary?.type === 'FREE_SHIPPING' && (
                          <div className="text-2xl font-bold mb-2">
                            FRETE GRÁTIS
                          </div>
                        )}
                        <p className="text-sm opacity-90">de desconto</p>
                      </div>
                    </div>

                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-2">{promo.name}</h3>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {promo.description}
                      </p>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <Tag className="h-4 w-4 mr-2" />
                          <span>{getTypeLabel(promo.type)}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>Até {formatDate(promo.schedule.endDate)}</span>
                        </div>
                        {promo.target === 'CATEGORY' && promo.targetCategories && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Package className="h-4 w-4 mr-2" />
                            <span>{(promo.targetCategories as string[]).join(', ')}</span>
                          </div>
                        )}
                        {promo.usageLimit && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Clock className="h-4 w-4 mr-2" />
                            <span>
                              {promo.usageLimit - promo.usedCount} usos restantes
                            </span>
                          </div>
                        )}
                      </div>

                      <Button
                        className="w-full bg-moria-orange hover:bg-moria-orange/90"
                        onClick={() => navigate('/')}
                      >
                        Ver Produtos
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* CTA Footer */}
        {!isLoading && filteredPromotions.length > 0 && (
          <div className="bg-white border-t py-8">
            <div className="container mx-auto px-4 text-center">
              <h3 className="text-2xl font-bold mb-3">
                Não perca essas oportunidades!
              </h3>
              <p className="text-gray-600 mb-6">
                As promoções são válidas enquanto durarem os estoques
              </p>
              <Button
                size="lg"
                className="bg-moria-orange hover:bg-moria-orange/90"
                onClick={() => navigate('/')}
              >
                Começar a Comprar
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
