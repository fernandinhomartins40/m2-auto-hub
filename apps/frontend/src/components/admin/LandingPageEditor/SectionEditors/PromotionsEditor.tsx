/**
 * PromotionsEditor - Editor da secao de promocoes
 */

import { Eye, Timer } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { PromotionsSectionConfig } from '@/types/landingPage';

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
              Exibir ou ocultar a secao de Promocoes na landing page
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
            placeholder="Promocoes Ativas"
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
              As promocoes sao carregadas do sistema. Aqui voce define apenas titulo e subtitulo da secao.
            </p>
          </div>
        </div>
      </Card>

      <Card className="bg-gradient-to-r from-moria-orange/5 to-gold-accent/5 border-moria-orange/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-moria-orange" />
              <CardTitle>Preview das Promocoes</CardTitle>
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
          <div
            className="rounded-lg p-8 text-white"
            style={{ background: 'linear-gradient(135deg, hsl(215 50% 23%), hsl(222 84% 5%))' }}
          >
            <div className="mb-12 text-center">
              <h2 className="mb-2 text-3xl font-bold text-secondary-foreground">
                {config.title || 'Promocoes Ativas'}
              </h2>
              <p className="text-secondary-foreground/60">
                {config.subtitle || 'Aproveite nossas ofertas especiais por tempo limitado.'}
              </p>
            </div>

            <div className="mb-12 grid gap-6 md:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="relative overflow-hidden rounded-xl border border-primary/25 bg-secondary/80 p-6"
                >
                  <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-3xl" />
                  <div className="relative z-10">
                    <span className="mb-4 inline-block rounded-full bg-badge-highlight px-3 py-1 text-xs font-bold text-primary-foreground">
                      DESTAQUE
                    </span>
                    <h3 className="mb-2 text-2xl font-bold text-secondary-foreground">
                      Promocao Exemplo {item}
                    </h3>
                    <p className="mb-4 text-sm text-secondary-foreground/60">
                      Descricao ilustrativa da promocao, como aparece na landing.
                    </p>
                    <div className="mb-3 rounded-md border border-primary/20 bg-primary/10 px-4 py-2">
                      <span className="text-sm font-semibold text-primary">
                        Condicao especial por tempo limitado
                      </span>
                    </div>
                    <div className="mb-5 text-xs text-secondary-foreground/70">
                      Codigo promocional: <span className="font-bold text-primary">M2{item}0</span>
                    </div>
                    <div className="rounded-md bg-primary px-6 py-3 text-center font-bold text-primary-foreground">
                      Aproveitar Agora
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="overflow-hidden rounded-lg border border-primary/15 bg-secondary/50 py-3">
              <div className="whitespace-nowrap px-4 text-sm">
                <span className="mx-8 font-semibold text-primary">* Promocoes validas enquanto durarem os estoques</span>
                <span className="mx-8 text-secondary-foreground/70">* Fale com a equipe para conferir disponibilidade</span>
                <span className="mx-8 font-semibold text-primary">* Condicoes sujeitas a alteracao</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
