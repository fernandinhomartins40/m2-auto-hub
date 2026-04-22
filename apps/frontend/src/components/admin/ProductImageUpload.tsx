import React, { useState, useRef, useCallback } from 'react';
import imageCompression from 'browser-image-compression';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { ProductImageCropper } from './ProductImageCropper';
import {
  Upload,
  Trash2,
  Edit3,
  Plus,
  AlertCircle,
  Check,
  FileImage,
  GripVertical,
  Star
} from 'lucide-react';

export interface ProductImage {
  id: string;
  file: File | null; // null para imagens já existentes (apenas URL)
  url: string;
  status: 'pending' | 'cropping' | 'compressing' | 'ready' | 'error';
  progress: number;
  error?: string;
  compressedSize?: number;
  originalSize?: number;
  isExisting?: boolean; // Flag para indicar imagens já salvas
}

interface ProductImageUploadProps {
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  maxImages?: number;
  aspectRatio?: number;
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  disabled?: boolean;
}

export function ProductImageUpload({
  images,
  onChange,
  maxImages = 10,
  aspectRatio = 1,
  maxSizeMB = 1,
  maxWidthOrHeight = 1200,
  disabled = false
}: ProductImageUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [cropImageId, setCropImageId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Adicionar arquivos
  const handleFiles = useCallback(async (fileList: FileList) => {
    if (disabled) return;

    const files = Array.from(fileList);

    // Validar e filtrar arquivos
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isValidSize = file.size <= 50 * 1024 * 1024; // 50MB max antes da compressão

      if (!isImage) {
        alert(`${file.name} não é uma imagem válida`);
        return false;
      }

      if (!isValidSize) {
        alert(`${file.name} é muito grande (máx 50MB)`);
        return false;
      }

      return true;
    });

    if (validFiles.length === 0) return;

    // Limitar quantidade
    const availableSlots = maxImages - images.length;
    const filesToAdd = validFiles.slice(0, availableSlots);

    if (filesToAdd.length < validFiles.length) {
      alert(`Apenas ${filesToAdd.length} imagens foram adicionadas (limite: ${maxImages})`);
    }

    // Criar objetos de imagem para cada arquivo
    const newImages: ProductImage[] = filesToAdd.map(file => ({
      id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      url: URL.createObjectURL(file),
      status: 'cropping',
      progress: 0,
      originalSize: file.size
    }));

    const updatedImages = [...images, ...newImages];
    onChange(updatedImages);

    // Iniciar crop da primeira imagem
    if (newImages.length > 0) {
      setCropImageId(newImages[0].id);
    }
  }, [images, maxImages, disabled, onChange]);

  // Atualizar status da imagem
  const updateImageStatus = (
    imageId: string,
    status: ProductImage['status'],
    updates?: Partial<ProductImage>
  ) => {
    onChange(
      images.map(img =>
        img.id === imageId ? { ...img, status, ...updates } : img
      )
    );
  };

  // Finalizar crop
  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!cropImageId) return;

    const imageIndex = images.findIndex(img => img.id === cropImageId);
    if (imageIndex === -1) return;

    try {
      // Atualizar status para comprimindo
      updateImageStatus(cropImageId, 'compressing', { progress: 25 });

      // Detectar tipo do blob (WebP ou JPEG)
      const isWebP = croppedBlob.type === 'image/webp';
      const fileExtension = isWebP ? 'webp' : 'jpg';
      const mimeType = isWebP ? 'image/webp' : 'image/jpeg';

      // Converter blob para arquivo
      const croppedFile = new File(
        [croppedBlob],
        `cropped-${Date.now()}.${fileExtension}`,
        { type: mimeType }
      );

      // Comprimir imagem
      const compressedFile = await imageCompression(croppedFile, {
        maxSizeMB,
        maxWidthOrHeight,
        useWebWorker: true,
        fileType: mimeType,
        initialQuality: isWebP ? 0.90 : 0.85,
        onProgress: (progress) => {
          updateImageStatus(cropImageId, 'compressing', {
            progress: 25 + (progress * 0.75)
          });
        }
      });

      // Criar URL da imagem comprimida
      const compressedUrl = URL.createObjectURL(compressedFile);

      // Atualizar imagem com arquivo comprimido
      const updatedImages = [...images];
      updatedImages[imageIndex] = {
        ...updatedImages[imageIndex],
        file: compressedFile,
        url: compressedUrl,
        status: 'ready',
        progress: 100,
        compressedSize: compressedFile.size
      };

      onChange(updatedImages);

      // Verificar se há próxima imagem pendente
      const nextPending = updatedImages.find(
        img => img.status === 'pending' && img.id !== cropImageId
      );

      if (nextPending) {
        setCropImageId(nextPending.id);
        updateImageStatus(nextPending.id, 'cropping');
      } else {
        setCropImageId(null);
      }
    } catch (error) {
      console.error('Erro ao processar imagem:', error);
      updateImageStatus(cropImageId, 'error', {
        error: 'Erro ao processar imagem'
      });
      setCropImageId(null);
    }
  };

  // Cancelar crop
  const handleCropCancel = () => {
    if (cropImageId) {
      // Remover imagem do array
      onChange(images.filter(img => img.id !== cropImageId));
    }
    setCropImageId(null);
  };

  // Remover imagem
  const removeImage = (imageId: string) => {
    const image = images.find(img => img.id === imageId);
    if (image?.url) {
      URL.revokeObjectURL(image.url);
    }
    onChange(images.filter(img => img.id !== imageId));
  };

  // Editar imagem (re-crop)
  const editImage = (imageId: string) => {
    setCropImageId(imageId);
    updateImageStatus(imageId, 'cropping');
  };

  // Reordenar imagens
  const moveImage = (fromIndex: number, toIndex: number) => {
    const newImages = [...images];
    const [movedImage] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, movedImage);
    onChange(newImages);
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setDragOver(true);
  };

  const handleDragLeave = () => {
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
    if (!disabled && images.length < maxImages) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
      e.target.value = ''; // Reset input
    }
  };

  // Formatar tamanho
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Renderizar status da imagem
  const renderImageStatus = (image: ProductImage) => {
    switch (image.status) {
      case 'cropping':
        return (
          <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center">
            <Badge variant="secondary">Aguardando corte...</Badge>
          </div>
        );

      case 'compressing':
        return (
          <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center p-2">
            <Progress value={image.progress} className="w-3/4 mb-2" />
            <Badge variant="secondary" className="text-xs">
              {Math.round(image.progress)}%
            </Badge>
          </div>
        );

      case 'error':
        return (
          <div className="absolute inset-0 bg-red-500 bg-opacity-60 flex flex-col items-center justify-center">
            <AlertCircle className="h-6 w-6 text-white mb-1" />
            <Badge variant="destructive" className="text-xs">
              {image.error || 'Erro'}
            </Badge>
          </div>
        );

      case 'ready':
        return (
          <div className="absolute top-2 right-2">
            <Badge className="bg-green-600 text-white text-xs">
              <Check className="h-3 w-3 mr-1" />
              Pronto
            </Badge>
          </div>
        );

      default:
        return null;
    }
  };

  const cropImage = images.find(img => img.id === cropImageId);
  const canAddMore = images.length < maxImages && !disabled;
  const readyCount = images.filter(img => img.status === 'ready').length;

  return (
    <>
      <div className="space-y-4">
        {/* Área de upload */}
        {canAddMore && (
          <Card
            className={`border-2 border-dashed transition-all cursor-pointer ${
              dragOver
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }`}
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <CardContent className="p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
                disabled={disabled}
              />

              <div className="flex flex-col items-center gap-3">
                <div className="p-4 bg-blue-50 rounded-full">
                  <Upload className="h-10 w-10 text-blue-500" />
                </div>

                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    Adicionar Imagens do Produto
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Arraste e solte ou clique para selecionar
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    JPG, PNG, WebP até 50MB • {images.length}/{maxImages} imagens
                  </p>
                </div>

                <Button variant="outline" size="sm" className="mt-2" type="button">
                  <Plus className="h-4 w-4 mr-2" />
                  Selecionar Imagens
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Grid de imagens */}
        {images.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-gray-900">Imagens do Produto</h4>
                <Badge variant="outline">
                  {readyCount}/{images.length} prontas
                </Badge>
              </div>
              {images.length > 0 && (
                <p className="text-xs text-gray-500">
                  A primeira imagem será a principal
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {images.map((image, index) => (
                <Card
                  key={image.id}
                  className={`relative group transition-all ${
                    index === 0 ? 'ring-2 ring-blue-500' : ''
                  } ${!image.isExisting && image.status === 'ready' ? 'ring-2 ring-green-400' : ''}`}
                >
                  <CardContent className="p-2">
                    {/* Badge de primeira imagem */}
                    {index === 0 && (
                      <div className="absolute -top-2 -left-2 z-10">
                        <Badge className="bg-blue-600 text-white">
                          <Star className="h-3 w-3 mr-1" />
                          Principal
                        </Badge>
                      </div>
                    )}

                    {/* Badge de nova imagem */}
                    {!image.isExisting && image.status === 'ready' && index !== 0 && (
                      <div className="absolute -top-2 -right-2 z-10">
                        <Badge className="bg-green-600 text-white text-xs">
                          Nova
                        </Badge>
                      </div>
                    )}

                    {/* Handle de arrastar */}
                    {image.status === 'ready' && images.length > 1 && (
                      <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-white rounded p-1 shadow-md cursor-move">
                          <GripVertical className="h-4 w-4 text-gray-600" />
                        </div>
                      </div>
                    )}

                    {/* Thumbnail */}
                    <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      {image.url ? (
                        <img
                          src={image.url}
                          alt={`Produto ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileImage className="h-10 w-10 text-gray-400" />
                        </div>
                      )}

                      {/* Status overlay */}
                      {renderImageStatus(image)}

                      {/* Controles */}
                      {image.status === 'ready' && (
                        <div className="absolute inset-0 bg-black bg-opacity-0 md:group-hover:bg-opacity-40 transition-all flex items-center justify-center md:opacity-0 md:group-hover:opacity-100">
                          <div className="flex gap-1">
                            {/* Botão de editar só aparece para imagens novas (com arquivo) */}
                            {!image.isExisting && image.file && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  editImage(image.id);
                                }}
                                type="button"
                                className="shadow-lg md:shadow-none"
                              >
                                <Edit3 className="h-3 w-3" />
                              </Button>
                            )}
                            {/* Botão de deletar aparece para todas as imagens */}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeImage(image.id);
                              }}
                              type="button"
                              className="shadow-lg md:shadow-none"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Info de compressão */}
                    {image.status === 'ready' && image.compressedSize && image.originalSize && (
                      <div className="mt-1 text-xs text-gray-500 text-center">
                        {formatSize(image.compressedSize)}
                        {image.originalSize > image.compressedSize && (
                          <span className="text-green-600 ml-1">
                            (-{Math.round((1 - image.compressedSize / image.originalSize) * 100)}%)
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Info geral */}
        {images.length > 0 && (
          <div className="space-y-2">
            {/* Estatísticas */}
            {(() => {
              const existingCount = images.filter(img => img.isExisting).length;
              const newCount = images.filter(img => !img.isExisting && img.status === 'ready').length;
              const processingCount = images.filter(img => img.status !== 'ready').length;

              return existingCount > 0 || newCount > 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-4 text-sm">
                    {existingCount > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                        <span className="text-gray-700">{existingCount} existente{existingCount !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                    {newCount > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-gray-700">{newCount} nova{newCount !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                    {processingCount > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse"></div>
                        <span className="text-gray-700">{processingCount} processando</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : null;
            })()}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2 text-sm text-blue-900">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Dicas:</p>
                  <ul className="mt-1 space-y-1 text-xs">
                    <li>• Use imagens de alta qualidade para melhor visualização</li>
                    <li>• A primeira imagem será exibida como principal</li>
                    <li>• Proporção {aspectRatio === 1 ? 'quadrada (1:1)' : `${aspectRatio}:1`} recomendada</li>
                    <li>• Imagens novas serão automaticamente otimizadas</li>
                    <li>• Passe o mouse sobre as imagens para editar ou remover</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dialog de Crop */}
      <Dialog open={!!cropImageId} onOpenChange={(open) => !open && handleCropCancel()}>
        <DialogContent className="max-w-5xl max-h-[calc(100vh-8rem)] sm:max-h-[calc(100vh-4rem)] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b bg-gray-50/50 shrink-0">
            <DialogTitle>Ajustar Imagem do Produto</DialogTitle>
            <DialogDescription>
              Recorte e ajuste a imagem antes de adicionar ao produto
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 min-h-0">
            <div className="py-4">
              {(() => {
                if (cropImage && cropImage.url) {
                  return (
                    <ProductImageCropper
                      imageUrl={cropImage.url}
                      onComplete={handleCropComplete}
                      onCancel={handleCropCancel}
                      aspectRatio={aspectRatio}
                    />
                  );
                } else {
                  return (
                    <div className="flex items-center justify-center h-96">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p className="text-gray-600">Carregando imagem...</p>
                      </div>
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
