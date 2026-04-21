import { MessageCircle } from "lucide-react";

import { useStorefront } from "@/context/StorefrontContext";
import {
  formatPhoneNumber,
  resolveSocialIcon,
  toAssetUrl,
} from "@/lib/storefront-helpers";

const Footer = () => {
  const {
    addressLines,
    brandShortName,
    businessHoursLines,
    landingConfig,
    menuItems,
    settings,
    whatsappHref,
  } = useStorefront();
  const footer = landingConfig.footer;

  if (footer?.enabled === false) {
    return null;
  }

  const logoUrl = toAssetUrl(footer?.logo?.url || landingConfig.header?.logo?.url);
  const socialLinks = (footer?.socialLinks ?? []).filter((link) => link.enabled !== false && link.url);

  return (
    <footer className="bg-secondary py-12 border-t border-primary/10">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8 items-start mb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 bg-primary rounded-md flex items-center justify-center overflow-hidden">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={footer?.logo?.alt || settings.storeName || "Logo da loja"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex gap-0.5">
                    <div className="w-0.5 h-4 bg-primary-foreground rounded-sm" />
                    <div className="w-0.5 h-4 bg-primary-foreground rounded-sm" />
                    <div className="w-0.5 h-4 bg-primary-foreground rounded-sm" />
                  </div>
                )}
              </div>
              <span className="font-heading text-xl font-bold text-primary-foreground tracking-wider">
                {brandShortName}
              </span>
            </div>
            <p className="text-secondary-foreground/50 text-sm mb-4">
              {footer?.description ||
                "Tudo que seu carro precisa, voce encontra aqui."}
            </p>
            {addressLines.length ? (
              <p className="text-secondary-foreground/60 text-sm">{addressLines.join(" | ")}</p>
            ) : null}
            {settings.phone ? (
              <p className="text-secondary-foreground/60 text-sm mt-2">
                {formatPhoneNumber(settings.phone)}
              </p>
            ) : null}
          </div>

          <div>
            <div className="flex flex-wrap gap-4 mb-4">
              {menuItems.map((item) => (
                <a
                  key={item.id}
                  href={item.href}
                  className="text-secondary-foreground/60 hover:text-primary text-sm transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </div>
            {businessHoursLines.length ? (
              <div className="space-y-1">
                {businessHoursLines.slice(0, 3).map((line) => (
                  <p key={line} className="text-secondary-foreground/50 text-sm">
                    {line}
                  </p>
                ))}
              </div>
            ) : null}
          </div>

          <div className="md:text-right">
            <div className="flex gap-3 md:justify-end mb-4">
              {socialLinks.map((link) => {
                const Icon = resolveSocialIcon(link.platform);

                return (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary hover:bg-primary/25 transition-colors"
                  >
                    <Icon size={18} />
                  </a>
                );
              })}
              {!socialLinks.some((link) => (link.platform ?? "").toLowerCase().includes("whatsapp")) ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary hover:bg-primary/25 transition-colors"
                >
                  <MessageCircle size={18} />
                </a>
              ) : null}
            </div>
          </div>
        </div>

        <div className="border-t border-primary/10 pt-6 text-center">
          <p className="text-secondary-foreground/40 text-sm">
            {footer?.copyright || "(c) 2026 M2 Auto Center. Todos os direitos reservados."}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
