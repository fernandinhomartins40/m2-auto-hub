import React, { useRef, useState } from 'react';
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
  outputMimeType?: string;
  outputQuality?: number;
  qualityLabel?: string;
}

export function ProductImageCropper({
  imageUrl,
  onComplete,
  onCancel,
  aspectRatio = 1,
  outputMimeType = 'image/webp',
  outputQuality = 0.96,
  qualityLabel = 'Alta qualidade',
}: ProductImageCropperProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 80,
    height: 80,
    x: 10,
    y: 10,
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
      y: (100 - cropPercent) / 2,
    });
  };

  const getCroppedImg = async () => {
    if (!completedCrop || !imgRef.current) {
      console.error('Nenhuma area de crop selecionada');
      return;
    }

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.error('Nao foi possivel obter contexto do canvas');
      return;
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const outputWidth = Math.max(1, Math.round(completedCrop.width * scaleX));
    const outputHeight = Math.max(1, Math.round(completedCrop.height * scaleY));

    canvas.width = outputWidth;
    canvas.height = outputHeight;

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      outputWidth,
      outputHeight
    );

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
            return;
          }

          canvas.toBlob((fallbackBlob) => {
            if (fallbackBlob) {
              resolve(fallbackBlob);
              return;
            }

            reject(new Error('Falha ao criar blob da imagem'));
          }, 'image/png');
        },
        outputMimeType,
        outputQuality
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
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <CropIcon className="h-4 w-4 text-gray-600 sm:h-5 sm:w-5" />
              <span className="text-sm font-medium sm:text-base">Editor de Imagem</span>
              <Badge variant="outline" className="text-xs">
                Quadrado 1:1
              </Badge>
              <Badge className="bg-green-600 text-xs text-white">{qualityLabel}</Badge>
            </div>
            <p className="text-xs text-gray-500 sm:text-sm">Arraste os cantos para ajustar</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-center rounded-lg border-2 border-gray-200 bg-gray-50 p-2 sm:p-4">
        <ReactCrop
          crop={crop}
          onChange={(nextCrop) => setCrop(nextCrop)}
          onComplete={(nextCrop) => setCompletedCrop(nextCrop)}
          aspect={aspectRatio}
          className="max-w-full"
        >
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Crop"
            onLoad={onImageLoad}
            className="h-auto max-w-full"
            style={{ maxHeight: 'min(500px, 60vh)' }}
          />
        </ReactCrop>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-2 text-sm text-gray-600 sm:p-3">
        <p className="text-xs">
          ðŸ’¡ <strong>Dica:</strong> Arraste os cantos da area destacada para ajustar o tamanho e posicao do corte.
          O recorte e exportado na resolucao real da imagem para preservar o maximo de qualidade.
        </p>
      </div>

      <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
        <Button variant="outline" onClick={onCancel} type="button" className="w-full sm:w-auto">
          <X className="h-4 w-4 shrink-0" />
          Cancelar
        </Button>
        <Button
          onClick={handleApplyCrop}
          className="w-full bg-blue-600 hover:bg-blue-700 sm:w-auto"
          type="button"
          disabled={!completedCrop}
        >
          <Check className="h-4 w-4 shrink-0" />
          Aplicar Corte
        </Button>
      </div>
    </div>
  );
}
