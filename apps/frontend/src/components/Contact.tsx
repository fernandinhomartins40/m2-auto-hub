import { ArrowRight } from "lucide-react";
import { useState } from "react";

import { useStorefront } from "@/context/StorefrontContext";
import { buildWhatsAppHref } from "@/lib/storefront-helpers";

const fieldClasses =
  "min-h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

const Contact = () => {
  const { contactServiceOptions, landingConfig, settings } = useStorefront();
  const [form, setForm] = useState({ nome: "", telefone: "", servico: "", mensagem: "" });
  const section = landingConfig.contactPage;

  if (section?.enabled === false) {
    return null;
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const message = [
      `Olá! Meu nome é ${form.nome}.`,
      `Telefone: ${form.telefone}.`,
      form.servico ? `Serviço de interesse: ${form.servico}.` : "",
      form.mensagem,
    ]
      .filter(Boolean)
      .join(" ");

    window.open(
      buildWhatsAppHref(settings.whatsapp || settings.phone, message),
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <section id="contato" className="h-full">
      <div className="mb-6">
        <div className="mb-3 h-1 w-14 rounded-full bg-primary" />
        <h2 className="font-heading text-3xl font-bold leading-tight text-slate-950 md:text-4xl">
          Vamos cuidar do <span className="text-primary">seu carro?</span>
        </h2>
        <p className="mt-2 text-sm text-slate-600 md:text-base">
          {section?.formSubtitle || "Conte o que você precisa. Nossa equipe atende pelo WhatsApp."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-xs font-semibold text-slate-600">
            Nome
            <input
              type="text"
              required
              value={form.nome}
              onChange={(event) => setForm({ ...form, nome: event.target.value })}
              className={fieldClasses}
            />
          </label>
          <label className="space-y-1.5 text-xs font-semibold text-slate-600">
            Telefone
            <input
              type="tel"
              required
              value={form.telefone}
              onChange={(event) => setForm({ ...form, telefone: event.target.value })}
              className={fieldClasses}
            />
          </label>
        </div>

        <label className="block space-y-1.5 text-xs font-semibold text-slate-600">
          Tipo de serviço
          <select
            required
            value={form.servico}
            onChange={(event) => setForm({ ...form, servico: event.target.value })}
            className={fieldClasses}
          >
            <option value="">Selecione</option>
            {contactServiceOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5 text-xs font-semibold text-slate-600">
          Mensagem
          <textarea
            rows={3}
            placeholder="Conte o que você precisa..."
            value={form.mensagem}
            onChange={(event) => setForm({ ...form, mensagem: event.target.value })}
            className={`${fieldClasses} resize-none py-3`}
          />
        </label>

        <button
          type="submit"
          className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-md bg-primary px-6 font-heading font-bold text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-primary/90"
        >
          Enviar solicitação
          <ArrowRight size={17} />
        </button>
      </form>
    </section>
  );
};

export default Contact;
