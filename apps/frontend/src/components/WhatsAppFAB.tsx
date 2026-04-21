import { MessageCircle } from "lucide-react";

import { useStorefront } from "@/context/StorefrontContext";

const WhatsAppFAB = () => {
  const { whatsappHref } = useStorefront();

  return (
    <a
      href={whatsappHref}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-whatsapp hover:scale-110 rounded-full flex items-center justify-center shadow-lg transition-transform"
      aria-label="Fale no WhatsApp"
    >
      <MessageCircle className="text-primary-foreground" size={28} />
    </a>
  );
};

export default WhatsAppFAB;
