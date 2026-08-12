import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Car,
  CheckCircle2,
  ClipboardPaste,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

import adminService, { type PlateTechnicalData } from '@/api/adminService';
import { formatPlate } from '@/utils/licensePlate';

import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Textarea } from '../ui/textarea';

interface Props {
  isOpen: boolean;
  plate: string;
  onClose: () => void;
  onResolved: (data: PlateTechnicalData) => void;
}

/**
 * Consulta assistida de placa.
 *
 * A página de origem recusa acesso automatizado, mas responde normalmente a um
 * navegador de verdade. Então o atendente abre a consulta numa aba, copia o
 * conteúdo e cola aqui — o servidor extrai os dados técnicos e guarda na base
 * própria, de modo que a mesma placa nunca precise ser consultada de novo.
 */
export function AssistedPlateLookupDialog({ isOpen, plate, onClose, onResolved }: Props) {
  const [url, setUrl] = useState('');
  const [pageText, setPageText] = useState('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setPageText('');
      setUrl('');
      return;
    }

    const carregarUrl = async () => {
      setIsLoadingUrl(true);
      try {
        const { url: destino } = await adminService.getAssistedLookupUrl(plate);
        setUrl(destino);
      } catch {
        toast.error('Não foi possível montar o link de consulta');
      } finally {
        setIsLoadingUrl(false);
      }
    };

    void carregarUrl();
  }, [isOpen, plate]);

  const abrirConsulta = () => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const colarDaAreaDeTransferencia = async () => {
    try {
      const texto = await navigator.clipboard.readText();
      if (texto.trim()) {
        setPageText(texto);
        toast.success('Conteúdo colado');
      } else {
        toast.error('A área de transferência está vazia');
      }
    } catch {
      toast.error('Não foi possível ler a área de transferência. Cole manualmente com Ctrl+V.');
    }
  };

  const salvar = async () => {
    if (!pageText.trim()) {
      toast.error('Cole o conteúdo da página de consulta');
      return;
    }

    setIsSaving(true);
    try {
      const resultado = await adminService.saveAssistedLookupResult(plate, pageText);

      if (resultado.found && resultado.technicalData) {
        toast.success('Veículo identificado e salvo na base');
        onResolved(resultado.technicalData);
        onClose();
      } else {
        toast.error('Não foi possível identificar o veículo nesse conteúdo');
      }
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Erro ao processar a consulta';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(aberto) => !aberto && onClose()}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Consulta assistida — {formatPlate(plate)}
          </DialogTitle>
          <DialogDescription>
            A consulta é feita no seu navegador. Depois de identificada, a placa fica salva
            e não precisa ser consultada novamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
            <div className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-moria-orange text-xs font-bold text-white">
                1
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-sm font-medium">Abra a consulta</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={abrirConsulta}
                  disabled={!url || isLoadingUrl}
                >
                  {isLoadingUrl ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="mr-2 h-4 w-4" />
                  )}
                  Abrir consulta em nova aba
                </Button>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-moria-orange text-xs font-bold text-white">
                2
              </span>
              <div className="min-w-0 text-sm">
                <p className="font-medium">Copie a página</p>
                <p className="text-muted-foreground">
                  Na aba que abriu, selecione tudo (<strong>Ctrl+A</strong>) e copie
                  (<strong>Ctrl+C</strong>).
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-moria-orange text-xs font-bold text-white">
                3
              </span>
              <div className="min-w-0 text-sm">
                <p className="font-medium">Cole aqui e confirme</p>
                <p className="text-muted-foreground">
                  O sistema extrai marca, modelo, ano e cor automaticamente.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="assisted-page-text" className="text-sm font-medium">
                Conteúdo da página
              </label>
              <Button type="button" variant="ghost" size="sm" onClick={colarDaAreaDeTransferencia}>
                <ClipboardPaste className="mr-2 h-4 w-4" />
                Colar
              </Button>
            </div>
            <Textarea
              id="assisted-page-text"
              value={pageText}
              onChange={(e) => setPageText(e.target.value)}
              placeholder="Cole aqui o conteúdo copiado da página de consulta..."
              rows={7}
              className="font-mono text-xs"
            />
            {pageText.trim() && (
              <p className="flex items-center gap-1 text-xs text-green-700">
                <CheckCircle2 className="h-3 w-3" />
                {pageText.trim().length.toLocaleString('pt-BR')} caracteres prontos para processar
              </p>
            )}
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Se preferir, pule esta etapa e cadastre o veículo manualmente — o resultado é o
              mesmo, e a placa fica salva do mesmo jeito.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={salvar}
            disabled={isSaving || !pageText.trim()}
            className="bg-moria-orange hover:bg-moria-orange/90"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                Identificar veículo
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
