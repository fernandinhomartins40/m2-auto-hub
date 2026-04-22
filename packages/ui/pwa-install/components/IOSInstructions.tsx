import React from 'react';
import { Home, Plus, Share, X } from 'lucide-react';
import { type PwaVariant, usePWAInstall } from '../hooks/usePWAInstall';

interface IOSInstructionsProps {
  appName: string;
  variant: PwaVariant;
  onClose?: () => void;
}

export function IOSInstructions({ appName, variant, onClose }: IOSInstructionsProps) {
  const { deviceInfo, shouldShowPrompt, handleDismiss } = usePWAInstall(variant);

  if (!shouldShowPrompt || deviceInfo.platform !== 'ios') {
    return null;
  }

  const isAdmin = variant === 'admin';
  const headerBg = isAdmin ? 'bg-blue-600' : 'bg-green-600';
  const stepBg = isAdmin ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600';
  const buttonBg = isAdmin ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700';
  const iconColor = isAdmin ? 'text-blue-600' : 'text-green-600';

  const handleClose = () => {
    handleDismiss();
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 animate-fade-in">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className={`${headerBg} text-white p-6 relative`}>
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
            aria-label="Fechar"
            type="button"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center">
              <Home className={`w-8 h-8 ${iconColor}`} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Instalar {appName}</h2>
              <p className="text-sm text-white/90">Para iPhone e iPad</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-gray-700">Siga os passos abaixo para adicionar o app na sua tela inicial:</p>

          <div className="flex gap-4">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full ${stepBg} flex items-center justify-center font-bold`}>1</div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">Toque no botao Compartilhar</h3>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-center">
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                    <Share className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full ${stepBg} flex items-center justify-center font-bold`}>2</div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">Selecione "Adicionar a Tela de Inicio"</h3>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-3 bg-white rounded-lg p-3 shadow-sm">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Plus className="w-6 h-6 text-gray-700" />
                  </div>
                  <p className="font-medium text-gray-900">Adicionar a Tela de Inicio</p>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleClose}
            className={`w-full ${buttonBg} text-white font-semibold py-4 rounded-lg transition-all duration-200`}
            type="button"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
