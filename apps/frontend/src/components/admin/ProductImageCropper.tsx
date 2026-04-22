import React, { useState, useRef } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Check, X, Crop as CropIcon } from 'lucide-react';

interface ProductImageCropperProps {
  imageUrl: string;
  onComplete: (croppedBlob: Blob) => void;
  onCancel: () => void;
  aspectRatio?: number;
}

export function ProductImageCropper({
  imageUrl,
  onComplete,
  onCancel,
  aspectRatio = 1
}: ProductImageCropperProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 80,
    height: 80,
    x: 10,
    y: 10
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;

    const cropSize = Math.min(width, height) * 0.8;
    const cropPercent = (cropSize / Math.min(width, height)) * 100;

    setCrop({
      unit: '%',
      width: cropPercent,
      height: cropPercent,
      x: (100 - cropPercent) / 2,
      y: (100 - cropPercent) / 2
    });
  };

  const getCroppedImg = async () => {
    if (!completedCrop || !imgRef.current) {
      console.error('Nenhuma área de crop selecionada');
      return;
    }

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.error('Não foi possível obter contexto do canvas');
      return;
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height
    );

    return new Promise<Blob>((resolve, reject) => {
      // Tentar criar WebP primeiro, com fallback para JPEG
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            // Fallback para JPEG se WebP falhar
            canvas.toBlob(
              (jpegBlob) => {
                if (jpegBlob) {
                  resolve(jpegBlob);
                } else {
                  reject(new Error('Falha ao criar blob da imagem'));
                }
              },
              'image/jpeg',
              0.95
            );
          }
        },
        'image/webp',
        0.90
      );
    });
  };

  const handleApplyCrop = async () => {
    try {
      const croppedBlob = await getCroppedImg();
      if (croppedBlob) {
        onComplete(croppedBlob);
      }
    } catch (error) {
      console.error('Erro ao aplicar crop:', error);
      alert('Erro ao processar imagem. Tente novamente.');
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <CropIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
              <span className="font-medium text-sm sm:text-base">Editor de Imagem</span>
              <Badge variant="outline" className="text-xs">Quadrado 1:1</Badge>
              <Badge className="bg-green-600 text-white text-xs">WebP</Badge>
            </div>
            <p className="text-xs sm:text-sm text-gray-500">
              Arraste os cantos para ajustar
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Crop Area */}
      <div className="border-2 border-gray-200 rounded-lg bg-gray-50 p-2 sm:p-4 flex items-center justify-center">
        <ReactCrop
          crop={crop}
          onChange={(c) => setCrop(c)}
          onComplete={(c) => setCompletedCrop(c)}
          aspect={aspectRatio}
          className="max-w-full"
        >
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Crop"
            onLoad={onImageLoad}
            className="max-w-full h-auto"
            style={{ maxHeight: 'min(500px, 60vh)' }}
          />
        </ReactCrop>
      </div>

      {/* Info */}
      <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3">
        <p className="text-xs">
          💡 <strong>Dica:</strong> Arraste os cantos da área destacada para ajustar o tamanho e posição do corte.
          A imagem será cortada em formato quadrado (1:1) e convertida para WebP para melhor performance.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
        <Button variant="outline" onClick={onCancel} type="button" className="w-full sm:w-auto">
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
        <Button
          onClick={handleApplyCrop}
          className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
          type="button"
          disabled={!completedCrop}
        >
          <Check className="h-4 w-4 mr-2" />
          Aplicar Corte
        </Button>
      </div>
    </div>
  );
}
