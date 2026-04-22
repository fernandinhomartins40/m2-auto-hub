import * as Icons from 'lucide-react';
import { Link } from 'react-router-dom';

import { useLandingPageConfig } from '@/hooks/useLandingPageConfig';

import { colorOrGradientToCSS } from './admin/LandingPageEditor/StyleControls';
import { Button } from './ui/button';

export function Footer() {
  const { config, loading } = useLandingPageConfig();

  if (!loading && !config.footer.enabled) {
    return null;
  }

  if (loading) {
    return (
      <footer className="bg-moria-black text-white">
        <div className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 animate-pulse">
            {[1, 2, 3, 4].map((item) => (
              <div key={item}>
                <div className="h-16 bg-gray-700 rounded mb-4 w-1/2"></div>
                <div className="h-4 bg-gray-700 rounded mb-2"></div>
                <div className="h-4 bg-gray-700 rounded mb-2 w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </footer>
    );
  }

  const { logo, description, contactInfo, businessHours, services = [], socialLinks = [], certifications = [], copyright, bottomLinks = [] } =
    config.footer;

  const getIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent || Icons.Circle;
  };

  return (
    <footer className="bg-moria-black text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <img src={logo.url} alt={logo.alt} className="h-16 mb-4" />
            <p className="text-gray-300 mb-6">{description}</p>
            <div className="flex flex-col space-y-4">
              <div className="flex space-x-4">
                {socialLinks
                  .filter((social) => social.enabled)
                  .map((social) => {
                    const SocialIcon =
                      social.platform === 'facebook' ? Icons.Facebook : Icons.Instagram;

                    return (
                      <Button
                        key={social.id}
                        variant="ghost"
                        size="icon"
                        className="hover:text-moria-orange"
                        onClick={() => window.open(social.url, '_blank', 'noopener,noreferrer')}
                      >
                        <SocialIcon className="h-5 w-5" />
                      </Button>
                    );
                  })}
              </div>

              <Link to="/store-panel">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-moria-orange text-moria-orange hover:bg-moria-orange hover:text-white"
                >
                  <Icons.Settings className="h-4 w-4 mr-2" />
                  Painel do Lojista
                </Button>
              </Link>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-bold mb-4 text-moria-orange">Contato</h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Icons.MapPin className="h-5 w-5 text-moria-orange mt-1" />
                <div>
                  <p className="text-gray-300">{contactInfo.address.street}</p>
                  <p className="text-gray-300">{contactInfo.address.city}</p>
                  <p className="text-gray-300">{contactInfo.address.zipCode}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Icons.Phone className="h-5 w-5 text-moria-orange" />
                <p className="text-gray-300">{contactInfo.phone}</p>
              </div>
              <div className="flex items-center space-x-3">
                <Icons.Mail className="h-5 w-5 text-moria-orange" />
                <p className="text-gray-300">{contactInfo.email}</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-bold mb-4 text-moria-orange">Horario de Funcionamento</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <Icons.Clock className="h-5 w-5 text-moria-orange" />
                <div>
                  <p className="text-gray-300 whitespace-pre-line">{businessHours.weekdays}</p>
                </div>
              </div>
              <div className="ml-8">
                <p className="text-gray-300 whitespace-pre-line">{businessHours.saturday}</p>
              </div>
              <div className="ml-8">
                <p className="text-gray-400 whitespace-pre-line">{businessHours.sunday}</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-bold mb-4 text-moria-orange">Servicos</h4>
            <ul className="space-y-2">
              {services.map((service) => (
                <li key={service.id} className="flex items-center space-x-2">
                  <Icons.Wrench className="h-4 w-4 text-moria-orange" />
                  <span className="text-gray-300 text-sm">{service.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-12 pt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {certifications.map((certification) => {
              const CertIcon = getIcon(certification.icon);

              return (
                <div key={certification.id} className="flex flex-col items-center">
                  <div
                    className="p-4 rounded-full mb-3"
                    style={colorOrGradientToCSS(certification.iconBackground)}
                  >
                    <CertIcon className="h-8 w-8 text-white" />
                  </div>
                  <h5 className="font-bold text-white mb-2">{certification.title}</h5>
                  <p className="text-gray-400 text-sm">{certification.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-700">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm mb-4 md:mb-0">{copyright}</p>
            <div className="flex space-x-6 text-sm">
              {bottomLinks.map((link) => (
                <a key={link.id} href={link.href} className="text-gray-400 hover:text-moria-orange transition-colors">
                  {link.text}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
