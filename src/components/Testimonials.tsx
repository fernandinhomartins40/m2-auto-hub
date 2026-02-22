import { Star } from "lucide-react";

const testimonials = [
  {
    text: "Atendimento excelente! Encontrei as peças que precisava na hora. Equipe muito atenciosa e especializada.",
    name: "Carlos M.",
    loc: "Palmital/PR",
  },
  {
    text: "Fiz a revisão completa do meu carro aqui e saí com tudo em ordem. Preço justo e serviço de qualidade.",
    name: "Ana P.",
    loc: "Palmital/PR",
  },
  {
    text: "Minha caminhonete diesel sempre fica nos cuidados da M2. Confiança total no trabalho deles!",
    name: "Roberto S.",
    loc: "Palmital/PR",
  },
];

const Testimonials = () => (
  <section className="py-20 section-dark">
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-heading font-bold text-secondary-foreground mb-2">
          O que nossos <span className="text-primary">clientes</span> dizem
        </h2>
        <div className="w-20 h-1 bg-primary rounded-full mx-auto" />
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {testimonials.map((t) => (
          <div key={t.name} className="glass-card rounded-xl p-6">
            <div className="flex gap-1 mb-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={18}
                  className="fill-gold-star text-gold-star"
                />
              ))}
            </div>
            <p className="text-secondary-foreground/80 italic mb-4 leading-relaxed">
              "{t.text}"
            </p>
            <div>
              <span className="font-heading font-bold text-secondary-foreground">
                {t.name}
              </span>
              <span className="text-secondary-foreground/50 text-sm ml-2">
                {t.loc}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default Testimonials;
