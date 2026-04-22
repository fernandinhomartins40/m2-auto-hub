import { Header } from "../components/Header";
import { Marquee } from "../components/Marquee";
import { Footer } from "../components/Footer";
import { useLandingPageConfig } from "../hooks/useLandingPageConfig";
import { colorOrGradientToCSS } from "../components/admin/LandingPageEditor/StyleControls";
import * as Icons from "lucide-react";
import "../styles/public.css";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { Navigate } from "react-router-dom";
import {
  Shield,
  Clock,
  Award,
  CheckCircle,
  Star,
  Loader2
} from "lucide-react";

export default function About() {
  const { config: landingPageConfig, loading: configLoading } = useLandingPageConfig();

  // Usar configurações do Landing Page Editor ou fallback para defaults
  const aboutPageConfig = landingPageConfig?.aboutPage || {
    enabled: true,
    heroBadge: "Sobre Nós",
    heroTitle: "Mais de",
    heroHighlight: "15 Anos",
    heroSubtitle: "Especialistas em peças automotivas e serviços de qualidade. Nossa missão é garantir que seu veículo esteja sempre em perfeitas condições.",
    stats: [
      { id: "1", number: "15+", label: "Anos de Experiência" },
      { id: "2", number: "10k+", label: "Peças em Estoque" },
      { id: "3", number: "5k+", label: "Clientes Satisfeitos" },
      { id: "4", number: "50k+", label: "Serviços Realizados" }
    ],
    historyTitle: "Nossa História",
    historySubtitle: "Uma jornada de dedicação, crescimento e compromisso com a excelência no setor automotivo.",
    milestones: [
      { id: "1", year: "2009", title: "Fundacao", description: "Inicio da M2 Center Auto" },
      { id: "2", year: "2012", title: "Expansão", description: "Ampliação do estoque e serviços" },
      { id: "3", year: "2015", title: "Modernização", description: "Investimento em equipamentos de diagnóstico" },
      { id: "4", year: "2018", title: "Certificação", description: "Certificação ISO 9001" },
      { id: "5", year: "2021", title: "Digital", description: "Lançamento da plataforma online" },
      { id: "6", year: "2024", title: "Presente", description: "Mais de 15 anos servindo com excelência" }
    ],
    valuesTitle: "Nossos Valores",
    valuesSubtitle: "Os princípios que guiam nossa empresa e nosso compromisso com cada cliente.",
    values: [
      { id: "1", icon: "Shield", title: "Qualidade", description: "Compromisso com peças originais e serviços de alta qualidade", color: { type: 'solid', solid: '#2563eb' } }, // text-blue-600
      { id: "2", icon: "Heart", title: "Confiança", description: "Relacionamento baseado na transparência e honestidade", color: { type: 'solid', solid: '#dc2626' } }, // text-red-600
      { id: "3", icon: "Target", title: "Excelência", description: "Busca constante pela melhoria contínua dos nossos serviços", color: { type: 'solid', solid: '#16a34a' } }, // text-green-600
      { id: "4", icon: "Users", title: "Relacionamento", description: "Foco no atendimento personalizado e duradouro", color: { type: 'solid', solid: '#9333ea' } } // text-purple-600
    ],
    servicesTitle: "Nossos Serviços",
    servicesSubtitle: "Oferecemos uma ampla gama de serviços especializados para manter seu veículo em perfeitas condições.",
    services: [
      { id: "1", name: "Manutenção Preventiva e Corretiva" },
      { id: "2", name: "Diagnóstico Eletrônico Completo" },
      { id: "3", name: "Troca de Óleo e Filtros" },
      { id: "4", name: "Sistema de Freios e ABS" },
      { id: "5", name: "Suspensão e Amortecedores" },
      { id: "6", name: "Sistema Elétrico e Eletrônico" },
      { id: "7", name: "Ar Condicionado Automotivo" },
      { id: "8", name: "Injeção Eletrônica" },
      { id: "9", name: "Sistema de Ignição" },
      { id: "10", name: "Alinhamento e Balanceamento" }
    ],
    commitmentTitle: "Nosso Compromisso",
    commitmentText: "Garantir que cada cliente tenha a melhor experiência possível, com serviços de qualidade superior, atendimento personalizado e preços justos. Sua satisfação é nossa maior conquista.",
    commitmentYears: "15+ Anos de Excelência"
  };

  // Renderizar loading
  if (configLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-moria-orange" />
      </div>
    );
  }

  if (!aboutPageConfig.enabled) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-white">
          <Header />
          <Marquee />
          
          {/* Hero Section */}
          <section
            className="relative py-20 text-white overflow-hidden"
            style={{
              ...colorOrGradientToCSS(aboutPageConfig.heroBackgroundColor),
              ...(aboutPageConfig.heroBackgroundColor ? {} : {
                background: 'linear-gradient(to bottom right, #1a1a1a, #374151)'
              })
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-moria-orange/10 to-transparent"></div>
            <div className="container mx-auto px-4 relative z-10">
              <div className="max-w-4xl mx-auto text-center">
                <Badge className="mb-6 bg-moria-orange text-white px-4 py-2 text-lg">
                  {aboutPageConfig.heroBadge}
                </Badge>
                <h1 className="text-4xl md:text-6xl font-bold mb-6">
                  {aboutPageConfig.heroTitle} <span className="gold-metallic">{aboutPageConfig.heroHighlight}</span>
                </h1>
                <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
                  {aboutPageConfig.heroSubtitle}
                </p>
              </div>
            </div>
          </section>

          {/* Stats Section */}
          <section
            className="py-16"
            style={{
              ...colorOrGradientToCSS(aboutPageConfig.statsBackgroundColor),
              ...(aboutPageConfig.statsBackgroundColor ? {} : { backgroundColor: '#f9fafb' })
            }}
          >
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                {aboutPageConfig.stats?.map((stat, index) => (
                  <div key={stat.id || index} className="bg-white p-6 rounded-lg shadow-md">
                    <div className="text-3xl md:text-4xl font-bold text-moria-orange mb-2">
                      {stat.number}
                    </div>
                    <div className="text-gray-600 font-medium">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Nossa História */}
          <section
            className="py-20"
            style={{
              ...colorOrGradientToCSS(aboutPageConfig.historyBackgroundColor),
              ...(aboutPageConfig.historyBackgroundColor ? {} : { backgroundColor: '#ffffff' })
            }}
          >
            <div className="container mx-auto px-4">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-bold mb-4">
                  {aboutPageConfig.historyTitle.split(' ').map((word, i, arr) =>
                    i === arr.length - 1 ?
                      <span key={i} className="gold-metallic">{word}</span> :
                      <span key={i}>{word} </span>
                  )}
                </h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  {aboutPageConfig.historySubtitle}
                </p>
              </div>

              <div className="max-w-4xl mx-auto">
                <div className="relative">
                  {/* Timeline Line */}
                  <div
                    className="absolute left-8 top-0 bottom-0 w-0.5 hidden md:block"
                    style={{
                      ...colorOrGradientToCSS(aboutPageConfig.timelineColor),
                      ...(aboutPageConfig.timelineColor ? {} : { backgroundColor: '#FF6B35' })
                    }}
                  ></div>

                  <div className="space-y-12">
                    {aboutPageConfig.milestones?.map((milestone, index) => (
                      <div key={milestone.id || index} className="relative flex items-center">
                        {/* Timeline Dot */}
                        <div className="hidden md:flex w-16 h-16 bg-moria-orange rounded-full items-center justify-center text-white font-bold text-lg mr-8 shadow-lg">
                          <Clock className="h-6 w-6" />
                        </div>

                        <Card className="flex-1">
                          <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                              <Badge className="bg-gold-accent text-moria-black w-fit font-bold text-lg px-4 py-2">
                                {milestone.year}
                              </Badge>
                              <div>
                                <h3 className="text-xl font-bold text-moria-black mb-2">
                                  {milestone.title}
                                </h3>
                                <p className="text-gray-600">
                                  {milestone.description}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Nossos Valores */}
          <section
            className="py-20 text-white"
            style={{
              ...colorOrGradientToCSS(aboutPageConfig.valuesBackgroundColor),
              ...(aboutPageConfig.valuesBackgroundColor ? {} : { backgroundColor: '#111827' })
            }}
          >
            <div className="container mx-auto px-4">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-bold mb-4">
                  {aboutPageConfig.valuesTitle.split(' ').map((word, i, arr) =>
                    i === arr.length - 1 ?
                      <span key={i} className="gold-metallic">{word}</span> :
                      <span key={i}>{word} </span>
                  )}
                </h2>
                <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                  {aboutPageConfig.valuesSubtitle}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {aboutPageConfig.values?.map((value, index) => {
                  const IconComponent = (Icons as any)[value.icon] || Shield;
                  return (
                    <Card key={value.id || index} className="bg-white/10 border-white/20 text-white hover:bg-white/20 transition-all">
                      <CardContent className="p-6 text-center">
                        <div className="bg-white/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                          <IconComponent
                            className="h-8 w-8"
                            style={colorOrGradientToCSS(value.color, { forText: true })}
                          />
                        </div>
                        <h3 className="text-xl font-bold mb-3">
                          {value.title}
                        </h3>
                        <p className="text-gray-300 text-sm">
                          {value.description}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Nossos Serviços */}
          <section
            className="py-20"
            style={{
              ...colorOrGradientToCSS(aboutPageConfig.servicesBackgroundColor),
              ...(aboutPageConfig.servicesBackgroundColor ? {} : { backgroundColor: '#ffffff' })
            }}
          >
            <div className="container mx-auto px-4">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-bold mb-4">
                  {aboutPageConfig.servicesTitle.split(' ').map((word, i, arr) =>
                    i === arr.length - 1 ?
                      <span key={i} className="gold-metallic">{word}</span> :
                      <span key={i}>{word} </span>
                  )}
                </h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  {aboutPageConfig.servicesSubtitle}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {aboutPageConfig.services?.map((service, index) => (
                  <div key={service.id || index} className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-moria-orange/10 transition-colors">
                    <CheckCircle className="h-5 w-5 text-moria-orange mr-3 flex-shrink-0" />
                    <span className="text-gray-700 font-medium">{service.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Compromisso */}
          <section
            className="py-20 text-white"
            style={{
              ...colorOrGradientToCSS(aboutPageConfig.commitmentBackgroundColor),
              ...(aboutPageConfig.commitmentBackgroundColor ? {} : {
                background: 'linear-gradient(to right, #FF6B35, #D4AF37)'
              })
            }}
          >
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto text-center">
                <Award className="h-16 w-16 mx-auto mb-6 text-white" />
                <h2 className="text-4xl md:text-5xl font-bold mb-6">
                  {aboutPageConfig.commitmentTitle}
                </h2>
                <p className="text-xl md:text-2xl mb-8 leading-relaxed">
                  "{aboutPageConfig.commitmentText}"
                </p>
                <div className="flex justify-center">
                  <div className="flex items-center space-x-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-6 w-6 text-yellow-300 fill-yellow-300" />
                    ))}
                    <span className="ml-4 text-lg font-semibold">{aboutPageConfig.commitmentYears}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <Footer />
    </div>
  );
}
