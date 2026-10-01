import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BadgePercent, Clock3, Package2, TrendingDown } from "lucide-react";

import { useStorefront } from "@/context/StorefrontContext";
import {
  buildWhatsAppHref,
  formatCurrency,
  toAssetUrl,
} from "@/lib/storefront-helpers";
import type { StorefrontOffer } from "@/types/storefront";
import type { StorefrontPromotion } from "@/types/storefront";

function getBadgeClass(text?: string | null) {
  const normalized = (text ?? "").toLowerCase();

  if (normalized.includes("dia")) {
    return "bg-badge-offer";
  }
  if (normalized.includes("semana")) {
    return "bg-badge-highlight";
  }
  if (normalized.includes("mes")) {
    return "bg-badge-economy";
  }
  if (normalized.includes("econom")) {
    return "bg-badge-economy";
  }
  return "bg-badge-highlight";
}

function useCountdown(targetDate?: string) {
  const [timeLeft, setTimeLeft] = useState({ hours: "00", minutes: "00", seconds: "00" });

  useEffect(() => {
    if (!targetDate) {
      setTimeLeft({ hours: "00", minutes: "00", seconds: "00" });
      return;
    }

    const tick = () => {
      const diff = new Date(targetDate).getTime() - Date.now();

      if (diff <= 0) {
        setTimeLeft({ hours: "00", minutes: "00", seconds: "00" });
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({
        hours: String(hours).padStart(2, "0"),
        minutes: String(minutes).padStart(2, "0"),
        seconds: String(seconds).padStart(2, "0"),
      });
    };

    tick();
    const interval = window.setInterval(tick, 1000);

    return () => window.clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

function OfferCard({ offer, whatsappNumber }: { offer: StorefrontOffer; whatsappNumber?: string }) {
  const imageUrl = toAssetUrl(offer.images?.[0]);
  const hasPrice = offer.salePrice > 0 && offer.promoPrice > 0 && offer.promoPrice < offer.salePrice;
  const salePrice = hasPrice ? formatCurrency(offer.salePrice) : null;
  const promoPrice = hasPrice ? formatCurrency(offer.promoPrice) : null;
  const savings = hasPrice ? formatCurrency(offer.salePrice - offer.promoPrice) : null;
  const discountPercent =
    hasPrice && offer.salePrice > 0
      ? Math.max(0, Math.round(((offer.salePrice - offer.promoPrice) / offer.salePrice) * 100))
      : null;
  const whatsappLink = buildWhatsAppHref(
    whatsappNumber,
    `Olá! Quero aproveitar a oferta ${offer.name}.`
  );

  return (
    <div className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[4/3] overflow-hidden border-b border-slate-200 bg-slate-50">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={offer.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary/10">
            <BadgePercent className="text-primary" size={40} />
          </div>
        )}

        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          {discountPercent !== null ? (
            <span className="rounded-full bg-primary px-3 py-1 text-xs font-heading font-bold text-primary-foreground">
              -{discountPercent}% OFF
            </span>
          ) : null}
          <span
            className={`rounded-full px-3 py-1 text-xs font-heading font-bold text-primary-foreground ${getBadgeClass(
              offer.offerBadge || offer.offerType
            )}`}
          >
            {offer.offerBadge || offer.offerType}
          </span>
        </div>
      </div>

      <div className="p-5">
        <span className="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-heading font-semibold text-primary">
          {offer.category}
        </span>
        <h3 className="mb-2 font-heading text-xl font-bold text-slate-900">
          {offer.name}
        </h3>
        <p className="mb-4 min-h-12 text-sm text-slate-600">{offer.description}</p>

        <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
          {hasPrice ? (
            <>
              <div className="flex items-center gap-3">
                <span className="font-heading text-xl font-bold text-primary">{promoPrice}</span>
                <span className="text-sm text-slate-400 line-through">{salePrice}</span>
              </div>
              <p className="mt-1 text-xs font-medium text-slate-600">
                Economia de {savings}
              </p>
            </>
          ) : (
            <p className="text-sm font-medium text-slate-600">
              Consulte as condições comerciais desta campanha.
            </p>
          )}
        </div>

        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-md bg-primary px-6 py-3 text-center font-heading font-bold text-primary-foreground transition-all hover:scale-105 hover:bg-primary/90"
        >
          Aproveitar Oferta
        </a>
      </div>
    </div>
  );
}

function OfferGroup({
  title,
  subtitle,
  icon,
  offers,
  whatsappNumber,
  countdown,
  accent,
}: {
  title: string;
  subtitle: string;
  icon: import('lucide-react').LucideIcon;
  offers: StorefrontOffer[];
  whatsappNumber?: string;
  countdown?: { hours: string; minutes: string; seconds: string };
  accent?: "default" | "gold";
}) {
  const Icon = icon;

  return (
    <div
      className={`mb-12 rounded-2xl border p-6 md:p-8 ${
        accent === "gold"
          ? "border-primary/25 bg-white/95"
          : "border-white/20 bg-white/95"
      }`}
    >
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
            <Icon className="text-primary" size={28} />
          </div>
          <div>
            <h3 className="font-heading text-2xl font-bold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-600">{subtitle}</p>
          </div>
        </div>

        {countdown ? (
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <Clock3 className="text-primary" size={18} />
            <div className="flex items-center gap-2 text-center font-heading">
              <span className="text-primary">{countdown.hours}</span>
              <span className="text-slate-400">:</span>
              <span className="text-primary">{countdown.minutes}</span>
              <span className="text-slate-400">:</span>
              <span className="text-primary">{countdown.seconds}</span>
            </div>
          </div>
        ) : null}
      </div>

      {offers.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {offers.map((offer) => (
            <OfferCard key={offer.id} offer={offer} whatsappNumber={whatsappNumber} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
          <p className="font-heading text-lg font-semibold text-slate-900">
            Nenhuma oferta ativa nesta faixa
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Assim que houver campanhas publicadas no sistema para este período, elas aparecerão aqui.
          </p>
        </div>
      )}
    </div>
  );
}

function getPromotionRewardLabel(promotion: StorefrontPromotion) {
  const rewardType = promotion.rewards?.primary?.type;
  const rewardValue = promotion.rewards?.primary?.value ?? 0;

  switch (rewardType) {
    case "PERCENTAGE":
      return `${rewardValue}% OFF`;
    case "FIXED":
      return formatCurrency(rewardValue);
    case "FREE_SHIPPING":
      return "Frete gratis";
    case "LOYALTY_POINTS":
      return `${rewardValue} pontos`;
    case "CASHBACK":
      return `${formatCurrency(rewardValue)} de cashback`;
    default:
      return promotion.badgeText || "Campanha ativa";
  }
}

function PromotionCard({
  promotion,
  whatsappNumber,
}: {
  promotion: StorefrontPromotion;
  whatsappNumber?: string;
}) {
  const imageUrl = toAssetUrl(promotion.bannerImage);
  const startDate = promotion.schedule?.startDate || promotion.startDate;
  const endDate = promotion.schedule?.endDate || promotion.endDate;
  const whatsappLink = buildWhatsAppHref(
    whatsappNumber,
    `Olá! Quero saber mais sobre a promoção ${promotion.name}.`
  );

  return (
    <div className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[4/3] overflow-hidden border-b border-slate-200 bg-slate-50">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={promotion.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary/10">
            <BadgePercent className="text-primary" size={40} />
          </div>
        )}

        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-heading font-bold text-primary-foreground">
            {getPromotionRewardLabel(promotion)}
          </span>
          {promotion.badgeText ? (
            <span className="rounded-full bg-badge-highlight px-3 py-1 text-xs font-heading font-bold text-primary-foreground">
              {promotion.badgeText}
            </span>
          ) : null}
        </div>
      </div>

      <div className="p-5">
        <h3 className="mb-2 font-heading text-xl font-bold text-slate-900">
          {promotion.name}
        </h3>
        <p className="mb-3 text-sm text-slate-600">
          {promotion.shortDescription || promotion.description}
        </p>
        {startDate || endDate ? (
          <p className="mb-4 text-xs font-medium uppercase tracking-wide text-slate-500">
            {startDate ? `Inicio: ${new Date(startDate).toLocaleDateString("pt-BR")}` : ""}
            {startDate && endDate ? " · " : ""}
            {endDate ? `Fim: ${new Date(endDate).toLocaleDateString("pt-BR")}` : ""}
          </p>
        ) : null}

        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-md bg-primary px-6 py-3 text-center font-heading font-bold text-primary-foreground transition-all hover:scale-105 hover:bg-primary/90"
        >
          Consultar promoção
        </a>
      </div>
    </div>
  );
}

const Promotions = () => {
  const { dailyOffers, weeklyOffers, monthlyOffers, landingConfig, promotions, settings } =
    useStorefront();
  const section = landingConfig.services;
  const marqueeItems = landingConfig.marquee?.items ?? [];
  const [activePeriod, setActivePeriod] = useState<"daily" | "weekly" | "monthly">("daily");

  const nextDailyExpiration = useMemo(() => {
    if (!dailyOffers.length) {
      return undefined;
    }

    return dailyOffers
      .map((offer) => offer.offerEndDate)
      .sort((left, right) => new Date(left).getTime() - new Date(right).getTime())[0];
  }, [dailyOffers]);

  const countdown = useCountdown(nextDailyExpiration);
  const hasStructuredOffers = dailyOffers.length || weeklyOffers.length || monthlyOffers.length;
  const activeOffers =
    activePeriod === "daily"
      ? dailyOffers
      : activePeriod === "weekly"
        ? weeklyOffers
        : monthlyOffers;
  const periodLabel =
    activePeriod === "daily" ? "do dia" : activePeriod === "weekly" ? "da semana" : "do mês";

  if (section?.enabled === false) {
    return null;
  }

  return (
    <section
      id="promocoes"
      className="relative overflow-hidden py-12"
      style={{
        background: "radial-gradient(circle at 75% 20%, hsl(217 91% 28%), transparent 35%), linear-gradient(135deg, hsl(222 84% 8%), hsl(215 55% 15%))",
      }}
    >
      <div className="container mx-auto px-4">
        <div className="mb-8 flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-4 h-1 w-14 rounded-full bg-primary" />
            <h2 className="font-heading text-3xl font-bold text-white md:text-4xl">
              {section?.title || "Promoções"}
            </h2>
            <p className="mt-1 text-white/60">
              {section?.subtitle || (hasStructuredOffers
                ? `Confira as ofertas ${periodLabel}.`
                : "Nenhuma promoção ativa no momento.")}
            </p>
          </div>

          <div className="flex flex-wrap gap-3" role="tablist" aria-label="Período das promoções">
            {([
              ["daily", "Do dia"],
              ["weekly", "Da semana"],
              ["monthly", "Do mês"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={activePeriod === value}
                onClick={() => setActivePeriod(value)}
                className={`min-h-11 rounded-lg border px-6 font-heading text-sm font-bold transition-all ${
                  activePeriod === value
                    ? "border-primary bg-primary text-white shadow-lg shadow-blue-600/25"
                    : "border-white/15 bg-white/5 text-white/75 hover:border-primary/60 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
            <a
              href={buildWhatsAppHref(settings.whatsapp || settings.phone)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-3 rounded-lg border border-primary/70 px-6 font-heading text-sm font-bold text-white transition-colors hover:bg-primary"
            >
              Consultar promoções
              <ArrowRight size={16} />
            </a>
          </div>
        </div>

        {activePeriod === "daily" && nextDailyExpiration && activeOffers.length ? (
          <div className="mb-5 inline-flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">
            <Clock3 className="text-primary" size={17} />
            Termina em
            <strong className="font-heading text-white">
              {countdown.hours}:{countdown.minutes}:{countdown.seconds}
            </strong>
          </div>
        ) : null}

        {activeOffers.length ? (
          <div
            role="tabpanel"
            className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-8"
          >
            {activeOffers.map((offer) => (
              <div key={offer.id} className="w-[82vw] max-w-sm shrink-0 snap-start sm:w-80">
                <OfferCard offer={offer} whatsappNumber={settings.whatsapp || settings.phone} />
              </div>
            ))}
          </div>
        ) : (
          <div role="tabpanel" className="mb-8 rounded-xl border border-white/10 bg-white/5 px-6 py-8 text-center">
            <p className="font-heading text-lg font-bold text-white">
              Nenhuma oferta {periodLabel} no momento
            </p>
            <p className="mt-1 text-sm text-white/55">
              Novas condições aparecerão aqui assim que forem publicadas pelo painel.
            </p>
          </div>
        )}

        {promotions.length > 0 ? (
          <div className="mb-8 rounded-2xl border border-white/20 bg-white/95 p-6 md:p-8">
            <div className="mb-8 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
                <BadgePercent className="text-primary" size={28} />
              </div>
              <div>
                <h3 className="font-heading text-2xl font-bold text-slate-900">
                  Campanhas e promoções
                </h3>
                <p className="text-sm text-slate-600">
                  Promoções configuradas no painel e disponíveis para consulta na loja.
                </p>
              </div>
            </div>

            <div className="scrollbar-hide flex gap-5 overflow-x-auto pb-3">
              {promotions.map((promotion) => (
                <div key={promotion.id} className="w-[82vw] max-w-sm shrink-0">
                  <PromotionCard
                    promotion={promotion}
                    whatsappNumber={settings.whatsapp || settings.phone}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {!hasStructuredOffers && promotions.length === 0 ? (
          <div className="mb-12 rounded-xl border border-primary/20 bg-secondary/70 p-8 text-center">
            <h3 className="mb-2 font-heading text-2xl font-bold text-secondary-foreground">
              Nenhuma promoção ativa no momento
            </h3>
            <p className="mb-6 text-secondary-foreground/60">
              Entre em contato e consulte as melhores condições para o seu serviço ou produto.
            </p>
            <a
              href={buildWhatsAppHref(settings.whatsapp || settings.phone)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-8 py-4 text-lg font-heading font-bold text-primary-foreground transition-all blue-shadow hover:scale-105 hover:bg-primary/90"
            >
              Consultar promoções
            </a>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-lg border border-primary/15 bg-secondary/50 py-3">
          <div className="animate-marquee whitespace-nowrap">
            {marqueeItems.length ? (
              <>
                {marqueeItems.concat(marqueeItems).map((item, index) => (
                  <span
                    key={`${item.id}-${index}`}
                    className={`mx-8 text-sm ${
                      index % 2 === 0
                        ? "font-heading font-semibold text-primary"
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
                <span className="mx-8 text-sm font-heading font-semibold text-primary">
                  Promoções válidas enquanto durarem os estoques
                </span>
                <span className="mx-8 text-sm text-secondary-foreground/70">
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
