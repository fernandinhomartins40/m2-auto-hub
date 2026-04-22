import React from 'react';
import { useDeviceDetection } from '../hooks/useDeviceDetection';
import { useDevMode } from '../hooks/useDevMode';
import { usePWAInstall } from '../hooks/usePWAInstall';

/**
 * Componente de debug para mostrar informações PWA em desenvolvimento
 * Apenas visível em modo desenvolvimento
 */
export function PWADebug() {
  const deviceInfo = useDeviceDetection();
  const { isDevMode, isDev, forceShow } = useDevMode();
  const { shouldShowPrompt, isInstallable } = usePWAInstall('customer');

  // Só mostra em dev
  if (!isDev) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black/90 text-white p-3 rounded-lg shadow-2xl text-xs font-mono z-50 max-w-xs">
      <div className="flex items-center justify-between mb-2 border-b border-white/20 pb-2">
        <span className="font-bold text-yellow-300">PWA DEBUG</span>
        <button
          onClick={() => (window as any).togglePWAForceShow?.()}
          className="bg-yellow-500 text-black px-2 py-1 rounded text-[10px] font-bold hover:bg-yellow-400"
          type="button"
        >
          {forceShow ? 'FORCED ON' : 'Toggle Force'}
        </button>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-400">Platform:</span>
          <span className="font-semibold text-cyan-300">{deviceInfo.platform}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Browser:</span>
          <span className="font-semibold text-cyan-300">{deviceInfo.browser}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Can Install:</span>
          <span className={deviceInfo.canInstall ? 'text-green-400' : 'text-red-400'}>
            {deviceInfo.canInstall ? '✓ YES' : '✗ NO'}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Standalone:</span>
          <span className={deviceInfo.isStandalone ? 'text-green-400' : 'text-gray-400'}>
            {deviceInfo.isStandalone ? '✓ YES' : '✗ NO'}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Install Method:</span>
          <span className="text-purple-300">{deviceInfo.installMethod}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Installable:</span>
          <span className={isInstallable ? 'text-green-400' : 'text-red-400'}>
            {isInstallable ? '✓ YES' : '✗ NO'}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Should Show:</span>
          <span className={shouldShowPrompt ? 'text-green-400 font-bold' : 'text-red-400'}>
            {shouldShowPrompt ? '✓ SHOWING' : '✗ HIDDEN'}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Dev Mode:</span>
          <span className={isDevMode ? 'text-yellow-400 font-bold' : 'text-gray-400'}>
            {isDevMode ? '✓ ENABLED' : '✗ DISABLED'}
          </span>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-white/20 text-[10px] text-gray-400">
        💡 Run <code className="bg-white/10 px-1 rounded">togglePWAForceShow()</code> in console
      </div>
    </div>
  );
}
