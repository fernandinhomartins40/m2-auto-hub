/**
 * ImageUploaderWithCrop - Upload de imagens com crop integrado
 * Usa ProductImageCropper (react-image-crop) para interface consistente
 */

import { useEffect, useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, X, Loader2, AlertCircle, RefreshCw, Info } from 'lucide-react';
import { ImageConfig } from '@/types/landingPage';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProductImageCropper } from '@/components/admin/ProductImageCropper';
import { toAssetUrl } from '@/lib/storefront-helpers';

interface ImageUploaderWithCropProps {
  label: string;
  value: ImageConfig;
  onChange: (image: ImageConfig) => void;
  description?: string;
  acceptedFormats?: string[];
  // Especificações de dimensões
  recommendedWidth?: number;
  recommendedHeight?: number;
  aspectRatio?: number | null; // null para livre, número para fixo (ex: 16/9, 1)
  maxFileSizeMB?: number;
  // Categoria para organização no servidor (hero, header, footer, logo)
  category?: string;
}

export const ImageUploaderWithCrop = ({
  label,
  value,
  onChange,
  description,
  acceptedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
  recommendedWidth = 1920,
  recommendedHeight = 1080,
  aspectRatio = null,
  maxFileSizeMB = 5,
  category = 'general',
}: ImageUploaderWithCropProps) => {
  const [preview, setPreview] = useState(() => toAssetUrl(value.url) || '');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const localPreviewUrlRef = useRef<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Estado do crop
  const [showCropper, setShowCropper] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
  const [tempImageMimeType, setTempImageMimeType] = useState<string>('image/jpeg');

  useEffect(() => {
    if (localPreviewUrlRef.current && preview === localPreviewUrlRef.current) {
      return;
    }

    setPreview(toAssetUrl(value.url) || '');
  }, [preview, value.url]);

  useEffect(() => {
    return () => {
      if (tempImageUrl) {
        URL.revokeObjectURL(tempImageUrl);
      }

      if (localPreviewUrlRef.current) {
        URL.revokeObjectURL(localPreviewUrlRef.current);
      }
    };
  }, [tempImageUrl]);

  /**
   * Upload de imagem via API
   */
  const uploadImage = async (file: File, category: string = 'general'): Promise<string> => {
    try {
      setUploadProgress(10);

      const formData = new FormData();
      formData.append('image', file);
      formData.append('category', category);

      setUploadProgress(30);

      // Endpoint correto: /api/landing-page/upload
      // Autenticação via httpOnly cookie (credentials: 'include')
      const response = await fetch('/api/landing-page/upload', {
        method: 'POST',
        credentials: 'include', // Envia cookies httpOnly
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erro ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setUploadProgress(100);

      const imageUrl = data.data?.url || data.url;

      if (!imageUrl) {
        throw new Error('URL da imagem não retornada pelo servidor');
      }

      return imageUrl;
    } catch (error: any) {
      console.error(`[ImageUploaderWithCrop] ❌ Erro no upload:`, error);
      throw error;
    }
  };

  const handleFileSelect = async (file: File) => {
    // Reset error state
    setUploadError(null);

    if (!acceptedFormats.includes(file.type)) {
      setUploadError('Formato de arquivo não suportado. Use JPG, PNG, WebP ou SVG.');
      return;
    }

    // Validar tamanho do arquivo
    const maxSize = maxFileSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Máximo: ${maxFileSizeMB}MB.`);
      return;
    }

    // Criar URL temporária para o cropper
    const tempUrl = URL.createObjectURL(file);
    setTempImageUrl(tempUrl);
    setTempImageMimeType(file.type || 'image/jpeg');
    setShowCropper(true);
  };

  /**
   * Finalizar crop e fazer upload
   */
  const handleCropComplete = async (croppedBlob: Blob) => {
    setShowCropper(false);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const extensionMap: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
      };
      const outputMimeType =
        croppedBlob.type && croppedBlob.type.startsWith('image/')
          ? croppedBlob.type
          : tempImageMimeType || 'image/jpeg';
      const fileExtension = extensionMap[outputMimeType] || 'jpg';
      const uploadFile = new File([croppedBlob], `landing-crop-${Date.now()}.${fileExtension}`, {
        type: outputMimeType,
      });

      // Criar preview local imediatamente
      const localPreview = URL.createObjectURL(uploadFile);
      if (localPreviewUrlRef.current) {
        URL.revokeObjectURL(localPreviewUrlRef.current);
      }
      localPreviewUrlRef.current = localPreview;
      setPreview(localPreview);

      // Upload para servidor com categoria
      const imageUrl = await uploadImage(uploadFile, category);

      // Atualizar com URL real do servidor
      setPreview(toAssetUrl(imageUrl) || imageUrl);
      onChange({
        ...value,
        url: imageUrl,
      });

      setUploadError(null);

      // Limpar URL temporária
      if (tempImageUrl) {
        URL.revokeObjectURL(tempImageUrl);
        setTempImageUrl(null);
      }
      setTempImageMimeType('image/jpeg');
      if (localPreviewUrlRef.current) {
        URL.revokeObjectURL(localPreviewUrlRef.current);
        localPreviewUrlRef.current = null;
      }
    } catch (error: any) {
      console.error('[ImageUploaderWithCrop] ❌ Upload falhou:', error);

      const errorMsg = error.message || 'Erro ao fazer upload da imagem.';
      setUploadError(errorMsg);

      // Restaurar preview anterior
      if (localPreviewUrlRef.current) {
        URL.revokeObjectURL(localPreviewUrlRef.current);
        localPreviewUrlRef.current = null;
      }
      setPreview(toAssetUrl(value.url) || '');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  /**
   * Cancelar crop
   */
  const handleCropCancel = () => {
    setShowCropper(false);
    if (tempImageUrl) {
      URL.revokeObjectURL(tempImageUrl);
      setTempImageUrl(null);
    }
    setTempImageMimeType('image/jpeg');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleUrlChange = (url: string) => {
    if (localPreviewUrlRef.current) {
      URL.revokeObjectURL(localPreviewUrlRef.current);
      localPreviewUrlRef.current = null;
    }
    setPreview(toAssetUrl(url) || url);
    onChange({
      ...value,
      url,
    });
  };

  const handleClear = () => {
    if (!value.url) return;

    if (!confirm('Tem certeza que deseja remover esta imagem?')) {
      return;
    }

    setPreview('');
    onChange({
      ...value,
      url: '',
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setUploadError(null);
  };

  const handleRetryUpload = () => {
    if (fileInputRef.current?.files?.[0]) {
      handleFileSelect(fileInputRef.current.files[0]);
    } else {
      fileInputRef.current?.click();
    }
  };

  // Calcular aspect ratio display
  const getAspectRatioLabel = () => {
    if (aspectRatio === null) return 'Livre';
    if (aspectRatio === 1) return '1:1 (Quadrado)';
    if (aspectRatio === 16/9) return '16:9 (Widescreen)';
    if (aspectRatio === 4/3) return '4:3';
    return `${aspectRatio.toFixed(2)}:1`;
  };

  return (
    <>
      <div className="space-y-2">
        <Label>{label}</Label>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}

        {/* Especificações */}
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-900">
            <strong>Dimensões recomendadas:</strong> {recommendedWidth}x{recommendedHeight}px
            {aspectRatio !== null && ` • Proporção: ${getAspectRatioLabel()}`}
            {aspectRatio === null && ' • Proporção: Livre'}
          </AlertDescription>
        </Alert>

        {/* Erro de Upload */}
        {uploadError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{uploadError}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryUpload}
                className="ml-2"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Tentar Novamente
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Preview com Loading State */}
        {preview && (
          <div className="relative rounded-lg border overflow-hidden bg-muted">
            {isUploading && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-10">
                <Loader2 className="h-8 w-8 text-white animate-spin mb-2" />
                <p className="text-white text-sm font-medium">
                  Enviando imagem... {uploadProgress}%
                </p>
                <div className="w-3/4 h-2 bg-gray-300 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
            <img
              src={preview}
              alt={value.alt || 'Preview'}
              className="w-full h-64 object-cover"
            />
            <Button
              size="icon"
              variant="destructive"
              className="absolute top-2 right-2"
              onClick={handleClear}
              disabled={isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Upload Area */}
        <div
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
            transition-colors
            ${isDragging ? 'border-primary bg-primary/10' : 'border-muted-foreground/25'}
            ${!preview ? 'block' : 'hidden'}
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-1">
            Arraste uma imagem ou clique para selecionar
          </p>
          <p className="text-xs text-muted-foreground">
            JPG, PNG, WebP ou SVG (máx. {maxFileSizeMB}MB)
          </p>
          <p className="text-xs text-blue-600 font-medium mt-2">
            ✂️ Editor de corte será exibido após seleção
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats.join(',')}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
        />

        {/* URL Input */}
        <div className="space-y-2">
          <Label>URL ou Caminho da Imagem (ou use upload acima)</Label>
          <Input
            type="text"
            value={value.url}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="https://exemplo.com/imagem.jpg ou /uploads/landing-page/imagem.webp"
          />
        </div>

        {/* Alt Text */}
        <div className="space-y-2">
          <Label>Texto Alternativo (Alt)</Label>
          <Input
            type="text"
            value={value.alt}
            onChange={(e) =>
              onChange({
                ...value,
                alt: e.target.value,
              })
            }
            placeholder="Descrição da imagem para acessibilidade"
          />
        </div>

        {/* Object Fit */}
        <div className="space-y-2">
          <Label>Ajuste da Imagem</Label>
          <select
            value={value.objectFit || 'cover'}
            onChange={(e) =>
              onChange({
                ...value,
                objectFit: e.target.value as ImageConfig['objectFit'],
              })
            }
            className="w-full rounded-md border border-input bg-background px-3 py-2"
          >
            <option value="cover">Cobrir (Cover) - Preenche toda a área</option>
            <option value="contain">Conter (Contain) - Imagem inteira visível</option>
            <option value="fill">Preencher (Fill) - Estica para caber</option>
            <option value="none">Original (None) - Tamanho original</option>
            <option value="scale-down">Reduzir (Scale Down) - Menor entre none e contain</option>
          </select>
        </div>
      </div>

      {/* Dialog de Crop */}
      <Dialog open={showCropper} onOpenChange={(open) => !open && handleCropCancel()}>
        <DialogContent className="sm:max-w-4xl w-[calc(100vw-2rem)] sm:w-[calc(100%-4rem)] sm:max-h-[calc(100vh-4rem)] overflow-auto">
          <DialogHeader>
            <DialogTitle>Ajustar Imagem</DialogTitle>
            <DialogDescription>
              Recorte e ajuste a imagem antes de fazer upload
              {aspectRatio !== null && ` • Proporção: ${getAspectRatioLabel()}`}
            </DialogDescription>
          </DialogHeader>
          {tempImageUrl && (
            <ProductImageCropper
              imageUrl={tempImageUrl}
              onComplete={handleCropComplete}
              onCancel={handleCropCancel}
              aspectRatio={aspectRatio || 1}
              outputMimeType={
                tempImageMimeType === 'image/png' || tempImageMimeType === 'image/webp'
                  ? tempImageMimeType
                  : 'image/jpeg'
              }
              outputQuality={0.985}
              qualityLabel="Qualidade máxima"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
