import { useStorefront } from "@/context/StorefrontContext";
import { resolveIcon } from "@/lib/storefront-helpers";

const Testimonials = () => {
  const { landingConfig } = useStorefront();
  const items =
    landingConfig.footer?.certifications?.slice(0, 3) ??
    landingConfig.about?.trustIndicators?.slice(0, 3) ??
    [];

  if (!items.length) {
    return null;
  }

  return (
    <section className="py-20 section-dark">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-secondary-foreground mb-2">
            Nossos <span className="text-primary">Diferenciais</span>
          </h2>
          <div className="w-20 h-1 bg-primary rounded-full mx-auto" />
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {items.map((item) => {
            const Icon = resolveIcon(item.icon);

            return (
              <div key={item.id} className="glass-card rounded-xl p-6">
                <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center mb-4">
                  <Icon size={22} className="text-primary" />
                </div>
                <h3 className="font-heading font-bold text-xl text-secondary-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-secondary-foreground/80 leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
