import { type ChangeEvent, useRef, useState } from 'react';
import { FileText, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import settingsService from '@/api/settingsService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { toast } from 'sonner';

type PdfBrandingField =
  | 'pdfHeaderLogoUrl'
  | 'pdfHeaderHtml'
  | 'pdfFooterLogoUrl'
  | 'pdfFooterHtml';

interface PdfBrandingSectionProps {
  storeName: string;
  pdfHeaderLogoUrl: string;
  pdfHeaderHtml: string;
  pdfFooterLogoUrl: string;
  pdfFooterHtml: string;
  onChange: (field: PdfBrandingField, value: string) => void;
}

type LogoSlot = 'header' | 'footer';

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const sanitizePreviewHtml = (value: string) =>
  value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');

function LogoUploadField({
  slot,
  title,
  description,
  value,
  onChange,
}: {
  slot: LogoSlot;
  title: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsUploading(true);
    try {
      const result = await settingsService.uploadPdfAsset(file, slot);
      onChange(result.url);
      toast.success(`Logo do ${slot === 'header' ? 'cabeçalho' : 'rodapé'} atualizado`);
    } catch (error: any) {
      toast.error('Erro ao enviar logo do PDF', {
        description: error?.message || 'Tente novamente.',
      });
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>{title}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4">
        {value ? (
          <div className="space-y-3">
            <div className="flex min-h-[112px] items-center justify-center rounded-lg border bg-white p-4">
              <img
                src={value}
                alt={title}
                className="max-h-20 w-auto max-w-full object-contain"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
                Trocar logo
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700"
                onClick={() => onChange('')}
                disabled={isUploading}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remover
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3">
            <div className="flex h-20 w-full items-center justify-center rounded-lg border bg-white text-muted-foreground">
              Sem logo configurado
            </div>
            <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={isUploading}>
              {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
              Enviar logo
            </Button>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

function SlotPreview({
  title,
  logoUrl,
  html,
}: {
  title: string;
  logoUrl: string;
  html: string;
}) {
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>Prévia aproximada do bloco que será aplicado ao PDF.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-2xl border bg-slate-50 p-5">
          {logoUrl || html.trim() ? (
            <div className="flex flex-col gap-4 sm:flex-row">
              {logoUrl ? (
                <div className="flex h-24 w-24 flex-none items-center justify-center rounded-xl border bg-white p-3">
                  <img src={logoUrl} alt={title} className="max-h-16 w-auto max-w-full object-contain" />
                </div>
              ) : null}
              <div
                className="prose prose-sm max-w-none text-slate-700"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed bg-white px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhum conteúdo configurado para este bloco.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function PdfBrandingSection({
  storeName,
  pdfHeaderLogoUrl,
  pdfHeaderHtml,
  pdfFooterLogoUrl,
  pdfFooterHtml,
  onChange,
}: PdfBrandingSectionProps) {
  const safeStoreName = escapeHtml(storeName || 'Nome da loja');
  const headerPreviewHtml = sanitizePreviewHtml(pdfHeaderHtml);
  const footerPreviewHtml = sanitizePreviewHtml(pdfFooterHtml);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-medium border-b pb-2">Branding dos PDFs</h3>
        <p className="text-sm text-muted-foreground">
          Configure o cabeçalho e o rodapé usados em orçamentos, revisões, relatórios e demais PDFs gerados pelo sistema.
        </p>
      </div>

      <Tabs defaultValue="header" className="space-y-4">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="header">Cabeçalho</TabsTrigger>
          <TabsTrigger value="footer">Rodapé</TabsTrigger>
        </TabsList>

        <TabsContent value="header" className="mt-0">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <div className="space-y-5">
              <LogoUploadField
                slot="header"
                title="Logo do cabeçalho"
                description="Use a marca principal da loja. Ela será exibida acima do conteúdo do PDF."
                value={pdfHeaderLogoUrl}
                onChange={(value) => onChange('pdfHeaderLogoUrl', value)}
              />
              <RichTextEditor
                label="Conteúdo do cabeçalho"
                description="Edite o texto institucional que acompanha o logo no topo do PDF."
                value={pdfHeaderHtml}
                onChange={(value) => onChange('pdfHeaderHtml', value)}
                placeholder="Digite o conteúdo do cabeçalho..."
                minHeight={220}
              />
            </div>
            <SlotPreview title="Prévia do cabeçalho" logoUrl={pdfHeaderLogoUrl} html={headerPreviewHtml} />
          </div>
        </TabsContent>

        <TabsContent value="footer" className="mt-0">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <div className="space-y-5">
              <LogoUploadField
                slot="footer"
                title="Logo do rodapé"
                description="Opcional. Use se quiser reforçar a marca também no fechamento do documento."
                value={pdfFooterLogoUrl}
                onChange={(value) => onChange('pdfFooterLogoUrl', value)}
              />
              <RichTextEditor
                label="Conteúdo do rodapé"
                description="Inclua informações finais, termos, agradecimentos ou contatos complementares."
                value={pdfFooterHtml}
                onChange={(value) => onChange('pdfFooterHtml', value)}
                placeholder="Digite o conteúdo do rodapé..."
                minHeight={220}
              />
            </div>
            <SlotPreview title="Prévia do rodapé" logoUrl={pdfFooterLogoUrl} html={footerPreviewHtml} />
          </div>
        </TabsContent>
      </Tabs>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-moria-orange" />
            Prévia resumida do PDF
          </CardTitle>
          <CardDescription>
            Simulação visual do documento com o cabeçalho e o rodapé da empresa aplicados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mx-auto max-w-3xl rounded-2xl border bg-white p-6 shadow-sm">
            <div className="space-y-4">
              <div className="rounded-2xl border bg-slate-50 p-5">
                {pdfHeaderLogoUrl || headerPreviewHtml.trim() ? (
                  <div className="flex flex-col gap-4 sm:flex-row">
                    {pdfHeaderLogoUrl ? (
                      <div className="flex h-20 w-20 flex-none items-center justify-center rounded-xl border bg-white p-3">
                        <img src={pdfHeaderLogoUrl} alt="Logo do cabeçalho" className="max-h-14 w-auto max-w-full object-contain" />
                      </div>
                    ) : null}
                    <div
                      className="prose prose-sm max-w-none text-slate-700"
                      dangerouslySetInnerHTML={{
                        __html: headerPreviewHtml || `<p><strong>${safeStoreName}</strong></p>`,
                      }}
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed bg-white px-4 py-8 text-center text-sm text-muted-foreground">
                    Sem cabeçalho configurado.
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-dashed bg-white p-6">
                <h4 className="text-lg font-semibold text-slate-900">Conteúdo do documento</h4>
                <p className="mt-2 text-sm text-slate-600">
                  Aqui entram os dados do orçamento, revisão ou relatório gerado pelo sistema.
                </p>
              </div>

              {(pdfFooterLogoUrl || footerPreviewHtml.trim()) ? (
                <div className="rounded-2xl border bg-slate-50 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row">
                    {pdfFooterLogoUrl ? (
                      <div className="flex h-20 w-20 flex-none items-center justify-center rounded-xl border bg-white p-3">
                        <img src={pdfFooterLogoUrl} alt="Logo do rodapé" className="max-h-14 w-auto max-w-full object-contain" />
                      </div>
                    ) : null}
                    <div
                      className="prose prose-sm max-w-none text-slate-700"
                      dangerouslySetInnerHTML={{ __html: footerPreviewHtml }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
