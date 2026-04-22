/**
 * ImageUploader - Upload e gerenciamento de imagens (versão simplificada)
 * Adaptado do Ferraco para Moria
 */

import { useState, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Upload, X, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { ImageConfig } from '@/types/landingPage';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ImageUploaderProps {
  label: string;
  value: ImageConfig;
  onChange: (image: ImageConfig) => void;
  description?: string;
  acceptedFormats?: string[];
}

export const ImageUploader = ({
  label,
  value,
  onChange,
  description,
  acceptedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
}: ImageUploaderProps) => {
  const [preview, setPreview] = useState(value.url);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  /**
   * Upload de imagem via API
   */
  const uploadImage = async (file: File): Promise<string> => {
    try {
      setUploadProgress(10);

      const formData = new FormData();
      formData.append('image', file);

      setUploadProgress(30);

      const response = await fetch('/api/landing-page/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setUploadProgress(100);

      const imageUrl = data.data?.url || data.url;

      return imageUrl;
    } catch (error: any) {
      console.error(`[ImageUploader] ❌ Erro no upload:`, error);
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

    // Validar tamanho do arquivo (máx 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB em bytes
    if (file.size > maxSize) {
      setUploadError(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Máximo: 5MB.`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Criar preview local imediatamente
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    try {
      const imageUrl = await uploadImage(file);

      // Atualizar com URL real do servidor
      setPreview(imageUrl);
      onChange({
        ...value,
        url: imageUrl,
      });

      setUploadError(null);
    } catch (error: any) {
      console.error('[ImageUploader] ❌ Upload falhou:', error);

      const errorMsg = error.message || 'Erro ao fazer upload da imagem.';
      setUploadError(errorMsg);

      // Restaurar preview anterior
      setPreview(value.url);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
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
    setPreview(url);
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

  return (
    <>
      <div className="space-y-2">
        <Label>{label}</Label>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}

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
              className="w-full h-48 object-cover"
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
            JPG, PNG, WebP ou SVG (máx. 5MB)
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
          <Label>URL da Imagem</Label>
          <Input
            type="url"
            value={value.url}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="https://exemplo.com/imagem.jpg"
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
            placeholder="Descrição da imagem"
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
            <option value="cover">Cobrir (Cover)</option>
            <option value="contain">Conter (Contain)</option>
            <option value="fill">Preencher (Fill)</option>
            <option value="none">Original (None)</option>
            <option value="scale-down">Reduzir (Scale Down)</option>
          </select>
        </div>
      </div>
    </>
  );
};
