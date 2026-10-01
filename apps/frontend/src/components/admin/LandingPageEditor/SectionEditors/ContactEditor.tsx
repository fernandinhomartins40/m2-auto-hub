import { Eye, Info } from 'lucide-react';

import Contact from '@/components/Contact';
import GoogleMap from '@/components/GoogleMap';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { ContactConfig, ContactServiceType } from '@/types/landingPage';
import { ArrayEditor } from '../StyleControls';
import { PreviewProviders } from './PreviewProviders';

interface ContactEditorProps {
  config: ContactConfig;
  onChange: (config: ContactConfig) => void;
}

export const ContactEditor = ({ config, onChange }: ContactEditorProps) => {
  const updateConfig = (updates: Partial<ContactConfig>) => onChange({ ...config, ...updates });

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label>Seção ativa</Label>
            <p className="text-sm text-muted-foreground">
              Exibe o formulário e o mapa lado a lado antes do rodapé.
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
          <h3 className="text-lg font-semibold">Chamada do formulário</h3>
          <p className="text-sm text-muted-foreground">
            O título visual “Vamos cuidar do seu carro?” é fixo no layout; personalize o texto de apoio.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Texto de apoio</Label>
          <Textarea
            value={config.formSubtitle || ''}
            onChange={(event) => updateConfig({ formSubtitle: event.target.value })}
            placeholder="Conte o que você precisa. Nossa equipe atende pelo WhatsApp."
            rows={2}
          />
        </div>
      </Card>

      <Card className="p-6">
        <ArrayEditor<ContactServiceType>
          label="Tipos de serviço"
          items={config.serviceTypes || []}
          onChange={(serviceTypes) => updateConfig({ serviceTypes })}
          createNew={() => ({ id: Date.now().toString(), name: 'Novo tipo de serviço' })}
          getItemLabel={(item) => item.name}
          renderItem={(item, _, update) => (
            <div className="space-y-2">
              <Label>Nome do serviço</Label>
              <Input
                value={item.name}
                onChange={(event) => update({ name: event.target.value })}
                placeholder="Manutenção preventiva"
              />
            </div>
          )}
          description="Opções exibidas no seletor Tipo de serviço do formulário."
          maxItems={10}
        />
      </Card>

      <Card className="border-blue-200 bg-blue-50 p-5">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 text-blue-700" />
          <p className="text-sm text-blue-900">
            Endereço, cidade, estado, telefone, WhatsApp e URL do mapa são gerenciados em
            <strong> Configurações da loja</strong> e aparecem automaticamente neste bloco.
          </p>
        </div>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              <CardTitle>Prévia de contato e mapa</CardTitle>
            </div>
            <Badge className="bg-green-100 text-green-800">Atualização em tempo real</Badge>
          </div>
          <CardDescription>Mesma composição em duas colunas usada na landing page.</CardDescription>
        </CardHeader>
        <CardContent>
          <PreviewProviders config={{ contactPage: config }}>
            <div className="grid gap-6 bg-white p-4 lg:grid-cols-2">
              <Contact />
              <GoogleMap />
            </div>
          </PreviewProviders>
        </CardContent>
      </Card>
    </div>
  );
};
