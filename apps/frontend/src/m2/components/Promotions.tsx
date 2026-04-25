import { useEffect, useMemo, useState } from "react";
import { BadgePercent, Clock3, Package2, TrendingDown } from "lucide-react";

import { useStorefront } from "@/context/StorefrontContext";
import {
  buildWhatsAppHref,
  formatCurrency,
  toAssetUrl,
} from "@/lib/storefront-helpers";
import type { StorefrontOffer } from "@/types/storefront";

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
    `Ola! Quero aproveitar a oferta ${offer.name}.`
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
              Consulte as condicoes comerciais desta campanha.
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
  icon: React.ComponentType<{ className?: string; size?: number }>;
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
            Assim que houver campanhas publicadas no backend para este periodo, elas aparecerao aqui.
          </p>
        </div>
      )}
    </div>
  );
}

const Promotions = () => {
  const { dailyOffers, weeklyOffers, monthlyOffers, landingConfig, promotions, settings } =
    useStorefront();
  const section = landingConfig.services;
  const marqueeItems = landingConfig.marquee?.items ?? [];

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
        <div className="mb-12 text-center">
          <h2 className="mb-2 text-3xl font-heading font-bold text-secondary-foreground md:text-4xl">
            {section?.title ? (
              section.title
            ) : (
              <>
                Promocoes <span className="text-primary">Ativas</span>
              </>
            )}
          </h2>
          <p className="text-secondary-foreground/60">
            {section?.subtitle || "Acompanhe nossas ofertas do dia, da semana e do mes."}
          </p>
        </div>

        <OfferGroup
          title="Ofertas do Dia"
          subtitle="Condicoes validas por tempo limitado."
          icon={Clock3}
          offers={dailyOffers}
          whatsappNumber={settings.whatsapp || settings.phone}
          countdown={nextDailyExpiration ? countdown : undefined}
        />

        <OfferGroup
          title="Ofertas da Semana"
          subtitle="Selecao especial para os proximos dias."
          icon={TrendingDown}
          offers={weeklyOffers}
          whatsappNumber={settings.whatsapp || settings.phone}
        />

        <OfferGroup
          title="Ofertas do Mes"
          subtitle="Kits e condicoes de maior economia para aproveitar no periodo."
          icon={Package2}
          offers={monthlyOffers}
          whatsappNumber={settings.whatsapp || settings.phone}
          accent="gold"
        />

        {!hasStructuredOffers && promotions.length === 0 ? (
          <div className="mb-12 rounded-xl border border-primary/20 bg-secondary/70 p-8 text-center">
            <h3 className="mb-2 font-heading text-2xl font-bold text-secondary-foreground">
              Nenhuma promocao ativa no momento
            </h3>
            <p className="mb-6 text-secondary-foreground/60">
              Entre em contato e consulte as melhores condicoes para o seu servico ou produto.
            </p>
            <a
              href={buildWhatsAppHref(settings.whatsapp || settings.phone)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-8 py-4 text-lg font-heading font-bold text-primary-foreground transition-all blue-shadow hover:scale-105 hover:bg-primary/90"
            >
              Consultar Promocoes
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
                  Promocoes validas enquanto durarem os estoques
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
