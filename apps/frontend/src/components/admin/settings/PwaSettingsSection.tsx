import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import {
  Check,
  CheckCircle2,
  Crop as CropIcon,
  Loader2,
  Shield,
  Smartphone,
  Trash2,
  Upload,
  User,
  Wrench,
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

type PwaProfileKey = 'customer' | 'admin' | 'mechanic';
type PwaPreviewShape = 'auto' | 'square' | 'rounded' | 'circle';
type PwaIconSlot = 'icon-192' | 'icon-512' | 'desktop-icon' | 'apple-touch-icon' | 'maskable-icon';

export type PwaField =
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
  | 'pwaMaskableIconUrl'
  | 'pwaAdminName'
  | 'pwaAdminShortName'
  | 'pwaAdminDescription'
  | 'pwaAdminThemeColor'
  | 'pwaAdminBackgroundColor'
  | 'pwaAdminDisplay'
  | 'pwaAdminIcon192Url'
  | 'pwaAdminIcon512Url'
  | 'pwaAdminDesktopIconUrl'
  | 'pwaAdminAppleTouchIconUrl'
  | 'pwaAdminMaskableIconUrl'
  | 'pwaMechanicName'
  | 'pwaMechanicShortName'
  | 'pwaMechanicDescription'
  | 'pwaMechanicThemeColor'
  | 'pwaMechanicBackgroundColor'
  | 'pwaMechanicDisplay'
  | 'pwaMechanicIcon192Url'
  | 'pwaMechanicIcon512Url'
  | 'pwaMechanicDesktopIconUrl'
  | 'pwaMechanicAppleTouchIconUrl'
  | 'pwaMechanicMaskableIconUrl';

interface PwaProfileConfig {
  name: string;
  shortName: string;
  description: string;
  themeColor: string;
  backgroundColor: string;
  display: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  icon192Url: string;
  icon512Url: string;
  desktopIconUrl: string;
  appleTouchIconUrl: string;
  maskableIconUrl: string;
}

interface PwaSettingsSectionProps {
  storeName: string;
  profiles: Record<PwaProfileKey, PwaProfileConfig>;
  onChange: (field: PwaField, value: string) => void;
}

const PROFILE_META: Record<
  PwaProfileKey,
  {
    label: string;
    badge: string;
    icon: typeof User;
    summary: string;
    installContext: string;
    fields: {
      name: PwaField;
      shortName: PwaField;
      description: PwaField;
      themeColor: PwaField;
      backgroundColor: PwaField;
      display: PwaField;
      icon192Url: PwaField;
      icon512Url: PwaField;
      desktopIconUrl: PwaField;
      appleTouchIconUrl: PwaField;
      maskableIconUrl: PwaField;
    };
  }
> = {
  customer: {
    label: 'Cliente',
    badge: 'Publico',
    icon: User,
    summary: 'App usado por clientes para pedidos, revisoes, veiculos e suporte.',
    installContext: 'Instalado a partir do login/area do cliente.',
    fields: {
      name: 'pwaName',
      shortName: 'pwaShortName',
      description: 'pwaDescription',
      themeColor: 'pwaThemeColor',
      backgroundColor: 'pwaBackgroundColor',
      display: 'pwaDisplay',
      icon192Url: 'pwaIcon192Url',
      icon512Url: 'pwaIcon512Url',
      desktopIconUrl: 'pwaDesktopIconUrl',
      appleTouchIconUrl: 'pwaAppleTouchIconUrl',
      maskableIconUrl: 'pwaMaskableIconUrl',
    },
  },
  admin: {
    label: 'Painel do Lojista',
    badge: 'Interno',
    icon: Shield,
    summary: 'App do lojista/gestao para pedidos, vendas, relatorios e operacao.',
    installContext: 'Instalado a partir do login administrativo ou painel do lojista.',
    fields: {
      name: 'pwaAdminName',
      shortName: 'pwaAdminShortName',
      description: 'pwaAdminDescription',
      themeColor: 'pwaAdminThemeColor',
      backgroundColor: 'pwaAdminBackgroundColor',
      display: 'pwaAdminDisplay',
      icon192Url: 'pwaAdminIcon192Url',
      icon512Url: 'pwaAdminIcon512Url',
      desktopIconUrl: 'pwaAdminDesktopIconUrl',
      appleTouchIconUrl: 'pwaAdminAppleTouchIconUrl',
      maskableIconUrl: 'pwaAdminMaskableIconUrl',
    },
  },
  mechanic: {
    label: 'App do Mecanico',
    badge: 'Oficina',
    icon: Wrench,
    summary: 'App da equipe tecnica para revisoes, checklist e fluxo da oficina.',
    installContext: 'Instalado a partir do login interno e aberto no painel do mecanico.',
    fields: {
      name: 'pwaMechanicName',
      shortName: 'pwaMechanicShortName',
      description: 'pwaMechanicDescription',
      themeColor: 'pwaMechanicThemeColor',
      backgroundColor: 'pwaMechanicBackgroundColor',
      display: 'pwaMechanicDisplay',
      icon192Url: 'pwaMechanicIcon192Url',
      icon512Url: 'pwaMechanicIcon512Url',
      desktopIconUrl: 'pwaMechanicDesktopIconUrl',
      appleTouchIconUrl: 'pwaMechanicAppleTouchIconUrl',
      maskableIconUrl: 'pwaMechanicMaskableIconUrl',
    },
  },
};

const ICON_SPECS: Array<{
  slot: PwaIconSlot;
  key: keyof Pick<
    PwaProfileConfig,
    'icon192Url' | 'icon512Url' | 'desktopIconUrl' | 'appleTouchIconUrl' | 'maskableIconUrl'
  >;
  title: string;
  description: string;
  size: string;
  notes: string;
  autoShape: Exclude<PwaPreviewShape, 'auto'>;
}> = [
  {
    slot: 'icon-192',
    key: 'icon192Url',
    title: 'Icone 192x192',
    description: 'Android e atalhos compactos.',
    size: 'PNG 192x192',
    notes: 'Ideal para a instalacao basica do app em Android.',
    autoShape: 'rounded',
  },
  {
    slot: 'icon-512',
    key: 'icon512Url',
    title: 'Icone 512x512',
    description: 'Splash screen e prompts de instalacao.',
    size: 'PNG 512x512',
    notes: 'Use a versao principal em alta qualidade.',
    autoShape: 'rounded',
  },
  {
    slot: 'desktop-icon',
    key: 'desktopIconUrl',
    title: 'Icone Desktop',
    description: 'Preferencial em instalacoes no PC.',
    size: 'PNG 512x512',
    notes: 'Utilizado por Chrome e Edge quando o app e instalado no desktop.',
    autoShape: 'rounded',
  },
  {
    slot: 'apple-touch-icon',
    key: 'appleTouchIconUrl',
    title: 'Apple Touch Icon',
    description: 'Tela inicial do iPhone e iPad.',
    size: 'PNG 180x180',
    notes: 'Valide o comportamento com cantos arredondados.',
    autoShape: 'rounded',
  },
  {
    slot: 'maskable-icon',
    key: 'maskableIconUrl',
    title: 'Icone Maskable',
    description: 'Launchers com mascara de recorte.',
    size: 'PNG 512x512',
    notes: 'Mantenha margem de seguranca ao redor da marca.',
    autoShape: 'circle',
  },
];

const getPreviewRadiusClass = (shape: PwaPreviewShape, autoShape: Exclude<PwaPreviewShape, 'auto'>) => {
  const resolvedShape = shape === 'auto' ? autoShape : shape;
  if (resolvedShape === 'circle') return 'rounded-full';
  if (resolvedShape === 'rounded') return 'rounded-[24px]';
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
  const [crop, setCrop] = useState<Crop>({ unit: '%', width: 84, height: 84, x: 8, y: 8 });
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
        throw new Error('Nao foi possivel preparar o canvas do recorte.');
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
          reject(new Error('Falha ao gerar o PNG do icone.'));
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
            <p className="text-sm text-gray-500">Recorte quadrado com preview de mascara para Android e iOS.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 rounded-lg border-2 border-gray-200 bg-gray-50 p-2 sm:p-3">
          <ReactCrop crop={crop} onChange={(next) => setCrop(next)} onComplete={(next) => setCompletedCrop(next)} aspect={1}>
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Crop do icone"
              onLoad={onImageLoad}
              className="max-w-full"
              style={{ maxHeight: 'min(480px, 52vh)' }}
            />
          </ReactCrop>
        </div>

        <Card className="min-w-0 border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Preview do Icone</CardTitle>
            <CardDescription>Valide como o icone pode aparecer em diferentes plataformas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'auto', label: 'Auto' },
                { value: 'square', label: 'Quadrado' },
                { value: 'rounded', label: 'Arred.' },
                { value: 'circle', label: 'Circulo' },
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
                {previewShape === 'auto' ? 'Preview automatico' : 'Preview manual'}
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
                O arquivo salvo continua quadrado. Essa selecao serve para validar o encaixe visual nas plataformas.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          <X className="h-4 w-4 shrink-0" />
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
  title,
  description,
  size,
  notes,
  autoShape,
  value,
  onUploaded,
  onRemove,
}: {
  slot: PwaIconSlot;
  title: string;
  description: string;
  size: string;
  notes: string;
  autoShape: Exclude<PwaPreviewShape, 'auto'>;
  value: string;
  onUploaded: (url: string) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
  const [previewShape, setPreviewShape] = useState<PwaPreviewShape>('auto');

  useEffect(() => {
    return () => {
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
      onUploaded(result.url);
      toast.success(`${title} atualizado`);
    } catch (error: any) {
      toast.error('Erro ao enviar icone do PWA', {
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
                <img src={value} alt={title} className={`h-20 w-20 object-contain ${getPreviewRadiusClass('auto', autoShape)}`} />
              ) : (
                <div className="text-center text-sm text-muted-foreground">Icone ainda nao configurado</div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
            O upload abre um cropper quadrado e exporta em PNG sem compressao destrutiva.
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
                onClick={onRemove}
                disabled={isUploading}
              >
                <Trash2 className="h-4 w-4 shrink-0" />
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
            <DialogDescription>Recorte o icone em proporcao 1:1 e valide os cantos para Android, iOS ou desktop.</DialogDescription>
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

export function PwaSettingsSection({ storeName, profiles, onChange }: PwaSettingsSectionProps) {
  const [activeProfile, setActiveProfile] = useState<PwaProfileKey>('customer');
  const profileMeta = PROFILE_META[activeProfile];
  const profile = profiles[activeProfile];
  const previewIcon =
    profile.desktopIconUrl || profile.icon512Url || profile.icon192Url || profile.appleTouchIconUrl || profile.maskableIconUrl;
  const previewName = profile.name.trim() || storeName || 'Nome do app';
  const previewShortName = profile.shortName.trim() || previewName.slice(0, 12);
  const ProfileIcon = profileMeta.icon;

  const handleProfileChange = (
    key: keyof PwaProfileConfig,
    value: string
  ) => {
    onChange(profileMeta.fields[key], value);
  };

  const manifestUrl = `/api/settings/pwa-manifest.webmanifest?app=${activeProfile}`;

  const installSummary = useMemo(() => {
    if (activeProfile === 'customer') {
      return 'Login do cliente, painel do cliente e instalacao publica.';
    }
    if (activeProfile === 'mechanic') {
      return 'Login interno e painel do mecanico.';
    }
    return 'Login administrativo e painel do lojista.';
  }, [activeProfile]);

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="border-b pb-2 text-lg font-medium">PWAs separados por perfil</h3>
        <p className="text-sm text-muted-foreground">
          Configure textos, cores e icones individualmente para o app do cliente, o painel do lojista e o app do mecanico.
        </p>
      </div>

      <div className="-mx-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:px-0">
        <div className="flex min-w-max gap-3 lg:grid lg:min-w-0 lg:grid-cols-3">
          {(Object.keys(PROFILE_META) as PwaProfileKey[]).map((key) => {
            const meta = PROFILE_META[key];
            const Icon = meta.icon;
            const isActive = key === activeProfile;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveProfile(key)}
                className={`h-full w-[280px] rounded-2xl border p-4 text-left transition sm:w-[320px] lg:w-auto ${isActive ? 'border-moria-orange bg-orange-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${isActive ? 'bg-moria-orange text-white' : 'bg-slate-100 text-slate-700'}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge variant={isActive ? 'default' : 'outline'} className="flex-shrink-0">{meta.badge}</Badge>
                </div>
                <div className="break-words font-semibold text-slate-900">{meta.label}</div>
                <p className="mt-1 text-sm text-slate-600">{meta.summary}</p>
              </button>
            );
          })}
        </div>
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ProfileIcon className="h-4 w-4 text-moria-orange" />
            {profileMeta.label}
          </CardTitle>
          <CardDescription>{profileMeta.installContext}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)] xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome completo do app</Label>
                  <Input value={profile.name} onChange={(e) => handleProfileChange('name', e.target.value)} placeholder={`${storeName} App`} maxLength={120} />
                </div>
                <div className="space-y-2">
                  <Label>Nome curto</Label>
                  <Input value={profile.shortName} onChange={(e) => handleProfileChange('shortName', e.target.value)} placeholder="M2 App" maxLength={40} />
                  <p className="text-xs text-muted-foreground">Aparece abaixo do icone quando o espaco e menor.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descricao do PWA</Label>
                <Textarea
                  value={profile.description}
                  onChange={(e) => handleProfileChange('description', e.target.value)}
                  placeholder="Descreva claramente para quem este app foi criado e o que ele oferece."
                  rows={4}
                  maxLength={240}
                />
                <p className="text-xs text-muted-foreground">Texto usado no manifesto, banners e experiencias de instalacao.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Cor do tema</Label>
                  <div className="flex gap-2">
                    <Input type="color" value={profile.themeColor} onChange={(e) => handleProfileChange('themeColor', e.target.value)} className="h-11 w-16 p-1" />
                    <Input value={profile.themeColor} onChange={(e) => handleProfileChange('themeColor', e.target.value)} placeholder="#0f172a" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cor de fundo</Label>
                  <div className="flex gap-2">
                    <Input type="color" value={profile.backgroundColor} onChange={(e) => handleProfileChange('backgroundColor', e.target.value)} className="h-11 w-16 p-1" />
                    <Input value={profile.backgroundColor} onChange={(e) => handleProfileChange('backgroundColor', e.target.value)} placeholder="#0f172a" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Modo de exibicao</Label>
                  <select
                    value={profile.display}
                    onChange={(e) => handleProfileChange('display', e.target.value)}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="standalone">Standalone</option>
                    <option value="fullscreen">Fullscreen</option>
                    <option value="minimal-ui">Minimal UI</option>
                    <option value="browser">Browser</option>
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <div className="mb-2 font-medium text-slate-900">Onde esse app sera usado</div>
                <p>{installSummary}</p>
                <p className="mt-2 text-xs text-slate-500">Manifesto: {manifestUrl}</p>
              </div>
            </div>

            <Card className="border-border/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Smartphone className="h-4 w-4 text-moria-orange" />
                  Preview do App Instalado
                </CardTitle>
                <CardDescription>Simulacao aproximada do nome, descricao e icone do perfil selecionado.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-[28px] border bg-slate-950 p-4 text-white shadow-sm sm:p-5">
                  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[18px] border border-white/10 bg-white/10" style={{ backgroundColor: profile.backgroundColor }}>
                      {previewIcon ? (
                        <img src={previewIcon} alt={previewName} className="h-full w-full rounded-[18px] object-contain" />
                      ) : (
                        <ProfileIcon className="h-8 w-8 text-white/70" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-base font-semibold">{previewName}</div>
                      <div className="text-sm text-white/70">{previewShortName}</div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      Manifesto do PWA
                    </div>
                    <div className="text-sm text-white/70">{profile.description || 'Descricao do aplicativo nao configurada.'}</div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full border border-white/10 px-3 py-1">Tema {profile.themeColor}</span>
                      <span className="rounded-full border border-white/10 px-3 py-1">Display {profile.display}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {ICON_SPECS.map((spec) => (
              <PwaIconUploadCard
                key={`${activeProfile}-${spec.slot}`}
                slot={spec.slot}
                title={spec.title}
                description={spec.description}
                size={spec.size}
                notes={spec.notes}
                autoShape={spec.autoShape}
                value={profile[spec.key]}
                onUploaded={(url) => handleProfileChange(spec.key, url)}
                onRemove={() => handleProfileChange(spec.key, '')}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
