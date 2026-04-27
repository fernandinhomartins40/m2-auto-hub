import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import {
  Check,
  CheckCircle2,
  Crop as CropIcon,
  Loader2,
  Smartphone,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import settingsService from '@/api/settingsService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ResponsiveDialogBody, ResponsiveDialogContent, ResponsiveDialogHeader } from '@/components/ui/responsive-dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

type PwaField =
  | 'pwaName'
  | 'pwaShortName'
  | 'pwaDescription'
  | 'pwaThemeColor'
  | 'pwaBackgroundColor'
  | 'pwaDisplay'
  | 'pwaIcon192Url'
  | 'pwaIcon512Url'
  | 'pwaDesktopIconUrl'
  | 'pwaAppleTouchIconUrl'
  | 'pwaMaskableIconUrl';

type PwaIconSlot = 'icon-192' | 'icon-512' | 'desktop-icon' | 'apple-touch-icon' | 'maskable-icon';
type PwaPreviewShape = 'auto' | 'square' | 'rounded' | 'circle';

interface PwaSettingsSectionProps {
  storeName: string;
  pwaName: string;
  pwaShortName: string;
  pwaDescription: string;
  pwaThemeColor: string;
  pwaBackgroundColor: string;
  pwaDisplay: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  pwaIcon192Url: string;
  pwaIcon512Url: string;
  pwaDesktopIconUrl: string;
  pwaAppleTouchIconUrl: string;
  pwaMaskableIconUrl: string;
  onChange: (field: PwaField, value: string) => void;
}

const ICON_SPECS: Array<{
  slot: PwaIconSlot;
  field: 'pwaIcon192Url' | 'pwaIcon512Url' | 'pwaDesktopIconUrl' | 'pwaAppleTouchIconUrl' | 'pwaMaskableIconUrl';
  title: string;
  description: string;
  size: string;
  notes: string;
  autoShape: Exclude<PwaPreviewShape, 'auto'>;
}> = [
  {
    slot: 'icon-192',
    field: 'pwaIcon192Url',
    title: 'Ícone 192x192',
    description: 'Usado na instalação Android e em atalhos compactos.',
    size: 'PNG 192x192',
    notes: 'Prefira imagem quadrada, com margem de segurança e logo centralizada.',
    autoShape: 'rounded',
  },
  {
    slot: 'icon-512',
    field: 'pwaIcon512Url',
    title: 'Ícone 512x512',
    description: 'Usado em splash screen, prompts de instalação e atalhos maiores.',
    size: 'PNG 512x512',
    notes: 'Envie em alta qualidade. O backend ajusta para o tamanho final sem recorte.',
    autoShape: 'rounded',
  },
  {
    slot: 'desktop-icon',
    field: 'pwaDesktopIconUrl',
    title: 'Icone Desktop',
    description: 'Usado como icone preferencial quando o PWA e instalado em PC ou notebook.',
    size: 'PNG 512x512',
    notes: 'Recomendado para Chrome, Edge e outros navegadores desktop que criam o app instalado.',
    autoShape: 'rounded',
  },
  {
    slot: 'apple-touch-icon',
    field: 'pwaAppleTouchIconUrl',
    title: 'Apple Touch Icon',
    description: 'Usado quando o app é salvo na tela inicial do iPhone e iPad.',
    size: 'PNG 180x180',
    notes: 'No iOS o ícone costuma aparecer com cantos arredondados. Use o preview para validar.',
    autoShape: 'rounded',
  },
  {
    slot: 'maskable-icon',
    field: 'pwaMaskableIconUrl',
    title: 'Ícone Maskable',
    description: 'Usado por launchers que aplicam máscara circular ou arredondada.',
    size: 'PNG 512x512',
    notes: 'Deixe área de respiro em volta da marca para não perder partes no recorte.',
    autoShape: 'circle',
  },
];

const getPreviewRadiusClass = (shape: PwaPreviewShape, autoShape: Exclude<PwaPreviewShape, 'auto'>) => {
  const resolved = shape === 'auto' ? autoShape : shape;

  if (resolved === 'circle') return 'rounded-full';
  if (resolved === 'rounded') return 'rounded-[24px]';
  return 'rounded-none';
};

function PwaIconCropper({
  imageUrl,
  slot,
  title,
  previewShape,
  autoShape,
  onPreviewShapeChange,
  onCancel,
  onComplete,
}: {
  imageUrl: string;
  slot: PwaIconSlot;
  title: string;
  previewShape: PwaPreviewShape;
  autoShape: Exclude<PwaPreviewShape, 'auto'>;
  onPreviewShapeChange: (shape: PwaPreviewShape) => void;
  onCancel: () => void;
  onComplete: (blob: Blob) => void;
}) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 84,
    height: 84,
    x: 8,
    y: 8,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const outputSize = slot === 'apple-touch-icon' ? 180 : slot === 'icon-192' ? 192 : 512;

  const onImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = event.currentTarget;
    const cropSize = Math.min(width, height) * 0.84;
    const cropPercent = (cropSize / Math.min(width, height)) * 100;

    setCrop({
      unit: '%',
      width: cropPercent,
      height: cropPercent,
      x: (100 - cropPercent) / 2,
      y: (100 - cropPercent) / 2,
    });
  };

  const handleApply = async () => {
    if (!completedCrop || !imageRef.current) return;

    setIsSubmitting(true);
    try {
      const image = imageRef.current;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Não foi possível preparar o canvas do recorte.');
      }

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      canvas.width = outputSize;
      canvas.height = outputSize;

      ctx.clearRect(0, 0, outputSize, outputSize);
      ctx.drawImage(
        image,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        outputSize,
        outputSize
      );

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) {
            resolve(result);
            return;
          }

          reject(new Error('Falha ao gerar o PNG do ícone.'));
        }, 'image/png');
      });

      onComplete(blob);
    } catch (error: any) {
      toast.error('Erro ao aplicar recorte', {
        description: error?.message || 'Tente novamente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <CropIcon className="h-5 w-5 text-gray-600" />
              <span className="font-medium">{title}</span>
              <Badge variant="outline">1:1</Badge>
              <Badge className="bg-emerald-600 text-white">PNG sem perda</Badge>
            </div>
            <p className="text-sm text-gray-500">
              Recorte quadrado com preview de máscara para Android/iOS.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 rounded-lg border-2 border-gray-200 bg-gray-50 p-2 sm:p-3">
          <ReactCrop crop={crop} onChange={(next) => setCrop(next)} onComplete={(next) => setCompletedCrop(next)} aspect={1}>
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Crop do ícone"
              onLoad={onImageLoad}
              className="max-w-full"
              style={{ maxHeight: 'min(480px, 52vh)' }}
            />
          </ReactCrop>
        </div>

        <Card className="min-w-0 border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Preview do Ícone</CardTitle>
            <CardDescription>Escolha como deseja validar visualmente os cantos do app.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'auto', label: 'Auto' },
                { value: 'square', label: 'Quadrado' },
                { value: 'rounded', label: 'Arred.' },
                { value: 'circle', label: 'Círculo' },
              ].map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={previewShape === option.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onPreviewShapeChange(option.value as PwaPreviewShape)}
                >
                  {option.label}
                </Button>
              ))}
            </div>

            <div className="rounded-2xl border bg-slate-950 p-5 text-white">
              <div className="mb-3 text-xs uppercase tracking-wide text-white/60">
                {previewShape === 'auto'
                  ? `Auto (${autoShape === 'circle' ? 'Maskable/launcher' : 'Android/iOS'})`
                  : 'Prévia manual'}
              </div>
              <div className="flex justify-center">
                <div className={`flex h-28 w-28 items-center justify-center overflow-hidden bg-white/10 ${getPreviewRadiusClass(previewShape, autoShape)}`}>
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className={`h-full w-full object-cover ${getPreviewRadiusClass(previewShape, autoShape)}`}
                  />
                </div>
              </div>
              <p className="mt-4 text-xs text-white/70">
                O arquivo salvo continua sendo PNG quadrado. Essa seleção serve para validar como ele se comporta nas exigências visuais da plataforma.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          <X className="mr-2 h-4 w-4" />
          Cancelar
        </Button>
        <Button onClick={handleApply} disabled={!completedCrop || isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
          Aplicar corte
        </Button>
      </div>
    </div>
  );
}

function PwaIconUploadCard({
  slot,
  field,
  title,
  description,
  size,
  notes,
  autoShape,
  value,
  onChange,
}: {
  slot: PwaIconSlot;
  field: 'pwaIcon192Url' | 'pwaIcon512Url' | 'pwaDesktopIconUrl' | 'pwaAppleTouchIconUrl' | 'pwaMaskableIconUrl';
  title: string;
  description: string;
  size: string;
  notes: string;
  autoShape: Exclude<PwaPreviewShape, 'auto'>;
  value: string;
  onChange: (field: PwaField, value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const localUrlRef = useRef<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
  const [previewShape, setPreviewShape] = useState<PwaPreviewShape>('auto');

  useEffect(() => {
    return () => {
      if (localUrlRef.current) URL.revokeObjectURL(localUrlRef.current);
      if (tempImageUrl) URL.revokeObjectURL(tempImageUrl);
    };
  }, [tempImageUrl]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    if (tempImageUrl) URL.revokeObjectURL(tempImageUrl);
    setTempImageUrl(localUrl);
    setShowCropper(true);
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    if (tempImageUrl) {
      URL.revokeObjectURL(tempImageUrl);
      setTempImageUrl(null);
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleCropComplete = async (blob: Blob) => {
    setShowCropper(false);
    setIsUploading(true);

    try {
      const file = new File([blob], `${slot}.png`, { type: 'image/png' });
      const result = await settingsService.uploadPwaAsset(file, slot);
      onChange(field, result.url);
      toast.success(`${title} atualizado`);
    } catch (error: any) {
      toast.error('Erro ao enviar ícone do PWA', {
        description: error?.message || 'Tente novamente.',
      });
    } finally {
      setIsUploading(false);
      if (tempImageUrl) {
        URL.revokeObjectURL(tempImageUrl);
        setTempImageUrl(null);
      }
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-xl border bg-slate-50 p-3">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">{size}</div>
            <div className="mb-3 text-sm text-slate-600">{notes}</div>
            <div className="flex min-h-[120px] items-center justify-center rounded-lg border bg-white p-4">
              {value ? (
                <img
                  src={value}
                  alt={title}
                  className={`h-20 w-20 object-contain ${getPreviewRadiusClass('auto', autoShape)}`}
                />
              ) : (
                <div className="text-center text-sm text-muted-foreground">Ícone ainda não configurado</div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
            O upload abre um cropper quadrado e exporta em PNG sem compressão destrutiva.
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={isUploading}>
              {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {value ? 'Trocar arquivo' : 'Enviar arquivo'}
            </Button>
            {value ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700"
                onClick={() => onChange(field, '')}
                disabled={isUploading}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remover
              </Button>
            ) : null}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/webp,image/jpeg"
            className="hidden"
            onChange={handleFileChange}
          />
        </CardContent>
      </Card>

      <Dialog open={showCropper} onOpenChange={(open) => !open && handleCropCancel()}>
        <ResponsiveDialogContent size="xl" className="flex flex-col gap-0 p-0">
          <ResponsiveDialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              Recorte o ícone em proporção 1:1 e valide visualmente os cantos para Android, iOS ou formato livre.
            </DialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogBody className="overflow-x-hidden">
            {tempImageUrl ? (
              <PwaIconCropper
                imageUrl={tempImageUrl}
                slot={slot}
                title={title}
                previewShape={previewShape}
                autoShape={autoShape}
                onPreviewShapeChange={setPreviewShape}
                onCancel={handleCropCancel}
                onComplete={handleCropComplete}
              />
            ) : null}
          </ResponsiveDialogBody>
        </ResponsiveDialogContent>
      </Dialog>
    </>
  );
}

export function PwaSettingsSection({
  storeName,
  pwaName,
  pwaShortName,
  pwaDescription,
  pwaThemeColor,
  pwaBackgroundColor,
  pwaDisplay,
  pwaIcon192Url,
  pwaIcon512Url,
  pwaDesktopIconUrl,
  pwaAppleTouchIconUrl,
  pwaMaskableIconUrl,
  onChange,
}: PwaSettingsSectionProps) {
  const previewIcon = pwaDesktopIconUrl || pwaIcon512Url || pwaIcon192Url || pwaAppleTouchIconUrl || pwaMaskableIconUrl;
  const previewName = pwaName.trim() || storeName || 'Nome do app';
  const previewShortName = pwaShortName.trim() || previewName.slice(0, 12);

  const iconValues = useMemo(
    () => ({
      'icon-192': pwaIcon192Url,
      'icon-512': pwaIcon512Url,
      'desktop-icon': pwaDesktopIconUrl,
      'apple-touch-icon': pwaAppleTouchIconUrl,
      'maskable-icon': pwaMaskableIconUrl,
    }),
    [pwaAppleTouchIconUrl, pwaDesktopIconUrl, pwaIcon192Url, pwaIcon512Url, pwaMaskableIconUrl]
  );

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="border-b pb-2 text-lg font-medium">PWA e Instalação do App</h3>
        <p className="text-sm text-muted-foreground">
          Configure os textos do app instalado e os ícones usados em Android, iPhone e atalhos do PWA.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pwaName">Nome completo do app</Label>
              <Input id="pwaName" value={pwaName} onChange={(e) => onChange('pwaName', e.target.value)} placeholder="M2 Center Auto" maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pwaShortName">Nome curto</Label>
              <Input
                id="pwaShortName"
                value={pwaShortName}
                onChange={(e) => onChange('pwaShortName', e.target.value)}
                placeholder="M2 Auto"
                maxLength={40}
              />
              <p className="text-xs text-muted-foreground">Aparece abaixo do ícone quando o espaço é menor.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pwaDescription">Descrição do PWA</Label>
            <Textarea
              id="pwaDescription"
              value={pwaDescription}
              onChange={(e) => onChange('pwaDescription', e.target.value)}
              placeholder="Aplicativo da loja para pedidos, atendimento e acompanhamento."
              rows={4}
              maxLength={240}
            />
            <p className="text-xs text-muted-foreground">Pode ser exibida em fluxos de instalação e gerenciamento do app.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="pwaThemeColor">Cor do tema</Label>
              <div className="flex gap-2">
                <Input id="pwaThemeColor" type="color" value={pwaThemeColor} onChange={(e) => onChange('pwaThemeColor', e.target.value)} className="h-11 w-16 p-1" />
                <Input value={pwaThemeColor} onChange={(e) => onChange('pwaThemeColor', e.target.value)} placeholder="#0f172a" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pwaBackgroundColor">Cor de fundo</Label>
              <div className="flex gap-2">
                <Input id="pwaBackgroundColor" type="color" value={pwaBackgroundColor} onChange={(e) => onChange('pwaBackgroundColor', e.target.value)} className="h-11 w-16 p-1" />
                <Input value={pwaBackgroundColor} onChange={(e) => onChange('pwaBackgroundColor', e.target.value)} placeholder="#0f172a" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pwaDisplay">Modo de exibição</Label>
              <select
                id="pwaDisplay"
                value={pwaDisplay}
                onChange={(e) => onChange('pwaDisplay', e.target.value)}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="standalone">Standalone</option>
                <option value="fullscreen">Fullscreen</option>
                <option value="minimal-ui">Minimal UI</option>
                <option value="browser">Browser</option>
              </select>
            </div>
          </div>
        </div>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Smartphone className="h-4 w-4 text-moria-orange" />
              Prévia do App Instalado
            </CardTitle>
            <CardDescription>Simulação visual aproximada do manifesto e do ícone do app.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-[28px] border bg-slate-950 p-5 text-white shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div
                  className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[18px] border border-white/10 bg-white/10"
                  style={{ backgroundColor: pwaBackgroundColor }}
                >
                  {previewIcon ? (
                    <img src={previewIcon} alt={previewName} className="h-full w-full rounded-[18px] object-contain" />
                  ) : (
                    <Smartphone className="h-8 w-8 text-white/70" />
                  )}
                </div>
                <div>
                  <div className="text-base font-semibold">{previewName}</div>
                  <div className="text-sm text-white/70">{previewShortName}</div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Manifesto do PWA
                </div>
                <div className="text-sm text-white/70">
                  {pwaDescription || 'Descrição do aplicativo não configurada.'}
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-white/10 px-3 py-1">Tema {pwaThemeColor}</span>
                  <span className="rounded-full border border-white/10 px-3 py-1">Display {pwaDisplay}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {ICON_SPECS.map((spec) => (
          <PwaIconUploadCard key={spec.slot} {...spec} value={iconValues[spec.slot]} onChange={onChange} />
        ))}
      </div>
    </div>
  );
}
