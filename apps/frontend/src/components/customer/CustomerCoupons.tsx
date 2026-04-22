// ✅ ETAPA 2.1: Seção de Cupons Disponíveis no Painel do Cliente
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import {
  Gift,
  Copy,
  Check,
  Tag,
  Calendar,
  Percent,
  TrendingUp,
  Loader2,
  AlertCircle,
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import couponService from '@/api/couponService';
import type { Coupon } from '@/api/couponService';

export function CustomerCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    loadActiveCoupons();
  }, []);

  const loadActiveCoupons = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await couponService.getActiveCoupons();

      // Se retornar objeto com data, extrair array
      const couponsArray = Array.isArray(data) ? data : (data as any).data || [];
      setCoupons(couponsArray);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar cupons');
      toast.error('Erro ao carregar cupons disponíveis');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success(`Cupom ${code} copiado!`);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      toast.error('Erro ao copiar código');
    }
  };

  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numPrice);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getDiscountText = (coupon: Coupon) => {
    if (coupon.discountType === 'PERCENTAGE') {
      return `${coupon.discountValue}% OFF`;
    }
    return `${formatPrice(coupon.discountValue)} OFF`;
  };

  const getDaysRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  const filteredCoupons = coupons.filter(coupon =>
    coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coupon.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-moria-orange" />
            Cupons Disponíveis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-moria-orange" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-moria-orange" />
            Cupons Disponíveis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadActiveCoupons} variant="outline">
              Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-moria-orange" />
              Cupons Disponíveis
            </CardTitle>
            <CardDescription>
              Aproveite descontos especiais nas suas compras
            </CardDescription>
          </div>
          {coupons.length > 0 && (
            <Badge variant="secondary" className="bg-moria-orange text-white">
              {coupons.length} {coupons.length === 1 ? 'cupom' : 'cupons'}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Busca */}
        {coupons.length > 3 && (
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cupom..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}

        {/* Lista de Cupons */}
        {filteredCoupons.length === 0 ? (
          <div className="text-center py-12">
            <Gift className="mx-auto h-16 w-16 text-gray-300 mb-4" />
            <p className="text-lg font-medium text-muted-foreground mb-2">
              {searchTerm ? 'Nenhum cupom encontrado' : 'Nenhum cupom disponível no momento'}
            </p>
            <p className="text-sm text-muted-foreground">
              {searchTerm ? 'Tente outro termo de busca' : 'Novos cupons serão adicionados em breve'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCoupons.map((coupon) => {
              const daysRemaining = getDaysRemaining(coupon.expiresAt);
              const isExpiringSoon = daysRemaining <= 3;
              const hasUsageLimit = coupon.usageLimit !== null && coupon.usageLimit !== undefined;
              const usagePercentage = hasUsageLimit
                ? (coupon.usedCount / coupon.usageLimit) * 100
                : 0;
              const isAlmostFull = usagePercentage >= 80;

              return (
                <Card
                  key={coupon.id}
                  className="relative overflow-hidden border-2 border-moria-orange/20 hover:border-moria-orange/50 transition-all hover:shadow-lg"
                >
                  {/* Badge de desconto no canto */}
                  <div className="absolute top-0 right-0 bg-moria-orange text-white px-3 py-1 rounded-bl-lg font-bold text-sm">
                    {getDiscountText(coupon)}
                  </div>

                  <CardContent className="pt-6 pb-4">
                    {/* Código do cupom */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Tag className="h-4 w-4 text-moria-orange" />
                        <span className="text-xs text-muted-foreground">Código do cupom:</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-gray-100 px-3 py-2 rounded font-mono text-lg font-bold text-gray-800">
                          {coupon.code}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyCode(coupon.code)}
                          className="h-10 px-3"
                        >
                          {copiedCode === coupon.code ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Descrição */}
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {coupon.description}
                    </p>

                    {/* Informações */}
                    <div className="space-y-2 text-xs">
                      {/* Data de expiração */}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-gray-500" />
                        <span className={isExpiringSoon ? 'text-orange-600 font-medium' : 'text-muted-foreground'}>
                          Válido até {formatDate(coupon.expiresAt)}
                          {isExpiringSoon && ` (${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'})`}
                        </span>
                      </div>

                      {/* Valor mínimo */}
                      {coupon.minValue && (
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-3 w-3 text-gray-500" />
                          <span className="text-muted-foreground">
                            Compra mínima: {formatPrice(coupon.minValue)}
                          </span>
                        </div>
                      )}

                      {/* Desconto máximo (para percentuais) */}
                      {coupon.discountType === 'PERCENTAGE' && coupon.maxValue && (
                        <div className="flex items-center gap-2">
                          <Percent className="h-3 w-3 text-gray-500" />
                          <span className="text-muted-foreground">
                            Desconto máximo: {formatPrice(coupon.maxValue)}
                          </span>
                        </div>
                      )}

                      {/* Limite de uso */}
                      {hasUsageLimit && (
                        <div className="mt-3">
                          <div className="flex justify-between items-center mb-1">
                            <span className={isAlmostFull ? 'text-orange-600 font-medium' : 'text-muted-foreground'}>
                              {coupon.usageLimit - coupon.usedCount} de {coupon.usageLimit} usos disponíveis
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${
                                isAlmostFull ? 'bg-orange-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Avisos */}
                    {isExpiringSoon && (
                      <div className="mt-3 bg-orange-50 border border-orange-200 rounded p-2 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-orange-800">
                          Este cupom expira em breve! Aproveite agora.
                        </p>
                      </div>
                    )}

                    {isAlmostFull && (
                      <div className="mt-3 bg-orange-50 border border-orange-200 rounded p-2 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-orange-800">
                          Poucos usos restantes! Garanta o seu desconto.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Dica de uso */}
        {filteredCoupons.length > 0 && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Como usar seus cupons
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✓ Copie o código do cupom desejado</li>
              <li>✓ Adicione produtos ao carrinho</li>
              <li>✓ No checkout, cole o código no campo "Cupom de desconto"</li>
              <li>✓ Veja o desconto aplicado antes de finalizar!</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
