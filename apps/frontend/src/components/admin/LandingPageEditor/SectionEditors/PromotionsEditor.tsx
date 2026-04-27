/**
 * PromotionsEditor - Editor da seção de promoções
 */

import { Eye } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { PromotionsSectionConfig } from '@/types/landingPage';
import Promotions from '@/m2/components/Promotions';
import { PreviewProviders } from './PreviewProviders';

interface PromotionsEditorProps {
  config: PromotionsSectionConfig;
  onChange: (config: PromotionsSectionConfig) => void;
}

export const PromotionsEditor = ({ config, onChange }: PromotionsEditorProps) => {
  const updateConfig = (updates: Partial<PromotionsSectionConfig>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <Label>Secao Ativa</Label>
            <p className="text-sm text-muted-foreground">
              Exibir ou ocultar a seção de Promoções na landing page
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
            placeholder="Promoções Ativas"
          />
        </div>

        <div className="space-y-2">
          <Label>Subtitulo</Label>
          <Textarea
            value={config.subtitle}
            onChange={(e) => updateConfig({ subtitle: e.target.value })}
            placeholder="Aproveite nossas ofertas especiais por tempo limitado..."
            rows={3}
          />
        </div>
      </Card>

      <Card className="p-6 bg-purple-50 border-purple-200">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-purple-500 p-2 text-white">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="mb-1 font-semibold text-purple-900">Ofertas Dinamicas</h4>
            <p className="text-sm text-purple-800">
              As promoções são carregadas do sistema. Aqui você define apenas título e subtítulo da seção.
            </p>
          </div>
        </div>
      </Card>

      <Card className="bg-gradient-to-r from-moria-orange/5 to-gold-accent/5 border-moria-orange/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-moria-orange" />
              <CardTitle>Preview das Promoções</CardTitle>
            </div>
            <Badge className="bg-green-100 text-green-800">
              <div className="h-2 w-2 bg-green-600 rounded-full mr-2"></div>
              Atualizacao em tempo real
            </Badge>
          </div>
          <CardDescription>
            Estrutura alinhada com a seção real da landing pública
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-background overflow-hidden rounded-lg border">
            <PreviewProviders config={{ services: config }}>
              <Promotions />
            </PreviewProviders>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
