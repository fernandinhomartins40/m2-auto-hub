import React from 'react';
import * as Icons from 'lucide-react';
import {
  AlertCircle,
  Clock,
  Disc,
  Loader2,
  Plus,
  Search,
  Snowflake,
  Wrench,
  Zap,
} from 'lucide-react';

import { useLandingPageConfig } from '../hooks/useLandingPageConfig';
import { useServices } from '../hooks/useServices';
import { useCart } from '../contexts/CartContext';
import { colorOrGradientToCSS } from './admin/LandingPageEditor/StyleControls';
import { Button } from './ui/button';
import { Card } from './ui/card';

const categoryIcons: Record<string, any> = {
  'Manutenção Preventiva': Wrench,
  Motor: Wrench,
  Freios: Disc,
  Suspensão: Disc,
  Transmissão: Wrench,
  'Sistema Elétrico': Zap,
  'Ar Condicionado': Snowflake,
  'Pneus e Rodas': Disc,
  Carroceria: Wrench,
  Diagnóstico: Search,
  Outros: Wrench,
};

const getCategoryIcon = (category: string) => categoryIcons[category] || Wrench;

export function Services() {
  const { addItem, openCart } = useCart();
  const { services, loading, error, fetchServices } = useServices();
  const { config, loading: configLoading } = useLandingPageConfig();

  interface ServiceItem {
    id: string;
    title: string;
    description: string;
    category: string;
    price?: number;
  }

  React.useEffect(() => {
    fetchServices({ status: 'ACTIVE', limit: 100 });
  }, []);

  if (!configLoading && !config.about.enabled) {
    return null;
  }

  const handleAddService = (service: ServiceItem) => {
    addItem({
      id: service.id,
      name: service.title,
      price: service.price || 0,
      quantity: 1,
      category: service.category,
      type: 'service',
      description: service.description,
    });
    openCart();
  };

  const formatPrice = (price?: number) => {
    if (!price || price === 0) {
      return 'Sob orçamento';
    }

    return `A partir de ${new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price)}`;
  };

  const sectionTitle = configLoading ? 'Nossos Serviços' : config.about.title;
  const sectionSubtitle = configLoading
    ? 'Oferecemos uma gama completa de serviços automotivos com qualidade profissional e preços justos. Sua tranquilidade é nossa prioridade.'
    : config.about.subtitle;

  const getTrustIndicatorIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent || Wrench;
  };

  return (
    <section id="servicos" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            {sectionTitle.split(' ').map((word, index) =>
              index === sectionTitle.split(' ').length - 1 ? (
                <span key={word} className="gold-metallic">
                  {word}
                </span>
              ) : (
                <span key={`${word}-${index}`}>{word} </span>
              )
            )}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">{sectionSubtitle}</p>
        </div>

        {loading && (
          <div className="text-center py-12">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-moria-orange mb-4" />
            <p className="text-gray-600">Carregando serviços...</p>
          </div>
        )}

        {error && (
          <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-600 mb-4" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">Erro ao carregar serviços</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => fetchServices({ status: 'ACTIVE', limit: 100 })} variant="outline">
              Tentar novamente
            </Button>
          </div>
        )}

        {!loading && !error && services && services.length === 0 && (
          <div className="text-center py-12">
            <Wrench className="mx-auto h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Nenhum serviço disponível</h3>
            <p className="text-gray-600">Estamos atualizando nosso catálogo de serviços.</p>
          </div>
        )}

        {!loading && !error && services && services.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service) => {
              const ServiceIcon = getCategoryIcon(service.category);

              return (
                <Card
                  key={service.id}
                  className="bg-card-dark text-card-dark-foreground p-6 hover-lift border-moria-orange/20 hover:border-moria-orange/50 transition-all duration-300"
                >
                  <div className="flex items-center mb-4">
                    <div className="gold-metallic-bg p-3 rounded-full mr-4">
                      <ServiceIcon className="h-6 w-6 text-moria-black" />
                    </div>
                    <h3 className="text-xl font-bold">{service.name}</h3>
                  </div>

                  <p className="text-gray-300 mb-4">{service.description}</p>

                  <div className="space-y-2 mb-6">
                    <div className="flex items-center text-sm text-gray-400">
                      <div className="w-2 h-2 bg-moria-orange rounded-full mr-2"></div>
                      Categoria: {service.category}
                    </div>
                    <div className="flex items-center text-sm text-gray-400">
                      <Clock className="h-4 w-4 mr-2 text-moria-orange" />
                      Tempo estimado: {service.estimatedTime}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-moria-orange font-bold">{formatPrice(service.basePrice)}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleAddService({
                          id: service.id,
                          title: service.name,
                          description: service.description,
                          category: service.category,
                          price: service.basePrice,
                        })
                      }
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Solicitar Orçamento
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {!configLoading && config.about.trustIndicators && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 text-center">
            {config.about.trustIndicators.map((indicator) => {
              const IndicatorIcon = getTrustIndicatorIcon(indicator.icon);

              return (
                <div key={indicator.id} className="flex flex-col items-center">
                  <div
                    className="p-4 rounded-full mb-2"
                    style={colorOrGradientToCSS(indicator.iconBackground)}
                  >
                    <IndicatorIcon className="h-8 w-8 text-white" />
                  </div>
                  <h4 className="font-bold text-moria-black">{indicator.title}</h4>
                  <p className="text-gray-600 text-sm">{indicator.description}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
