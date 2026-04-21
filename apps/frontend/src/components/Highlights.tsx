import { BadgePercent, MessageCircle, Package, Wrench } from "lucide-react";

import { useStorefront } from "@/context/StorefrontContext";

const Highlights = () => {
  const { productsCount, promotions, servicesCount } = useStorefront();

  const items = [
    {
      icon: Package,
      title: "Catalogo Integrado",
      value: `${productsCount} produtos`,
    },
    {
      icon: Wrench,
      title: "Servicos Ativos",
      value: `${servicesCount} servicos`,
    },
    {
      icon: BadgePercent,
      title: "Promocoes no Ar",
      value: `${promotions.length} ofertas`,
    },
    {
      icon: MessageCircle,
      title: "Atendimento Rapido",
      value: "WhatsApp direto",
    },
  ];

  return (
    <section className="relative z-10 -mt-12 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((item) => (
            <div
              key={item.title}
              className="bg-secondary border border-primary/20 rounded-lg p-6 flex flex-col items-center text-center card-glow"
            >
              <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mb-3">
                <item.icon className="text-primary" size={28} />
              </div>
              <span className="font-heading font-bold text-secondary-foreground text-sm md:text-base">
                {item.title}
              </span>
              <span className="mt-1 text-xs md:text-sm text-secondary-foreground/60">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Highlights;
