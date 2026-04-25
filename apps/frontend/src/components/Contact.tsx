import { useState } from "react";
import { Clock3, Instagram, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { useStorefront } from "@/context/StorefrontContext";
import { buildWhatsAppHref, formatPhoneNumber } from "@/lib/storefront-helpers";

const Contact = () => {
  const {
    addressLines,
    businessHoursSummary,
    contactServiceOptions,
    landingConfig,
    settings,
    whatsappHref,
  } = useStorefront();
  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    servico: "",
    mensagem: "",
  });

  const footerSocialLinks = landingConfig.footer?.socialLinks ?? [];
  const instagramLink = footerSocialLinks.find((link) =>
    (link.platform ?? "").toLowerCase().includes("instagram")
  )?.url;
  const section = landingConfig.contactPage;

  if (section?.enabled === false) {
    return null;
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const message = [
      `Ola! Meu nome e ${form.nome}.`,
      `Telefone: ${form.telefone}.`,
      form.servico ? `Servico de interesse: ${form.servico}.` : "",
      form.mensagem,
    ]
      .filter(Boolean)
      .join(" ");

    const href = buildWhatsAppHref(settings.whatsapp || settings.phone, message);
    window.open(href, "_blank", "noopener,noreferrer");
  };

  return (
    <section id="contato" className="py-20 section-light">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-2">
            {section?.heroTitle ? (
              section.heroTitle
            ) : (
              <>
                Entre em <span className="text-primary">Contato</span>
              </>
            )}
          </h2>
          <div className="w-20 h-1 bg-primary rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {section?.formSubtitle ||
              "Conte o que voce precisa e seguimos com o atendimento pelo WhatsApp."}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-secondary rounded-xl p-8 space-y-5">
            {addressLines.length ? (
              <div className="flex items-start gap-3">
                <MapPin className="text-primary mt-1 shrink-0" size={20} />
                <span className="text-secondary-foreground/80">{addressLines.join(" | ")}</span>
              </div>
            ) : null}
            {settings.phone ? (
              <div className="flex items-start gap-3">
                <Phone className="text-primary mt-1 shrink-0" size={20} />
                <span className="text-secondary-foreground/80">
                  {formatPhoneNumber(settings.phone)}
                </span>
              </div>
            ) : null}
            {settings.whatsapp ? (
              <div className="flex items-start gap-3">
                <MessageCircle className="text-primary mt-1 shrink-0" size={20} />
                <span className="text-secondary-foreground/80">
                  WhatsApp: {formatPhoneNumber(settings.whatsapp)}
                </span>
              </div>
            ) : null}
            {businessHoursSummary ? (
              <div className="flex items-start gap-3">
                <Clock3 className="text-primary mt-1 shrink-0" size={20} />
                <span className="text-secondary-foreground/80">{businessHoursSummary}</span>
              </div>
            ) : null}
            {settings.email ? (
              <div className="flex items-start gap-3">
                <Mail className="text-primary mt-1 shrink-0" size={20} />
                <a href={`mailto:${settings.email}`} className="text-primary hover:underline">
                  {settings.email}
                </a>
              </div>
            ) : null}
            {instagramLink ? (
              <div className="flex items-start gap-3">
                <Instagram className="text-primary mt-1 shrink-0" size={20} />
                <a
                  href={instagramLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {instagramLink.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "@")}
                </a>
              </div>
            ) : null}
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 bg-whatsapp hover:opacity-90 text-primary-foreground px-6 py-3 rounded-md font-heading font-bold transition-all"
            >
              WhatsApp
            </a>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Nome"
              required
              value={form.nome}
              onChange={(event) => setForm({ ...form, nome: event.target.value })}
              className="w-full px-4 py-3 rounded-md border border-border bg-background text-foreground font-body focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="tel"
              placeholder="Telefone"
              required
              value={form.telefone}
              onChange={(event) => setForm({ ...form, telefone: event.target.value })}
              className="w-full px-4 py-3 rounded-md border border-border bg-background text-foreground font-body focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <select
              required
              value={form.servico}
              onChange={(event) => setForm({ ...form, servico: event.target.value })}
              className="w-full px-4 py-3 rounded-md border border-border bg-background text-foreground font-body focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Tipo de Servico</option>
              {contactServiceOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <textarea
              placeholder="Mensagem"
              rows={4}
              value={form.mensagem}
              onChange={(event) => setForm({ ...form, mensagem: event.target.value })}
              className="w-full px-4 py-3 rounded-md border border-border bg-background text-foreground font-body focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-md font-heading font-bold text-lg transition-all blue-shadow hover:scale-[1.02]"
            >
              Enviar Solicitacao
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Contact;
