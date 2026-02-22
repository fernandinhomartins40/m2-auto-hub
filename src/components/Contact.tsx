import { MapPin, Phone, MessageCircle, Clock, Instagram } from "lucide-react";
import { useState } from "react";

const WHATSAPP_URL = "https://wa.me/5542991215515";

const serviceOptions = [
  "Mecânica Geral",
  "Especialidade Diesel",
  "Troca de Óleo",
  "Escapamentos",
  "Instalação de Acessórios",
  "Suspensão & Freios",
  "Outro",
];

const Contact = () => {
  const [form, setForm] = useState({ nome: "", telefone: "", servico: "", mensagem: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const msg = `Olá! Meu nome é ${form.nome}. Telefone: ${form.telefone}. Serviço: ${form.servico}. ${form.mensagem}`;
    window.open(`${WHATSAPP_URL}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <section id="contato" className="py-20 section-light">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-2">
            Entre em <span className="text-primary">Contato</span>
          </h2>
          <div className="w-20 h-1 bg-primary rounded-full mx-auto" />
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Info */}
          <div className="bg-secondary rounded-xl p-8 space-y-5">
            <div className="flex items-start gap-3">
              <MapPin className="text-primary mt-1 shrink-0" size={20} />
              <span className="text-secondary-foreground/80">Rua Maximiliano Vicentin, 153 - Palmital, PR</span>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="text-primary mt-1 shrink-0" size={20} />
              <span className="text-secondary-foreground/80">(42) 3657-1420</span>
            </div>
            <div className="flex items-start gap-3">
              <MessageCircle className="text-primary mt-1 shrink-0" size={20} />
              <span className="text-secondary-foreground/80">WhatsApp: (42) 9 9121-5515</span>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="text-primary mt-1 shrink-0" size={20} />
              <span className="text-secondary-foreground/80">Seg a Sex: 08h às 18h | Sáb: 08h às 12h</span>
            </div>
            <div className="flex items-start gap-3">
              <Instagram className="text-primary mt-1 shrink-0" size={20} />
              <a
                href="https://instagram.com/m2autocenterpalmital"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                @m2autocenterpalmital
              </a>
            </div>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 bg-whatsapp hover:opacity-90 text-primary-foreground px-6 py-3 rounded-md font-heading font-bold transition-all"
            >
              💬 WhatsApp
            </a>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Nome"
              required
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="w-full px-4 py-3 rounded-md border border-border bg-background text-foreground font-body focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="tel"
              placeholder="Telefone"
              required
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              className="w-full px-4 py-3 rounded-md border border-border bg-background text-foreground font-body focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <select
              required
              value={form.servico}
              onChange={(e) => setForm({ ...form, servico: e.target.value })}
              className="w-full px-4 py-3 rounded-md border border-border bg-background text-foreground font-body focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Tipo de Serviço</option>
              {serviceOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <textarea
              placeholder="Mensagem"
              rows={4}
              value={form.mensagem}
              onChange={(e) => setForm({ ...form, mensagem: e.target.value })}
              className="w-full px-4 py-3 rounded-md border border-border bg-background text-foreground font-body focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-md font-heading font-bold text-lg transition-all blue-shadow hover:scale-[1.02]"
            >
              Enviar Solicitação
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Contact;
