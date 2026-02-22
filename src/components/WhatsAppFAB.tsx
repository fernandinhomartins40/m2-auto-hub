import { MessageCircle } from "lucide-react";

const WHATSAPP_URL = "https://wa.me/5542991215515";

const WhatsAppFAB = () => (
  <a
    href={WHATSAPP_URL}
    target="_blank"
    rel="noopener noreferrer"
    className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-whatsapp hover:scale-110 rounded-full flex items-center justify-center shadow-lg transition-transform"
    aria-label="Fale no WhatsApp"
  >
    <MessageCircle className="text-primary-foreground" size={28} />
  </a>
);

export default WhatsAppFAB;
