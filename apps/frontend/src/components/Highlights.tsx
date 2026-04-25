import { useStorefront } from "@/context/StorefrontContext";
import { formatPhoneNumber, resolveIcon } from "@/lib/storefront-helpers";

const Highlights = () => {
  const { landingConfig, productsCount, promotions, servicesCount, settings } = useStorefront();
  const section = landingConfig.contact;

  if (section?.enabled === false) {
    return null;
  }

  const items =
    section?.items?.length
      ? section.items
      : [
          { id: "1", icon: "Package", title: "Catalogo Integrado", valueType: "products" as const },
          { id: "2", icon: "Wrench", title: "Servicos Ativos", valueType: "services" as const },
          { id: "3", icon: "BadgePercent", title: "Promocoes no Ar", valueType: "promotions" as const },
          { id: "4", icon: "MessageCircle", title: "Atendimento Rapido", valueType: "whatsapp" as const },
        ];

  const getValue = (valueType?: string, customValue?: string) => {
    switch (valueType) {
      case "products":
        return `${productsCount} produtos`;
      case "services":
        return `${servicesCount} servicos`;
      case "promotions":
        return `${promotions.length} ofertas`;
      case "whatsapp":
        return settings.whatsapp ? formatPhoneNumber(settings.whatsapp) : "WhatsApp direto";
      case "custom":
        return customValue || "Texto personalizado";
      default:
        return customValue || "";
    }
  };

  return (
    <section className="relative z-10 -mt-12 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {items.slice(0, 4).map((item) => {
            const Icon = resolveIcon(item.icon);

            return (
              <div
                key={item.id}
                className="card-glow flex flex-col items-center rounded-lg border border-primary/20 bg-secondary p-6 text-center"
              >
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
                  <Icon className="text-primary" size={28} />
                </div>
                <span className="font-heading text-sm font-bold text-secondary-foreground md:text-base">
                  {item.title}
                </span>
                <span className="mt-1 text-xs text-secondary-foreground/60 md:text-sm">
                  {getValue(item.valueType, item.customValue)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Highlights;
