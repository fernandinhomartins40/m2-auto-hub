import * as Icons from 'lucide-react';
import { Eye } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { HeroButton, HeroConfig, HeroFeature } from '@/types/landingPage';

import {
  ArrayEditor,
  ColorOrGradientPicker,
  colorOrGradientToCSS,
  IconSelector,
  ImageUploaderWithCrop,
  SliderControl,
} from '../StyleControls';

interface HeroEditorProps {
  config: HeroConfig;
  onChange: (config: HeroConfig) => void;
}

export const HeroEditor = ({ config, onChange }: HeroEditorProps) => {
  const updateConfig = (updates: Partial<HeroConfig>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <Label>Secao Ativa</Label>
            <p className="text-sm text-muted-foreground">
              Exibir ou ocultar a secao hero na landing page
            </p>
          </div>
          <Switch checked={config.enabled} onCheckedChange={(enabled) => updateConfig({ enabled })} />
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-semibold">Textos Principais</h3>

        <div className="space-y-2">
          <Label>Titulo (Palavra Dourada)</Label>
          <Input
            value={config.title}
            onChange={(event) => updateConfig({ title: event.target.value })}
            placeholder="M2"
          />
        </div>

        <div className="space-y-2">
          <Label>Subtitulo</Label>
          <Input
            value={config.subtitle}
            onChange={(event) => updateConfig({ subtitle: event.target.value })}
            placeholder="Pecas & Servicos"
          />
        </div>

        <div className="space-y-2">
          <Label>Descricao</Label>
          <Textarea
            value={config.description}
            onChange={(event) => updateConfig({ description: event.target.value })}
            placeholder="Especialistas em pecas automotivas..."
            rows={3}
          />
        </div>
      </Card>

      <Card className="p-6">
        <ArrayEditor<HeroFeature>
          label="Features (Icones com Texto)"
          items={config.features}
          onChange={(features) => updateConfig({ features })}
          createNew={() => ({
            id: Date.now().toString(),
            icon: 'Shield',
            text: 'Nova Feature',
          })}
          getItemLabel={(item) => item.text}
          renderItem={(item, _, update) => (
            <div className="space-y-4">
              <IconSelector label="Icone" value={item.icon} onChange={(icon) => update({ icon })} />

              <div className="space-y-2">
                <Label>Texto</Label>
                <Input
                  value={item.text}
                  onChange={(event) => update({ text: event.target.value })}
                  placeholder="Qualidade Garantida"
                />
              </div>
            </div>
          )}
          maxItems={4}
        />
      </Card>

      <Card className="p-6">
        <ArrayEditor<HeroButton>
          label="Botoes de Acao (CTAs)"
          items={config.buttons}
          onChange={(buttons) => updateConfig({ buttons })}
          createNew={() => ({
            id: Date.now().toString(),
            text: 'Novo Botao',
            href: '#',
            variant: 'hero',
            enabled: true,
          })}
          getItemLabel={(item) => item.text}
          renderItem={(item, _, update) => (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Texto do Botao</Label>
                <Input
                  value={item.text}
                  onChange={(event) => update({ text: event.target.value })}
                  placeholder="Ver Promocoes"
                />
              </div>

              <div className="space-y-2">
                <Label>Link (href)</Label>
                <Input
                  value={item.href}
                  onChange={(event) => update({ href: event.target.value })}
                  placeholder="#promocoes ou https://..."
                />
              </div>

              <div className="space-y-2">
                <Label>Estilo do Botao</Label>
                <select
                  value={item.variant}
                  onChange={(event) => update({ variant: event.target.value as HeroButton['variant'] })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                >
                  <option value="hero">Hero (Laranja)</option>
                  <option value="premium">Premium (Dourado)</option>
                  <option value="outline">Outline (Contorno)</option>
                  <option value="default">Padrao</option>
                </select>
              </div>

              <div className="pt-4 border-t space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground">
                  Personalizacao de Cores (Opcional)
                </h4>

                <ColorOrGradientPicker
                  label="Cor de Fundo / Gradiente"
                  value={item.background || { type: 'solid', solid: '#ff6600' }}
                  onChange={(background) => update({ background })}
                  defaultGradientPreset="goldMetallic"
                  description="Defina uma cor solida ou gradiente para o fundo do botao"
                />

                <ColorOrGradientPicker
                  label="Cor do Texto / Gradiente"
                  value={item.textColor || { type: 'solid', solid: '#ffffff' }}
                  onChange={(textColor) => update({ textColor })}
                  defaultGradientPreset="goldMetallic"
                  description="Defina uma cor solida ou gradiente para o texto do botao"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={(event) => update({ enabled: event.target.checked })}
                  className="h-4 w-4"
                />
                <Label>Botao ativo</Label>
              </div>
            </div>
          )}
          maxItems={3}
        />
      </Card>

      <Card className="p-6">
        <ImageUploaderWithCrop
          label="Imagem de Fundo do Hero"
          value={config.backgroundImage}
          onChange={(backgroundImage) => updateConfig({ backgroundImage })}
          description="Imagem principal do banner hero - largura total da tela"
          recommendedWidth={1920}
          recommendedHeight={1080}
          aspectRatio={16 / 9}
          maxFileSizeMB={10}
        />
      </Card>

      <Card className="p-6">
        <SliderControl
          label="Opacidade do Overlay Escuro"
          value={config.overlayOpacity}
          onChange={(overlayOpacity) => updateConfig({ overlayOpacity })}
          min={0}
          max={100}
          unit="%"
          description="Escurecimento sobre a imagem de fundo (0 = transparente, 100 = preto total)"
        />
      </Card>

      <Card className="bg-gradient-to-r from-moria-orange/5 to-gold-accent/5 border-moria-orange/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-moria-orange" />
              <CardTitle>Preview do Hero</CardTitle>
            </div>
            <Badge className="bg-green-100 text-green-800">
              <div className="h-2 w-2 bg-green-600 rounded-full mr-2"></div>
              Atualizacao em tempo real
            </Badge>
          </div>
          <CardDescription>Veja como a secao hero aparecera na landing page</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative min-h-[400px] flex items-center rounded-lg overflow-hidden">
            {config.backgroundImage.url ? (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${config.backgroundImage.url})` }}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800" />
            )}

            <div className="absolute inset-0 bg-black" style={{ opacity: config.overlayOpacity / 100 }} />

            <div className="relative z-10 p-8 w-full">
              <div className="max-w-2xl">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                  <span className="gold-metallic">{config.title || 'M2'}</span>
                  <br />
                  <span className="text-white">{config.subtitle || 'Pecas & Servicos'}</span>
                </h1>

                <p className="text-lg text-gray-300 mb-6">
                  {config.description || 'Descricao do seu negocio...'}
                </p>

                {config.features.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    {config.features.map((feature) => {
                      const IconComponent = (Icons as any)[feature.icon] || Icons.Circle;
                      return (
                        <div key={feature.id} className="flex items-center space-x-2 text-white">
                          <IconComponent className="h-4 w-4 text-moria-orange" />
                          <span className="text-xs">{feature.text}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {config.buttons.filter((button) => button.enabled).length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {config.buttons
                      .filter((button) => button.enabled)
                      .map((button) => {
                        const customStyle =
                          button.background || button.textColor
                            ? {
                                ...(button.background ? colorOrGradientToCSS(button.background) : {}),
                                ...(button.textColor
                                  ? colorOrGradientToCSS(button.textColor, { forText: true })
                                  : {}),
                              }
                            : undefined;

                        return (
                          <Button
                            key={button.id}
                            variant={button.variant as any}
                            size="sm"
                            style={customStyle}
                          >
                            {button.text}
                          </Button>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
