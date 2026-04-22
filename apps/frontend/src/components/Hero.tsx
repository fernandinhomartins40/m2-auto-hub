import * as Icons from 'lucide-react';

import heroImage from '@/assets/hero-garage.jpg';
import { useLandingPageConfig } from '@/hooks/useLandingPageConfig';

import { colorOrGradientToCSS } from './admin/LandingPageEditor/StyleControls';
import { Button } from './ui/button';

export function Hero() {
  const { config, loading } = useLandingPageConfig();

  if (!loading && !config.hero.enabled) {
    return null;
  }

  if (loading) {
    return (
      <section id="inicio" className="relative min-h-[70vh] flex items-center bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl animate-pulse">
            <div className="h-16 bg-gray-700 rounded mb-6 w-3/4"></div>
            <div className="h-8 bg-gray-700 rounded mb-8 w-1/2"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-8 bg-gray-700 rounded"></div>
              ))}
            </div>
            <div className="flex gap-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-12 bg-gray-700 rounded w-40"></div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  const { title, subtitle, description, features = [], buttons = [], backgroundImage, overlayOpacity } =
    config.hero;

  const getIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent || Icons.Circle;
  };

  const handleButtonClick = (href: string) => {
    if (href.startsWith('#')) {
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (href.startsWith('/')) {
      window.location.href = href;
      return;
    }

    window.open(href, '_blank', 'noopener,noreferrer');
  };

  return (
    <section id="inicio" className="relative min-h-[70vh] flex items-center">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImage.url || heroImage})` }}
      >
        <div className="absolute inset-0 bg-moria-black" style={{ opacity: overlayOpacity / 100 }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            <span className="gold-metallic">{title}</span>
            <br />
            <span className="text-white">{subtitle}</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl">{description}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {features.map((feature) => {
              const IconComponent = getIcon(feature.icon);
              return (
                <div key={feature.id} className="flex items-center space-x-2 text-white">
                  <IconComponent className="h-5 w-5 text-moria-orange" />
                  <span className="text-sm">{feature.text}</span>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            {buttons
              .filter((button) => button.enabled)
              .map((button) => {
                const customStyle =
                  button.background || button.textColor
                    ? {
                        ...(button.background ? colorOrGradientToCSS(button.background) : {}),
                        ...(button.textColor
                          ? colorOrGradientToCSS(button.textColor, { forText: true })
                          : {}),
                      }
                    : undefined;

                return (
                  <Button
                    key={button.id}
                    variant={button.variant as any}
                    size="lg"
                    className="text-lg"
                    style={customStyle}
                    onClick={() => handleButtonClick(button.href)}
                  >
                    {button.text}
                  </Button>
                );
              })}
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none select-none hidden md:block absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white animate-bounce"
      >
        <div className="w-6 h-10 border-2 border-white rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>
    </section>
  );
}
