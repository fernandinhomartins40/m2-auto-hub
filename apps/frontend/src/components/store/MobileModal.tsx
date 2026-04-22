import React from 'react';
import { X } from 'lucide-react';
import { useIsMobile } from '../../hooks/use-mobile';
import { cn } from '../../lib/utils';

interface MobileModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

/**
 * Modal que se adapta automaticamente para mobile
 * - Desktop: Modal centralizado com tamanho customizável
 * - Mobile: Full screen com scroll otimizado
 */
export default function MobileModal({
  open,
  onClose,
  title,
  children,
  fullScreen = false,
  size = 'md',
  className,
}: MobileModalProps) {
  const isMobile = useIsMobile();

  // Force fullScreen em mobile
  const shouldBeFullScreen = fullScreen || isMobile;

  // Tamanhos do modal (desktop)
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full',
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className={cn(
          'fixed z-50 bg-white',
          shouldBeFullScreen
            ? // Full Screen (Mobile ou forçado)
              'inset-0 flex flex-col'
            : // Centered Modal (Desktop)
              'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg shadow-2xl max-h-[90vh] flex flex-col',
          !shouldBeFullScreen && sizeClasses[size],
          'animate-scale-in',
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0 safe-area-top">
            <h2
              id="modal-title"
              className="text-lg font-semibold text-gray-900"
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation"
              aria-label="Fechar"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        )}

        {/* Content */}
        <div
          className={cn(
            'flex-1 overflow-y-auto',
            isMobile
              ? 'px-4 py-4 pb-safe' // Mobile padding
              : 'p-6' // Desktop padding
          )}
          style={{
            WebkitOverflowScrolling: 'touch', // Smooth scroll iOS
          }}
        >
          {children}
        </div>

        {/* Safe area for iOS */}
        {isMobile && (
          <div className="h-safe-area-inset-bottom bg-white flex-shrink-0" />
        )}
      </div>
    </>
  );
}

/**
 * Hook para controlar modal
 */
export function useModal(defaultOpen = false) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  const open = React.useCallback(() => setIsOpen(true), []);
  const close = React.useCallback(() => setIsOpen(false), []);
  const toggle = React.useCallback(() => setIsOpen((prev) => !prev), []);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
}
