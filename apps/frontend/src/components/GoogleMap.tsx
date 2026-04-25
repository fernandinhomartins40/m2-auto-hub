import { useStorefront } from "@/context/StorefrontContext";

const GoogleMap = () => {
  const { landingConfig, mapEmbedUrl } = useStorefront();

  if (landingConfig.contactPage?.enabled === false) {
    return null;
  }

  return (
    <section className="w-full">
      <iframe
        title="Localizacao da loja"
        src={mapEmbedUrl}
        width="100%"
        height="400"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="grayscale hover:grayscale-0 transition-all duration-500"
      />
    </section>
  );
};

export default GoogleMap;
