import heroBg from "@/assets/hero-bg.jpg";
import { useStorefront } from "@/context/StorefrontContext";
import { buildWhatsAppHref, normalizeLink, toAssetUrl } from "@/lib/storefront-helpers";
import { ArrowRight, MapPin } from "lucide-react";

const primaryButtonClasses =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 font-heading text-sm font-bold text-primary-foreground transition-all blue-shadow hover:-translate-y-0.5 hover:bg-primary/90";
const secondaryButtonClasses =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-5 py-3 font-heading text-sm font-bold text-primary transition-all hover:-translate-y-0.5 hover:border-primary";

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
      <div className="grid lg:min-h-[420px] lg:grid-cols-[48%_52%]">
        <div className="relative z-10 flex items-center px-6 py-8 sm:px-10 lg:px-[max(2.5rem,calc((100vw-1280px)/2))] lg:py-8 lg:pr-10">
          <div className="max-w-2xl animate-fade-up">
            <div className="mb-3 h-1 w-12 rounded-full bg-primary" />
            <span className="mb-2 block font-heading text-xs font-bold uppercase tracking-[0.18em] text-primary">
              {storeName}
            </span>
            <h1 className="mb-3 font-heading text-4xl font-bold leading-[0.96] tracking-tight text-slate-950 lg:text-[2.75rem] xl:text-5xl">
              {hero?.title || "Tudo que seu carro precisa,"}{" "}
              <span className="text-primary">{hero?.subtitle || "você encontra aqui."}</span>
            </h1>
            <p className="mb-3 max-w-xl text-sm leading-relaxed text-slate-600 lg:text-base">
              {hero?.description || "Auto Peças + Auto Center em Palmital/PR. Atendimento especializado em mecânica leve, pesada e diesel."}
            </p>
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-slate-600">
              <MapPin size={16} className="text-primary" />
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
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-slate-200 pt-3">
                {hero.features.slice(0, 4).map((feature) => <span key={feature.id} className="text-xs font-semibold text-slate-600">• {feature.text}</span>)}
              </div>
            ) : null}
          </div>
        </div>
        <div className="relative min-h-[300px] overflow-hidden lg:min-h-full">
        <img
          src={backgroundImage}
          alt={hero?.backgroundImage?.alt || storeName}
          className="absolute inset-0 h-full w-full object-cover"
        />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/25 via-transparent to-primary/10" />
          <div className="absolute bottom-5 right-5 rounded-xl border border-white/25 bg-slate-950/70 px-4 py-3 text-white backdrop-blur-md">
            <strong className="block font-heading text-base">Qualidade em cada detalhe</strong>
            <span className="text-xs text-white/70">Do diagnóstico à peça certa.</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
