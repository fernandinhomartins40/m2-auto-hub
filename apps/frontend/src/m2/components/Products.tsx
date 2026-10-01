import { ArrowRight, ImageIcon, MessageCircle, ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useStorefront } from "@/context/StorefrontContext";
import { useCart } from "@/contexts/CartContext";
import { buildWhatsAppHref, formatCurrency, toAssetUrl } from "@/lib/storefront-helpers";

const Products = () => {
  const { landingConfig, products, settings } = useStorefront();
  const { addItem, openCart } = useCart();
  const section = landingConfig.products;
  const whatsappNumber = settings.whatsapp || settings.phone;

  if (section?.enabled === false) {
    return null;
  }

  return (
    <section
      id="produtos"
      className="border-y border-blue-100 bg-gradient-to-br from-blue-50 via-slate-50 to-blue-50/70 py-16"
    >
      <div className="container mx-auto px-4">
        <div className="mb-8 text-left">
          <div className="mb-4 h-1 w-14 rounded-full bg-primary" />
          <h2 className="font-heading text-3xl font-bold leading-tight text-slate-950 md:text-4xl">
            Encontre a <span className="text-primary">peça que você precisa.</span>
          </h2>
          <p className="mt-2 text-slate-600">
            {section?.subtitle || "Consulte a disponibilidade com nossa equipe."}
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {products.map((product) => {
            const imageUrl = toAssetUrl(product.images?.[0]);
            const salePriceValue =
              typeof product.salePrice === "number"
                ? product.salePrice
                : product.salePrice
                  ? Number(product.salePrice)
                  : null;
            const promoPriceValue =
              typeof product.promoPrice === "number"
                ? product.promoPrice
                : product.promoPrice
                  ? Number(product.promoPrice)
                  : null;
            const displayPriceValue = promoPriceValue ?? salePriceValue ?? null;
            const salePrice = formatCurrency(salePriceValue);
            const promoPrice = formatCurrency(promoPriceValue);
            const canAddToCart =
              typeof displayPriceValue === "number" &&
              !Number.isNaN(displayPriceValue) &&
              displayPriceValue > 0 &&
              (product.stock ?? 1) > 0 &&
              product.status !== "INACTIVE";
            const whatsappLink = buildWhatsAppHref(
              whatsappNumber,
              `Olá! Quero saber mais sobre o produto ${product.name}.`
            );

            const handleAdd = () => {
              if (!canAddToCart || displayPriceValue === null) {
                return;
              }

              addItem({
                id: product.id,
                name: product.name,
                price: displayPriceValue,
                image: imageUrl,
                category: product.category,
                type: "product",
                description: product.description,
              });
              openCart();
            };

            return (
              <article
                key={product.id}
                className="group grid min-h-20 grid-cols-[64px_minmax(0,1fr)] items-center gap-3 rounded-xl border border-white bg-white p-2 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-lg sm:grid-cols-[64px_minmax(0,1fr)_auto]"
              >
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <ImageIcon className="text-slate-400" size={25} aria-hidden="true" />
                  )}
                </div>

                <div className="min-w-0 px-1 py-1">
                  <h3 className="truncate font-heading text-sm font-bold text-slate-950 sm:text-base">
                    {product.name}
                  </h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {promoPrice ? (
                      <>
                        <span className="font-heading text-sm font-bold text-primary sm:text-base">
                          {promoPrice}
                        </span>
                        {salePrice ? (
                          <span className="text-xs text-slate-400 line-through">{salePrice}</span>
                        ) : null}
                      </>
                    ) : salePrice ? (
                      <span className="font-heading text-sm font-bold text-primary sm:text-base">
                        {salePrice}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-slate-500">Preço sob consulta</span>
                    )}
                    {product.stock !== undefined ? (
                      <span className="text-[11px] text-slate-400">Estoque: {product.stock}</span>
                    ) : null}
                  </div>
                </div>

                <div className="col-span-2 flex gap-2 sm:col-span-1">
                  <Button
                    type="button"
                    onClick={handleAdd}
                    disabled={!canAddToCart}
                    className="h-11 flex-1 gap-2 rounded-lg bg-blue-50 px-4 font-heading text-sm font-bold text-primary shadow-none hover:bg-primary hover:text-white sm:flex-none"
                  >
                    <ShoppingCart size={17} />
                    {canAddToCart ? "Adicionar" : "Consultar"}
                  </Button>
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Consultar ${product.name} pelo WhatsApp`}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white transition-colors hover:bg-emerald-600"
                  >
                    <MessageCircle size={20} />
                  </a>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col gap-5 rounded-xl border border-white bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between md:px-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-primary">
              <ShoppingCart size={23} />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-slate-950">
                Escolheu seus produtos?
              </h3>
              <p className="text-sm text-slate-500">
                Fale com a nossa equipe e finalize seu pedido pelo WhatsApp.
              </p>
            </div>
          </div>
          <a
            href={buildWhatsAppHref(whatsappNumber)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center justify-center gap-3 rounded-lg bg-primary px-7 font-heading font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 hover:bg-primary/90"
          >
            <MessageCircle size={19} />
            Finalizar pedido pelo WhatsApp
            <ArrowRight size={18} />
          </a>
        </div>
      </div>
    </section>
  );
};

export default Products;
