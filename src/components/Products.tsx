import {
  Droplets, Wind, Filter, Settings, ShieldCheck, Truck, Disc, Zap,
} from "lucide-react";

const WHATSAPP_URL = "https://wa.me/5542991215515";

const products = [
  { icon: Droplets, title: "Óleos & Lubrificantes", desc: "Óleos minerais, semissintéticos e sintéticos das melhores marcas.", tag: "Linha Completa" },
  { icon: Wind, title: "Escapamentos & Silenciosos", desc: "Sistemas de exaustão para veículos leves e pesados.", tag: "Alta Durabilidade" },
  { icon: Filter, title: "Filtros", desc: "Filtros de óleo, ar, combustível e cabine para todas as marcas.", tag: "Todas as Marcas" },
  { icon: Settings, title: "Peças para Motor", desc: "Componentes originais e alternativos para motores a gasolina e diesel.", tag: "Leve & Pesado" },
  { icon: ShieldCheck, title: "Suspensão & Direção", desc: "Amortecedores, buchas, terminais e componentes de direção.", tag: "Segurança" },
  { icon: Truck, title: "Linha Diesel", desc: "Peças e acessórios específicos para veículos a diesel e frotas.", tag: "Especialidade" },
  { icon: Disc, title: "Freios", desc: "Pastilhas, discos, lonas e fluidos de freio para seu veículo.", tag: "Segurança Primeiro" },
  { icon: Zap, title: "Elétrica Automotiva", desc: "Baterias, alternadores, velas e componentes do sistema elétrico.", tag: "Linha Completa" },
];

const Products = () => (
  <section id="produtos" className="py-20 section-light">
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-2">
          Nossos <span className="text-primary">Produtos</span>
        </h2>
        <div className="w-20 h-1 bg-primary rounded-full mx-auto mb-4" />
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Trabalhamos com as melhores marcas do mercado para garantir qualidade e
          durabilidade para o seu veículo.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {products.map((p) => (
          <div
            key={p.title}
            className="bg-secondary border border-primary/15 rounded-lg p-5 card-glow group"
          >
            <div className="w-11 h-11 rounded-lg bg-primary/15 flex items-center justify-center mb-3 group-hover:bg-primary/25 transition-colors">
              <p.icon className="text-primary" size={22} />
            </div>
            <h3 className="font-heading font-bold text-lg text-secondary-foreground mb-1">
              {p.title}
            </h3>
            <p className="text-secondary-foreground/60 text-sm mb-3">{p.desc}</p>
            <span className="inline-block bg-primary/15 text-primary text-xs font-heading font-semibold px-3 py-1 rounded-full">
              {p.tag}
            </span>
          </div>
        ))}
      </div>

      <div className="text-center">
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-md font-heading font-bold text-lg transition-all blue-shadow hover:scale-105"
        >
          💬 Solicitar Produto pelo WhatsApp
        </a>
      </div>
    </div>
  </section>
);

export default Products;
