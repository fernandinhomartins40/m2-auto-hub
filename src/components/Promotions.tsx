const WHATSAPP_URL = "https://wa.me/5542991215515";

const promos = [
  {
    badge: "OFERTA",
    badgeClass: "bg-badge-offer",
    title: "Troca de Óleo + Filtro",
    desc: "Óleo sintético + filtro de óleo + mão de obra incluída.",
    highlight: "Consulte condições",
    cta: "Aproveitar Oferta",
  },
  {
    badge: "DESTAQUE",
    badgeClass: "bg-badge-highlight",
    title: "Revisão Preventiva Completa",
    desc: "Verificação de freios, suspensão, fluidos e sistema elétrico.",
    highlight: "Agende agora e garanta sua vaga!",
    cta: "Agendar Agora",
  },
  {
    badge: "ECONOMIA",
    badgeClass: "bg-badge-economy",
    title: "Escapamento com Instalação",
    desc: "Compre seu escapamento e ganhe a instalação por nossa equipe.",
    highlight: "Instalação inclusa na compra",
    cta: "Quero essa Oferta",
  },
];

const Promotions = () => (
  <section
    id="promocoes"
    className="py-20"
    style={{
      background:
        "linear-gradient(135deg, hsl(215 50% 23%), hsl(222 84% 5%))",
    }}
  >
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-heading font-bold text-secondary-foreground mb-2">
          🔥 Promoções da <span className="text-primary">Semana</span>
        </h2>
        <p className="text-secondary-foreground/60">
          Aproveite nossas ofertas especiais por tempo limitado!
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {promos.map((p) => (
          <div
            key={p.title}
            className="relative bg-secondary/80 border border-primary/25 rounded-xl p-6 card-glow overflow-hidden"
          >
            {/* glow corner */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

            <span
              className={`inline-block ${p.badgeClass} text-primary-foreground text-xs font-heading font-bold px-3 py-1 rounded-full mb-4`}
            >
              {p.badge}
            </span>
            <h3 className="font-heading font-bold text-2xl text-secondary-foreground mb-2">
              {p.title}
            </h3>
            <p className="text-secondary-foreground/60 text-sm mb-4">{p.desc}</p>
            <div className="bg-primary/10 border border-primary/20 rounded-md px-4 py-2 mb-5">
              <span className="text-primary font-heading font-semibold text-sm">
                {p.highlight}
              </span>
            </div>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-md font-heading font-bold transition-all hover:scale-105"
            >
              {p.cta}
            </a>
          </div>
        ))}
      </div>

      {/* Marquee */}
      <div className="overflow-hidden rounded-lg bg-secondary/50 border border-primary/15 py-3">
        <div className="animate-marquee whitespace-nowrap">
          <span className="text-primary font-heading font-semibold text-sm mx-8">
            ⚡ Promoções válidas enquanto durarem os estoques
          </span>
          <span className="text-secondary-foreground/60 text-sm mx-8">·</span>
          <span className="text-secondary-foreground/70 text-sm mx-8">
            Entre em contato para conferir disponibilidade
          </span>
          <span className="text-secondary-foreground/60 text-sm mx-8">·</span>
          <span className="text-primary font-heading font-semibold text-sm mx-8">
            (42) 9 9121-5515
          </span>
          <span className="text-secondary-foreground/60 text-sm mx-8">⚡</span>
          <span className="text-primary font-heading font-semibold text-sm mx-8">
            ⚡ Promoções válidas enquanto durarem os estoques
          </span>
          <span className="text-secondary-foreground/60 text-sm mx-8">·</span>
          <span className="text-secondary-foreground/70 text-sm mx-8">
            Entre em contato para conferir disponibilidade
          </span>
          <span className="text-secondary-foreground/60 text-sm mx-8">·</span>
          <span className="text-primary font-heading font-semibold text-sm mx-8">
            (42) 9 9121-5515
          </span>
          <span className="text-secondary-foreground/60 text-sm mx-8">⚡</span>
        </div>
      </div>
    </div>
  </section>
);

export default Promotions;
