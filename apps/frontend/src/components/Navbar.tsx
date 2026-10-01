import { useEffect, useState } from "react";
import { CircleUserRound, Menu, ShoppingCart, X } from "lucide-react";

import { useStorefront } from "@/context/StorefrontContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { normalizeLink, toAssetUrl } from "@/lib/storefront-helpers";

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { landingConfig, menuItems, settings, whatsappHref } = useStorefront();
  const { isAuthenticated, customer } = useAuth();
  const { totalItems, openCart } = useCart();

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
  const customerHref = isAuthenticated ? "/customer" : "/customer-login/?redirect=%2Fcustomer";

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
      className={`landing-navbar fixed top-0 left-0 right-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? "border-slate-200 bg-white/95 backdrop-blur-xl shadow-lg"
          : "border-slate-200/80 bg-white/90 backdrop-blur-md"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <button
          type="button"
          onClick={() => handleClick("#inicio")}
          className="flex items-center text-left"
          aria-label={`Ir para o inicio da ${storeName}`}
        >
          <div className="flex h-12 items-center overflow-hidden">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={landingConfig.header?.logo?.alt || storeName}
                className="h-full w-auto object-contain"
              />
            ) : (
              <span className="font-heading text-xl font-bold text-slate-950 tracking-wide">
                {storeName}
              </span>
            )}
          </div>
        </button>

        <nav className="hidden lg:flex items-center gap-6">
          {menuItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleClick(normalizeLink(item.label, item.href))}
              className="text-sm font-bold text-slate-700 hover:text-primary transition-colors"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={customerHref}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:border-primary hover:text-primary transition-colors"
            aria-label={isAuthenticated ? `Acessar painel do cliente de ${customer?.name ?? "cliente"}` : "Entrar no painel do cliente"}
            title={isAuthenticated ? "Painel do cliente" : "Entrar no painel do cliente"}
          >
            <CircleUserRound size={20} />
          </a>

          <button
            type="button"
            onClick={openCart}
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
            aria-label="Abrir carrinho"
            title="Abrir carrinho"
          >
            <ShoppingCart size={20} />
            {totalItems > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                {totalItems}
              </span>
            ) : null}
          </button>

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
            className="lg:hidden inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-800 hover:border-primary hover:text-primary transition-colors"
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pb-4 shadow-xl">
          {menuItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleClick(normalizeLink(item.label, item.href))}
              className="block w-full border-b border-slate-100 py-3 text-left font-medium text-slate-700 transition-colors last:border-0 hover:text-primary"
            >
              {item.label}
            </button>
          ))}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <a
              href={customerHref}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:border-primary hover:text-primary transition-colors"
            >
              <CircleUserRound size={18} />
              Cliente
            </a>
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                openCart();
              }}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:border-primary hover:text-primary transition-colors"
            >
              <ShoppingCart size={18} />
              Carrinho
              {totalItems > 0 ? (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                  {totalItems}
                </span>
              ) : null}
            </button>
          </div>
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
