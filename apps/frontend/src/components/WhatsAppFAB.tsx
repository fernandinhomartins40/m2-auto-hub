import { MessageCircle } from "lucide-react";

import { useStorefront } from "@/context/StorefrontContext";

const WhatsAppFAB = () => {
  const { whatsappHref } = useStorefront();

  return (
    /* O botao flutua fora do `main` por design, e sem uma regiao nomeada o
       axe o contava como conteudo fora de landmark (A-02). `aside` nomeado
       resolve sem mexer na posicao nem no comportamento. */
    <aside aria-label="Atalho de contato">
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-whatsapp hover:scale-110 rounded-full flex items-center justify-center shadow-lg transition-transform"
        aria-label="Fale no WhatsApp"
      >
        <MessageCircle className="text-primary-foreground" size={28} />
      </a>
    </aside>
  );
};

export default WhatsAppFAB;
