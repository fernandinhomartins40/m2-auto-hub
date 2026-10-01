/**
 * LandingPageContent - Conteudo do editor da Landing Page
 * Integrado ao StorePanel - Responsivo mobile/desktop
 */

import { useState } from 'react';
import { useLandingPageConfig } from '@/hooks/useLandingPageConfig';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Save,
  RotateCcw,
  Download,
  Upload,
  Loader2,
  AlertCircle,
  Eye,
  MoreVertical,
  Palette,
} from 'lucide-react';
import {
  HeroEditor,
  HeaderEditor,
  FooterEditor,
  MarqueeEditor,
  ServicesEditor,
  ProductsEditor,
  PromotionsEditor,
  ContactEditor,
  HighlightsEditor,
} from '@/components/admin/LandingPageEditor/SectionEditors';
import { AboutEditor } from '@/components/admin/LandingPageEditor/SectionEditors/AboutEditor';
import { toast } from 'sonner';
import { AdminPageHeader } from './AdminPageHeader';

const orderedTabs = [
  { value: 'header', label: 'Cabeçalho', description: 'Logo, navegação e ações do topo.' },
  { value: 'hero', label: 'Hero compacto', description: 'Chamada principal dividida entre conteúdo e imagem.' },
  { value: 'contact', label: 'Faixa de destaques', description: 'Indicadores azuis exibidos logo abaixo do hero.' },
  { value: 'about', label: 'Cuidado à peça', description: 'Chamada de serviços e diferenciais da oficina.' },
  { value: 'aboutPage', label: 'Institucional', description: 'Imagem e painel azul sobre a história da empresa.' },
  { value: 'products', label: 'Produtos', description: 'Cabeçalho da lista compacta de produtos e preços.' },
  { value: 'services', label: 'Promoções', description: 'Cabeçalho das abas por período e campanhas.' },
  { value: 'marquee', label: 'Faixa promocional', description: 'Mensagens em movimento no final de Promoções.' },
  { value: 'contactPage', label: 'Contato e mapa', description: 'Formulário, opções de serviço e localização.' },
  { value: 'footer', label: 'Rodapé', description: 'Marca, contatos, redes sociais e links finais.' },
] as const;

export function LandingPageContent() {
  const {
    config,
    loading,
    isDirty,
    isSaving,
    error,
    updateConfig,
    save,
    reset,
    exportConfig,
    importConfig,
  } = useLandingPageConfig();

  const [activeTab, setActiveTab] = useState('header');

  const handleSave = async () => {
    await save(false);
  };

  const handleExport = () => {
    exportConfig();
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (event) => {
      const file = (event.currentTarget as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = event.target?.result as string;
          importConfig(json);
        } catch {
          toast.error('Erro ao importar: arquivo invalido');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleReset = () => {
    reset();
  };

  const handlePreview = () => {
    window.open('/', '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-moria-orange" />
            <p className="text-gray-600">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <AdminPageHeader
        icon={Palette}
        title="Editor da Landing Page"
        description="Edite o conteúdo da página pública seguindo a mesma ordem da landing page."
      />
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex-1">
          {isDirty && (
            <span className="text-sm text-orange-600 font-medium flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-orange-600 animate-pulse"></div>
              Alterações não salvas
            </span>
          )}
        </div>

        <div className="hidden md:flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={handlePreview} size="sm">
            <Eye className="h-4 w-4 shrink-0" />
            Visualizar
          </Button>

          <Button variant="outline" onClick={handleExport} title="Exportar (Ctrl+E)" size="sm">
            <Download className="h-4 w-4 shrink-0" />
            Exportar
          </Button>

          <Button variant="outline" onClick={handleImport} size="sm">
            <Upload className="h-4 w-4 shrink-0" />
            Importar
          </Button>

          <Button
            variant="outline"
            onClick={handleReset}
            className="text-red-600 hover:text-red-700"
            size="sm"
          >
            <RotateCcw className="h-4 w-4 shrink-0" />
            Restaurar padrão
          </Button>

          <Button
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className="bg-moria-orange hover:bg-moria-orange/90"
            size="sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 shrink-0" />
                Salvar
              </>
            )}
          </Button>
        </div>

        <div className="flex md:hidden items-center gap-2 w-full sm:w-auto">
          <Button
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className="bg-moria-orange hover:bg-moria-orange/90 flex-1 sm:flex-none"
            size="sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 shrink-0" />
                Salvar
              </>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handlePreview}>
                <Eye className="h-4 w-4 mr-2" />
                Visualizar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleImport}>
                <Upload className="h-4 w-4 mr-2" />
                Importar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleReset} className="text-red-600">
                <RotateCcw className="h-4 w-4 mr-2" />
                Restaurar padrão
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="p-4 md:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="mb-6">
            <div className="md:hidden overflow-x-auto scrollbar-hide -mx-4 px-4">
              <TabsList className="inline-flex w-auto">
                {orderedTabs.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="hidden md:block overflow-x-auto scrollbar-hide -mx-6 px-6">
              <TabsList className="inline-flex w-auto min-w-full">
                {orderedTabs.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value} className="text-sm">
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>

          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <p className="font-heading text-sm font-bold text-blue-950">
              {orderedTabs.find((tab) => tab.value === activeTab)?.label}
            </p>
            <p className="mt-1 text-sm text-blue-800/80">
              {orderedTabs.find((tab) => tab.value === activeTab)?.description}
            </p>
          </div>

          <TabsContent value="header" className="space-y-4 mt-0">
            <HeaderEditor
              config={config.header}
              onChange={(header) => updateConfig('header', header)}
            />
          </TabsContent>

          <TabsContent value="hero" className="space-y-4 mt-0">
            <HeroEditor config={config.hero} onChange={(hero) => updateConfig('hero', hero)} />
          </TabsContent>

          <TabsContent value="contact" className="space-y-4 mt-0">
            <HighlightsEditor
              config={config.contact}
              onChange={(contact) => updateConfig('contact', contact)}
            />
          </TabsContent>

          <TabsContent value="about" className="space-y-4 mt-0">
            <ServicesEditor config={config.about} onChange={(about) => updateConfig('about', about)} />
          </TabsContent>

          <TabsContent value="aboutPage" className="space-y-4 mt-0">
            <AboutEditor
              config={config.aboutPage}
              onChange={(aboutPage) => updateConfig('aboutPage', aboutPage)}
            />
          </TabsContent>

          <TabsContent value="products" className="space-y-4 mt-0">
            <ProductsEditor
              config={config.products}
              onChange={(products) => updateConfig('products', products)}
            />
          </TabsContent>

          <TabsContent value="services" className="space-y-4 mt-0">
            <PromotionsEditor
              config={config.services}
              onChange={(services) => updateConfig('services', services)}
            />
          </TabsContent>

          <TabsContent value="contactPage" className="space-y-4 mt-0">
            <ContactEditor
              config={config.contactPage}
              onChange={(contactPage) => updateConfig('contactPage', contactPage)}
            />
          </TabsContent>

          <TabsContent value="footer" className="space-y-4 mt-0">
            <FooterEditor config={config.footer} onChange={(footer) => updateConfig('footer', footer)} />
          </TabsContent>

          <TabsContent value="marquee" className="space-y-4 mt-0">
            <MarqueeEditor
              config={config.marquee}
              onChange={(marquee) => updateConfig('marquee', marquee)}
            />
          </TabsContent>
        </Tabs>
      </Card>

      <Card className="p-4 bg-gray-50">
        <h3 className="text-sm font-semibold mb-2">Atalhos de Teclado</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-xs text-gray-600">
          <div><kbd className="px-2 py-1 bg-white border rounded">Ctrl+S</kbd> Salvar</div>
          <div><kbd className="px-2 py-1 bg-white border rounded">Ctrl+E</kbd> Exportar</div>
          <div><kbd className="px-2 py-1 bg-white border rounded">Ctrl+R</kbd> Recarregar</div>
        </div>
      </Card>
    </div>
  );
}


