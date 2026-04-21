import aboutImg from "@/assets/about-shop.jpg";

import { useStorefront } from "@/context/StorefrontContext";

const About = () => {
  const { landingConfig } = useStorefront();
  const aboutPage = landingConfig.aboutPage;

  if (aboutPage?.enabled === false) {
    return null;
  }

  const titlePrefix = aboutPage?.heroTitle || "Mais de 14 anos";
  const titleHighlight = aboutPage?.heroHighlight || "cuidando do seu veiculo";
  const description =
    aboutPage?.heroSubtitle ||
    "A M2 Auto Center nasceu em Palmital com um proposito claro: oferecer pecas de qualidade e servicos confiaveis em um so lugar.";
  const stats = aboutPage?.stats?.slice(0, 4) ?? [];

  return (
    <section id="sobre" className="py-20 section-light">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-2">
              {titlePrefix} <span className="text-primary">{titleHighlight}</span>
            </h2>
            <div className="w-20 h-1 bg-primary rounded-full mb-6" />
            <p className="text-muted-foreground leading-relaxed text-lg">{description}</p>

            {stats.length ? (
              <div className="grid grid-cols-2 gap-4 mt-8">
                {stats.map((stat) => (
                  <div key={stat.id} className="rounded-lg border border-primary/15 bg-secondary p-4">
                    <div className="text-xl font-heading font-bold text-primary">
                      {stat.number}
                    </div>
                    <div className="text-sm text-secondary-foreground/70">{stat.label}</div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className="relative">
            <img
              src={aboutImg}
              alt="Equipe trabalhando na oficina"
              className="rounded-lg w-full h-80 object-cover blue-shadow"
            />
            <div className="absolute -bottom-4 -left-4 w-24 h-24 border-4 border-primary rounded-lg" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
