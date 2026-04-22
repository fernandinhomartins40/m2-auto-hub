import React, { useState } from 'react';
import { Card, CardContent } from './card';
import { Button } from './button';
import { Badge } from './badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  X,
  Image as ImageIcon,
  Maximize2
} from 'lucide-react';

interface ProductImageGalleryProps {
  images: string[];
  productName: string;
  className?: string;
  aspectRatio?: 'square' | 'auto';
  thumbnailSize?: 'sm' | 'md' | 'lg';
  enableZoom?: boolean;
  enableFullscreen?: boolean;
}

export function ProductImageGallery({
  images = [],
  productName = 'Produto',
  className = '',
  aspectRatio = 'square',
  thumbnailSize = 'md',
  enableZoom = true,
  enableFullscreen = true
}: ProductImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  // Se não há imagens, mostrar placeholder
  if (!images || images.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}>
        <div className="text-center p-8">
          <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">Nenhuma imagem disponível</p>
        </div>
      </div>
    );
  }

  const currentImage = images[currentIndex] || images[0];

  // Navegação de imagens
  const goToPrevious = () => {
    setCurrentIndex(prev =>
      prev === 0 ? images.length - 1 : prev - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex(prev =>
      prev === images.length - 1 ? 0 : prev + 1
    );
  };

  const goToImage = (index: number) => {
    setCurrentIndex(index);
  };

  // Configurações de tamanho
  const getThumbnailSize = () => {
    switch (thumbnailSize) {
      case 'sm': return 'h-12 w-12';
      case 'md': return 'h-16 w-16';
      case 'lg': return 'h-20 w-20';
      default: return 'h-16 w-16';
    }
  };

  const getMainImageClasses = () => {
    const baseClasses = 'w-full object-cover transition-transform duration-200';
    const aspectClasses = aspectRatio === 'square' ? 'aspect-square' : 'h-auto';
    const zoomClasses = isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in';
    return `${baseClasses} ${aspectClasses} ${enableZoom ? zoomClasses : ''}`;
  };

  return (
    <>
      <div className={`space-y-4 ${className}`}>
        {/* Imagem Principal */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-0">
            <div className="relative">
              <img
                src={currentImage}
                alt={`${productName} - Imagem ${currentIndex + 1}`}
                className={getMainImageClasses()}
                onClick={() => enableZoom && setIsZoomed(!isZoomed)}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/api/placeholder/400/400';
                }}
              />

              {/* Badges de informação */}
              <div className="absolute top-2 left-2">
                <Badge variant="secondary" className="text-xs">
                  {currentIndex + 1} de {images.length}
                </Badge>
              </div>

              {/* Controles de navegação */}
              {images.length > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                    onClick={goToPrevious}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                    onClick={goToNext}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}

              {/* Botão de fullscreen */}
              {enableFullscreen && (
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                  onClick={() => setIsFullscreen(true)}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              )}

              {/* Indicador de zoom */}
              {enableZoom && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute bottom-2 right-2 bg-white/80 hover:bg-white"
                  onClick={() => setIsZoomed(!isZoomed)}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Miniaturas */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => goToImage(index)}
                className={`
                  flex-shrink-0 ${getThumbnailSize()} rounded-lg overflow-hidden border-2 transition-all
                  ${index === currentIndex
                    ? 'border-blue-500 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <img
                  src={image}
                  alt={`${productName} - Miniatura ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/api/placeholder/100/100';
                  }}
                />
              </button>
            ))}
          </div>
        )}

        {/* Indicadores de pontos (alternativa às miniaturas para mobile) */}
        {images.length > 1 && images.length <= 5 && (
          <div className="flex justify-center gap-2 md:hidden">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => goToImage(index)}
                className={`
                  w-2 h-2 rounded-full transition-all
                  ${index === currentIndex
                    ? 'bg-blue-500'
                    : 'bg-gray-300 hover:bg-gray-400'
                  }
                `}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal Fullscreen */}
      {enableFullscreen && (
        <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
          <DialogContent className="max-w-4xl w-full max-h-[90vh] p-0">
            <DialogHeader className="p-4 pb-0">
              <DialogTitle className="flex items-center justify-between">
                <span>{productName} - Galeria de Imagens</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsFullscreen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>

            <div className="relative">
              <img
                src={currentImage}
                alt={`${productName} - Fullscreen`}
                className="w-full h-auto max-h-[70vh] object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/api/placeholder/800/600';
                }}
              />

              {/* Controles fullscreen */}
              {images.length > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute left-4 top-1/2 transform -translate-y-1/2"
                    onClick={goToPrevious}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-4 top-1/2 transform -translate-y-1/2"
                    onClick={goToNext}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}

              {/* Contador fullscreen */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                <Badge variant="secondary">
                  {currentIndex + 1} de {images.length}
                </Badge>
              </div>
            </div>

            {/* Miniaturas no modal */}
            {images.length > 1 && (
              <div className="p-4 pt-0">
                <div className="flex gap-2 justify-center overflow-x-auto">
                  {images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => goToImage(index)}
                      className={`
                        flex-shrink-0 h-12 w-12 rounded-lg overflow-hidden border-2 transition-all
                        ${index === currentIndex
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                    >
                      <img
                        src={image}
                        alt={`Miniatura ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/api/placeholder/60/60';
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}