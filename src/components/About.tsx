import aboutImg from "@/assets/about-shop.jpg";

const About = () => (
  <section id="sobre" className="py-20 section-light">
    <div className="container mx-auto px-4">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-2">
            Mais de <span className="text-primary">14 anos</span> cuidando do seu veículo
          </h2>
          <div className="w-20 h-1 bg-primary rounded-full mb-6" />
          <p className="text-muted-foreground leading-relaxed text-lg">
            A M2 Auto Center nasceu em Palmital com um propósito claro: oferecer
            peças de qualidade e serviços confiáveis em um só lugar. Atendemos veículos
            leves, pesados e a diesel com equipe técnica especializada e comprometida
            com a sua segurança e satisfação.
          </p>
        </div>
        <div className="relative">
          <img
            src={aboutImg}
            alt="Mecânico trabalhando na oficina M2 Auto Center"
            className="rounded-lg w-full h-80 object-cover blue-shadow"
          />
          <div className="absolute -bottom-4 -left-4 w-24 h-24 border-4 border-primary rounded-lg" />
        </div>
      </div>
    </div>
  </section>
);

export default About;
