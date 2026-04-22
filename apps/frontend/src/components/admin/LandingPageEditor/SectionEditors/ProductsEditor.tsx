/**
 * ProductsEditor - Editor da seção Peças Originais
 */

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ProductsSectionConfig } from '@/types/landingPage';
// ColorOrGradientPicker disponível em '../StyleControls' se necessário
import { Eye, Package } from 'lucide-react';

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
      {/* Habilitado */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <Label>Seção Ativa</Label>
            <p className="text-sm text-muted-foreground">
              Exibir ou ocultar a seção de Peças na landing page
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
            placeholder="Peças Originais"
          />
          <p className="text-xs text-muted-foreground">
            A última palavra será destacada em dourado
          </p>
        </div>

        <div className="space-y-2">
          <Label>Subtítulo</Label>
          <Textarea
            value={config.subtitle}
            onChange={(e) => updateConfig({ subtitle: e.target.value })}
            placeholder="Temos as melhores peças para o seu veículo..."
            rows={3}
          />
        </div>
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
            <h4 className="font-semibold text-blue-900 mb-1">Produtos Dinâmicos</h4>
            <p className="text-sm text-blue-800">
              Os produtos exibidos nesta seção são carregados automaticamente do catálogo de produtos.
              Aqui você configura apenas o título e subtítulo da seção.
            </p>
            <p className="text-sm text-blue-800 mt-2">
              Para gerenciar os produtos (adicionar, editar, remover), utilize a seção
              <strong> Produtos </strong> no painel administrativo.
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
              <CardTitle>Preview das Peças</CardTitle>
            </div>
            <Badge className="bg-green-100 text-green-800">
              <div className="h-2 w-2 bg-green-600 rounded-full mr-2"></div>
              Atualização em tempo real
            </Badge>
          </div>
          <CardDescription>
            Veja como a seção de peças aparecerá na landing page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-white p-8 rounded-lg">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-3">
                {config.title.split(' ').map((word, i, arr) =>
                  i === arr.length - 1 ?
                    <span key={i} className="gold-metallic">{word}</span> :
                    <span key={i}>{word} </span>
                )}
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                {config.subtitle || 'Produtos de qualidade para seu veículo'}
              </p>
            </div>

            {/* Sample Products */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="bg-gray-100 h-32 flex items-center justify-center">
                    <Package className="h-12 w-12 text-gray-400" />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold text-gray-900 mb-1">Peça Original {i}</p>
                    <p className="text-xs text-gray-500 mb-2">Categoria Exemplo</p>
                    <p className="text-lg font-bold text-moria-orange">R$ 99,90</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-6">
              <p className="text-sm text-gray-500">
                💡 Os produtos reais serão carregados do catálogo do sistema
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
