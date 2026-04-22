/**
 * ServicesEditor - Editor da seção "Nossos Serviços"
 */

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ServicesSectionConfig, TrustIndicator } from '@/types/landingPage';
import { ArrayEditor, IconSelector, ColorOrGradientPicker, colorOrGradientToCSS } from '../StyleControls';
import { Eye } from 'lucide-react';
import * as Icons from 'lucide-react';

interface ServicesEditorProps {
  config: ServicesSectionConfig;
  onChange: (config: ServicesSectionConfig) => void;
}

export const ServicesEditor = ({ config, onChange }: ServicesEditorProps) => {
  const updateConfig = (updates: Partial<ServicesSectionConfig>) => {
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
              Exibir ou ocultar a seção de Serviços na landing page
            </p>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(enabled) => updateConfig({ enabled })}
          />
        </div>
      </Card>

      {/* Textos da Seção */}
      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-semibold">Textos da Seção</h3>

        <div className="space-y-2">
          <Label>Título</Label>
          <Input
            value={config.title}
            onChange={(e) => updateConfig({ title: e.target.value })}
            placeholder="Nossos Serviços"
          />
          <p className="text-xs text-muted-foreground">
            A última palavra será destacada em dourado
          </p>
        </div>

        <div className="space-y-2">
          <Label>Subtítulo</Label>
          <Textarea
            value={config.subtitle}
            onChange={(e) => updateConfig({ subtitle: e.target.value })}
            placeholder="Oferecemos uma gama completa de serviços automotivos..."
            rows={3}
          />
        </div>
      </Card>

      {/* Indicadores de Confiança */}
      <Card className="p-6">
        <ArrayEditor<TrustIndicator>
          label="Indicadores de Confiança"
          items={config.trustIndicators}
          onChange={(trustIndicators) => updateConfig({ trustIndicators })}
          createNew={() => ({
            id: Date.now().toString(),
            icon: 'Shield',
            iconBackground: {
              type: 'gradient' as const,
              gradient: {
                type: 'linear' as const,
                angle: 135,
                colors: ['#ffd900', '#ffa600', '#ab8617']
              }
            },
            title: 'Novo Indicador',
            description: 'Descrição do indicador',
          })}
          getItemLabel={(item) => item.title}
          renderItem={(item, _, update) => (
            <div className="space-y-4">
              <IconSelector
                label="Ícone"
                value={item.icon}
                onChange={(icon) => update({ icon })}
              />

              <ColorOrGradientPicker
                label="Cor de Fundo do Ícone / Gradiente"
                value={item.iconBackground || { type: 'solid', solid: '#ff6600' }}
                onChange={(iconBackground) => update({ iconBackground })}
                defaultGradientPreset="goldMetallic"
                description="Cor sólida ou gradiente para o fundo do ícone"
              />

              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={item.title}
                  onChange={(e) => update({ title: e.target.value })}
                  placeholder="Garantia"
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  value={item.description}
                  onChange={(e) => update({ description: e.target.value })}
                  placeholder="6 meses em todos os serviços"
                />
              </div>

              {/* Preview do Indicador */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                <p className="text-xs font-semibold text-gray-600 mb-2">Preview:</p>
                <div className="flex flex-col items-center text-center">
                  <div
                    className="p-3 rounded-full mb-2"
                    style={colorOrGradientToCSS(item.iconBackground)}
                  >
                    <div className="w-6 h-6 text-white">
                      {/* Placeholder icon */}
                      ✓
                    </div>
                  </div>
                  <h4 className="font-bold text-sm">{item.title}</h4>
                  <p className="text-xs text-gray-600">{item.description}</p>
                </div>
              </div>
            </div>
          )}
          description="Cards exibidos abaixo da lista de serviços (recomendado: 4 indicadores)"
          maxItems={6}
        />
      </Card>

      {/* Informação */}
      <Card className="p-6 bg-green-50 border-green-200">
        <div className="flex items-start gap-3">
          <div className="bg-green-500 text-white p-2 rounded-full">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-green-900 mb-1">Seção de Serviços</h4>
            <p className="text-sm text-green-800">
              Esta seção exibe os serviços cadastrados no sistema, seguidos pelos indicadores de confiança
              que você configura aqui.
            </p>
            <p className="text-sm text-green-800 mt-2">
              <strong>Indicadores de Confiança:</strong> Use-os para destacar diferenciais como garantia,
              rapidez, experiência e tecnologia.
            </p>
            <p className="text-sm text-green-800 mt-2">
              Para gerenciar os serviços (adicionar, editar, remover), utilize a seção
              <strong> Serviços </strong> no painel administrativo.
            </p>
          </div>
        </div>
      </Card>

      {/* Preview */}
      <Card className="bg-gradient-to-r from-moria-orange/5 to-gold-accent/5 border-moria-orange/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-moria-orange" />
              <CardTitle>Preview dos Serviços</CardTitle>
            </div>
            <Badge className="bg-green-100 text-green-800">
              <div className="h-2 w-2 bg-green-600 rounded-full mr-2"></div>
              Atualização em tempo real
            </Badge>
          </div>
          <CardDescription>
            Veja como a seção de serviços aparecerá na landing page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-white p-8 rounded-lg">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-3">
                {config.title.split(' ').map((word, i, arr) =>
                  i === arr.length - 1 ?
                    <span key={i} className="gold-metallic">{word}</span> :
                    <span key={i}>{word} </span>
                )}
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                {config.subtitle || 'Oferecemos serviços automotivos completos'}
              </p>
            </div>

            {/* Trust Indicators */}
            {config.trustIndicators.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {config.trustIndicators.map((indicator) => {
                  const IconComponent = (Icons as any)[indicator.icon] || Icons.Shield;
                  return (
                    <div key={indicator.id} className="flex flex-col items-center text-center">
                      <div
                        className="p-4 rounded-full mb-3 flex items-center justify-center"
                        style={colorOrGradientToCSS(indicator.iconBackground)}
                      >
                        <IconComponent className="h-8 w-8 text-white" />
                      </div>
                      <h4 className="font-bold text-gray-900 mb-1">{indicator.title}</h4>
                      <p className="text-sm text-gray-600">{indicator.description}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {config.trustIndicators.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <p>Adicione indicadores de confiança acima para visualizá-los aqui</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
