import { useStorefront } from "@/context/StorefrontContext";

const GoogleMap = () => {
  const { landingConfig, mapEmbedUrl } = useStorefront();
  const section = landingConfig.contactPage;

  if (section?.enabled === false) {
    return null;
  }

  return (
    <section className="w-full bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground">
            {section?.mapTitle || "Nossa Localizacao"}
          </h2>
          <div className="mx-auto mt-2 mb-4 h-1 w-20 rounded-full bg-primary" />
          <p className="mx-auto max-w-2xl text-muted-foreground">
            {section?.mapSubtitle || "Visite nossa loja para atendimento presencial."}
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/60 shadow-sm">
          <iframe
            title="Localizacao da loja"
            src={mapEmbedUrl}
            width="100%"
            height="420"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="grayscale transition-all duration-500 hover:grayscale-0"
          />
        </div>
      </div>
    </section>
  );
};

export default GoogleMap;
