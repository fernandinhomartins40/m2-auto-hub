import { Wrench, Fuel, Droplets, Wind, PlusCircle, ShieldCheck } from "lucide-react";

const WHATSAPP_URL = "https://wa.me/5542991215515";

const services = [
  { icon: Wrench, title: "Mecânica Geral", desc: "Manutenção preventiva e corretiva para seu veículo." },
  { icon: Fuel, title: "Especialidade Diesel", desc: "Serviços completos para caminhonetes e veículos de carga." },
  { icon: Droplets, title: "Troca de Óleo", desc: "Óleos minerais e sintéticos com filtros de qualidade." },
  { icon: Wind, title: "Escapamentos", desc: "Instalação e substituição de sistemas de exaustão." },
  { icon: PlusCircle, title: "Instalação de Acessórios", desc: "Montagem das peças adquiridas na loja." },
  { icon: ShieldCheck, title: "Suspensão & Freios", desc: "Diagnóstico e reparo de sistemas de segurança." },
];

const Services = () => (
  <section id="servicos" className="py-20 section-dark">
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-heading font-bold text-secondary-foreground mb-2">
          Nossos <span className="text-primary">Serviços</span>
        </h2>
        <div className="w-20 h-1 bg-primary rounded-full mx-auto" />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((s) => (
          <div
            key={s.title}
            className="bg-secondary border border-primary/20 rounded-lg p-6 card-glow group"
          >
            <div className="w-12 h-12 rounded-lg bg-primary/15 flex items-center justify-center mb-4 group-hover:bg-primary/25 transition-colors">
              <s.icon className="text-primary" size={24} />
            </div>
            <h3 className="font-heading font-bold text-xl text-secondary-foreground mb-2">
              {s.title}
            </h3>
            <p className="text-secondary-foreground/60 mb-4 text-sm">{s.desc}</p>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-primary font-heading font-semibold text-sm hover:underline"
            >
              Solicitar Orçamento →
            </a>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default Services;
