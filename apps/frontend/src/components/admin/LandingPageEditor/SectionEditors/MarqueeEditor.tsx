/**
 * MarqueeEditor - Editor da seção Marquee (Banner de mensagens)
 */

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { MarqueeConfig, MarqueeItem } from '@/types/landingPage';
import { ArrayEditor, ColorOrGradientPicker, colorOrGradientToCSS, SliderControl } from '../StyleControls';
import { Eye } from 'lucide-react';

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
      {/* Habilitado */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <Label>Seção Ativa</Label>
            <p className="text-sm text-muted-foreground">
              Exibir ou ocultar o marquee na landing page
            </p>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(enabled) => updateConfig({ enabled })}
          />
        </div>
      </Card>

      {/* Mensagens do Marquee */}
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
                <Label>Ícone/Emoji</Label>
                <Input
                  value={item.icon}
                  onChange={(e) => update({ icon: e.target.value })}
                  placeholder="🔧"
                  maxLength={2}
                />
                <p className="text-xs text-muted-foreground">
                  Use emojis como: 🔧 ⚡ 🚗 🛠️ 💰 ✨ 🎉
                </p>
              </div>

              <div className="space-y-2">
                <Label>Texto da Mensagem</Label>
                <Input
                  value={item.text}
                  onChange={(e) => update({ text: e.target.value.toUpperCase() })}
                  placeholder="PEÇAS ORIGINAIS COM ATÉ 30% DE DESCONTO"
                  className="uppercase"
                />
                <p className="text-xs text-muted-foreground">
                  O texto será convertido automaticamente para MAIÚSCULAS
                </p>
              </div>
            </div>
          )}
          description="Mensagens que rolam continuamente no banner superior"
          maxItems={10}
        />
      </Card>

      {/* Velocidade de Animação */}
      <Card className="p-6">
        <SliderControl
          label="Velocidade da Animação"
          value={config.speed}
          onChange={(speed) => updateConfig({ speed })}
          min={10}
          max={60}
          step={5}
          unit="s"
          description="Tempo em segundos para completar um ciclo completo da animação"
        />
      </Card>

      {/* Cores e Gradientes */}
      <Card className="p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Cores e Gradientes</h3>
          <p className="text-sm text-muted-foreground">
            Configure cores sólidas ou gradientes para o banner
          </p>
        </div>

        <ColorOrGradientPicker
          label="Cor de Fundo / Gradiente"
          value={config.backgroundColor || { type: 'solid', solid: '#ff6600' }}
          onChange={(backgroundColor) => updateConfig({ backgroundColor })}
          defaultGradientPreset="orangeToGold"
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


      {/* Preview */}
      <Card className="bg-gradient-to-r from-moria-orange/5 to-gold-accent/5 border-moria-orange/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-moria-orange" />
              <CardTitle>Preview do Marquee</CardTitle>
            </div>
            <Badge className="bg-green-100 text-green-800">
              <div className="h-2 w-2 bg-green-600 rounded-full mr-2"></div>
              Atualização em tempo real
            </Badge>
          </div>
          <CardDescription>
            Veja como o banner de mensagens aparecerá na landing page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="overflow-hidden rounded-lg"
            style={{
              ...colorOrGradientToCSS(config.backgroundColor),
              ...colorOrGradientToCSS(config.textColor, { forText: true }),
            }}
          >
            <div className="py-3 px-4 flex items-center">
              <div className="whitespace-nowrap text-sm font-bold animate-marquee-slow flex items-center gap-8">
                {config.items.map((item, i) => (
                  <span key={i} className="flex items-center gap-2">
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.text}</span>
                  </span>
                ))}
                {/* Duplicate for seamless loop */}
                {config.items.map((item, i) => (
                  <span key={`dup-${i}`} className="flex items-center gap-2">
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.text}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 Velocidade configurada: {config.speed}s por ciclo. A animação real terá movimento contínuo e suave.
          </p>
        </CardContent>
      </Card>

      {/* Informação */}
      <Card className="p-6 bg-amber-50 border-amber-200">
        <div className="flex items-start gap-3">
          <div className="bg-amber-500 text-white p-2 rounded-full">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-amber-900 mb-1">Configuração do Marquee</h4>
            <p className="text-sm text-amber-800">
              O marquee é o banner de mensagens que rola continuamente no topo da página.
              Use-o para destacar promoções, novidades e informações importantes.
            </p>
            <p className="text-sm text-amber-800 mt-2">
              <strong>Dica:</strong> Mantenha as mensagens curtas e impactantes para melhor legibilidade.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
