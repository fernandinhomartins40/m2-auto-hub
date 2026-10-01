import { MapPin, MessageCircle } from "lucide-react";

import { useStorefront } from "@/context/StorefrontContext";

const GoogleMap = () => {
  const { addressLines, landingConfig, mapEmbedUrl, settings, whatsappHref } = useStorefront();

  if (landingConfig.contactPage?.enabled === false) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <iframe
        title="Localização da loja"
        src={mapEmbedUrl}
        width="100%"
        height="300"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="block w-full"
      />
      <div className="flex flex-col gap-4 border-t border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <MapPin className="shrink-0 text-primary" size={22} />
          <div>
            <strong className="block font-heading text-sm text-slate-950">
              {settings.city || "Palmital"} – {settings.state || "PR"}
            </strong>
            <span className="block max-w-xs truncate text-xs text-slate-500">
              {addressLines[0] || "Nossa equipe atende pelo WhatsApp."}
            </span>
          </div>
        </div>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-emerald-500 px-6 font-heading text-sm font-bold text-white transition-colors hover:bg-emerald-600"
        >
          <MessageCircle size={18} />
          Fale no WhatsApp
        </a>
      </div>
    </section>
  );
};

export default GoogleMap;
