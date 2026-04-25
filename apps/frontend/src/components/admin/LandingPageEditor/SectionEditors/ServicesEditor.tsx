/**
 * ServicesEditor - Editor da secao "Nossos Servicos"
 */

import { Eye } from 'lucide-react';
import * as Icons from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ServicesSectionConfig, TrustIndicator } from '@/types/landingPage';

import {
  ArrayEditor,
  ColorOrGradientPicker,
  colorOrGradientToCSS,
  IconSelector,
} from '../StyleControls';

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
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <Label>Secao Ativa</Label>
            <p className="text-sm text-muted-foreground">
              Exibir ou ocultar a secao de Servicos na landing page
            </p>
          </div>
          <Switch checked={config.enabled} onCheckedChange={(enabled) => updateConfig({ enabled })} />
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-semibold">Textos da Secao</h3>

        <div className="space-y-2">
          <Label>Titulo</Label>
          <Input
            value={config.title}
            onChange={(e) => updateConfig({ title: e.target.value })}
            placeholder="Nossos Servicos"
          />
        </div>

        <div className="space-y-2">
          <Label>Subtitulo</Label>
          <Textarea
            value={config.subtitle}
            onChange={(e) => updateConfig({ subtitle: e.target.value })}
            placeholder="Oferecemos uma gama completa de servicos automotivos..."
            rows={3}
          />
        </div>
      </Card>

      <Card className="p-6">
        <ArrayEditor<TrustIndicator>
          label="Indicadores de Confianca"
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
                colors: ['#ffd900', '#ffa600', '#ab8617'],
              },
            },
            title: 'Novo Indicador',
            description: 'Descricao do indicador',
          })}
          getItemLabel={(item) => item.title}
          renderItem={(item, _, update) => (
            <div className="space-y-4">
              <IconSelector label="Icone" value={item.icon} onChange={(icon) => update({ icon })} />

              <ColorOrGradientPicker
                label="Cor de Fundo do Icone / Gradiente"
                value={item.iconBackground || { type: 'solid', solid: '#ff6600' }}
                onChange={(iconBackground) => update({ iconBackground })}
                defaultGradientPreset="goldMetallic"
                description="Cor solida ou gradiente para o fundo do icone"
              />

              <div className="space-y-2">
                <Label>Titulo</Label>
                <Input
                  value={item.title}
                  onChange={(e) => update({ title: e.target.value })}
                  placeholder="Garantia"
                />
              </div>

              <div className="space-y-2">
                <Label>Descricao</Label>
                <Input
                  value={item.description}
                  onChange={(e) => update({ description: e.target.value })}
                  placeholder="6 meses em todos os servicos"
                />
              </div>

              <div className="mt-4 rounded-lg border bg-gray-50 p-4">
                <p className="mb-2 text-xs font-semibold text-gray-600">Preview:</p>
                <div className="flex flex-col items-center text-center">
                  <div className="mb-2 rounded-full p-3" style={colorOrGradientToCSS(item.iconBackground)}>
                    <div className="h-6 w-6 text-white">✓</div>
                  </div>
                  <h4 className="text-sm font-bold">{item.title}</h4>
                  <p className="text-xs text-gray-600">{item.description}</p>
                </div>
              </div>
            </div>
          )}
          description="Cards exibidos abaixo da lista de servicos da landing."
          maxItems={6}
        />
      </Card>

      <Card className="p-6 bg-green-50 border-green-200">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-green-500 p-2 text-white">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="mb-1 font-semibold text-green-900">Secao de Servicos</h4>
            <p className="text-sm text-green-800">
              Esta secao exibe os servicos cadastrados no sistema e, abaixo, os indicadores de confianca
              configurados aqui.
            </p>
          </div>
        </div>
      </Card>

      <Card className="bg-gradient-to-r from-moria-orange/5 to-gold-accent/5 border-moria-orange/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-moria-orange" />
              <CardTitle>Preview dos Servicos</CardTitle>
            </div>
            <Badge className="bg-green-100 text-green-800">
              <div className="h-2 w-2 bg-green-600 rounded-full mr-2"></div>
              Atualizacao em tempo real
            </Badge>
          </div>
          <CardDescription>
            Estrutura alinhada com a secao real da landing publica
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-secondary p-8">
            <div className="mb-8 text-center">
              <h2 className="mb-2 text-3xl font-bold text-secondary-foreground">
                {config.title || 'Nossos Servicos'}
              </h2>
              <div className="mx-auto mb-4 h-1 w-20 rounded-full bg-primary" />
              <p className="mx-auto max-w-2xl text-lg text-secondary-foreground/60">
                {config.subtitle || 'Oferecemos servicos automotivos completos'}
              </p>
            </div>

            <div className="mb-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="rounded-lg border border-primary/20 bg-white p-6 text-left">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/15">
                    <Icons.Wrench className="h-6 w-6 text-primary" />
                  </div>
                  <div className="mb-3">
                    <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      Categoria
                    </span>
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-gray-900">Servico Exemplo {item}</h3>
                  <p className="mb-4 min-h-12 text-sm text-gray-600">
                    Descricao ilustrativa do servico, seguindo a estrutura real da landing.
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                    <span className="rounded-full border border-primary/15 px-3 py-1">1h</span>
                    <span className="rounded-full border border-primary/15 px-3 py-1">
                      A partir de R$ 99,90
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {config.trustIndicators.length ? (
              <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                {config.trustIndicators.map((indicator) => {
                  const IconComponent = (Icons as any)[indicator.icon] || Icons.Shield;

                  return (
                    <div
                      key={indicator.id}
                      className="flex flex-col items-center rounded-lg bg-white/70 p-5 text-center"
                    >
                      <div
                        className="mb-3 flex items-center justify-center rounded-full p-4"
                        style={colorOrGradientToCSS(indicator.iconBackground)}
                      >
                        <IconComponent className="h-8 w-8 text-white" />
                      </div>
                      <h4 className="mb-1 font-bold text-gray-900">{indicator.title}</h4>
                      <p className="text-sm text-gray-600">{indicator.description}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-400">
                <p>Adicione indicadores de confianca acima para visualiza-los aqui</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
