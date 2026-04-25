/**
 * LandingPageContent - Conteúdo do editor da Landing Page
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

  const [activeTab, setActiveTab] = useState('hero');

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
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = event.target?.result as string;
          importConfig(json);
        } catch (err) {
          toast.error('Erro ao importar: arquivo inválido');
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
      {/* Header Actions - Desktop e Mobile */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex-1">
          {isDirty && (
            <span className="text-sm text-orange-600 font-medium flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-orange-600 animate-pulse"></div>
              Alterações não salvas
            </span>
          )}
        </div>

        {/* Actions - Desktop */}
        <div className="hidden md:flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={handlePreview}
            size="sm"
          >
            <Eye className="h-4 w-4 mr-2" />
            Visualizar
          </Button>

          <Button
            variant="outline"
            onClick={handleExport}
            title="Exportar (Ctrl+E)"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>

          <Button
            variant="outline"
            onClick={handleImport}
            size="sm"
          >
            <Upload className="h-4 w-4 mr-2" />
            Importar
          </Button>

          <Button
            variant="outline"
            onClick={handleReset}
            className="text-red-600 hover:text-red-700"
            size="sm"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Restaurar Padrão
          </Button>

          <Button
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className="bg-moria-orange hover:bg-moria-orange/90"
            size="sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </>
            )}
          </Button>
        </div>

        {/* Actions - Mobile (Dropdown Menu) */}
        <div className="flex md:hidden items-center gap-2 w-full sm:w-auto">
          <Button
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className="bg-moria-orange hover:bg-moria-orange/90 flex-1 sm:flex-none"
            size="sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
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
                Restaurar Padrão
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Alertas */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Conteúdo Principal */}
      <Card className="p-4 md:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* TabsList - Mobile: Scroll Horizontal sem barra, Desktop: Grid */}
          <div className="mb-6">
            {/* Mobile: Scroll Horizontal sem barra visível */}
            <div className="md:hidden overflow-x-auto scrollbar-hide -mx-4 px-4">
              <TabsList className="inline-flex w-auto">
                <TabsTrigger value="header" className="text-xs">Header</TabsTrigger>
                <TabsTrigger value="hero" className="text-xs">Hero</TabsTrigger>
                <TabsTrigger value="contact" className="text-xs">Destaques</TabsTrigger>
                <TabsTrigger value="marquee" className="text-xs">Marquee</TabsTrigger>
                <TabsTrigger value="about" className="text-xs">Serviços</TabsTrigger>
                <TabsTrigger value="products" className="text-xs">Peças</TabsTrigger>
                <TabsTrigger value="services" className="text-xs">Promoções</TabsTrigger>
                <TabsTrigger value="aboutPage" className="text-xs">Sobre</TabsTrigger>
                <TabsTrigger value="contactPage" className="text-xs">Contato</TabsTrigger>
                <TabsTrigger value="footer" className="text-xs">Footer</TabsTrigger>
              </TabsList>
            </div>

            {/* Desktop: Scroll Horizontal sem barra visível */}
            <div className="hidden md:block overflow-x-auto scrollbar-hide -mx-6 px-6">
              <TabsList className="inline-flex w-auto min-w-full">
                <TabsTrigger value="header" className="text-sm">Header</TabsTrigger>
                <TabsTrigger value="hero" className="text-sm">Hero</TabsTrigger>
                <TabsTrigger value="contact" className="text-sm">Destaques</TabsTrigger>
                <TabsTrigger value="marquee" className="text-sm">Marquee</TabsTrigger>
                <TabsTrigger value="about" className="text-sm">Serviços</TabsTrigger>
                <TabsTrigger value="products" className="text-sm">Peças</TabsTrigger>
                <TabsTrigger value="services" className="text-sm">Promoções</TabsTrigger>
                <TabsTrigger value="aboutPage" className="text-sm">Sobre</TabsTrigger>
                <TabsTrigger value="contactPage" className="text-sm">Contato</TabsTrigger>
                <TabsTrigger value="footer" className="text-sm">Footer</TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="hero" className="space-y-4 mt-0">
            <HeroEditor
              config={config.hero}
              onChange={(hero) => updateConfig('hero', hero)}
            />
          </TabsContent>

          <TabsContent value="header" className="space-y-4 mt-0">
            <HeaderEditor
              config={config.header}
              onChange={(header) => updateConfig('header', header)}
            />
          </TabsContent>

          <TabsContent value="marquee" className="space-y-4 mt-0">
            <MarqueeEditor
              config={config.marquee}
              onChange={(marquee) => updateConfig('marquee', marquee)}
            />
          </TabsContent>

          <TabsContent value="contact" className="space-y-4 mt-0">
            <HighlightsEditor
              config={config.contact}
              onChange={(contact) => updateConfig('contact', contact)}
            />
          </TabsContent>

          <TabsContent value="about" className="space-y-4 mt-0">
            <ServicesEditor
              config={config.about}
              onChange={(about) => updateConfig('about', about)}
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

          <TabsContent value="aboutPage" className="space-y-4 mt-0">
            <AboutEditor
              config={config.aboutPage}
              onChange={(aboutPage) => updateConfig('aboutPage', aboutPage)}
            />
          </TabsContent>

          <TabsContent value="footer" className="space-y-4 mt-0">
            <FooterEditor
              config={config.footer}
              onChange={(footer) => updateConfig('footer', footer)}
            />
          </TabsContent>
        </Tabs>
      </Card>

      {/* Shortcuts Help */}
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
