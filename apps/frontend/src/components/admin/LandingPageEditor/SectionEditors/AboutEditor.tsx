import { Eye, Info } from 'lucide-react';

import About from '@/components/About';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { AboutConfig } from '@/types/landingPage';
import { ImageUploaderWithCrop } from '../StyleControls';
import { PreviewProviders } from './PreviewProviders';

interface AboutEditorProps {
  config: AboutConfig;
  onChange: (config: AboutConfig) => void;
}

export const AboutEditor = ({ config, onChange }: AboutEditorProps) => {
  const updateConfig = (updates: Partial<AboutConfig>) => onChange({ ...config, ...updates });

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label>Seção ativa</Label>
            <p className="text-sm text-muted-foreground">
              Exibe o bloco horizontal com imagem e painel azul institucional.
            </p>
          </div>
          <Switch
            checked={config.enabled ?? true}
            onCheckedChange={(enabled) => updateConfig({ enabled })}
          />
        </div>
      </Card>

      <Card className="space-y-4 p-6">
        <div>
          <h3 className="text-lg font-semibold">Conteúdo institucional</h3>
          <p className="text-sm text-muted-foreground">
            Estes textos aparecem no painel azul à direita da imagem.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Início do título</Label>
            <Input
              value={config.heroTitle || ''}
              onChange={(event) => updateConfig({ heroTitle: event.target.value })}
              placeholder="Há mais de 14 anos"
            />
          </div>
          <div className="space-y-2">
            <Label>Complemento do título</Label>
            <Input
              value={config.heroHighlight || ''}
              onChange={(event) => updateConfig({ heroHighlight: event.target.value })}
              placeholder="cuidando do seu veículo."
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Subtítulo</Label>
          <Textarea
            value={config.heroSubtitle || ''}
            onChange={(event) => updateConfig({ heroSubtitle: event.target.value })}
            placeholder="Peças de qualidade e serviços de confiança, em um só lugar."
            rows={3}
          />
        </div>
      </Card>

      <Card className="space-y-4 p-6">
        <h3 className="text-lg font-semibold">Imagem do lado esquerdo</h3>
        <ImageUploaderWithCrop
          label="Imagem da oficina"
          value={config.sectionImage}
          onChange={(sectionImage) => updateConfig({ sectionImage })}
          description="Use uma imagem horizontal. Ela ocupará toda a metade esquerda do bloco."
          recommendedWidth={960}
          recommendedHeight={640}
          aspectRatio={3 / 2}
          maxFileSizeMB={5}
          category="about-home"
        />
      </Card>

      <Card className="border-blue-200 bg-blue-50 p-5">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 text-blue-700" />
          <p className="text-sm text-blue-900">
            Os três diferenciais exibidos na base deste bloco são editados em
            <strong> Cuidado à peça → Diferenciais</strong>.
          </p>
        </div>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              <CardTitle>Prévia do bloco institucional</CardTitle>
            </div>
            <Badge className="bg-green-100 text-green-800">Atualização em tempo real</Badge>
          </div>
          <CardDescription>Mesma estrutura horizontal usada na landing page.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border bg-background">
            <PreviewProviders config={{ aboutPage: config }}>
              <About />
            </PreviewProviders>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
