import { useStorefront } from "@/context/StorefrontContext";
import {
  buildWhatsAppHref,
  formatCurrency,
  resolveProductIcon,
  toAssetUrl,
} from "@/lib/storefront-helpers";

const Products = () => {
  const { landingConfig, products, settings } = useStorefront();
  const section = landingConfig.products;

  if (section?.enabled === false) {
    return null;
  }

  return (
    <section id="produtos" className="py-20 section-light">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-2">
            {section?.title ? (
              section.title
            ) : (
              <>
                Nossos <span className="text-primary">Produtos</span>
              </>
            )}
          </h2>
          <div className="w-20 h-1 bg-primary rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {section?.subtitle ||
              "Trabalhamos com as melhores marcas do mercado para garantir qualidade e durabilidade para o seu veiculo."}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {products.map((product) => {
            const ProductIcon = resolveProductIcon(product.category, product.name);
            const imageUrl = toAssetUrl(product.images?.[0]);
            const salePrice = formatCurrency(product.salePrice);
            const promoPrice = formatCurrency(product.promoPrice);
            const whatsappLink = buildWhatsAppHref(
              settings.whatsapp || settings.phone,
              `Ola! Quero saber mais sobre o produto ${product.name}.`
            );

            return (
              <div
                key={product.id}
                className="bg-secondary border border-primary/15 rounded-lg overflow-hidden card-glow group"
              >
                <div className="aspect-[4/3] bg-secondary/80 border-b border-primary/10">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ProductIcon className="text-primary" size={40} />
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span className="inline-block bg-primary/15 text-primary text-xs font-heading font-semibold px-3 py-1 rounded-full">
                      {product.category}
                    </span>
                    {product.stock !== undefined ? (
                      <span className="text-xs text-secondary-foreground/50">
                        Estoque: {product.stock}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="font-heading font-bold text-lg text-secondary-foreground mb-2">
                    {product.name}
                  </h3>
                  <p className="text-secondary-foreground/60 text-sm mb-4 min-h-12">
                    {product.description}
                  </p>
                  {salePrice || promoPrice ? (
                    <div className="flex items-center gap-3 mb-4">
                      {promoPrice ? (
                        <>
                          <span className="text-primary font-heading font-bold text-lg">
                            {promoPrice}
                          </span>
                          {salePrice ? (
                            <span className="text-secondary-foreground/40 line-through text-sm">
                              {salePrice}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-primary font-heading font-bold text-lg">
                          {salePrice}
                        </span>
                      )}
                    </div>
                  ) : null}
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-primary font-heading font-semibold text-sm hover:underline"
                  >
                    Solicitar este produto
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center">
          <a
            href={buildWhatsAppHref(settings.whatsapp || settings.phone)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-md font-heading font-bold text-lg transition-all blue-shadow hover:scale-105"
          >
            Solicitar Produto pelo WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
};

export default Products;
