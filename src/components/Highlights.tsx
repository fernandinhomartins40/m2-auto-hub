import { Wrench, Droplets, Truck, Settings } from "lucide-react";

const items = [
  { icon: Wrench, label: "Mecânica Especializada" },
  { icon: Droplets, label: "Óleos & Lubrificantes" },
  { icon: Truck, label: "Linha Diesel" },
  { icon: Settings, label: "Peças de Qualidade" },
];

const Highlights = () => (
  <section className="relative z-10 -mt-12 pb-8">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="bg-secondary border border-primary/20 rounded-lg p-6 flex flex-col items-center text-center card-glow"
          >
            <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mb-3">
              <item.icon className="text-primary" size={28} />
            </div>
            <span className="font-heading font-bold text-secondary-foreground text-sm md:text-base">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default Highlights;
