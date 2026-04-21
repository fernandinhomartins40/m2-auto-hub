import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { useStorefront } from "@/context/StorefrontContext";
import { normalizeLink, toAssetUrl } from "@/lib/storefront-helpers";

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { brandShortName, landingConfig, menuItems, settings, whatsappHref } = useStorefront();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (landingConfig.header?.enabled === false) {
    return null;
  }

  const logoUrl = toAssetUrl(landingConfig.header?.logo?.url);
  const storeName = settings.storeName || "M2 Auto Center";

  const handleClick = (href: string) => {
    setMobileOpen(false);

    if (href.startsWith("#")) {
      document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    window.location.href = href;
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-secondary/95 backdrop-blur-md shadow-lg"
          : "bg-secondary/80 backdrop-blur-sm"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <button
          type="button"
          onClick={() => handleClick("#inicio")}
          className="flex items-center gap-2 text-left"
          aria-label={`Ir para o inicio da ${storeName}`}
        >
          <div className="w-10 h-10 bg-primary rounded-md flex items-center justify-center overflow-hidden">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={landingConfig.header?.logo?.alt || storeName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex gap-0.5">
                <div className="w-1 h-5 bg-primary-foreground rounded-sm" />
                <div className="w-1 h-5 bg-primary-foreground rounded-sm" />
                <div className="w-1 h-5 bg-primary-foreground rounded-sm" />
              </div>
            )}
          </div>
          <span className="font-heading text-2xl font-bold text-primary-foreground tracking-wider">
            {brandShortName}
          </span>
        </button>

        <nav className="hidden lg:flex items-center gap-6">
          {menuItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleClick(normalizeLink(item.label, item.href))}
              className="text-sm font-medium text-secondary-foreground/80 hover:text-primary transition-colors"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden lg:inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-md font-heading font-bold text-sm transition-colors"
        >
          Fale no WhatsApp
        </a>

        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          className="lg:hidden text-secondary-foreground"
          aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
        >
          {mobileOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden bg-secondary border-t border-primary/20 px-4 pb-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleClick(normalizeLink(item.label, item.href))}
              className="block w-full text-left py-3 text-secondary-foreground/80 hover:text-primary font-medium transition-colors border-b border-primary/10 last:border-0"
            >
              {item.label}
            </button>
          ))}
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-md font-heading font-bold"
          >
            Fale no WhatsApp
          </a>
        </div>
      )}
    </header>
  );
};

export default Navbar;
