import heroBg from "@/assets/hero-bg.jpg";

const WHATSAPP_URL = "https://wa.me/5542991215515";

const Hero = () => {
  return (
    <section
      id="inicio"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0">
        <img src={heroBg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/95 via-secondary/80 to-primary/30" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center py-32">
        <div className="max-w-3xl mx-auto animate-fade-up">
          <div className="inline-block bg-primary/20 border border-primary/30 rounded-full px-4 py-1.5 mb-6">
            <span className="text-primary font-heading font-semibold text-sm tracking-wide">
              M2 AUTO PEÇAS & AUTO CENTER
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-bold text-secondary-foreground leading-tight mb-6">
            Tudo que seu carro precisa,{" "}
            <span className="text-primary">você encontra aqui.</span>
          </h1>
          <p className="text-lg md:text-xl text-secondary-foreground/70 max-w-2xl mx-auto mb-10 font-body">
            Auto Peças + Auto Center em Palmital/PR. Atendimento especializado
            em mecânica leve, pesada e diesel.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-md font-heading font-bold text-lg transition-all blue-shadow hover:scale-105"
            >
              Agendar Serviço
            </a>
            <button
              onClick={() =>
                document
                  .querySelector("#servicos")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="inline-flex items-center justify-center gap-2 border-2 border-secondary-foreground/30 hover:border-primary text-secondary-foreground px-8 py-4 rounded-md font-heading font-bold text-lg transition-all hover:scale-105"
            >
              Ver Serviços
            </button>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default Hero;
