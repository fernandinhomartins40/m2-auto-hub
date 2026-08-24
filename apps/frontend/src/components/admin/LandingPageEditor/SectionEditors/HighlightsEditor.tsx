import { Eye } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { HighlightsConfig, HighlightItem, HighlightValueType } from '@/types/landingPage';
import { ArrayEditor, IconSelector } from '../StyleControls';
import { PreviewProviders } from './PreviewProviders';
import Highlights from '@/components/Highlights';

interface HighlightsEditorProps {
  config: HighlightsConfig;
  onChange: (config: HighlightsConfig) => void;
}

const valueTypeLabels: Record<HighlightValueType, string> = {
  products: 'Total de produtos',
  services: 'Total de servicos',
  promotions: 'Total de promocoes',
  whatsapp: 'WhatsApp da loja',
  custom: 'Texto personalizado',
};

export const HighlightsEditor = ({ config, onChange }: HighlightsEditorProps) => {
  const updateConfig = (updates: Partial<HighlightsConfig>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <Label>Secao ativa</Label>
            <p className="text-sm text-muted-foreground">
              Exibir ou ocultar os cards de destaques abaixo do hero
            </p>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(enabled) => updateConfig({ enabled })}
          />
        </div>
      </Card>

      <Card className="p-6">
        <ArrayEditor<HighlightItem>
          label="Cards de Destaque"
          items={config.items}
          onChange={(items) => updateConfig({ items })}
          createNew={() => ({
            id: Date.now().toString(),
            icon: 'Package',
            title: 'Novo destaque',
            valueType: 'custom',
            customValue: 'Texto livre',
          })}
          getItemLabel={(item) => item.title}
          renderItem={(item, _, update) => (
            <div className="space-y-4">
              <IconSelector
                label="Icone"
                value={item.icon}
                onChange={(icon) => update({ icon })}
              />

              <div className="space-y-2">
                <Label>Titulo</Label>
                <Input
                  value={item.title}
                  onChange={(event) => update({ title: event.target.value })}
                  placeholder="Catalogo Integrado"
                />
              </div>

              <div className="space-y-2">
                <Label>Valor exibido</Label>
                <Select
                  value={item.valueType}
                  onValueChange={(value) => update({ valueType: value as HighlightValueType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de valor" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(valueTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {item.valueType === 'custom' ? (
                <div className="space-y-2">
                  <Label>Texto personalizado</Label>
                  <Input
                    value={item.customValue || ''}
                    onChange={(event) => update({ customValue: event.target.value })}
                    placeholder="Entrega em toda a regiao"
                  />
                </div>
              ) : null}
            </div>
          )}
          description="Esses cards aparecem logo abaixo do hero e podem mostrar totais dinamicos ou texto personalizado."
          maxItems={6}
        />
      </Card>

      <Card className="bg-gradient-to-r from-moria-orange/5 to-gold-accent/5 border-moria-orange/20">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-moria-orange" />
              <CardTitle>Preview dos Destaques</CardTitle>
            </div>
            <Badge className="bg-green-100 text-green-800">
              <div className="h-2 w-2 bg-green-600 rounded-full mr-2"></div>
              Atualizacao em tempo real
            </Badge>
          </div>
          <CardDescription>
            Veja como os cards de destaque aparecerao na landing page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-background overflow-hidden rounded-lg border">
            <PreviewProviders config={{ contact: config }}>
              <div className="px-6 pt-20 pb-6 bg-background">
                <Highlights />
              </div>
            </PreviewProviders>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
