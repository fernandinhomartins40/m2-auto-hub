import aboutImg from "@/assets/about-shop.jpg";

import { useStorefront } from "@/context/StorefrontContext";
import { toAssetUrl } from "@/lib/storefront-helpers";

function withOpacity(color: string, opacityPercent: number) {
  const alpha = Math.max(0, Math.min(100, opacityPercent)) / 100;

  if (alpha === 1) {
    return color;
  }

  const hex = color.replace("#", "").trim();
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    const [r, g, b] = hex.split("").map((value) => parseInt(value + value, 16));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const rgbMatch = color.match(/^rgb\(\s*([^)]+)\s*\)$/i);
  if (rgbMatch) {
    return `rgba(${rgbMatch[1]}, ${alpha})`;
  }

  const rgbaMatch = color.match(/^rgba\(\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)$/i);
  if (rgbaMatch) {
    return `rgba(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]}, ${alpha})`;
  }

  return color;
}

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
  const sectionImage = toAssetUrl(aboutPage?.sectionImage?.url) || aboutImg;
  const sectionImageAlt = aboutPage?.sectionImage?.alt || "Equipe trabalhando na oficina";
  const sectionImageFit = aboutPage?.sectionImage?.objectFit || "cover";
  const decorativeSquare = {
    enabled: aboutPage?.decorativeSquare?.enabled ?? true,
    size: aboutPage?.decorativeSquare?.size ?? 96,
    borderWidth: aboutPage?.decorativeSquare?.borderWidth ?? 4,
    borderRadius: aboutPage?.decorativeSquare?.borderRadius ?? 12,
    borderColor: aboutPage?.decorativeSquare?.borderColor || "#2563eb",
    backgroundColor: aboutPage?.decorativeSquare?.backgroundColor || "#ffffff",
    backgroundOpacity: aboutPage?.decorativeSquare?.backgroundOpacity ?? 100,
    offsetX: aboutPage?.decorativeSquare?.offsetX ?? -16,
    offsetY: aboutPage?.decorativeSquare?.offsetY ?? -16,
  };

  return (
    <section id="sobre" className="bg-white py-20">
      <div className="container mx-auto px-4">
        <div className="grid overflow-hidden rounded-2xl bg-primary shadow-2xl shadow-blue-950/10 md:grid-cols-2">
          <div className="order-2 p-8 text-white md:order-2 md:p-12 lg:p-16">
            <div className="mb-6 h-1 w-14 rounded-full bg-white/80" />
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4">
              {titlePrefix} <span className="text-white">{titleHighlight}</span>
            </h2>
            <p className="text-white/80 leading-relaxed text-lg">{description}</p>

            {stats.length ? (
              <div className="grid grid-cols-2 gap-4 mt-8">
                {stats.map((stat) => (
                  <div key={stat.id} className="rounded-lg border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                    <div className="text-xl font-heading font-bold text-white">
                      {stat.number}
                    </div>
                    <div className="text-sm text-white/70">{stat.label}</div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className="relative order-1 min-h-80 md:order-1">
            <img
              src={sectionImage}
              alt={sectionImageAlt}
              className="absolute inset-0 h-full w-full"
              style={{ objectFit: sectionImageFit }}
            />
            {decorativeSquare.enabled ? (
              <div
                className="absolute"
                style={{
                  left: `${decorativeSquare.offsetX}px`,
                  bottom: `${decorativeSquare.offsetY}px`,
                  width: `${decorativeSquare.size}px`,
                  height: `${decorativeSquare.size}px`,
                  borderWidth: `${decorativeSquare.borderWidth}px`,
                  borderStyle: "solid",
                  borderColor: decorativeSquare.borderColor,
                  backgroundColor: withOpacity(
                    decorativeSquare.backgroundColor,
                    decorativeSquare.backgroundOpacity
                  ),
                  borderRadius: `${decorativeSquare.borderRadius}px`,
                }}
              />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
