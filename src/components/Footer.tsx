import { Facebook, Instagram, MessageCircle } from "lucide-react";

const WHATSAPP_URL = "https://wa.me/5542991215515";

const navLinks = [
  { label: "Início", href: "#inicio" },
  { label: "Sobre", href: "#sobre" },
  { label: "Serviços", href: "#servicos" },
  { label: "Produtos", href: "#produtos" },
  { label: "Promoções", href: "#promocoes" },
  { label: "Contato", href: "#contato" },
];

const Footer = () => (
  <footer className="bg-secondary py-12 border-t border-primary/10">
    <div className="container mx-auto px-4">
      <div className="grid md:grid-cols-3 gap-8 items-start mb-8">
        {/* Logo */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 bg-primary rounded-md flex items-center justify-center">
              <div className="flex gap-0.5">
                <div className="w-0.5 h-4 bg-primary-foreground rounded-sm" />
                <div className="w-0.5 h-4 bg-primary-foreground rounded-sm" />
                <div className="w-0.5 h-4 bg-primary-foreground rounded-sm" />
              </div>
            </div>
            <span className="font-heading text-xl font-bold text-primary-foreground tracking-wider">
              m2
            </span>
          </div>
          <p className="text-secondary-foreground/50 text-sm">
            Tudo que seu carro precisa, você encontra aqui.
          </p>
        </div>

        {/* Nav */}
        <div className="flex flex-wrap gap-4">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-secondary-foreground/60 hover:text-primary text-sm transition-colors"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Social */}
        <div className="flex gap-3 md:justify-end">
          <a href="#" className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary hover:bg-primary/25 transition-colors">
            <Facebook size={18} />
          </a>
          <a href="https://instagram.com/m2autocenterpalmital" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary hover:bg-primary/25 transition-colors">
            <Instagram size={18} />
          </a>
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary hover:bg-primary/25 transition-colors">
            <MessageCircle size={18} />
          </a>
        </div>
      </div>

      <div className="border-t border-primary/10 pt-6 text-center">
        <p className="text-secondary-foreground/40 text-sm">
          © 2026 M2 Auto Center — Palmital/PR. Todos os direitos reservados.
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
