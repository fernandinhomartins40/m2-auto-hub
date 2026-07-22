import { Download, MessageCircle, Settings } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useStorefront } from "@/context/StorefrontContext";
import {
  formatPhoneNumber,
  formatBusinessHoursLines,
  resolveSocialIcon,
  toAssetUrl,
} from "@/lib/storefront-helpers";

const Footer = () => {
  const {
    addressLines,
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

  const logoUrl = toAssetUrl(footer?.logo?.url);
  const footerAddressLines = [
    footer?.contactInfo?.address?.street,
    footer?.contactInfo?.address?.city,
    footer?.contactInfo?.address?.zipCode,
  ].filter(Boolean) as string[];
  const visibleAddressLines = footerAddressLines.length ? footerAddressLines : addressLines;
  const visiblePhone = footer?.contactInfo?.phone || settings.phone;
  const visibleBusinessHoursLines =
    footer?.businessHours
      ? formatBusinessHoursLines({
          monday: footer.businessHours.weekdays,
          saturday: footer.businessHours.saturday,
          sunday: footer.businessHours.sunday,
        })
      : businessHoursLines;
  const socialLinks = (footer?.socialLinks ?? []).filter((link) => link.enabled !== false && link.url);

  return (
    <footer className="bg-secondary py-12 border-t border-primary/10">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8 items-start mb-8">
          <div>
            {logoUrl ? (
              <div className="mb-3">
                <img
                  src={logoUrl}
                  alt={footer?.logo?.alt || settings.storeName || "Logo da loja"}
                  className="h-12 w-auto object-contain"
                />
              </div>
            ) : null}
            <p className="text-secondary-foreground/50 text-sm mb-4">
              {footer?.description ||
                "Tudo que seu carro precisa, voce encontra aqui."}
            </p>
            {visibleAddressLines.length ? (
              <p className="text-secondary-foreground/60 text-sm">{visibleAddressLines.join(" | ")}</p>
            ) : null}
            {visiblePhone ? (
              <p className="text-secondary-foreground/60 text-sm mt-2">
                {formatPhoneNumber(visiblePhone)}
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
            {visibleBusinessHoursLines.length ? (
              <div className="space-y-1">
                {visibleBusinessHoursLines.slice(0, 3).map((line) => (
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

            <div className="flex flex-col gap-2 md:items-end">
              <Link
                to="/admin-login/?redirect=%2Fstore-panel"
                className="inline-flex md:justify-end"
              >
                <Button
                  type="button"
                  variant="outline"
                  className="border-primary/40 bg-transparent text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  <Settings size={16} />
                  Painel do Lojista
                </Button>
              </Link>

              <Link to="/pwa-admin" className="inline-flex md:justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-secondary-foreground/60 hover:text-primary"
                >
                  <Download size={14} />
                  Instalar App do Painel
                </Button>
              </Link>
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
