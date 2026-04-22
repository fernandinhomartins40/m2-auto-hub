import { ClipboardList } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useStorefront } from "@/context/StorefrontContext";
import { useCart } from "@/contexts/CartContext";
import {
  buildWhatsAppHref,
  formatCurrency,
  resolveServiceIcon,
} from "@/lib/storefront-helpers";

const Services = () => {
  const { landingConfig, services, settings } = useStorefront();
  const { addItem, openCart } = useCart();
  const section = landingConfig.about;

  if (section?.enabled === false) {
    return null;
  }

  return (
    <section id="servicos" className="py-20 section-dark">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-secondary-foreground mb-2">
            {section?.title ? (
              section.title
            ) : (
              <>
                Nossos <span className="text-primary">Servicos</span>
              </>
            )}
          </h2>
          <div className="w-20 h-1 bg-primary rounded-full mx-auto mb-4" />
          <p className="text-secondary-foreground/60 max-w-2xl mx-auto">
            {section?.subtitle ||
              "Atendimento tecnico especializado para mecanica leve, pesada e diesel."}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => {
            const ServiceIcon = resolveServiceIcon(service.category, service.name);
            const priceLabel = formatCurrency(service.basePrice);
            const whatsappLink = buildWhatsAppHref(
              settings.whatsapp || settings.phone,
              `Ola! Quero solicitar um orcamento para o servico ${service.name}.`
            );

            return (
              <div
                key={service.id}
                className="bg-secondary border border-primary/20 rounded-lg p-6 card-glow group"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/15 flex items-center justify-center mb-4 group-hover:bg-primary/25 transition-colors">
                  <ServiceIcon className="text-primary" size={24} />
                </div>
                <div className="mb-3">
                  <span className="inline-block bg-primary/10 text-primary text-xs font-heading font-semibold px-3 py-1 rounded-full">
                    {service.category}
                  </span>
                </div>
                <h3 className="font-heading font-bold text-xl text-secondary-foreground mb-2">
                  {service.name}
                </h3>
                <p className="text-secondary-foreground/60 mb-4 text-sm min-h-12">
                  {service.description}
                </p>
                <div className="mb-4 flex flex-wrap gap-2 text-xs text-secondary-foreground/60">
                  {service.estimatedTime ? (
                    <span className="rounded-full border border-primary/15 px-3 py-1">
                      {service.estimatedTime}
                    </span>
                  ) : null}
                  {priceLabel ? (
                    <span className="rounded-full border border-primary/15 px-3 py-1">
                      A partir de {priceLabel}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-col gap-3">
                  <Button
                    type="button"
                    onClick={() => {
                      addItem({
                        id: service.id,
                        name: service.name,
                        price: service.basePrice ?? 0,
                        category: service.category,
                        type: "service",
                        description: service.description,
                      });
                      openCart();
                    }}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <ClipboardList size={16} />
                    Adicionar ao orçamento
                  </Button>

                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center text-primary font-heading font-semibold text-sm hover:underline"
                  >
                    Solicitar pelo WhatsApp
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Services;
