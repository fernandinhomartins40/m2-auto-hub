import { type ChangeEvent, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Smartphone, Trash2, Upload } from 'lucide-react';
import settingsService from '@/api/settingsService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  | 'pwaAppleTouchIconUrl'
  | 'pwaMaskableIconUrl';

type PwaIconSlot = 'icon-192' | 'icon-512' | 'apple-touch-icon' | 'maskable-icon';

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
  pwaAppleTouchIconUrl: string;
  pwaMaskableIconUrl: string;
  onChange: (field: PwaField, value: string) => void;
}

const ICON_SPECS: Array<{
  slot: PwaIconSlot;
  field: 'pwaIcon192Url' | 'pwaIcon512Url' | 'pwaAppleTouchIconUrl' | 'pwaMaskableIconUrl';
  title: string;
  description: string;
  size: string;
  notes: string;
}> = [
  {
    slot: 'icon-192',
    field: 'pwaIcon192Url',
    title: 'Ícone 192x192',
    description: 'Usado na instalação Android e em atalhos compactos.',
    size: 'PNG 192x192',
    notes: 'Prefira imagem quadrada, com margem de segurança e logo centralizada.',
  },
  {
    slot: 'icon-512',
    field: 'pwaIcon512Url',
    title: 'Ícone 512x512',
    description: 'Usado em splash screen, prompts de instalação e atalhos maiores.',
    size: 'PNG 512x512',
    notes: 'Envie em alta qualidade. O backend ajusta para o tamanho final sem recorte.',
  },
  {
    slot: 'apple-touch-icon',
    field: 'pwaAppleTouchIconUrl',
    title: 'Apple Touch Icon',
    description: 'Usado quando o app é salvo na tela inicial do iPhone e iPad.',
    size: 'PNG 180x180',
    notes: 'Evite detalhes muito pequenos. Ícones simples funcionam melhor no iOS.',
  },
  {
    slot: 'maskable-icon',
    field: 'pwaMaskableIconUrl',
    title: 'Ícone Maskable',
    description: 'Usado por launchers que aplicam máscara circular ou arredondada.',
    size: 'PNG 512x512',
    notes: 'Deixe área de respiro em volta da marca para não perder partes no recorte.',
  },
];

function PwaIconUploadCard({
  slot,
  field,
  title,
  description,
  size,
  notes,
  value,
  onChange,
}: {
  slot: PwaIconSlot;
  field: 'pwaIcon192Url' | 'pwaIcon512Url' | 'pwaAppleTouchIconUrl' | 'pwaMaskableIconUrl';
  title: string;
  description: string;
  size: string;
  notes: string;
  value: string;
  onChange: (field: PwaField, value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await settingsService.uploadPwaAsset(file, slot);
      onChange(field, result.url);
      toast.success(`${title} atualizado`);
    } catch (error: any) {
      toast.error('Erro ao enviar ícone do PWA', {
        description: error?.message || 'Tente novamente.',
      });
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
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
              <img src={value} alt={title} className="h-20 w-20 rounded-2xl object-contain" />
            ) : (
              <div className="text-center text-sm text-muted-foreground">Ícone ainda não configurado</div>
            )}
          </div>
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
  pwaAppleTouchIconUrl,
  pwaMaskableIconUrl,
  onChange,
}: PwaSettingsSectionProps) {
  const previewIcon = pwaIcon512Url || pwaIcon192Url || pwaAppleTouchIconUrl || pwaMaskableIconUrl;
  const previewName = pwaName.trim() || storeName || 'Nome do app';
  const previewShortName = pwaShortName.trim() || previewName.slice(0, 12);

  const iconValues = useMemo(
    () => ({
      'icon-192': pwaIcon192Url,
      'icon-512': pwaIcon512Url,
      'apple-touch-icon': pwaAppleTouchIconUrl,
      'maskable-icon': pwaMaskableIconUrl,
    }),
    [pwaAppleTouchIconUrl, pwaIcon192Url, pwaIcon512Url, pwaMaskableIconUrl]
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
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[18px] border border-white/10 bg-white/10" style={{ backgroundColor: pwaBackgroundColor }}>
                  {previewIcon ? (
                    <img src={previewIcon} alt={previewName} className="h-full w-full object-contain" />
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
