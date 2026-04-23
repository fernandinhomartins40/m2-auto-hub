/**
 * PromotionsEditor - Editor da seção Promoções
 */

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { PromotionsSectionConfig } from '@/types/landingPage';
// ColorOrGradientPicker disponível em '../StyleControls' se necessário
import { Eye, Timer } from 'lucide-react';

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
      {/* Habilitado */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <Label>Seção Ativa</Label>
            <p className="text-sm text-muted-foreground">
              Exibir ou ocultar a seção de Promoções na landing page
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
            placeholder="Promoções Imperdíveis"
          />
          <p className="text-xs text-muted-foreground">
            A primeira palavra será destacada em dourado
          </p>
        </div>

        <div className="space-y-2">
          <Label>Subtítulo</Label>
          <Textarea
            value={config.subtitle}
            onChange={(e) => updateConfig({ subtitle: e.target.value })}
            placeholder="Aproveite nossas ofertas especiais por tempo limitado..."
            rows={3}
          />
        </div>
      </Card>


      {/* Informação */}
      <Card className="p-6 bg-purple-50 border-purple-200">
        <div className="flex items-start gap-3">
          <div className="bg-purple-500 text-white p-2 rounded-full">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-purple-900 mb-1">Ofertas Dinâmicas</h4>
            <p className="text-sm text-purple-800">
              As promoções exibidas nesta seção são carregadas automaticamente do sistema de ofertas.
              Aqui você configura apenas o título e subtítulo da seção.
            </p>
            <p className="text-sm text-purple-800 mt-2">
              Para criar e gerenciar ofertas (Dia, Semana, Mês), utilize a seção
              <strong> Ofertas </strong> no painel administrativo.
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
              <CardTitle>Preview das Promoções</CardTitle>
            </div>
            <Badge className="bg-green-100 text-green-800">
              <div className="h-2 w-2 bg-green-600 rounded-full mr-2"></div>
              Atualização em tempo real
            </Badge>
          </div>
          <CardDescription>
            Veja como a seção de promoções aparecerá na landing page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gradient-to-br from-gray-900 to-moria-black text-white p-8 rounded-lg">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-3">
                {config.title.split(' ').map((word, i) =>
                  i === 0 ?
                    <span key={i} className="gold-metallic">{word} </span> :
                    <span key={i}>{word} </span>
                )}
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                {config.subtitle || 'Aproveite nossas ofertas especiais'}
              </p>
            </div>

            {/* Sample Products */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                { title: 'Produto em Destaque', discount: 40, oldPrice: 100, newPrice: 60 },
                { title: 'Oferta da Semana', discount: 30, oldPrice: 80, newPrice: 56 },
                { title: 'Kit Promocional', discount: 50, oldPrice: 150, newPrice: 75 }
              ].map((product, i) => (
                <div key={i} className="bg-white rounded-lg overflow-hidden">
                  <div className="bg-gray-700 h-32 flex items-center justify-center">
                    <Timer className="h-12 w-12 text-moria-orange" />
                  </div>
                  <div className="p-4">
                    <Badge className="bg-primary text-primary-foreground mb-2">-{product.discount}%</Badge>
                    <p className="text-sm font-semibold text-gray-900 mb-2">{product.title}</p>
                    <div>
                      <span className="text-xs text-gray-500 line-through">R$ {product.oldPrice.toFixed(2)}</span>
                      <span className="text-xl font-bold text-primary ml-2">R$ {product.newPrice.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Info */}
            <div className="p-4 bg-moria-orange/20 border border-moria-orange/30 rounded text-center">
              <p className="text-sm">
                ⚡ Ofertas por tempo limitado • 🚚 Frete grátis acima de R$ 150,00
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
