import About from "@/components/About";
import { CartDrawer } from "@/components/CartDrawer";
import Contact from "@/components/Contact";
import GoogleMap from "@/components/GoogleMap";
import Highlights from "@/components/Highlights";
import Navbar from "@/components/Navbar";
import Testimonials from "@/components/Testimonials";
import WhatsAppFAB from "@/components/WhatsAppFAB";
import Footer from "@/m2/components/Footer";
import Hero from "@/m2/components/Hero";
import Products from "@/m2/components/Products";
import Promotions from "@/m2/components/Promotions";
import Services from "@/m2/components/Services";
import { MAIN_CONTENT_ID, SkipToContent } from "@/components/layout/SkipToContent";

const Index = () => (
  <>
    <SkipToContent />
    <Navbar />
    {/* Um unico `main` por pagina: sem ele a landing deixava 132 nos fora de
        regiao nomeada (A-02) e o skip link nao tinha destino (A-05). */}
    <main id={MAIN_CONTENT_ID} tabIndex={-1} className="outline-none">
      <Hero />
      <Highlights />
      <About />
      <Services />
      <Products />
      <Promotions />
      <Testimonials />
      <Contact />
      <GoogleMap />
    </main>
    <Footer />
    <CartDrawer />
    <WhatsAppFAB />
  </>
);

export default Index;
