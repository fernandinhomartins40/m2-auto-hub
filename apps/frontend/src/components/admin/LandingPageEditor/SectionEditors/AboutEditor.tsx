/**
 * AboutEditor - Editor da seção Sobre da Home
 */

import { Eye, Info } from 'lucide-react';

import About from '@/components/About';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { AboutConfig, AboutStat } from '@/types/landingPage';
import { ArrayEditor, ColorPicker, ImageUploaderWithCrop, SliderControl } from '../StyleControls';
import { PreviewProviders } from './PreviewProviders';

interface AboutEditorProps {
  config: AboutConfig;
  onChange: (config: AboutConfig) => void;
}

export const AboutEditor = ({ config, onChange }: AboutEditorProps) => {
  const updateConfig = (updates: Partial<AboutConfig>) => {
    onChange({ ...config, ...updates });
  };

  const updateDecorativeSquare = (updates: Partial<AboutConfig['decorativeSquare']>) => {
    updateConfig({
      decorativeSquare: {
        ...config.decorativeSquare,
        ...updates,
      },
    });
  };

  if (!config) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center text-gray-500">
          <p>Carregando configuracao...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <Label>Secao Ativa</Label>
            <p className="text-sm text-muted-foreground">
              Exibir ou ocultar a seção "Mais de 14 anos cuidando do seu veículo" na landing
            </p>
          </div>
          <Switch
            checked={config.enabled ?? true}
            onCheckedChange={(enabled) => updateConfig({ enabled })}
          />
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-semibold">Conteudo da Secao</h3>
        <p className="text-sm text-muted-foreground">
          Estes sao os campos usados pelo bloco publico da home.
        </p>

        <div className="space-y-2">
          <Label>Titulo inicial</Label>
          <Input
            value={config.heroTitle || ''}
            onChange={(e) => updateConfig({ heroTitle: e.target.value })}
            placeholder="Mais de 14 anos"
          />
        </div>

        <div className="space-y-2">
          <Label>Destaque em azul</Label>
          <Input
            value={config.heroHighlight || ''}
            onChange={(e) => updateConfig({ heroHighlight: e.target.value })}
            placeholder="cuidando do seu veiculo"
          />
        </div>

        <div className="space-y-2">
          <Label>Descrição</Label>
          <Textarea
            value={config.heroSubtitle || ''}
            onChange={(e) => updateConfig({ heroSubtitle: e.target.value })}
            placeholder="A M2 Auto Center nasceu em Palmital com um proposito claro..."
            rows={3}
          />
        </div>
      </Card>

      <Card className="p-6">
        <ArrayEditor<AboutStat>
          label="Cards de Estatisticas"
          items={config.stats || []}
          onChange={(stats) => updateConfig({ stats })}
          createNew={() => ({
            id: Date.now().toString(),
            number: '0+',
            label: 'Nova Estatistica',
          })}
          getItemLabel={(item) => `${item.number} - ${item.label}`}
          renderItem={(item, _, update) => (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Numero</Label>
                <Input
                  value={item.number}
                  onChange={(e) => update({ number: e.target.value })}
                  placeholder="14+"
                />
              </div>
              <div className="space-y-2">
                <Label>Label</Label>
                <Input
                  value={item.label}
                  onChange={(e) => update({ label: e.target.value })}
                  placeholder="Anos de Experiencia"
                />
              </div>
            </div>
          )}
          description="A seção pública exibe até 4 cards."
          maxItems={4}
        />
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-semibold">Imagem da Secao</h3>
        <ImageUploaderWithCrop
          label="Imagem lateral"
          value={config.sectionImage}
          onChange={(sectionImage) => updateConfig({ sectionImage })}
          description="Imagem exibida ao lado direito da seção Sobre da Home"
          recommendedWidth={900}
          recommendedHeight={640}
          aspectRatio={900 / 640}
          maxFileSizeMB={5}
          category="about-home"
        />
      </Card>

      <Card className="p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Quadrado Decorativo</h3>
          <p className="text-sm text-muted-foreground">
            Ajuste o detalhe visual exibido no canto inferior esquerdo da imagem.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label>Quadrado ativo</Label>
            <p className="text-sm text-muted-foreground">
              Exibir ou ocultar o quadrado decorativo.
            </p>
          </div>
          <Switch
            checked={config.decorativeSquare?.enabled ?? true}
            onCheckedChange={(enabled) => updateDecorativeSquare({ enabled })}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <ColorPicker
            label="Cor da borda"
            value={config.decorativeSquare?.borderColor || '#2563eb'}
            onChange={(borderColor) => updateDecorativeSquare({ borderColor })}
          />

          <ColorPicker
            label="Cor de fundo"
            value={config.decorativeSquare?.backgroundColor || '#ffffff'}
            onChange={(backgroundColor) => updateDecorativeSquare({ backgroundColor })}
          />
        </div>

        <SliderControl
          label="Opacidade do fundo"
          value={config.decorativeSquare?.backgroundOpacity ?? 100}
          onChange={(backgroundOpacity) => updateDecorativeSquare({ backgroundOpacity })}
          min={0}
          max={100}
          unit="%"
          description="Use 0% para deixar apenas o tracado da borda."
        />

        <div className="grid gap-4 md:grid-cols-2">
          <SliderControl
            label="Tamanho"
            value={config.decorativeSquare?.size ?? 96}
            onChange={(size) => updateDecorativeSquare({ size })}
            min={32}
            max={180}
            unit="px"
          />

          <SliderControl
            label="Espessura da borda"
            value={config.decorativeSquare?.borderWidth ?? 4}
            onChange={(borderWidth) => updateDecorativeSquare({ borderWidth })}
            min={1}
            max={16}
            unit="px"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <SliderControl
            label="Canto arredondado"
            value={config.decorativeSquare?.borderRadius ?? 12}
            onChange={(borderRadius) => updateDecorativeSquare({ borderRadius })}
            min={0}
            max={48}
            unit="px"
          />
          <div />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <SliderControl
            label="Deslocamento horizontal"
            value={config.decorativeSquare?.offsetX ?? -16}
            onChange={(offsetX) => updateDecorativeSquare({ offsetX })}
            min={-120}
            max={120}
            unit="px"
          />

          <SliderControl
            label="Deslocamento vertical"
            value={config.decorativeSquare?.offsetY ?? -16}
            onChange={(offsetY) => updateDecorativeSquare({ offsetY })}
            min={-120}
            max={120}
            unit="px"
          />
        </div>
      </Card>

      <Card className="p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <div className="bg-blue-500 text-white p-2 rounded-full">
            <Info className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-blue-900 mb-1">Escopo desta aba</h4>
            <p className="text-sm text-blue-800">
              Esta aba controla a seção Sobre da home: textos, cards, imagem lateral e o quadrado decorativo.
            </p>
          </div>
        </div>
      </Card>

      <Card className="bg-gradient-to-r from-moria-orange/5 to-gold-accent/5 border-moria-orange/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-moria-orange" />
              <CardTitle>Preview da Secao Sobre da Home</CardTitle>
            </div>
            <Badge className="bg-green-100 text-green-800">
              <div className="h-2 w-2 bg-green-600 rounded-full mr-2"></div>
              Atualizacao em tempo real
            </Badge>
          </div>
          <CardDescription>
            Preview usando a mesma estrutura real da landing publica
          </CardDescription>
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
