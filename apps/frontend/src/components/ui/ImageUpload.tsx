import React, { useState, useRef, useCallback } from 'react';
import imageCompression from 'browser-image-compression';
import { Button } from './button';
import { Card, CardContent } from './card';
import { Badge } from './badge';
import { Progress } from './progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './dialog';
import { ImageCropper } from './ImageCropper';
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  Edit3,
  Plus,
  FileImage,
  AlertCircle,
  Check
} from 'lucide-react';

interface UploadedImage {
  id: string;
  file?: File;
  tempUrl?: string;
  processedUrls?: {
    thumbnail: string;
    medium: string;
    full: string;
  };
  status: 'uploading' | 'uploaded' | 'processing' | 'ready' | 'error';
  progress: number;
  error?: string;
}

interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageUploadProps {
  onImagesChange: (images: UploadedImage[]) => void;
  maxImages?: number;
  aspectRatio?: number | null;
  className?: string;
  disabled?: boolean;
}

export function ImageUpload({
  onImagesChange,
  maxImages = 10,
  aspectRatio = null,
  className = '',
  disabled = false
}: ImageUploadProps) {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [cropImage, setCropImage] = useState<UploadedImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload para API
  const uploadToAPI = async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch('/api/images/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error('Erro no upload');
    }

    return response.json();
  };

  // Processar imagem na API
  const processImageAPI = async (tempPath: string, cropData?: CropData): Promise<any> => {
    const response = await fetch('/api/images/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ tempPath, cropData })
    });

    if (!response.ok) {
      throw new Error('Erro no processamento');
    }

    return response.json();
  };

  // Adicionar imagens
  const handleFiles = useCallback(async (fileList: FileList) => {
    if (disabled) return;

    const files = Array.from(fileList);
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      return isValidType && isValidSize;
    });

    if (validFiles.length === 0) return;

    // Limitar quantidade
    const availableSlots = maxImages - images.length;
    const filesToProcess = validFiles.slice(0, availableSlots);

    // Processar primeira imagem com crop se necessário
    if (filesToProcess.length > 0 && aspectRatio !== null) {
      const file = filesToProcess[0];
      const newImage: UploadedImage = {
        id: `temp-${Date.now()}-${Math.random()}`,
        file,
        tempUrl: URL.createObjectURL(file),
        status: 'uploading',
        progress: 0
      };

      setImages(prev => [...prev, newImage]);
      setCropImage(newImage);
      return;
    }

    // Se não precisa crop, processar diretamente
    const newImages: UploadedImage[] = filesToProcess.map(file => ({
      id: `temp-${Date.now()}-${Math.random()}`,
      file,
      tempUrl: URL.createObjectURL(file),
      status: 'ready',
      progress: 100
    }));

    setImages(prev => [...prev, ...newImages]);
    onImagesChange([...images, ...newImages]);
  }, [images, maxImages, aspectRatio, disabled, onImagesChange]);

  // Processar imagem
  const processImage = async (imageId: string, tempPath: string, cropData?: CropData) => {
    try {
      setImages(prev => prev.map(img =>
        img.id === imageId
          ? { ...img, status: 'processing', progress: 75 }
          : img
      ));

      const processResult = await processImageAPI(tempPath, cropData);

      setImages(prev => prev.map(img =>
        img.id === imageId
          ? {
              ...img,
              status: 'ready',
              progress: 100,
              processedUrls: processResult.data.urls
            }
          : img
      ));

    } catch (error) {
      console.error('Erro no processamento:', error);
      setImages(prev => prev.map(img =>
        img.id === imageId
          ? {
              ...img,
              status: 'error',
              error: 'Erro no processamento'
            }
          : img
      ));
    }
  };

  // Finalizar crop
  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!cropImage) return;

    try {
      // Detectar tipo do blob e comprimir com WebP
      const isWebP = croppedBlob.type === 'image/webp';
      const mimeType = isWebP ? 'image/webp' : 'image/jpeg';

      // Comprimir imagem
      const compressedFile = await imageCompression(croppedBlob as File, {
        maxSizeMB: 1,
        maxWidthOrHeight: 800,
        useWebWorker: true,
        fileType: mimeType,
        initialQuality: isWebP ? 0.90 : 0.80
      });

      // Criar URL da imagem comprimida
      const compressedUrl = URL.createObjectURL(compressedFile);

      // Atualizar imagem no estado
      setImages(prev => prev.map(img =>
        img.id === cropImage.id
          ? {
              ...img,
              file: compressedFile,
              tempUrl: compressedUrl,
              status: 'ready',
              progress: 100
            }
          : img
      ));

      const updatedImages = images.map(img =>
        img.id === cropImage.id
          ? {
              ...img,
              file: compressedFile,
              tempUrl: compressedUrl,
              status: 'ready' as const,
              progress: 100
            }
          : img
      );

      onImagesChange(updatedImages);
      setCropImage(null);
    } catch (error) {
      console.error('Erro ao processar imagem:', error);
      setImages(prev => prev.map(img =>
        img.id === cropImage.id
          ? {
              ...img,
              status: 'error',
              error: 'Erro ao processar imagem'
            }
          : img
      ));
      setCropImage(null);
    }
  };

  // Cancelar crop
  const handleCropCancel = () => {
    if (cropImage) {
      setImages(prev => prev.filter(img => img.id !== cropImage.id));
    }
    setCropImage(null);
  };

  // Remover imagem
  const removeImage = (imageId: string) => {
    setImages(prev => {
      const updated = prev.filter(img => img.id !== imageId);
      onImagesChange(updated);
      return updated;
    });
  };

  // Abrir cropper para edição
  const editImage = (image: UploadedImage) => {
    setCropImage(image);
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!disabled && e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Click handler
  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  // Renderizar status da imagem
  const renderImageStatus = (image: UploadedImage) => {
    switch (image.status) {
      case 'uploading':
      case 'processing':
        return (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center">
            <Progress value={image.progress} className="w-16 mb-2" />
            <Badge variant="secondary" className="text-xs">
              {image.status === 'uploading' ? 'Enviando...' : 'Processando...'}
            </Badge>
          </div>
        );
      case 'error':
        return (
          <div className="absolute inset-0 bg-red-500 bg-opacity-50 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-white" />
          </div>
        );
      case 'ready':
        return (
          <div className="absolute top-1 right-1">
            <Badge variant="default" className="text-xs">
              <Check className="h-3 w-3 mr-1" />
              Pronto
            </Badge>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className={`space-y-4 ${className}`}>
      {/* Área de upload */}
      <Card
        className={`border-2 border-dashed transition-colors cursor-pointer ${
          dragOver
            ? 'border-blue-500 bg-blue-50'
            : disabled
              ? 'border-gray-200 bg-gray-50'
              : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <CardContent
          className="p-6 text-center"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
            onChange={handleFileChange}
            className="hidden"
            disabled={disabled}
          />

          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-gray-100 rounded-full">
              <Upload className="h-8 w-8 text-gray-400" />
            </div>

            <div>
              <p className="text-lg font-medium">
                {disabled ? 'Upload desabilitado' : 'Envie suas imagens'}
              </p>
              <p className="text-sm text-gray-500">
                Arraste e solte ou clique para selecionar
              </p>
              <p className="text-xs text-gray-400 mt-1">
                JPEG, PNG, WebP, GIF até 10MB • Máx. {maxImages} imagens
              </p>
            </div>

            {images.length < maxImages && !disabled && (
              <Button variant="outline" size="sm" className="mt-2">
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Imagens
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Grid de imagens */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image) => (
            <Card key={image.id} className="relative group">
              <CardContent className="p-2">
                <div className="relative aspect-square">
                  {/* Thumbnail */}
                  <div className="w-full h-full bg-gray-100 rounded-lg overflow-hidden">
                    {image.processedUrls?.thumbnail ? (
                      <img
                        src={image.processedUrls.thumbnail}
                        alt="Produto"
                        className="w-full h-full object-cover"
                      />
                    ) : image.tempUrl ? (
                      <img
                        src={image.tempUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileImage className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Status overlay */}
                  {renderImageStatus(image)}

                  {/* Controles */}
                  {image.status === 'ready' && (
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex gap-1">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => editImage(image)}
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeImage(image.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

        {/* Info */}
        {images.length > 0 && (
          <div className="text-sm text-gray-500 text-center">
            {images.length} de {maxImages} imagens
            {aspectRatio && ` • Proporção ${aspectRatio === 1 ? '1:1' : `${aspectRatio}:1`}`}
          </div>
        )}
      </div>

      {/* Dialog de Crop */}
      <Dialog open={!!cropImage} onOpenChange={(open) => !open && handleCropCancel()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Ajustar Imagem</DialogTitle>
            <DialogDescription>
              Recorte e ajuste a imagem antes de fazer upload
            </DialogDescription>
          </DialogHeader>
          {cropImage && (
            <ImageCropper
              imageUrl={cropImage.tempUrl!}
              onCropComplete={handleCropComplete}
              onCancel={handleCropCancel}
              aspectRatio={aspectRatio}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}