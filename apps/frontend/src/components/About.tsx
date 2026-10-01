import aboutImg from "@/assets/about-shop.jpg";
import { useStorefront } from "@/context/StorefrontContext";
import { resolveIcon, toAssetUrl } from "@/lib/storefront-helpers";

const About = () => {
  const { landingConfig } = useStorefront();
  const aboutPage = landingConfig.aboutPage;
  const trustIndicators = landingConfig.about?.trustIndicators?.length
    ? landingConfig.about.trustIndicators.slice(0, 3)
    : [
        { id: "security", icon: "Shield", title: "Segurança", description: "Serviço confiável" },
        { id: "speed", icon: "Zap", title: "Agilidade", description: "Atendimento rápido" },
        { id: "experience", icon: "Users", title: "Experiência", description: "Equipe especializada" },
      ];

  if (aboutPage?.enabled === false) {
    return null;
  }

  const titlePrefix = aboutPage?.heroTitle || "Há mais de 14 anos";
  const titleHighlight = aboutPage?.heroHighlight || "cuidando do seu veículo.";
  const description =
    aboutPage?.heroSubtitle ||
    "Peças de qualidade e serviços de confiança, em um só lugar.";
  const sectionImage = toAssetUrl(aboutPage?.sectionImage?.url) || aboutImg;
  const sectionImageAlt = aboutPage?.sectionImage?.alt || "Equipe trabalhando na oficina";
  const sectionImageFit = aboutPage?.sectionImage?.objectFit || "cover";

  return (
    <section id="sobre" className="bg-white py-0">
      <div className="grid min-h-[360px] overflow-hidden lg:grid-cols-[48%_52%]">
        <div className="relative min-h-[300px] lg:min-h-full">
          <img
            src={sectionImage}
            alt={sectionImageAlt}
            className="absolute inset-0 h-full w-full"
            style={{ objectFit: sectionImageFit }}
          />
        </div>

        <div className="flex flex-col justify-center bg-primary px-7 py-10 text-white sm:px-10 lg:px-14 lg:py-12">
          <div className="mb-5 h-1 w-14 rounded-full bg-white/80" />
          <h2 className="max-w-2xl font-heading text-3xl font-bold leading-tight text-white md:text-4xl">
            {titlePrefix} {titleHighlight}
          </h2>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-white/80 md:text-lg">
            {description}
          </p>

          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {trustIndicators.map((indicator, index) => {
              const Icon = resolveIcon(indicator.icon);

              return (
                <div
                  key={indicator.id}
                  className={`flex gap-3 sm:block ${index ? "sm:border-l sm:border-white/25 sm:pl-5" : ""}`}
                >
                  <Icon className="mb-2 shrink-0 text-white" size={23} />
                  <h3 className="font-heading text-base font-bold text-white">{indicator.title}</h3>
                  <p className="mt-0.5 text-xs text-white/70">{indicator.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
