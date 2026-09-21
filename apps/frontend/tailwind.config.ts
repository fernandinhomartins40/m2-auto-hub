import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      // Os breakpoints padrao do Tailwind ficam intactos. Estes dois cobrem a
      // faixa que faltava: entre `lg` (1024) e `xl` (1280) nada mudava, e e
      // justamente onde a sidebar de 288px deixa o conteudo apertado.
      // `nb` = 1180px: menor largura MEDIDA em que uma grid de 4 colunas do
      // painel para de cortar texto (ver RESPONSIVE-UX-AUDIT.md secao 3).
      screens: {
        nb: "1180px",
        // A sidebar larga volta DEPOIS das grids abrirem para 4 colunas. Se as
        // duas coisas acontecessem no mesmo pixel, o conteudo perderia 216px
        // no exato momento em que passa a pedir mais colunas — que e o bug
        // original deste projeto, so que deslocado. [MEDIDO]
        "sidebar-full": "1400px",
        "3xl": "1728px",
      },
      fontFamily: {
        heading: ["Rajdhani", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        "moria-black": "hsl(var(--moria-black))",
        "moria-orange": "hsl(var(--moria-orange))",
        "moria-orange-hover": "hsl(var(--moria-orange-hover))",
        "gold-start": "hsl(var(--gold-start))",
        "gold-mid": "hsl(var(--gold-mid))",
        "gold-end": "hsl(var(--gold-end))",
        "gold-accent": "hsl(var(--gold-accent))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          hover: "hsl(var(--secondary-hover))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
          dark: "hsl(var(--card-dark))",
          "dark-foreground": "hsl(var(--card-dark-foreground))",
        },
        "surface-dark": "hsl(var(--surface-dark))",
        "surface-dark-foreground": "hsl(var(--surface-dark-foreground))",
        whatsapp: "hsl(var(--whatsapp))",
        "gold-star": "hsl(var(--gold-star))",
        "badge-offer": "hsl(var(--badge-offer))",
        "badge-highlight": "hsl(var(--badge-highlight))",
        "badge-economy": "hsl(var(--badge-economy))",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "slide-down": {
          from: { transform: "translateY(-100%)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "slide-up": {
          from: { transform: "translateY(100%)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide-down": "slide-down 0.3s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
