/**
 * ProductsEditor - Editor da secao de produtos
 */

import { Eye, Package } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ProductsSectionConfig } from '@/types/landingPage';

interface ProductsEditorProps {
  config: ProductsSectionConfig;
  onChange: (config: ProductsSectionConfig) => void;
}

export const ProductsEditor = ({ config, onChange }: ProductsEditorProps) => {
  const updateConfig = (updates: Partial<ProductsSectionConfig>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <Label>Secao Ativa</Label>
            <p className="text-sm text-muted-foreground">
              Exibir ou ocultar a secao de Produtos na landing page
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
            placeholder="Nossos Produtos"
          />
        </div>

        <div className="space-y-2">
          <Label>Subtitulo</Label>
          <Textarea
            value={config.subtitle}
            onChange={(e) => updateConfig({ subtitle: e.target.value })}
            placeholder="Temos as melhores pecas para o seu veiculo..."
            rows={3}
          />
        </div>
      </Card>

      <Card className="p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-blue-500 p-2 text-white">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="mb-1 font-semibold text-blue-900">Produtos Dinamicos</h4>
            <p className="text-sm text-blue-800">
              Os produtos desta secao sao carregados do catalogo. Aqui voce define apenas titulo e subtitulo.
            </p>
          </div>
        </div>
      </Card>

      <Card className="bg-gradient-to-r from-moria-orange/5 to-gold-accent/5 border-moria-orange/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-moria-orange" />
              <CardTitle>Preview dos Produtos</CardTitle>
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
              <h2 className="mb-2 text-3xl font-bold text-foreground">
                {config.title || 'Nossos Produtos'}
              </h2>
              <div className="mx-auto mb-4 h-1 w-20 rounded-full bg-primary" />
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                {config.subtitle || 'Produtos de qualidade para seu veiculo'}
              </p>
            </div>

            <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="overflow-hidden rounded-lg border border-primary/15 bg-white">
                  <div className="flex h-32 items-center justify-center border-b border-primary/10 bg-secondary/80">
                    <Package className="h-12 w-12 text-primary" />
                  </div>
                  <div className="p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="inline-block rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                        Categoria
                      </span>
                      <span className="text-xs text-secondary-foreground/50">Estoque: 10</span>
                    </div>
                    <p className="mb-1 text-sm font-semibold text-gray-900">Produto Exemplo {i}</p>
                    <p className="mb-3 text-xs text-gray-500">Descricao ilustrativa do produto</p>
                    <p className="mb-3 text-lg font-bold text-primary">R$ 99,90</p>
                    <div className="mb-2 rounded-md bg-primary px-3 py-2 text-center text-xs font-bold text-white">
                      Adicionar ao carrinho
                    </div>
                    <div className="text-center text-xs font-semibold text-primary">
                      Solicitar pelo WhatsApp
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <span className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-bold text-white">
                Solicitar Produto pelo WhatsApp
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
