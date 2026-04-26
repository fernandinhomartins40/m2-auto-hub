/**
 * MarqueeEditor - Editor da secao Marquee (Banner de mensagens)
 */

import { Eye } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MarqueeConfig, MarqueeItem } from '@/types/landingPage';
import { Marquee } from '@/components/Marquee';

import { ArrayEditor, ColorOrGradientPicker, SliderControl } from '../StyleControls';
import { PreviewProviders } from './PreviewProviders';

interface MarqueeEditorProps {
  config: MarqueeConfig;
  onChange: (config: MarqueeConfig) => void;
}

export const MarqueeEditor = ({ config, onChange }: MarqueeEditorProps) => {
  const updateConfig = (updates: Partial<MarqueeConfig>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <Label>Secao Ativa</Label>
            <p className="text-sm text-muted-foreground">
              Exibir ou ocultar o marquee na landing page
            </p>
          </div>
          <Switch checked={config.enabled} onCheckedChange={(enabled) => updateConfig({ enabled })} />
        </div>
      </Card>

      <Card className="p-6">
        <ArrayEditor<MarqueeItem>
          label="Mensagens do Marquee"
          items={config.items}
          onChange={(items) => updateConfig({ items })}
          createNew={() => ({
            id: Date.now().toString(),
            icon: '🔧',
            text: 'NOVA MENSAGEM',
          })}
          getItemLabel={(item) => `${item.icon} ${item.text}`}
          renderItem={(item, _, update) => (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Icone/Emoji</Label>
                <Input
                  value={item.icon}
                  onChange={(e) => update({ icon: e.target.value })}
                  placeholder="🔧"
                  maxLength={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Texto da Mensagem</Label>
                <Input
                  value={item.text}
                  onChange={(e) => update({ text: e.target.value.toUpperCase() })}
                  placeholder="PECAS ORIGINAIS COM ATE 30% DE DESCONTO"
                  className="uppercase"
                />
              </div>
            </div>
          )}
          description="Mensagens que rolam continuamente no banner superior"
          maxItems={10}
        />
      </Card>

      <Card className="p-6">
        <SliderControl
          label="Velocidade da Animacao"
          value={config.speed}
          onChange={(speed) => updateConfig({ speed })}
          min={10}
          max={60}
          step={5}
          unit="s"
          description="Tempo em segundos para completar um ciclo completo"
        />
      </Card>

      <Card className="p-6 space-y-4">
        <div>
          <h3 className="mb-2 text-lg font-semibold">Cores e Gradientes</h3>
          <p className="text-sm text-muted-foreground">
            Configure cores solidas ou gradientes para o banner
          </p>
        </div>

        <ColorOrGradientPicker
          label="Cor de Fundo / Gradiente"
          value={config.backgroundColor || { type: 'solid', solid: '#ff6600' }}
          onChange={(backgroundColor) => updateConfig({ backgroundColor })}
          defaultGradientPreset="blueToGold"
          description="Cor ou gradiente do fundo do banner"
        />

        <ColorOrGradientPicker
          label="Cor do Texto / Gradiente"
          value={config.textColor || { type: 'solid', solid: '#ffffff' }}
          onChange={(textColor) => updateConfig({ textColor })}
          defaultGradientPreset="goldMetallic"
          description="Cor ou gradiente do texto do banner"
        />
      </Card>

      <Card className="bg-gradient-to-r from-moria-orange/5 to-gold-accent/5 border-moria-orange/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-moria-orange" />
              <CardTitle>Preview do Marquee</CardTitle>
            </div>
            <Badge className="bg-green-100 text-green-800">
              <div className="h-2 w-2 bg-green-600 rounded-full mr-2"></div>
              Atualizacao em tempo real
            </Badge>
          </div>
          <CardDescription>
            Preview usando a mesma estrutura da faixa real da landing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border bg-background">
            <PreviewProviders config={{ marquee: config }}>
              <Marquee previewConfig={config} />
            </PreviewProviders>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Velocidade configurada: {config.speed}s por ciclo.
          </p>
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50 p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-amber-500 p-2 text-white">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="mb-1 font-semibold text-amber-900">Configuracao do Marquee</h4>
            <p className="text-sm text-amber-800">
              O marquee e o banner de mensagens que rola continuamente no topo da pagina.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
