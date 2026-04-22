// Hooks
export { useDeviceDetection } from './hooks/useDeviceDetection';
export { useInstallPrompt } from './hooks/useInstallPrompt';
export { usePWAInstall } from './hooks/usePWAInstall';
export { useDevMode } from './hooks/useDevMode';

// Components
export { InstallCard } from './components/InstallCard';
export { IOSInstructions } from './components/IOSInstructions';
export { InstallBanner } from './components/InstallBanner';
export { PWADebug } from './components/PWADebug';
export { IconSVG, AdminIconSVG, CustomerIconSVG } from './components/IconSVG';

// Types
export type { Platform, Browser, DeviceInfo } from './hooks/useDeviceDetection';
export type { PwaVariant } from './hooks/usePWAInstall';
