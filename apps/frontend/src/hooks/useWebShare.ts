import { useState } from 'react';

interface ShareData {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

interface UseWebShareReturn {
  canShare: boolean;
  share: (data: ShareData) => Promise<void>;
  isSharing: boolean;
  error: Error | null;
}

/**
 * Hook para usar a Web Share API
 * Permite compartilhar conteúdo nativamente do PWA
 *
 * @example
 * const { canShare, share } = useWebShare();
 *
 * if (canShare) {
 *   share({
 *     title: 'Produto Incrível',
 *     text: 'Veja este produto!',
 *     url: window.location.href,
 *   });
 * }
 */
export function useWebShare(): UseWebShareReturn {
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Verificar se Web Share API está disponível
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator;

  const share = async (data: ShareData): Promise<void> => {
    if (!canShare) {
      const err = new Error('Web Share API not supported in this browser');
      setError(err);
      console.warn(err.message);

      // Fallback: copiar URL para clipboard
      if (data.url) {
        try {
          await navigator.clipboard.writeText(data.url);
          console.log('URL copied to clipboard as fallback');
        } catch (clipboardError) {
          console.error('Failed to copy to clipboard:', clipboardError);
        }
      }
      return;
    }

    setIsSharing(true);
    setError(null);

    try {
      // Verificar se pode compartilhar os dados fornecidos
      if (navigator.canShare && !navigator.canShare(data)) {
        throw new Error('Cannot share the provided data');
      }

      await navigator.share(data);
      console.log('Successfully shared');
    } catch (err) {
      // Usuário cancelou o compartilhamento (não é um erro real)
      if ((err as Error).name === 'AbortError') {
        console.log('Share was cancelled by user');
      } else {
        console.error('Error sharing:', err);
        setError(err as Error);
      }
    } finally {
      setIsSharing(false);
    }
  };

  return {
    canShare,
    share,
    isSharing,
    error,
  };
}

/**
 * Função auxiliar para compartilhar produto
 */
export function shareProduct(product: { name: string; price: number; url?: string }) {
  const shareData: ShareData = {
    title: `${product.name} - Moria Peças`,
    text: `Confira este produto: ${product.name} por R$ ${product.price.toFixed(2)}`,
    url: product.url || window.location.href,
  };

  return shareData;
}

/**
 * Função auxiliar para compartilhar pedido
 */
export function shareOrder(order: { id: string; total: number }) {
  const shareData: ShareData = {
    title: `Pedido #${order.id} - Moria Peças`,
    text: `Meu pedido na Moria Peças - Total: R$ ${order.total.toFixed(2)}`,
    url: `${window.location.origin}/customer?order=${order.id}`,
  };

  return shareData;
}
