import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Clock, Timer, TrendingDown, Package } from "lucide-react";
import { useCart } from "../contexts/CartContext";
import offerService, { Offer } from "../api/offerService";
import { getImageUrl } from "@/utils/imageUrl";
import { useLandingPageConfig } from "@/hooks/useLandingPageConfig";
import { useStoreSettings } from "@/hooks/useStoreSettings";

interface PromotionalProduct {
  id: string;
  name: string;
  originalPrice: number;
  discountPrice: number;
  discount: number;
  image: string;
  category: string;
  limited?: boolean;
  endTime?: Date;
  badge?: string;
}

// Simulated countdown timer hook
function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;

      if (distance > 0) {
        setTimeLeft({
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return timeLeft;
}

// Helper para converter Offer em PromotionalProduct
const convertOfferToPromotional = (offer: Offer): PromotionalProduct => {
  const imageUrl = offer.images && offer.images.length > 0
    ? getImageUrl(offer.images[0])
    : '';

  return {
    id: offer.id,
    name: offer.name,
    originalPrice: Number(offer.salePrice),
    discountPrice: Number(offer.promoPrice),
    discount: offerService.calculateDiscount(Number(offer.salePrice), Number(offer.promoPrice)),
    image: imageUrl,
    category: offer.category,
    limited: offer.offerType === 'DIA',
    endTime: offer.offerType === 'DIA' ? new Date(offer.offerEndDate) : undefined,
    badge: offer.offerBadge
  };
};

export function Promotions() {
  const { addItem, openCart } = useCart();
  const { settings: storeSettings } = useStoreSettings();
  const { config, loading: configLoading } = useLandingPageConfig();

  const [dailyOffers, setDailyOffers] = useState<PromotionalProduct[]>([]);
  const [weeklyOffers, setWeeklyOffers] = useState<PromotionalProduct[]>([]);
  const [monthlyOffers, setMonthlyOffers] = useState<PromotionalProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // Buscar próxima data de expiração das ofertas diárias para o countdown
  const nextDailyExpiration = dailyOffers.length > 0 && dailyOffers[0].endTime
    ? dailyOffers[0].endTime
    : new Date(Date.now() + 24 * 60 * 60 * 1000);

  const timeLeft = useCountdown(nextDailyExpiration);

  // Carregar ofertas da API
  useEffect(() => {
    const loadOffers = async () => {
      try {
        setLoading(true);
        const [daily, weekly, monthly] = await Promise.all([
          offerService.getOffersByType('DIA'),
          offerService.getOffersByType('SEMANA'),
          offerService.getOffersByType('MES')
        ]);

        setDailyOffers(daily.map(convertOfferToPromotional));
        setWeeklyOffers(weekly.map(convertOfferToPromotional));
        setMonthlyOffers(monthly.map(convertOfferToPromotional));
      } catch (error) {
        console.error('Erro ao carregar ofertas:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOffers();
  }, []);


  const PromotionCard = ({ product }: { product: PromotionalProduct }) => (
    <Card className="product-hover overflow-hidden">
      <div className="relative">
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-48 object-cover"
        />
        <Badge className="absolute top-2 left-2 bg-red-500 text-white font-bold animate-pulse">
          -{product.discount}%
        </Badge>
        {(product.badge || product.limited) && (
          <Badge className="absolute top-2 right-2 bg-moria-orange text-white font-bold">
            {product.badge || 'LIMITADO'}
          </Badge>
        )}
      </div>

      <div className="p-4">
        <Badge variant="outline" className="mb-2 text-xs">
          {product.category}
        </Badge>
        
        <h3 className="font-semibold text-lg mb-3 line-clamp-2">
          {product.name}
        </h3>

        <div className="mb-4">
          <span className="text-sm text-gray-500 line-through mr-2">
            R$ {product.originalPrice.toFixed(2)}
          </span>
          <span className="text-xl font-bold text-red-600">
            R$ {product.discountPrice.toFixed(2)}
          </span>
          <div className="text-xs text-green-600 font-medium">
            Economia de R$ {(product.originalPrice - product.discountPrice).toFixed(2)}
          </div>
        </div>

        <Button
          variant="hero"
          size="sm"
          className="w-full"
          onClick={() => {
            addItem({
              id: product.id,
              name: product.name,
              price: product.discountPrice,
              image: product.image,
              category: product.category
            });
            openCart();
          }}
        >
          Adicionar ao Carrinho
        </Button>
      </div>
    </Card>
  );

  const sectionTitle = configLoading ? "Promoções Imperdíveis" : config.services.title;
  const sectionSubtitle = configLoading ? "Aproveite nossas ofertas especiais por tempo limitado. Qualidade garantida com os melhores preços do mercado." : config.services.subtitle;

  if (!configLoading && !config.services.enabled) {
    return null;
  }

  return (
    <section id="promocoes" className="py-20 bg-gradient-to-br from-gray-900 to-moria-black text-white">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            {sectionTitle.split(' ').map((word, i) =>
              i === 0 ?
                <span key={i} className="gold-metallic">{word} </span> :
                <span key={i}>{word} </span>
            )}
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            {sectionSubtitle}
          </p>
        </div>

        {/* Daily Offers */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <Timer className="h-8 w-8 text-moria-orange mr-3" />
              <div>
                <h3 className="text-3xl font-bold">Ofertas do Dia</h3>
                <p className="text-gray-400">Válido até meia-noite</p>
              </div>
            </div>
            
            {/* Countdown Timer */}
            <div className="bg-moria-orange/20 border border-moria-orange rounded-lg p-4">
              <div className="flex items-center space-x-2 text-center">
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-moria-orange">
                    {timeLeft.hours.toString().padStart(2, '0')}
                  </span>
                  <span className="text-xs text-gray-400">HORAS</span>
                </div>
                <span className="text-moria-orange">:</span>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-moria-orange">
                    {timeLeft.minutes.toString().padStart(2, '0')}
                  </span>
                  <span className="text-xs text-gray-400">MIN</span>
                </div>
                <span className="text-moria-orange">:</span>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-moria-orange">
                    {timeLeft.seconds.toString().padStart(2, '0')}
                  </span>
                  <span className="text-xs text-gray-400">SEG</span>
                </div>
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="h-64 animate-pulse bg-gray-700" />
              ))}
            </div>
          ) : dailyOffers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {dailyOffers.map((product) => (
                <PromotionCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-800/50 rounded-lg">
              <p className="text-gray-400">Nenhuma oferta do dia disponível no momento</p>
            </div>
          )}
        </div>

        {/* Weekly Offers */}
        {(loading || weeklyOffers.length > 0) && (
          <div className="mb-16">
            <div className="flex items-center mb-8">
              <TrendingDown className="h-8 w-8 text-gold-accent mr-3" />
              <div>
                <h3 className="text-3xl font-bold">Ofertas da Semana</h3>
                <p className="text-gray-400">Semana da Manutenção</p>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="h-64 animate-pulse bg-gray-700" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {weeklyOffers.map((product) => (
                  <PromotionCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Monthly Offers */}
        {(loading || monthlyOffers.length > 0) && (
          <div className="mb-16">
            <div className="gold-metallic-bg p-8 rounded-lg">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center">
                  <Package className="h-8 w-8 text-moria-black mr-3" />
                  <div>
                    <h3 className="text-3xl font-bold text-moria-black">Ofertas do Mês</h3>
                    <p className="text-moria-black/70">Kits promocionais com desconto progressivo</p>
                  </div>
                </div>
                {!loading && monthlyOffers.length > 0 && (
                  <Badge className="bg-moria-black text-gold-accent font-bold text-lg px-4 py-2">
                    ATÉ {monthlyOffers.length > 0 ? Math.max(...monthlyOffers.map(p => p.discount)) : 0}% OFF
                  </Badge>
                )}
              </div>

              {loading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {[1, 2].map((i) => (
                    <Card key={i} className="h-64 animate-pulse bg-gray-700/30" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {monthlyOffers.map((product) => (
                    <PromotionCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CTA Section */}
        <div className="text-center bg-moria-orange/10 border border-moria-orange/30 rounded-lg p-8">
          <Clock className="h-16 w-16 text-moria-orange mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-4">
            Não perca essas ofertas!
          </h3>
          <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
            Aproveite nossas promoções por tempo limitado. Peças originais com qualidade garantida 
            e os melhores preços do mercado.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="hero"
              size="lg"
              onClick={() => window.location.href = '/promocoes'}
            >
              Ver Todas as Promoções
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-white text-white hover:bg-white hover:text-moria-black"
              onClick={() => {
                const whatsappNumber = storeSettings?.whatsapp || "5511999999999";
                window.open(`https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${encodeURIComponent('Olá! Gostaria de saber mais sobre as promoções.')}`, '_blank');
              }}
            >
              Falar com Vendedor
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
