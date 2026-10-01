import { ArrowRight, ClipboardList } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useStorefront } from "@/context/StorefrontContext";
import { useCart } from "@/contexts/CartContext";
import {
  buildWhatsAppHref,
  formatCurrency,
  resolveIcon,
  resolveServiceIcon,
} from "@/lib/storefront-helpers";

const Services = () => {
  const { landingConfig, services, settings } = useStorefront();
  const { addItem, openCart } = useCart();
  const section = landingConfig.about;
  const trustIndicators = section?.trustIndicators?.length
    ? section.trustIndicators
    : [
        { id: "security", icon: "Shield", title: "Segurança", description: "Serviço confiável" },
        { id: "speed", icon: "Zap", title: "Agilidade", description: "Atendimento rápido" },
        { id: "experience", icon: "Users", title: "Experiência", description: "Equipe especializada" },
        { id: "diesel", icon: "Truck", title: "Diesel", description: "Linha pesada e utilitarios" },
      ];

  if (section?.enabled === false) {
    return null;
  }

  return (
    <section id="servicos" className="bg-white py-14 md:py-16">
      <div className="container mx-auto px-4">
        <div className="grid items-stretch gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-0">
          <div className="flex flex-col justify-center lg:border-r lg:border-slate-200 lg:pr-14">
            <div className="mb-5 h-1 w-14 rounded-full bg-primary" />
            <h2 className="max-w-md font-heading text-4xl font-bold leading-[1.02] text-slate-950 md:text-5xl">
              Do cuidado<br />à <span className="text-primary">peça certa.</span>
            </h2>
            <p className="mt-5 max-w-sm text-lg leading-relaxed text-slate-600">
              {section?.subtitle || "Conte com a M2 para cuidar do seu veículo."}
            </p>
            <a
              href={buildWhatsAppHref(
                settings.whatsapp || settings.phone,
                "Olá! Quero agendar um serviço."
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 inline-flex w-fit items-center justify-center gap-3 rounded-lg bg-primary px-7 py-4 font-heading font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 hover:bg-primary/90"
            >
              Agendar serviço
              <ArrowRight size={18} />
            </a>
          </div>

          <div className="flex flex-col justify-center lg:pl-14">
            {trustIndicators.slice(0, 4).map((indicator, index) => {
              const Icon = resolveIcon(indicator.icon);

              return (
                <div
                  key={indicator.id}
                  className={`flex items-center gap-6 py-4 ${index ? "border-t border-slate-200" : ""}`}
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-50">
                    <Icon className="text-primary" size={25} />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold text-slate-950">
                      {indicator.title}
                    </h3>
                    <p className="mt-0.5 text-sm text-slate-500">{indicator.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {services.length ? (
          <div className="mt-16 border-t border-slate-200 pt-12">
            <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <span className="font-heading text-sm font-bold uppercase tracking-[0.18em] text-primary">
                  Serviços automotivos
                </span>
                <h3 className="mt-2 font-heading text-3xl font-bold text-slate-950">
                  Escolha o cuidado que seu veículo precisa
                </h3>
              </div>
              <p className="max-w-md text-sm text-slate-500">
                Serviços cadastrados no painel, com orçamento e atendimento direto pela equipe.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const ServiceIcon = resolveServiceIcon(service.category, service.name);
            const priceLabel = formatCurrency(service.basePrice);
            const whatsappLink = buildWhatsAppHref(
              settings.whatsapp || settings.phone,
              `Olá! Quero solicitar um orçamento para o serviço ${service.name}.`
            );

            return (
              <div
                key={service.id}
                className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/15 flex items-center justify-center mb-4 group-hover:bg-primary/25 transition-colors">
                  <ServiceIcon className="text-primary" size={24} />
                </div>
                <div className="mb-3">
                  <span className="inline-block bg-primary/10 text-primary text-xs font-heading font-semibold px-3 py-1 rounded-full">
                    {service.category}
                  </span>
                </div>
                <h3 className="font-heading font-bold text-xl text-slate-950 mb-2">
                  {service.name}
                </h3>
                <p className="text-slate-600 mb-4 text-sm min-h-12">
                  {service.description}
                </p>
                <div className="mb-4 flex flex-wrap gap-2 text-xs text-slate-500">
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
                    className="inline-flex min-h-[44px] items-center justify-center px-2 py-2 text-primary font-heading font-semibold text-sm hover:underline"
                  >
                    Solicitar pelo WhatsApp
                  </a>
                </div>
              </div>
            );
          })}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default Services;
