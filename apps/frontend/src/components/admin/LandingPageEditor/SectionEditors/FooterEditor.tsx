/**
 * FooterEditor - Editor da seção Footer (Rodapé)
 */

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  FooterConfig,
  FooterService,
  FooterSocialLink,
  FooterCertification,
  FooterBottomLink,
} from '@/types/landingPage';
import { ImageUploader, ArrayEditor, IconSelector, ColorOrGradientPicker } from '../StyleControls';
import { Eye, MapPin, Phone, Mail, Settings, MessageCircle } from 'lucide-react';
import * as Icons from 'lucide-react';
import Footer from '@/m2/components/Footer';
import { PreviewProviders } from './PreviewProviders';

interface FooterEditorProps {
  config: FooterConfig;
  onChange: (config: FooterConfig) => void;
}

export const FooterEditor = ({ config, onChange }: FooterEditorProps) => {
  const updateConfig = (updates: Partial<FooterConfig>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <Label>Seção Ativa</Label>
            <p className="text-sm text-muted-foreground">
              Exibir ou ocultar o footer na landing page
            </p>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(enabled) => updateConfig({ enabled })}
          />
        </div>
      </Card>

      <Card className="p-6">
        <ImageUploader
          label="Logo do Footer"
          value={config.logo}
          onChange={(logo) => updateConfig({ logo })}
          description="Logo exibida no rodapé"
          category="footer-logo"
        />
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-semibold">Descrição</h3>
        <Textarea
          value={config.description}
          onChange={(e) => updateConfig({ description: e.target.value })}
          placeholder="Breve descrição da empresa..."
          rows={3}
        />
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-semibold">Informações de Contato</h3>

        <div className="space-y-2">
          <Label>Endereço - Rua</Label>
          <Input
            value={config.contactInfo.address.street}
            onChange={(e) =>
              updateConfig({
                contactInfo: {
                  ...config.contactInfo,
                  address: {
                    ...config.contactInfo.address,
                    street: e.target.value,
                  },
                },
              })
            }
            placeholder="Rua Exemplo, 123"
          />
        </div>

        <div className="space-y-2">
          <Label>Endereço - Cidade</Label>
          <Input
            value={config.contactInfo.address.city}
            onChange={(e) =>
              updateConfig({
                contactInfo: {
                  ...config.contactInfo,
                  address: {
                    ...config.contactInfo.address,
                    city: e.target.value,
                  },
                },
              })
            }
            placeholder="São Paulo, SP"
          />
        </div>

        <div className="space-y-2">
          <Label>CEP</Label>
          <Input
            value={config.contactInfo.address.zipCode}
            onChange={(e) =>
              updateConfig({
                contactInfo: {
                  ...config.contactInfo,
                  address: {
                    ...config.contactInfo.address,
                    zipCode: e.target.value,
                  },
                },
              })
            }
            placeholder="12345-678"
          />
        </div>

        <div className="space-y-2">
          <Label>Telefone</Label>
          <Input
            value={config.contactInfo.phone}
            onChange={(e) =>
              updateConfig({
                contactInfo: {
                  ...config.contactInfo,
                  phone: e.target.value,
                },
              })
            }
            placeholder="(11) 1234-5678"
          />
        </div>

        <div className="space-y-2">
          <Label>E-mail</Label>
          <Input
            type="email"
            value={config.contactInfo.email}
            onChange={(e) =>
              updateConfig({
                contactInfo: {
                  ...config.contactInfo,
                  email: e.target.value,
                },
              })
            }
            placeholder="contato@m2centerauto.com.br"
          />
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-semibold">Horário de Funcionamento</h3>

        <div className="space-y-2">
          <Label>Dias de Semana</Label>
          <Textarea
            value={config.businessHours.weekdays}
            onChange={(e) =>
              updateConfig({
                businessHours: {
                  ...config.businessHours,
                  weekdays: e.target.value,
                },
              })
            }
            placeholder="Segunda a Sexta:&#10;8:00h às 18:00h"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>Sábado</Label>
          <Textarea
            value={config.businessHours.saturday}
            onChange={(e) =>
              updateConfig({
                businessHours: {
                  ...config.businessHours,
                  saturday: e.target.value,
                },
              })
            }
            placeholder="Sábado:&#10;8:00h às 12:00h"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>Domingo</Label>
          <Textarea
            value={config.businessHours.sunday}
            onChange={(e) =>
              updateConfig({
                businessHours: {
                  ...config.businessHours,
                  sunday: e.target.value,
                },
              })
            }
            placeholder="Domingo:&#10;Fechado"
            rows={2}
          />
        </div>
      </Card>

      <Card className="p-6">
        <ArrayEditor<FooterService>
          label="Lista de Serviços"
          items={config.services}
          onChange={(services) => updateConfig({ services })}
          createNew={() => ({
            id: Date.now().toString(),
            name: 'Novo Serviço',
          })}
          getItemLabel={(item) => item.name}
          renderItem={(item, _, update) => (
            <div className="space-y-2">
              <Label>Nome do Serviço</Label>
              <Input
                value={item.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="Troca de Óleo"
              />
            </div>
          )}
          maxItems={10}
        />
      </Card>

      <Card className="p-6">
        <ArrayEditor<FooterSocialLink>
          label="Redes Sociais"
          items={config.socialLinks}
          onChange={(socialLinks) => updateConfig({ socialLinks })}
          createNew={() => ({
            id: Date.now().toString(),
            platform: 'instagram',
            url: '',
            enabled: true,
          })}
          getItemLabel={(item) => `${item.platform} - ${item.enabled ? 'Ativo' : 'Inativo'}`}
          renderItem={(item, _, update) => (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Plataforma</Label>
                <select
                  value={item.platform}
                  onChange={(e) => update({ platform: e.target.value as any })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                >
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>URL</Label>
                <Input
                  value={item.url}
                  onChange={(e) => update({ url: e.target.value })}
                  placeholder="https://instagram.com/m2centerauto"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={item.enabled}
                  onCheckedChange={(enabled) => update({ enabled })}
                />
                <Label>Link ativo</Label>
              </div>
            </div>
          )}
          maxItems={5}
        />
      </Card>

      <Card className="p-6">
        <ArrayEditor<FooterCertification>
          label="Certificações e Selos"
          items={config.certifications}
          onChange={(certifications) => updateConfig({ certifications })}
          createNew={() => ({
            id: Date.now().toString(),
            icon: 'Shield',
            iconBackground: {
              type: 'gradient',
              gradient: {
                type: 'linear',
                angle: 135,
                colors: ['#ffd900', '#ffa600', '#ab8617'],
              },
            },
            title: 'Nova Certificação',
            description: 'Descrição',
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
                  placeholder="100% Garantido"
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  value={item.description}
                  onChange={(e) => update({ description: e.target.value })}
                  placeholder="Peças com garantia"
                />
              </div>
            </div>
          )}
          maxItems={5}
        />
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-semibold">Rodapé Inferior</h3>

        <div className="space-y-2">
          <Label>Texto de Copyright</Label>
          <Input
            value={config.copyright}
            onChange={(e) => updateConfig({ copyright: e.target.value })}
            placeholder="© 2026 M2 Center Auto. Todos os direitos reservados."
          />
        </div>

        <ArrayEditor<FooterBottomLink>
          label="Links Inferiores"
          items={config.bottomLinks}
          onChange={(bottomLinks) => updateConfig({ bottomLinks })}
          createNew={() => ({
            id: Date.now().toString(),
            text: 'Novo Link',
            href: '#',
          })}
          getItemLabel={(item) => item.text}
          renderItem={(item, _, update) => (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Texto</Label>
                <Input
                  value={item.text}
                  onChange={(e) => update({ text: e.target.value })}
                  placeholder="Política de Privacidade"
                />
              </div>

              <div className="space-y-2">
                <Label>Link</Label>
                <Input
                  value={item.href}
                  onChange={(e) => update({ href: e.target.value })}
                  placeholder="/politica-privacidade"
                />
              </div>
            </div>
          )}
          maxItems={5}
        />
      </Card>

      <Card className="bg-gradient-to-r from-moria-orange/5 to-gold-accent/5 border-moria-orange/20">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-moria-orange" />
              <CardTitle>Preview do Footer</CardTitle>
            </div>
            <Badge className="bg-green-100 text-green-800">
              <div className="h-2 w-2 bg-green-600 rounded-full mr-2"></div>
              Atualização em tempo real
            </Badge>
          </div>
          <CardDescription>
            Estrutura alinhada com o footer real da landing publica
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-background overflow-hidden rounded-lg border">
            <PreviewProviders config={{ footer: config }}>
              <Footer />
            </PreviewProviders>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
