/**
 * AboutEditor - Editor completo da Página Sobre Nós
 */

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AboutConfig, AboutMilestone, AboutValue, AboutStat, AboutService } from '@/types/landingPage';
import { ArrayEditor, ColorOrGradientPicker, colorOrGradientToCSS } from '../StyleControls';
import { stringToColorOrGradient } from '@/utils/colorHelpers';
import { Eye, Clock, Shield, Heart, Target, Users, CheckCircle, Award, Star } from 'lucide-react';
import * as Icons from 'lucide-react';

interface AboutEditorProps {
  config: AboutConfig;
  onChange: (config: AboutConfig) => void;
}

export const AboutEditor = ({ config, onChange }: AboutEditorProps) => {
  const updateConfig = (updates: Partial<AboutConfig>) => {
    onChange({ ...config, ...updates });
  };

  // Segurança: retornar loading se config não estiver pronto
  if (!config) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center text-gray-500">
          <p>Carregando configuração...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Habilitado */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <Label>Página Ativa</Label>
            <p className="text-sm text-muted-foreground">
              Exibir ou ocultar a página Sobre Nós no menu
            </p>
          </div>
          <Switch
            checked={config.enabled ?? true}
            onCheckedChange={(enabled) => updateConfig({ enabled })}
          />
        </div>
      </Card>

      {/* Cores e Estilos */}
      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-semibold">Cores e Estilos</h3>
        <p className="text-sm text-muted-foreground">
          Personalize as cores de fundo de cada seção
        </p>

        <ColorOrGradientPicker
          label="Cor de Fundo Hero / Gradiente"
          value={config.heroBackgroundColor || { type: 'solid', solid: '#1a1a1a' }}
          onChange={(heroBackgroundColor) => updateConfig({ heroBackgroundColor })}
          defaultGradientPreset="darkToGray"
          description="Cor de fundo da seção hero (topo)"
        />

        <ColorOrGradientPicker
          label="Cor de Fundo Estatísticas / Gradiente"
          value={config.statsBackgroundColor || { type: 'solid', solid: '#f9fafb' }}
          onChange={(statsBackgroundColor) => updateConfig({ statsBackgroundColor })}
          description="Cor de fundo da seção de estatísticas"
        />

        <ColorOrGradientPicker
          label="Cor de Fundo História / Gradiente"
          value={config.historyBackgroundColor || { type: 'solid', solid: '#ffffff' }}
          onChange={(historyBackgroundColor) => updateConfig({ historyBackgroundColor })}
          description="Cor de fundo da seção de história"
        />

        <ColorOrGradientPicker
          label="Cor da Linha do Tempo / Gradiente"
          value={config.timelineColor || { type: 'solid', solid: '#ff6600' }}
          onChange={(timelineColor) => updateConfig({ timelineColor })}
          description="Cor da linha vertical do timeline"
        />

        <ColorOrGradientPicker
          label="Cor de Fundo Valores / Gradiente"
          value={config.valuesBackgroundColor || { type: 'solid', solid: '#111827' }}
          onChange={(valuesBackgroundColor) => updateConfig({ valuesBackgroundColor })}
          description="Cor de fundo da seção de valores"
        />

        <ColorOrGradientPicker
          label="Cor de Fundo Serviços / Gradiente"
          value={config.servicesBackgroundColor || { type: 'solid', solid: '#ffffff' }}
          onChange={(servicesBackgroundColor) => updateConfig({ servicesBackgroundColor })}
          description="Cor de fundo da seção de serviços"
        />

        <ColorOrGradientPicker
          label="Cor de Fundo Compromisso / Gradiente"
          value={config.commitmentBackgroundColor || { type: 'solid', solid: '#ff6600' }}
          onChange={(commitmentBackgroundColor) => updateConfig({ commitmentBackgroundColor })}
          defaultGradientPreset="orangeToGold"
          description="Cor de fundo da seção de compromisso (CTA final)"
        />
      </Card>

      {/* Hero Section */}
      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-semibold">Seção Hero</h3>

        <div className="space-y-2">
          <Label>Badge</Label>
          <Input
            value={config.heroBadge || ''}
            onChange={(e) => updateConfig({ heroBadge: e.target.value })}
            placeholder="Sobre Nós"
          />
        </div>

        <div className="space-y-2">
          <Label>Título</Label>
          <Input
            value={config.heroTitle || ''}
            onChange={(e) => updateConfig({ heroTitle: e.target.value })}
            placeholder="Mais de 15 Anos"
          />
        </div>

        <div className="space-y-2">
          <Label>Destaque (aparece em dourado)</Label>
          <Input
            value={config.heroHighlight || ''}
            onChange={(e) => updateConfig({ heroHighlight: e.target.value })}
            placeholder="Cuidando do Seu Veículo"
          />
        </div>

        <div className="space-y-2">
          <Label>Subtítulo</Label>
          <Textarea
            value={config.heroSubtitle || ''}
            onChange={(e) => updateConfig({ heroSubtitle: e.target.value })}
            placeholder="Especialistas em peças automotivas e serviços de qualidade..."
            rows={3}
          />
        </div>
      </Card>

      {/* Stats */}
      <Card className="p-6">
        <ArrayEditor<AboutStat>
          label="Estatísticas"
          items={config.stats || []}
          onChange={(stats) => updateConfig({ stats })}
          createNew={() => ({
            id: Date.now().toString(),
            number: '0+',
            label: 'Nova Estatística'
          })}
          getItemLabel={(item) => `${item.number} - ${item.label}`}
          renderItem={(item, _, update) => (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número</Label>
                <Input
                  value={item.number}
                  onChange={(e) => update({ number: e.target.value })}
                  placeholder="15+"
                />
                <p className="text-xs text-muted-foreground">
                  Ex: 15+, 10k+, 5k+, 50k+
                </p>
              </div>
              <div className="space-y-2">
                <Label>Label</Label>
                <Input
                  value={item.label}
                  onChange={(e) => update({ label: e.target.value })}
                  placeholder="Anos de Experiência"
                />
              </div>
            </div>
          )}
          description="Estatísticas exibidas em destaque (experiência, estoque, clientes, serviços)"
          maxItems={4}
        />
      </Card>

      {/* História */}
      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-semibold">Nossa História</h3>

        <div className="space-y-2">
          <Label>Título</Label>
          <Input
            value={config.historyTitle || ''}
            onChange={(e) => updateConfig({ historyTitle: e.target.value })}
            placeholder="Nossa História"
          />
          <p className="text-xs text-muted-foreground">
            A última palavra será destacada em dourado
          </p>
        </div>

        <div className="space-y-2">
          <Label>Subtítulo</Label>
          <Textarea
            value={config.historySubtitle || ''}
            onChange={(e) => updateConfig({ historySubtitle: e.target.value })}
            placeholder="Uma jornada de dedicação, crescimento e compromisso..."
            rows={2}
          />
        </div>
      </Card>

      {/* Milestones */}
      <Card className="p-6">
        <ArrayEditor<AboutMilestone>
          label="Marcos da História"
          items={config.milestones || []}
          onChange={(milestones) => updateConfig({ milestones })}
          createNew={() => ({
            id: Date.now().toString(),
            year: new Date().getFullYear().toString(),
            title: 'Novo Marco',
            description: 'Descrição do marco'
          })}
          getItemLabel={(item) => `${item.year} - ${item.title}`}
          renderItem={(item, _, update) => (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ano</Label>
                  <Input
                    value={item.year}
                    onChange={(e) => update({ year: e.target.value })}
                    placeholder="2024"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    value={item.title}
                    onChange={(e) => update({ title: e.target.value })}
                    placeholder="Fundação"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  value={item.description}
                  onChange={(e) => update({ description: e.target.value })}
                  placeholder="Início da Moria Peças e Serviços"
                />
              </div>
            </div>
          )}
          description="Timeline com os marcos históricos da empresa"
          maxItems={10}
        />
      </Card>

      {/* Valores */}
      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-semibold">Nossos Valores</h3>

        <div className="space-y-2">
          <Label>Título</Label>
          <Input
            value={config.valuesTitle || ''}
            onChange={(e) => updateConfig({ valuesTitle: e.target.value })}
            placeholder="Nossos Valores"
          />
          <p className="text-xs text-muted-foreground">
            A última palavra será destacada em dourado
          </p>
        </div>

        <div className="space-y-2">
          <Label>Subtítulo</Label>
          <Textarea
            value={config.valuesSubtitle || ''}
            onChange={(e) => updateConfig({ valuesSubtitle: e.target.value })}
            placeholder="Os princípios que guiam nossa empresa..."
            rows={2}
          />
        </div>
      </Card>

      {/* Values Items */}
      <Card className="p-6">
        <ArrayEditor<AboutValue>
          label="Valores da Empresa"
          items={config.values || []}
          onChange={(values) => updateConfig({ values })}
          createNew={() => ({
            id: Date.now().toString(),
            icon: 'Shield',
            title: 'Novo Valor',
            description: 'Descrição do valor',
            color: { type: 'solid', solid: '#2563eb' }
          })}
          getItemLabel={(item) => item.title}
          renderItem={(item, _, update) => (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Ícone (Lucide)</Label>
                <Input
                  value={item.icon}
                  onChange={(e) => update({ icon: e.target.value })}
                  placeholder="Shield, Heart, Target, Users"
                />
                <p className="text-xs text-muted-foreground">
                  Exemplos: Shield, Heart, Target, Users, Award, Star
                </p>
              </div>

              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={item.title}
                  onChange={(e) => update({ title: e.target.value })}
                  placeholder="Qualidade"
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={item.description}
                  onChange={(e) => update({ description: e.target.value })}
                  placeholder="Compromisso com peças originais e serviços de alta qualidade"
                  rows={2}
                />
              </div>

              <ColorOrGradientPicker
                label="Cor do Ícone / Gradiente"
                value={stringToColorOrGradient(item.color) || { type: 'solid', solid: '#ff6600' }}
                onChange={(color) => update({ color })}
                defaultGradientPreset="orangeToGold"
                description="Cor sólida ou gradiente para o ícone"
              />
            </div>
          )}
          description="Valores e princípios da empresa"
          maxItems={6}
        />
      </Card>

      {/* Serviços */}
      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-semibold">Nossos Serviços</h3>

        <div className="space-y-2">
          <Label>Título</Label>
          <Input
            value={config.servicesTitle || ''}
            onChange={(e) => updateConfig({ servicesTitle: e.target.value })}
            placeholder="Nossos Serviços"
          />
          <p className="text-xs text-muted-foreground">
            A última palavra será destacada em dourado
          </p>
        </div>

        <div className="space-y-2">
          <Label>Subtítulo</Label>
          <Textarea
            value={config.servicesSubtitle || ''}
            onChange={(e) => updateConfig({ servicesSubtitle: e.target.value })}
            placeholder="Oferecemos uma ampla gama de serviços especializados..."
            rows={2}
          />
        </div>
      </Card>

      {/* Services List */}
      <Card className="p-6">
        <ArrayEditor<AboutService>
          label="Lista de Serviços"
          items={config.services || []}
          onChange={(services) => updateConfig({ services })}
          createNew={() => ({
            id: Date.now().toString(),
            name: 'Novo Serviço'
          })}
          getItemLabel={(item) => item.name}
          renderItem={(item, _, update) => (
            <div className="space-y-2">
              <Label>Nome do Serviço</Label>
              <Input
                value={item.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="Manutenção Preventiva e Corretiva"
              />
            </div>
          )}
          description="Lista de serviços oferecidos pela empresa"
          maxItems={15}
        />
      </Card>

      {/* Compromisso */}
      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-semibold">Nosso Compromisso</h3>

        <div className="space-y-2">
          <Label>Título</Label>
          <Input
            value={config.commitmentTitle || ''}
            onChange={(e) => updateConfig({ commitmentTitle: e.target.value })}
            placeholder="Nosso Compromisso"
          />
        </div>

        <div className="space-y-2">
          <Label>Texto do Compromisso</Label>
          <Textarea
            value={config.commitmentText || ''}
            onChange={(e) => updateConfig({ commitmentText: e.target.value })}
            placeholder="Garantir que cada cliente tenha a melhor experiência possível..."
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label>Anos de Excelência</Label>
          <Input
            value={config.commitmentYears || ''}
            onChange={(e) => updateConfig({ commitmentYears: e.target.value })}
            placeholder="15+ Anos de Excelência"
          />
        </div>
      </Card>


      {/* Preview */}
      <Card className="bg-gradient-to-r from-moria-orange/5 to-gold-accent/5 border-moria-orange/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-moria-orange" />
              <CardTitle>Preview da Página Sobre Nós</CardTitle>
            </div>
            <Badge className="bg-green-100 text-green-800">
              <div className="h-2 w-2 bg-green-600 rounded-full mr-2"></div>
              Atualização em tempo real
            </Badge>
          </div>
          <CardDescription>
            Veja como a página Sobre Nós aparecerá no site
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-white rounded-lg overflow-hidden max-h-[600px] overflow-y-auto">
            {/* Hero Section */}
            <div
              className="relative py-12 text-white"
              style={{
                ...colorOrGradientToCSS(config.heroBackgroundColor),
                ...(config.heroBackgroundColor ? {} : {
                  background: 'linear-gradient(to bottom right, #1a1a1a, #374151)'
                })
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-moria-orange/10 to-transparent"></div>
              <div className="relative z-10 text-center px-4">
                <Badge className="mb-4 bg-moria-orange text-white px-3 py-1">
                  {config.heroBadge || 'Sobre Nós'}
                </Badge>
                <h1 className="text-3xl font-bold mb-2">
                  {config.heroTitle} <span className="gold-metallic">{config.heroHighlight}</span>
                </h1>
                <p className="text-gray-300 max-w-2xl mx-auto text-sm">
                  {config.heroSubtitle || 'Especialistas em peças automotivas e serviços de qualidade.'}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div
              className="py-8 px-4"
              style={{
                ...colorOrGradientToCSS(config.statsBackgroundColor),
                ...(config.statsBackgroundColor ? {} : { backgroundColor: '#f9fafb' })
              }}
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(config.stats || []).slice(0, 4).map((stat, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg shadow text-center">
                    <div className="text-2xl font-bold text-moria-orange mb-1">
                      {stat.number}
                    </div>
                    <div className="text-gray-600 text-xs font-medium">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* História */}
            <div
              className="py-8 px-4"
              style={{
                ...colorOrGradientToCSS(config.historyBackgroundColor),
                ...(config.historyBackgroundColor ? {} : { backgroundColor: '#ffffff' })
              }}
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">
                  {(config.historyTitle || 'Nossa História').split(' ').map((word, i, arr) =>
                    i === arr.length - 1 ?
                      <span key={i} className="gold-metallic">{word}</span> :
                      <span key={i}>{word} </span>
                  )}
                </h2>
                <p className="text-gray-600 text-sm">
                  {config.historySubtitle || 'Uma jornada de dedicação e crescimento'}
                </p>
              </div>

              {/* Timeline */}
              <div className="space-y-4">
                {(config.milestones || []).slice(0, 4).map((milestone, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div
                      className="rounded-full w-10 h-10 flex items-center justify-center text-white flex-shrink-0"
                      style={{
                        ...colorOrGradientToCSS(config.timelineColor),
                        ...(config.timelineColor ? {} : { backgroundColor: '#FF6B35' })
                      }}
                    >
                      <Clock className="h-4 w-4" />
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg flex-1">
                      <Badge className="bg-gold-accent text-moria-black mb-1 text-xs">
                        {milestone.year}
                      </Badge>
                      <h3 className="text-sm font-bold text-moria-black">
                        {milestone.title}
                      </h3>
                      <p className="text-gray-600 text-xs">
                        {milestone.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Valores */}
            <div
              className="py-8 px-4 text-white"
              style={{
                ...colorOrGradientToCSS(config.valuesBackgroundColor),
                ...(config.valuesBackgroundColor ? {} : { backgroundColor: '#111827' })
              }}
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">
                  {(config.valuesTitle || 'Nossos Valores').split(' ').map((word, i, arr) =>
                    i === arr.length - 1 ?
                      <span key={i} className="gold-metallic">{word}</span> :
                      <span key={i}>{word} </span>
                  )}
                </h2>
                <p className="text-gray-300 text-sm">
                  {config.valuesSubtitle || 'Os princípios que guiam nossa empresa'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {(config.values || []).slice(0, 4).map((value, index) => {
                  const IconComponent = (Icons as any)[value.icon] || Shield;
                  return (
                    <div key={index} className="bg-white/10 border border-white/20 p-3 rounded-lg text-center">
                      <div className="bg-white/10 rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-2">
                        <IconComponent
                          className="h-5 w-5"
                          style={colorOrGradientToCSS(value.color, { forText: true })}
                        />
                      </div>
                      <h3 className="text-sm font-bold mb-1">
                        {value.title}
                      </h3>
                      <p className="text-gray-300 text-xs">
                        {value.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Serviços */}
            <div
              className="py-8 px-4"
              style={{
                ...colorOrGradientToCSS(config.servicesBackgroundColor),
                ...(config.servicesBackgroundColor ? {} : { backgroundColor: '#ffffff' })
              }}
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">
                  {(config.servicesTitle || 'Nossos Serviços').split(' ').map((word, i, arr) =>
                    i === arr.length - 1 ?
                      <span key={i} className="gold-metallic">{word}</span> :
                      <span key={i}>{word} </span>
                  )}
                </h2>
                <p className="text-gray-600 text-sm">
                  {config.servicesSubtitle || 'Oferecemos uma ampla gama de serviços'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(config.services || []).slice(0, 6).map((service, index) => (
                  <div key={index} className="flex items-center p-2 bg-gray-50 rounded hover:bg-moria-orange/10 transition-colors">
                    <CheckCircle className="h-3 w-3 text-moria-orange mr-2 flex-shrink-0" />
                    <span className="text-gray-700 text-xs font-medium">{service.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Compromisso */}
            <div
              className="py-8 px-4 text-white text-center"
              style={{
                ...colorOrGradientToCSS(config.commitmentBackgroundColor),
                ...(config.commitmentBackgroundColor ? {} : {
                  background: 'linear-gradient(to right, #FF6B35, #D4AF37)'
                })
              }}
            >
              <Award className="h-10 w-10 mx-auto mb-3 text-white" />
              <h2 className="text-2xl font-bold mb-3">
                {config.commitmentTitle || 'Nosso Compromisso'}
              </h2>
              <p className="mb-4 text-sm leading-relaxed max-w-2xl mx-auto">
                {config.commitmentText || 'Garantir que cada cliente tenha a melhor experiência possível'}
              </p>
              <div className="flex justify-center items-center space-x-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 text-yellow-300 fill-yellow-300" />
                ))}
                <span className="ml-2 text-sm font-semibold">
                  {config.commitmentYears || '15+ Anos de Excelência'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informação */}
      <Card className="p-6 bg-purple-50 border-purple-200">
        <div className="flex items-start gap-3">
          <div className="bg-purple-500 text-white p-2 rounded-full">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-purple-900 mb-1">Página Sobre Nós</h4>
            <p className="text-sm text-purple-800">
              Configure todos os elementos da página institucional: história, valores,
              estatísticas, serviços e compromisso com os clientes.
            </p>
            <p className="text-sm text-purple-800 mt-2">
              <strong>Dica:</strong> Use essa página para transmitir credibilidade e
              construir confiança com seus clientes.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
