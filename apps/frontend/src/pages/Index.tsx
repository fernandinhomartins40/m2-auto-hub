import About from "@/components/About";
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

const Index = () => (
  <>
    <Navbar />
    <Hero />
    <Highlights />
    <About />
    <Services />
    <Products />
    <Promotions />
    <Testimonials />
    <Contact />
    <GoogleMap />
    <Footer />
    <WhatsAppFAB />
  </>
);

export default Index;
