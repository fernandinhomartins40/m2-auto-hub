import { useStorefront } from "@/context/StorefrontContext";
import { buildWhatsAppHref, toAssetUrl } from "@/lib/storefront-helpers";

function getBadgeClass(text?: string | null) {
  const normalized = (text ?? "").toLowerCase();

  if (normalized.includes("oferta")) {
    return "bg-badge-offer";
  }
  if (normalized.includes("econom")) {
    return "bg-badge-economy";
  }
  return "bg-badge-highlight";
}

const Promotions = () => {
  const { landingConfig, promotions, settings } = useStorefront();
  const section = landingConfig.services;
  const marqueeItems = landingConfig.marquee?.items ?? [];

  if (section?.enabled === false) {
    return null;
  }

  return (
    <section
      id="promocoes"
      className="py-20"
      style={{
        background: "linear-gradient(135deg, hsl(215 50% 23%), hsl(222 84% 5%))",
      }}
    >
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-secondary-foreground mb-2">
            {section?.title ? (
              section.title
            ) : (
              <>
                Promocoes <span className="text-primary">Ativas</span>
              </>
            )}
          </h2>
          <p className="text-secondary-foreground/60">
            {section?.subtitle || "Aproveite nossas ofertas especiais por tempo limitado."}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {promotions.slice(0, 3).map((promotion) => {
            const bannerImage = toAssetUrl(promotion.bannerImage);
            const highlight =
              promotion.shortDescription ||
              (promotion.endDate
                ? `Valido ate ${new Date(promotion.endDate).toLocaleDateString("pt-BR")}`
                : "Consulte as condicoes da promocao");
            const badgeText = promotion.badgeText || promotion.type || "DESTAQUE";
            const whatsappLink = buildWhatsAppHref(
              settings.whatsapp || settings.phone,
              `Ola! Quero aproveitar a promocao ${promotion.name}${promotion.code ? ` com o codigo ${promotion.code}` : ""}.`
            );

            return (
              <div
                key={promotion.id}
                className="relative bg-secondary/80 border border-primary/25 rounded-xl p-6 card-glow overflow-hidden"
              >
                {bannerImage ? (
                  <div className="absolute inset-0 opacity-10">
                    <img
                      src={bannerImage}
                      alt={promotion.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : null}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                <div className="relative z-10">
                  <span
                    className={`inline-block ${getBadgeClass(
                      badgeText
                    )} text-primary-foreground text-xs font-heading font-bold px-3 py-1 rounded-full mb-4`}
                  >
                    {badgeText}
                  </span>
                  <h3 className="font-heading font-bold text-2xl text-secondary-foreground mb-2">
                    {promotion.name}
                  </h3>
                  <p className="text-secondary-foreground/60 text-sm mb-4">
                    {promotion.description}
                  </p>
                  <div className="bg-primary/10 border border-primary/20 rounded-md px-4 py-2 mb-3">
                    <span className="text-primary font-heading font-semibold text-sm">
                      {highlight}
                    </span>
                  </div>
                  {promotion.code ? (
                    <div className="mb-5 text-xs text-secondary-foreground/70">
                      Codigo promocional:{" "}
                      <span className="font-heading font-bold text-primary">{promotion.code}</span>
                    </div>
                  ) : null}
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-md font-heading font-bold transition-all hover:scale-105"
                  >
                    Aproveitar Agora
                  </a>
                </div>
              </div>
            );
          })}

          {promotions.length === 0 ? (
            <div className="md:col-span-3 rounded-xl border border-primary/20 bg-secondary/70 p-8 text-center">
              <h3 className="font-heading font-bold text-2xl text-secondary-foreground mb-2">
                Nenhuma promocao ativa no momento
              </h3>
              <p className="text-secondary-foreground/60 mb-6">
                Entre em contato e consulte as melhores condicoes para o seu servico ou produto.
              </p>
              <a
                href={buildWhatsAppHref(settings.whatsapp || settings.phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-md font-heading font-bold text-lg transition-all blue-shadow hover:scale-105"
              >
                Consultar Promocoes
              </a>
            </div>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-lg bg-secondary/50 border border-primary/15 py-3">
          <div className="animate-marquee whitespace-nowrap">
            {marqueeItems.length ? (
              <>
                {marqueeItems.concat(marqueeItems).map((item, index) => (
                  <span
                    key={`${item.id}-${index}`}
                    className={`mx-8 text-sm ${
                      index % 2 === 0
                        ? "text-primary font-heading font-semibold"
                        : "text-secondary-foreground/70"
                    }`}
                  >
                    {item.icon ? `${item.icon} ` : ""}
                    {item.text}
                  </span>
                ))}
              </>
            ) : (
              <>
                <span className="text-primary font-heading font-semibold text-sm mx-8">
                  Promocoes validas enquanto durarem os estoques
                </span>
                <span className="text-secondary-foreground/70 text-sm mx-8">
                  Fale com a equipe para conferir disponibilidade
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Promotions;
