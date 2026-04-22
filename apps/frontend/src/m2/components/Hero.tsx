import heroBg from "@/assets/hero-bg.jpg";
import { useStorefront } from "@/context/StorefrontContext";
import { buildWhatsAppHref, normalizeLink, toAssetUrl } from "@/lib/storefront-helpers";

const primaryButtonClasses =
  "inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-md font-heading font-bold text-lg transition-all blue-shadow hover:scale-105";
const secondaryButtonClasses =
  "inline-flex items-center justify-center gap-2 border-2 border-secondary-foreground/30 hover:border-primary text-secondary-foreground px-8 py-4 rounded-md font-heading font-bold text-lg transition-all hover:scale-105";

const Hero = () => {
  const { landingConfig, settings, whatsappHref } = useStorefront();
  const hero = landingConfig.hero;

  if (hero?.enabled === false) {
    return null;
  }

  const backgroundImage = toAssetUrl(hero?.backgroundImage?.url) || heroBg;
  const buttons = (hero?.buttons ?? []).filter((button) => button.enabled !== false);
  const storeName = settings.storeName || "M2 Auto Pecas & Auto Center";
  const overlayOpacity = Math.min(Math.max((hero?.overlayOpacity ?? 80) / 100, 0.35), 0.95);

  const handleAnchorClick = (href: string) => {
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="inicio"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      <div className="absolute inset-0">
        <img
          src={backgroundImage}
          alt={hero?.backgroundImage?.alt || storeName}
          className="w-full h-full object-cover"
        />
        <div
          className="absolute inset-0 bg-gradient-to-br from-secondary via-secondary to-primary/40"
          style={{ opacity: overlayOpacity }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 text-center py-32">
        <div className="max-w-4xl mx-auto animate-fade-up">
          <div className="inline-block bg-primary/20 border border-primary/30 rounded-full px-4 py-1.5 mb-6">
            <span className="text-primary font-heading font-semibold text-sm tracking-wide">
              {storeName.toUpperCase()}
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-bold text-secondary-foreground leading-tight mb-6">
            {hero?.title || "Tudo que seu carro precisa,"}{" "}
            <span className="text-primary">
              {hero?.subtitle || "voce encontra aqui."}
            </span>
          </h1>
          <p className="text-lg md:text-xl text-secondary-foreground/70 max-w-2xl mx-auto mb-10 font-body">
            {hero?.description ||
              "Auto Pecas + Auto Center em Palmital/PR. Atendimento especializado em mecanica leve, pesada e diesel."}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {buttons.slice(0, 3).map((button, index) => {
              const normalizedHref =
                /wa\.me|whatsapp/i.test(button.href) || /whatsapp/i.test(button.text)
                  ? whatsappHref
                  : normalizeLink(button.text, button.href);
              const classes =
                index === 0 || button.variant === "hero" ? primaryButtonClasses : secondaryButtonClasses;

              if (normalizedHref.startsWith("#")) {
                return (
                  <button
                    key={button.id}
                    type="button"
                    onClick={() => handleAnchorClick(normalizedHref)}
                    className={classes}
                  >
                    {button.text}
                  </button>
                );
              }

              return (
                <a
                  key={button.id}
                  href={
                    normalizedHref === whatsappHref
                      ? buildWhatsAppHref(settings.whatsapp || settings.phone)
                      : normalizedHref
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className={classes}
                >
                  {button.text}
                </a>
              );
            })}
          </div>

          {hero?.features?.length ? (
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              {hero.features.slice(0, 4).map((feature) => (
                <span
                  key={feature.id}
                  className="rounded-full border border-primary/20 bg-secondary/40 px-4 py-2 text-sm text-secondary-foreground/80"
                >
                  {feature.text}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default Hero;
