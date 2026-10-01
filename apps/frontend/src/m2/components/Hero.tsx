import heroBg from "@/assets/hero-bg.jpg";
import { useStorefront } from "@/context/StorefrontContext";
import { buildWhatsAppHref, normalizeLink, toAssetUrl } from "@/lib/storefront-helpers";
import { ArrowRight, MapPin } from "lucide-react";

const primaryButtonClasses =
  "inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-7 py-4 rounded-lg font-heading font-bold transition-all blue-shadow hover:-translate-y-0.5";
const secondaryButtonClasses =
  "inline-flex items-center justify-center gap-2 border border-primary/30 hover:border-primary bg-primary/5 text-primary px-7 py-4 rounded-lg font-heading font-bold transition-all hover:-translate-y-0.5";

const Hero = () => {
  const { landingConfig, settings, whatsappHref } = useStorefront();
  const hero = landingConfig.hero;

  if (hero?.enabled === false) {
    return null;
  }

  const backgroundImage = toAssetUrl(hero?.backgroundImage?.url) || heroBg;
  const buttons = (hero?.buttons ?? []).filter((button) => button.enabled !== false);
  const storeName = settings.storeName || "M2 Auto Peças & Auto Center";

  const handleAnchorClick = (href: string) => {
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="inicio" className="overflow-hidden bg-white pt-16">
      <div className="grid min-h-[650px] lg:grid-cols-[48%_52%]">
        <div className="relative z-10 flex items-center px-6 py-16 sm:px-10 lg:px-[max(2.5rem,calc((100vw-1280px)/2))] lg:pr-12">
          <div className="max-w-2xl animate-fade-up">
            <div className="mb-7 h-1 w-16 rounded-full bg-primary" />
            <span className="mb-4 block font-heading text-sm font-bold uppercase tracking-[0.18em] text-primary">
              {storeName}
            </span>
            <h1 className="mb-6 font-heading text-5xl font-bold leading-[0.95] tracking-tight text-slate-950 sm:text-6xl xl:text-7xl">
              {hero?.title || "Tudo que seu carro precisa,"}{" "}
              <span className="text-primary">{hero?.subtitle || "você encontra aqui."}</span>
            </h1>
            <p className="mb-6 max-w-xl text-lg leading-relaxed text-slate-600">
              {hero?.description || "Auto Peças + Auto Center em Palmital/PR. Atendimento especializado em mecânica leve, pesada e diesel."}
            </p>
            <div className="mb-8 flex items-center gap-2 text-sm font-semibold text-slate-600">
              <MapPin size={18} className="text-primary" />
              Atendimento local, peças e serviços especializados
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              {buttons.slice(0, 3).map((button, index) => {
                const normalizedHref = /wa\.me|whatsapp/i.test(button.href) || /whatsapp/i.test(button.text) ? whatsappHref : normalizeLink(button.text, button.href);
                const classes = index === 0 || button.variant === "hero" ? primaryButtonClasses : secondaryButtonClasses;
                const content = <>{button.text}<ArrowRight size={17} /></>;
                return normalizedHref.startsWith("#") ? (
                  <button key={button.id} type="button" onClick={() => handleAnchorClick(normalizedHref)} className={classes}>{content}</button>
                ) : (
                  <a key={button.id} href={normalizedHref === whatsappHref ? buildWhatsAppHref(settings.whatsapp || settings.phone) : normalizedHref} target="_blank" rel="noopener noreferrer" className={classes}>{content}</a>
                );
              })}
            </div>
            {hero?.features?.length ? (
              <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 border-t border-slate-200 pt-6">
                {hero.features.slice(0, 4).map((feature) => <span key={feature.id} className="text-sm font-semibold text-slate-600">• {feature.text}</span>)}
              </div>
            ) : null}
          </div>
        </div>
        <div className="relative min-h-[420px] overflow-hidden lg:min-h-full">
        <img
          src={backgroundImage}
          alt={hero?.backgroundImage?.alt || storeName}
          className="absolute inset-0 h-full w-full object-cover"
        />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/25 via-transparent to-primary/10" />
          <div className="absolute bottom-7 right-7 rounded-xl border border-white/25 bg-slate-950/70 px-5 py-4 text-white backdrop-blur-md">
            <strong className="block font-heading text-lg">Qualidade em cada detalhe</strong>
            <span className="text-sm text-white/70">Do diagnóstico à peça certa.</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
