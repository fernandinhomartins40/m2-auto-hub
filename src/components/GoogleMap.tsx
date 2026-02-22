const GoogleMap = () => (
  <section className="w-full">
    <iframe
      title="Localização M2 Auto Center"
      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3636.0!2d-50.2!3d-23.25!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjPCsDE1JzAwLjAiUyA1MMKwMTInMDAuMCJX!5e0!3m2!1spt-BR!2sbr!4v1700000000000"
      width="100%"
      height="400"
      style={{ border: 0 }}
      allowFullScreen
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      className="grayscale hover:grayscale-0 transition-all duration-500"
    />
  </section>
);

export default GoogleMap;
