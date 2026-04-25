import { useState } from "react";
import { Instagram, Mail, MapPin } from "lucide-react";

import { useStorefront } from "@/context/StorefrontContext";
import {
  buildWhatsAppHref,
  formatPhoneNumber,
  resolveIcon,
  toCssTextStyle,
} from "@/lib/storefront-helpers";

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

  const fallbackInfoCards = [
    addressLines.length
      ? {
          id: "address",
          icon: "MapPin",
          title: "Endereco",
          content: addressLines,
          color: "#2563eb",
        }
      : null,
    settings.phone
      ? {
          id: "phone",
          icon: "Phone",
          title: "Telefone",
          content: [formatPhoneNumber(settings.phone)],
          color: "#2563eb",
        }
      : null,
    settings.whatsapp
      ? {
          id: "whatsapp",
          icon: "MessageCircle",
          title: "WhatsApp",
          content: [formatPhoneNumber(settings.whatsapp)],
          color: "#16a34a",
        }
      : null,
    businessHoursSummary
      ? {
          id: "hours",
          icon: "Clock",
          title: "Horario",
          content: [businessHoursSummary],
          color: "#9333ea",
        }
      : null,
  ].filter(Boolean);

  const infoCards = section?.contactInfoCards?.length
    ? section.contactInfoCards
    : fallbackInfoCards;

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
            {section?.heroSubtitle ||
              "Conte o que voce precisa e seguimos com o atendimento pelo WhatsApp."}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {infoCards.map((card) => {
                const Icon = resolveIcon(card.icon, MapPin);

                return (
                  <div key={card.id} className="rounded-xl bg-secondary p-6">
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                      <Icon size={20} style={toCssTextStyle(card.color)} />
                    </div>
                    <h3 className="font-heading text-lg font-bold text-secondary-foreground">
                      {card.title}
                    </h3>
                    <div className="mt-2 space-y-1 text-sm text-secondary-foreground/75">
                      {card.content?.map((line, index) => <p key={`${card.id}-${index}`}>{line}</p>)}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-xl bg-secondary p-8 space-y-5">
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
                className="mt-4 flex items-center justify-center gap-2 rounded-md bg-whatsapp px-6 py-3 font-heading font-bold text-primary-foreground transition-all hover:opacity-90"
              >
                WhatsApp
              </a>
            </div>
          </div>

          <div className="rounded-xl bg-background p-8 shadow-sm ring-1 ring-border/60">
            <div className="mb-6">
              <h3 className="font-heading text-2xl font-bold text-foreground">
                {section?.formTitle || "Envie sua Mensagem"}
              </h3>
              <p className="mt-2 text-muted-foreground">
                {section?.formSubtitle ||
                  "Preencha o formulario abaixo e entraremos em contato o mais breve possivel."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Nome"
                required
                value={form.nome}
                onChange={(event) => setForm({ ...form, nome: event.target.value })}
                className="w-full rounded-md border border-border bg-background px-4 py-3 font-body text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                type="tel"
                placeholder="Telefone"
                required
                value={form.telefone}
                onChange={(event) => setForm({ ...form, telefone: event.target.value })}
                className="w-full rounded-md border border-border bg-background px-4 py-3 font-body text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <select
                required
                value={form.servico}
                onChange={(event) => setForm({ ...form, servico: event.target.value })}
                className="w-full rounded-md border border-border bg-background px-4 py-3 font-body text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
                className="w-full resize-none rounded-md border border-border bg-background px-4 py-3 font-body text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="submit"
                className="blue-shadow w-full rounded-md bg-primary px-6 py-3 font-heading text-lg font-bold text-primary-foreground transition-all hover:scale-[1.02] hover:bg-primary/90"
              >
                Enviar Solicitacao
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
