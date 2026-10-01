import { useStorefront } from "@/context/StorefrontContext";
import { formatPhoneNumber, resolveIcon } from "@/lib/storefront-helpers";

const Highlights = () => {
  const { landingConfig, offers, promotions, productsCount, servicesCount, settings } = useStorefront();
  const section = landingConfig.contact;

  if (section?.enabled === false) {
    return null;
  }

  const items =
    section?.items?.length
      ? section.items
      : [
          { id: "1", icon: "Package", title: "Catálogo integrado", valueType: "products" as const },
          { id: "2", icon: "Wrench", title: "Serviços ativos", valueType: "services" as const },
          { id: "3", icon: "BadgePercent", title: "Promoções no ar", valueType: "promotions" as const },
          { id: "4", icon: "MessageCircle", title: "Atendimento rápido", valueType: "whatsapp" as const },
        ];

  const getValue = (valueType?: string, customValue?: string) => {
    switch (valueType) {
      case "products":
        return `${productsCount} produtos`;
      case "services":
        return `${servicesCount} serviços`;
      case "promotions":
        return `${offers.length || promotions.length} ofertas`;
      case "whatsapp":
        return settings.whatsapp ? formatPhoneNumber(settings.whatsapp) : "WhatsApp direto";
      case "custom":
        return customValue || "Texto personalizado";
      default:
        return customValue || "";
    }
  };

  return (
    <section className="bg-primary text-white">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {items.slice(0, 4).map((item) => {
            const Icon = resolveIcon(item.icon);

            return (
              <div
                key={item.id}
                className="flex min-h-28 items-center gap-4 border-white/20 px-4 py-6 text-left even:border-l md:border-l md:first:border-l-0"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Icon className="text-white" size={23} />
                </div>
                <div><span className="block font-heading text-sm font-bold md:text-base">{item.title}</span>
                <span className="mt-1 block text-xs text-white/75 md:text-sm">{getValue(item.valueType, item.customValue)}</span></div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Highlights;
