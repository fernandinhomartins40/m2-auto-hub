import React, { useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';
import { type PwaVariant, usePWAInstall } from '../hooks/usePWAInstall';
import { IOSInstructions } from './IOSInstructions';

interface InstallBannerProps {
  appName: string;
  variant: PwaVariant;
  compact?: boolean;
}

export function InstallBanner({ appName, variant, compact = false }: InstallBannerProps) {
  const { deviceInfo, shouldShowPrompt, isInstallable, handleInstall, handleDismiss } =
    usePWAInstall(variant);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  if (!shouldShowPrompt) {
    return null;
  }

  const isAdmin = variant === 'admin';
  const gradientBg = isAdmin ? 'from-blue-500 to-blue-600' : 'from-green-500 to-green-600';
  const borderColor = isAdmin ? 'border-blue-200' : 'border-green-200';
  const bgFrom = isAdmin ? 'from-blue-50' : 'from-green-50';
  const iconBg = isAdmin ? 'bg-blue-600' : 'bg-green-600';
  const buttonBg = isAdmin ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700';

  const isAndroid = deviceInfo.platform === 'android';
  const isIOS = deviceInfo.platform === 'ios';
  const isDesktop = deviceInfo.platform === 'desktop';

  const handleClick = async () => {
    if ((isAndroid || isDesktop) && isInstallable) {
      const success = await handleInstall();
      if (!success) {
        setShowIOSInstructions(true);
      }
      return;
    }

    setShowIOSInstructions(true);
  };

  if (compact) {
    return (
      <>
        <div
          className={`bg-gradient-to-r ${gradientBg} text-white px-4 py-3 flex items-center justify-between shadow-md animate-slide-down`}
        >
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5" />
            <div>
              <p className="font-medium text-sm">Instale o app para acesso rapido</p>
              {isIOS && (
                <p className="text-xs text-white/80 flex items-center gap-1">
                  Toque em Compartilhar <Share className="inline w-3 h-3" />
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClick}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              type="button"
            >
              {isIOS ? 'Como fazer' : 'Instalar'}
            </button>
            <button
              onClick={handleDismiss}
              className="text-white/80 hover:text-white p-1 transition-colors"
              aria-label="Fechar"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
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

  return (
    <>
      <div
        className={`bg-gradient-to-br ${bgFrom} to-white border-2 ${borderColor} rounded-xl p-4 flex items-center gap-4 shadow-lg animate-slide-up`}
      >
        <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Smartphone className="w-6 h-6 text-white" />
        </div>

        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">Instale o app {appName}</h4>
          <p className="text-sm text-gray-600">
            {isAndroid && 'Acesso rapido e funciona offline'}
            {isIOS && 'Adicione a tela inicial para acesso rapido'}
            {isDesktop && 'Instale no seu computador para acesso rapido'}
            {!isAndroid && !isIOS && !isDesktop && 'Acesso rapido direto da area de trabalho'}
          </p>
        </div>

        <button
          onClick={handleClick}
          className={`${buttonBg} text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors`}
          type="button"
        >
          <Download className="w-4 h-4" />
          {isIOS ? 'Como fazer' : 'Instalar'}
        </button>

        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 p-1 transition-colors"
          aria-label="Dispensar"
          type="button"
        >
          <X className="w-5 h-5" />
        </button>
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
