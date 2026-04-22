/**
 * ContactEditor - Editor completo da Página de Contato
 */

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ContactConfig, ContactInfoCard, ContactServiceType } from '@/types/landingPage';
import { ArrayEditor, ColorOrGradientPicker, colorOrGradientToCSS } from '../StyleControls';
import { stringToColorOrGradient } from '@/utils/colorHelpers';
import { Eye, MapPin, Phone, Mail, Clock, MessageCircle, CheckCircle } from 'lucide-react';
import * as Icons from 'lucide-react';

interface ContactEditorProps {
  config: ContactConfig;
  onChange: (config: ContactConfig) => void;
}

export const ContactEditor = ({ config, onChange }: ContactEditorProps) => {
  const updateConfig = (updates: Partial<ContactConfig>) => {
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
              Exibir ou ocultar a página de Contato no menu
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
          label="Cor de Fundo Cards / Gradiente"
          value={config.cardsBackgroundColor || { type: 'solid', solid: '#f9fafb' }}
          onChange={(cardsBackgroundColor) => updateConfig({ cardsBackgroundColor })}
          description="Cor de fundo da seção de cards de informação"
        />

        <ColorOrGradientPicker
          label="Cor de Fundo Formulário / Gradiente"
          value={config.formBackgroundColor || { type: 'solid', solid: '#ffffff' }}
          onChange={(formBackgroundColor) => updateConfig({ formBackgroundColor })}
          description="Cor de fundo da seção do formulário e mapa"
        />

        <ColorOrGradientPicker
          label="Cor de Fundo CTA / Gradiente"
          value={config.ctaBackgroundColor || { type: 'solid', solid: '#ff6600' }}
          onChange={(ctaBackgroundColor) => updateConfig({ ctaBackgroundColor })}
          defaultGradientPreset="orangeToGold"
          description="Cor de fundo do CTA final (WhatsApp)"
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
            placeholder="Fale Conosco"
          />
        </div>

        <div className="space-y-2">
          <Label>Título</Label>
          <Input
            value={config.heroTitle || ''}
            onChange={(e) => updateConfig({ heroTitle: e.target.value })}
            placeholder="Entre em Contato"
          />
          <p className="text-xs text-muted-foreground">
            A última palavra será destacada em dourado
          </p>
        </div>

        <div className="space-y-2">
          <Label>Subtítulo</Label>
          <Textarea
            value={config.heroSubtitle || ''}
            onChange={(e) => updateConfig({ heroSubtitle: e.target.value })}
            placeholder="Estamos prontos para ajudar com suas necessidades automotivas..."
            rows={3}
          />
        </div>
      </Card>

      {/* Contact Info Cards */}
      <Card className="p-6">
        <ArrayEditor<ContactInfoCard>
          label="Cards de Informações de Contato"
          items={config.contactInfoCards || []}
          onChange={(contactInfoCards) => updateConfig({ contactInfoCards })}
          createNew={() => ({
            id: Date.now().toString(),
            icon: 'MapPin',
            title: 'Novo Card',
            content: ['Linha 1', 'Linha 2'],
            color: { type: 'solid', solid: '#2563eb' }
          })}
          getItemLabel={(item) => `${item.title}`}
          renderItem={(item, _, update) => (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Ícone (Lucide)</Label>
                <Input
                  value={item.icon}
                  onChange={(e) => update({ icon: e.target.value })}
                  placeholder="MapPin, Phone, Mail, Clock"
                />
                <p className="text-xs text-muted-foreground">
                  Exemplos: MapPin, Phone, Mail, Clock, MessageCircle
                </p>
              </div>

              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={item.title}
                  onChange={(e) => update({ title: e.target.value })}
                  placeholder="Endereço"
                />
              </div>

              <div className="space-y-2">
                <Label>Conteúdo (uma linha por item)</Label>
                <Textarea
                  value={item.content.join('\n')}
                  onChange={(e) => update({ content: e.target.value.split('\n') })}
                  placeholder="Rua das Oficinas, 123&#10;Centro - São Paulo/SP&#10;CEP: 01234-567"
                  rows={3}
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
          description="Cards exibidos com informações de contato (endereço, telefone, e-mail, horário)"
          maxItems={6}
        />
      </Card>

      {/* Form Section */}
      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-semibold">Seção do Formulário</h3>

        <div className="space-y-2">
          <Label>Título do Formulário</Label>
          <Input
            value={config.formTitle || ''}
            onChange={(e) => updateConfig({ formTitle: e.target.value })}
            placeholder="Envie sua Mensagem"
          />
          <p className="text-xs text-muted-foreground">
            A última palavra será destacada em dourado
          </p>
        </div>

        <div className="space-y-2">
          <Label>Subtítulo do Formulário</Label>
          <Textarea
            value={config.formSubtitle || ''}
            onChange={(e) => updateConfig({ formSubtitle: e.target.value })}
            placeholder="Preencha o formulário abaixo e entraremos em contato..."
            rows={2}
          />
        </div>
      </Card>

      {/* Service Types */}
      <Card className="p-6">
        <ArrayEditor<ContactServiceType>
          label="Tipos de Serviço"
          items={config.serviceTypes || []}
          onChange={(serviceTypes) => updateConfig({ serviceTypes })}
          createNew={() => ({
            id: Date.now().toString(),
            name: 'Novo Tipo de Serviço'
          })}
          getItemLabel={(item) => item.name}
          renderItem={(item, _, update) => (
            <div className="space-y-2">
              <Label>Nome do Serviço</Label>
              <Input
                value={item.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="Manutenção Preventiva"
              />
            </div>
          )}
          description="Opções disponíveis no campo 'Tipo de Serviço' do formulário"
          maxItems={10}
        />
      </Card>

      {/* Map Section */}
      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-semibold">Seção do Mapa</h3>

        <div className="space-y-2">
          <Label>Título</Label>
          <Input
            value={config.mapTitle || ''}
            onChange={(e) => updateConfig({ mapTitle: e.target.value })}
            placeholder="Nossa Localização"
          />
          <p className="text-xs text-muted-foreground">
            A última palavra será destacada em dourado
          </p>
        </div>

        <div className="space-y-2">
          <Label>Subtítulo</Label>
          <Textarea
            value={config.mapSubtitle || ''}
            onChange={(e) => updateConfig({ mapSubtitle: e.target.value })}
            placeholder="Visite nossa oficina para um atendimento presencial..."
            rows={2}
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <div>
            <Label>Exibir Cards de Informação Rápida</Label>
            <p className="text-sm text-muted-foreground">
              Cards abaixo do mapa (Atendimento Rápido, WhatsApp 24h, etc)
            </p>
          </div>
          <Switch
            checked={config.quickInfoEnabled ?? true}
            onCheckedChange={(quickInfoEnabled) => updateConfig({ quickInfoEnabled })}
          />
        </div>
      </Card>

      {/* CTA Section */}
      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-semibold">Seção CTA (Call to Action)</h3>

        <div className="space-y-2">
          <Label>Título</Label>
          <Input
            value={config.ctaTitle || ''}
            onChange={(e) => updateConfig({ ctaTitle: e.target.value })}
            placeholder="Precisa de Ajuda Imediata?"
          />
        </div>

        <div className="space-y-2">
          <Label>Subtítulo</Label>
          <Input
            value={config.ctaSubtitle || ''}
            onChange={(e) => updateConfig({ ctaSubtitle: e.target.value })}
            placeholder="Entre em contato via WhatsApp para atendimento prioritário"
          />
        </div>
      </Card>


      {/* Preview */}
      <Card className="bg-gradient-to-r from-moria-orange/5 to-gold-accent/5 border-moria-orange/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-moria-orange" />
              <CardTitle>Preview da Página de Contato</CardTitle>
            </div>
            <Badge className="bg-green-100 text-green-800">
              <div className="h-2 w-2 bg-green-600 rounded-full mr-2"></div>
              Atualização em tempo real
            </Badge>
          </div>
          <CardDescription>
            Veja como a página de contato aparecerá no site
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-white rounded-lg overflow-hidden">
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
                  {config.heroBadge || 'Fale Conosco'}
                </Badge>
                <h1 className="text-3xl font-bold mb-3">
                  {(config.heroTitle || 'Entre em Contato').split(' ').map((word, i, arr) =>
                    i === arr.length - 1 ?
                      <span key={i} className="gold-metallic">{word}</span> :
                      <span key={i}>{word} </span>
                  )}
                </h1>
                <p className="text-gray-300 max-w-2xl mx-auto">
                  {config.heroSubtitle || 'Estamos prontos para ajudar com suas necessidades automotivas.'}
                </p>
              </div>
            </div>

            {/* Contact Info Cards */}
            <div
              className="py-8 px-4"
              style={{
                ...colorOrGradientToCSS(config.cardsBackgroundColor),
                ...(config.cardsBackgroundColor ? {} : { backgroundColor: '#f9fafb' })
              }}
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(config.contactInfoCards || []).slice(0, 4).map((info, index) => {
                  const IconComponent = (Icons as any)[info.icon] || MapPin;
                  return (
                    <div key={index} className="bg-white p-3 rounded-lg text-center shadow-sm">
                      <div className="bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-2">
                        <IconComponent
                          className="h-5 w-5"
                          style={colorOrGradientToCSS(info.color, { forText: true })}
                        />
                      </div>
                      <h3 className="font-bold text-sm mb-1 text-moria-black">
                        {info.title}
                      </h3>
                      {info.content.slice(0, 2).map((line, i) => (
                        <p key={i} className="text-gray-600 text-xs">
                          {line}
                        </p>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Form & Map Section */}
            <div
              className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4"
              style={{
                ...colorOrGradientToCSS(config.formBackgroundColor),
                ...(config.formBackgroundColor ? {} : { backgroundColor: '#ffffff' })
              }}
            >
              {/* Form */}
              <div>
                <h2 className="text-xl font-bold mb-2">
                  {(config.formTitle || 'Envie sua Mensagem').split(' ').map((word, i, arr) =>
                    i === arr.length - 1 ?
                      <span key={i} className="gold-metallic">{word}</span> :
                      <span key={i}>{word} </span>
                  )}
                </h2>
                <p className="text-gray-600 text-sm mb-4">
                  {config.formSubtitle || 'Preencha o formulário abaixo...'}
                </p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-100 h-8 rounded"></div>
                    <div className="bg-gray-100 h-8 rounded"></div>
                  </div>
                  <div className="bg-gray-100 h-8 rounded"></div>
                  <div className="bg-gray-100 h-16 rounded"></div>
                  <div className="bg-moria-orange h-8 rounded text-white text-xs flex items-center justify-center">
                    Enviar Mensagem
                  </div>
                </div>
              </div>

              {/* Map */}
              <div>
                <h2 className="text-xl font-bold mb-2">
                  {(config.mapTitle || 'Nossa Localização').split(' ').map((word, i, arr) =>
                    i === arr.length - 1 ?
                      <span key={i} className="gold-metallic">{word}</span> :
                      <span key={i}>{word} </span>
                  )}
                </h2>
                <p className="text-gray-600 text-sm mb-4">
                  {config.mapSubtitle || 'Visite nossa oficina...'}
                </p>
                <div className="bg-gray-200 h-32 rounded flex items-center justify-center mb-3">
                  <MapPin className="h-8 w-8 text-gray-400" />
                </div>
                {config.quickInfoEnabled && (
                  <div className="space-y-2">
                    {[
                      { icon: CheckCircle, title: 'Atendimento Rápido', color: 'moria-orange' },
                      { icon: MessageCircle, title: 'WhatsApp 24h', color: 'green-500' }
                    ].map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <div key={i} className="border-l-4 border-l-moria-orange bg-gray-50 p-2 rounded flex items-center space-x-2">
                          <Icon className="h-4 w-4 text-moria-orange" />
                          <span className="font-semibold text-xs">{item.title}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* CTA Section */}
            <div
              className="py-8 px-4 text-white text-center"
              style={{
                ...colorOrGradientToCSS(config.ctaBackgroundColor),
                ...(config.ctaBackgroundColor ? {} : {
                  background: 'linear-gradient(to right, #FF6B35, #D4AF37)'
                })
              }}
            >
              <h2 className="text-2xl font-bold mb-2">
                {config.ctaTitle || 'Precisa de Ajuda Imediata?'}
              </h2>
              <p className="mb-4 opacity-90">
                {config.ctaSubtitle || 'Entre em contato via WhatsApp'}
              </p>
              <div className="bg-white text-moria-orange px-4 py-2 rounded inline-flex items-center text-sm font-semibold">
                <MessageCircle className="mr-2 h-4 w-4" />
                Falar Agora no WhatsApp
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informação */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <div className="bg-blue-500 text-white p-2 rounded-full">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-blue-900 mb-1">Página de Contato</h4>
            <p className="text-sm text-blue-800">
              Configure todos os elementos da página de contato: informações de contato,
              formulário, mapa e call-to-action para WhatsApp.
            </p>
            <p className="text-sm text-blue-800 mt-2">
              <strong>Dica:</strong> Mantenha as informações sempre atualizadas para facilitar
              o contato dos clientes.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
