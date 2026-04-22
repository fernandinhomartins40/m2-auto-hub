import React, { useState } from 'react';
import { Download, Share2, X } from 'lucide-react';
import { type PwaVariant, usePWAInstall } from '../hooks/usePWAInstall';
import { IconSVG } from './IconSVG';
import { IOSInstructions } from './IOSInstructions';

interface InstallCardProps {
  appName: string;
  appIcon?: string;
  variant: PwaVariant;
}

export function InstallCard({ appName, appIcon, variant }: InstallCardProps) {
  const { deviceInfo, shouldShowPrompt, isInstallable, handleInstall, handleDismiss } =
    usePWAInstall(variant);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  if (!shouldShowPrompt) {
    return null;
  }

  const isIOS = deviceInfo.platform === 'ios';
  const isAndroid = deviceInfo.platform === 'android';
  const isAdmin = variant === 'admin';
  const bgGradient = isAdmin ? 'from-blue-50 to-white border-blue-200' : 'from-green-50 to-white border-green-200';
  const buttonBg = isAdmin ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700';

  return (
    <>
      <div className={`relative overflow-hidden rounded-xl border-2 bg-gradient-to-br ${bgGradient} p-6 shadow-lg animate-slide-up`}>
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Dispensar"
          type="button"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-16 h-16 rounded-2xl shadow-md overflow-hidden">
            {appIcon ? <img src={appIcon} alt={appName} className="w-16 h-16 object-cover" /> : <IconSVG variant={variant} size={64} />}
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Instale o app {appName}</h3>
            <p className="text-sm text-gray-600 mb-4">
              {isIOS ? 'Adicione a tela inicial para acesso rapido e experiencia nativa' : 'Acesso rapido, offline e notificacoes em tempo real'}
            </p>

            <button
              onClick={isIOS ? () => setShowIOSInstructions(true) : handleInstall}
              disabled={isAndroid && !isInstallable}
              className={`w-full flex items-center justify-center gap-2 ${buttonBg} text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`}
              type="button"
            >
              {isIOS ? (
                <>
                  <Share2 className="w-5 h-5" />
                  Ver como instalar
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  {isInstallable ? 'Instalar agora' : 'Instalando...'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {showIOSInstructions && (
        <IOSInstructions
          appName={appName}
          variant={variant}
          onClose={() => setShowIOSInstructions(false)}
        />
      )}
    </>
  );
}
