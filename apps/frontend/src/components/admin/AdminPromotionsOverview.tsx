import {
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle,
  Clock,
  Eye,
  Gift,
  MessageCircle,
  Package,
  Plus,
  RefreshCw,
  Search,
  Tag,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Separator } from "../ui/separator";

const formatPrice = (price: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);

interface AdminPromotionsOverviewProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

/**
 * Visao geral de promocoes. Extraida do AdminContent, que concentrava 26 telas
 * em um unico arquivo.
 */
export function AdminPromotionsOverview({
  searchTerm,
  onSearchTermChange: setSearchTerm,
  statusFilter,
  onStatusFilterChange: setStatusFilter,
  onRefresh: loadData,
  isLoading,
}: AdminPromotionsOverviewProps) {
  // Dados simulados de promoções baseados no conceito de campanhas de marketing
  const promotions = [
    {
      id: 'promo-001',
      name: 'Black Friday Automotiva',
      description: 'Descontos especiais em peças selecionadas',
      type: 'discount',
      value: 25,
      isActive: true,
      startDate: '2024-11-20',
      endDate: '2024-11-30',
      targetProducts: ['Filtros', 'Pastilhas de Freio'],
      minValue: 100,
      usageCount: 45,
      maxUsage: 100,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'promo-002', 
      name: 'Combo Revisão Completa',
      description: 'Kit completo para revisão com desconto progressivo',
      type: 'bundle',
      value: 15,
      isActive: true,
      startDate: '2024-11-01',
      endDate: '2024-12-31',
      targetProducts: ['Filtros', 'Óleo Motor', 'Velas'],
      minValue: 200,
      usageCount: 12,
      maxUsage: 50,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'promo-003',
      name: 'Frete Grátis Dezembro',
      description: 'Frete gratuito para pedidos acima de R$ 150',
      type: 'shipping',
      value: 0,
      isActive: false,
      startDate: '2024-12-01',
      endDate: '2024-12-31',
      targetProducts: [],
      minValue: 150,
      usageCount: 0,
      maxUsage: 200,
      createdAt: new Date().toISOString(),
    }
  ];

  return (
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
                onClick={loadData}
                disabled={isLoading}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button 
                size="sm" 
                className="bg-moria-orange hover:bg-moria-orange/90"
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

          <div className="space-y-4">
            {promotions.map((promotion) => {
              const isExpired = new Date(promotion.endDate) < new Date();
              const isUpcoming = new Date(promotion.startDate) > new Date();
              const usage = (promotion.usageCount / promotion.maxUsage) * 100;
              
              const getPromotionTypeIcon = () => {
                switch (promotion.type) {
                  case 'discount': return <TrendingUp className="h-6 w-6" />;
                  case 'bundle': return <Package className="h-6 w-6" />;
                  case 'shipping': return <Truck className="h-6 w-6" />;
                  default: return <Gift className="h-6 w-6" />;
                }
              };

              const getPromotionTypeLabel = () => {
                switch (promotion.type) {
                  case 'discount': return 'Desconto';
                  case 'bundle': return 'Combo';
                  case 'shipping': return 'Frete';
                  default: return 'Promoção';
                }
              };

              return (
                <div key={promotion.id} className="border rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="bg-moria-orange text-white rounded-lg p-3">
                        {getPromotionTypeIcon()}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{promotion.name}</h3>
                        <p className="text-sm text-gray-600 mb-2">{promotion.description}</p>
                        <div className="flex items-center gap-4">
                          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                            {getPromotionTypeLabel()}
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
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {promotion.type === 'discount' && (
                        <p className="text-2xl font-bold text-green-600">{promotion.value}%</p>
                      )}
                      {promotion.type === 'shipping' && (
                        <p className="text-lg font-bold text-blue-600">Frete Grátis</p>
                      )}
                      <p className="text-sm text-gray-600">Min: {formatPrice(promotion.minValue)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">Período</span>
                      </div>
                      <div className="text-sm">
                        <p>Início: {new Date(promotion.startDate).toLocaleDateString('pt-BR')}</p>
                        <p>Fim: {new Date(promotion.endDate).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">Uso</span>
                      </div>
                      <div className="text-sm">
                        <p>{promotion.usageCount} / {promotion.maxUsage}</p>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-moria-orange h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(usage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Tag className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">Produtos</span>
                      </div>
                      <div className="text-sm">
                        {promotion.targetProducts.length > 0 ? (
                          <p className="text-gray-600">{promotion.targetProducts.join(', ')}</p>
                        ) : (
                          <p className="text-gray-500">Todos os produtos</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <BarChart3 className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">Performance</span>
                      </div>
                      <div className="text-sm">
                        <p className="text-green-600 font-medium">{usage.toFixed(1)}% usado</p>
                        <p className="text-gray-500">{promotion.maxUsage - promotion.usageCount} restantes</p>
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
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-red-600 hover:text-red-700 hover:border-red-300"
                      >
                        <AlertCircle className="h-4 w-4 mr-1" />
                        Excluir
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          const link = `${window.location.origin}/customer`;
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
        </CardContent>
      </Card>
    </div>
  );
}
