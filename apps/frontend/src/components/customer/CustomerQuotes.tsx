import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  FileDown,
  FileText,
  Loader2,
  MapPin,
  MessageSquare,
  RefreshCw,
  Search,
  ThumbsDown,
  ThumbsUp,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import customerService, { CustomerQuote } from '@/api/customerService';
import type { Quote as AdminQuote } from '@/api/adminService';
import { buildQuotePdfHtml, getQuotePdfFilename } from '@/utils/quotePdf';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { RequestQuoteModal } from './RequestQuoteModal';
import { formatCurrency } from '@/lib/format';

interface CustomerQuotesProps {
  onNavigateToProfile?: () => void;
}

const STATUS_CONFIG: Record<
  CustomerQuote['status'],
  { label: string; className: string }
> = {
  PENDING: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800' },
  ANALYZING: { label: 'Em analise', className: 'bg-purple-100 text-purple-800' },
  QUOTED: { label: 'Aguardando sua aprovacao', className: 'bg-blue-100 text-blue-800' },
  APPROVED: { label: 'Aprovado por voce', className: 'bg-green-100 text-green-800' },
  REJECTED: { label: 'Recusado por voce', className: 'bg-red-100 text-red-800' },
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return 'Nao informado';
  }

  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const toPdfQuote = (quote: CustomerQuote): AdminQuote => ({
  id: quote.id,
  userId: quote.userId,
  customerName: quote.customerName,
  customerWhatsApp: quote.customerWhatsApp,
  items: quote.items.map((item) => ({
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    price: item.price,
    quotedPrice: item.quotedPrice,
  })),
  total: quote.total,
  status: quote.status,
  createdAt: quote.createdAt,
  updatedAt: quote.updatedAt,
  quotedAt: quote.quotedAt || null,
  quoteApprovedAt: quote.quoteApprovedAt || null,
  quoteNotes: quote.quoteNotes || quote.observations || null,
  source:
    quote.source === 'PHONE'
      ? 'phone'
      : quote.source === 'WEB'
        ? 'website'
        : 'website',
});

export function CustomerQuotes({ onNavigateToProfile }: CustomerQuotesProps) {
  const { customer } = useAuth();
  const { toast } = useToast();
  const [quotes, setQuotes] = useState<CustomerQuote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | CustomerQuote['status']>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [exportingQuoteId, setExportingQuoteId] = useState<string | null>(null);

  const loadQuotes = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await customerService.getMyQuotes();
      setQuotes(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar orcamentos',
        description:
          error.response?.data?.message ||
          error.response?.data?.error ||
          'Nao foi possivel carregar seus orcamentos.',
        variant: 'destructive',
      });
      setQuotes([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadQuotes();
  }, [loadQuotes]);

  const filteredQuotes = useMemo(() => {
    return quotes.filter(
      (quote) => {
        const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
        if (!matchesStatus) {
          return false;
        }

        if (!searchTerm.trim()) {
          return true;
        }

        const normalizedSearch = searchTerm.trim().toLowerCase();
        return (
          quote.id.toLowerCase().includes(normalizedSearch) ||
          quote.items.some((item) => item.name.toLowerCase().includes(normalizedSearch))
        );
      }
    );
  }, [quotes, searchTerm, statusFilter]);

  const stats = useMemo(
    () => ({
      total: quotes.length,
      pending: quotes.filter((quote) => ['PENDING', 'ANALYZING'].includes(quote.status)).length,
      quoted: quotes.filter((quote) => quote.status === 'QUOTED').length,
      approved: quotes.filter((quote) => quote.status === 'APPROVED').length,
    }),
    [quotes]
  );

  const handleApprove = async (quoteId: string) => {
    try {
      const result = await customerService.approveQuote(quoteId);
      toast({
        title: 'Orcamento aprovado e convertido em pedido',
        description: result.message,
      });
      await loadQuotes();
    } catch (error: any) {
      toast({
        title: 'Erro ao aprovar orcamento',
        description:
          error.response?.data?.message ||
          error.response?.data?.error ||
          'Nao foi possivel aprovar o orcamento.',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (quoteId: string) => {
    try {
      const result = await customerService.rejectQuote(quoteId);
      toast({
        title: 'Orcamento rejeitado',
        description: result.message,
      });
      await loadQuotes();
    } catch (error: any) {
      toast({
        title: 'Erro ao rejeitar orcamento',
        description:
          error.response?.data?.message ||
          error.response?.data?.error ||
          'Nao foi possivel rejeitar o orcamento.',
        variant: 'destructive',
      });
    }
  };

  const handleExportPdf = async (quote: CustomerQuote) => {
    try {
      setExportingQuoteId(quote.id);
      const pdfQuote = toPdfQuote(quote);
      await customerService.exportQuotePdf(quote.id, {
        html: buildQuotePdfHtml(pdfQuote),
        filename: getQuotePdfFilename(pdfQuote),
      });
      toast({
        title: 'PDF gerado',
        description: `O orcamento #${quote.id.slice(0, 8)} foi exportado com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao exportar PDF',
        description:
          error.response?.data?.message ||
          error.response?.data?.error ||
          'Nao foi possivel gerar o PDF do orcamento.',
        variant: 'destructive',
      });
    } finally {
      setExportingQuoteId(null);
    }
  };

  if (!customer) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Meus Orcamentos</h1>
          <p className="text-muted-foreground">
            Solicite, acompanhe e aprove os orcamentos enviados pela loja.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void loadQuotes()}>
            <RefreshCw className="h-4 w-4 shrink-0" />
            Atualizar
          </Button>
          <Button
            className="bg-moria-orange hover:bg-moria-orange/90"
            onClick={() => setIsRequestModalOpen(true)}
          >
            <Wrench className="h-4 w-4 shrink-0" />
            Solicitar orcamento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 nb:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Solicitacoes registradas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Aguardando analise da loja</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Respondidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.quoted}</div>
            <p className="text-xs text-muted-foreground">Prontos para sua decisao</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">Convertidos em servico</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-9"
                placeholder="Buscar por numero do orcamento ou servico"
              />
            </div>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as 'all' | CustomerQuote['status'])
              }
            >
              <option value="all">Todos os status</option>
              <option value="PENDING">Pendente</option>
              <option value="ANALYZING">Em analise</option>
              <option value="QUOTED">Orcado</option>
              <option value="APPROVED">Aprovado</option>
              <option value="REJECTED">Rejeitado</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="py-12 text-center">
          <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-moria-orange" />
          <p className="text-muted-foreground">Carregando orcamentos...</p>
        </div>
      ) : filteredQuotes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <p className="mb-2 text-lg font-semibold">Nenhum orcamento encontrado</p>
            <p className="mb-4 text-sm text-muted-foreground">
              Solicite seu primeiro orcamento para acompanhar tudo pelo painel.
            </p>
            <Button
              className="bg-moria-orange hover:bg-moria-orange/90"
              onClick={() => setIsRequestModalOpen(true)}
            >
              <Wrench className="h-4 w-4 shrink-0" />
              Solicitar primeiro orcamento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredQuotes.map((quote) => {
            const status = STATUS_CONFIG[quote.status];
            const finalTotal = quote.items.reduce((sum, item) => {
              const price = item.quotedPrice ?? item.price ?? 0;
              return sum + price * item.quantity;
            }, 0);
            const canDecide = quote.status === 'QUOTED';

            return (
              <Card key={quote.id} className="transition-shadow hover:shadow-lg">
                <CardHeader className="space-y-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">
                        Orcamento #{quote.id.slice(0, 8).toUpperCase()}
                      </CardTitle>
                      <CardDescription>
                        Solicitado em {formatDateTime(quote.createdAt)}
                      </CardDescription>
                    </div>
                    <Badge className={status.className}>{status.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border bg-gray-50 p-3">
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Itens
                      </p>
                      <p className="text-sm font-semibold">{quote.items.length} servico(s)</p>
                    </div>
                    <div className="rounded-lg border bg-gray-50 p-3">
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Total
                      </p>
                      <p className="text-sm font-semibold">
                        {finalTotal > 0 ? formatCurrency(finalTotal) : 'Sob analise'}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-gray-50 p-3">
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Respondido em
                      </p>
                      <p className="text-sm font-semibold">{formatDateTime(quote.quotedAt)}</p>
                    </div>
                    <div className="rounded-lg border bg-gray-50 p-3">
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Aprovado em
                      </p>
                      <p className="text-sm font-semibold">
                        {quote.quoteApprovedAt
                          ? formatDateTime(quote.quoteApprovedAt)
                          : 'Ainda nao'}
                      </p>
                    </div>
                  </div>

                  {quote.status === 'APPROVED' && quote.orderStatus && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                      Este orcamento virou pedido. Status atual: {quote.orderStatus === 'IN_PRODUCTION' ? 'Em producao' : quote.orderStatus}.
                    </div>
                  )}

                  <div className="space-y-2">
                    {quote.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium">
                            {item.quantity}x {item.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {item.quotedPrice !== null
                              ? `Valor final ${formatCurrency(item.quotedPrice)} por unidade`
                              : item.price > 0
                                ? `Estimativa inicial ${formatCurrency(item.price)} por unidade`
                                : 'Aguardando precificacao da equipe'}
                          </p>
                        </div>
                        <div className="text-right text-sm font-semibold">
                          {item.quotedPrice !== null
                            ? formatCurrency(item.quotedPrice * item.quantity)
                            : item.price > 0
                              ? formatCurrency(item.price * item.quantity)
                              : 'Sob analise'}
                        </div>
                      </div>
                    ))}
                  </div>

                  {quote.address && (
                    <div className="rounded-lg border bg-gray-50 p-3">
                      <p className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        Endereco vinculado
                      </p>
                      <p className="text-sm">
                        {quote.address.street}, {quote.address.number}
                        {quote.address.complement ? ` - ${quote.address.complement}` : ''}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {quote.address.neighborhood} - {quote.address.city}/{quote.address.state}
                      </p>
                    </div>
                  )}

                  {quote.quoteNotes && (
                    <div className="rounded-lg border bg-moria-orange/5 p-3">
                      <p className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <MessageSquare className="h-4 w-4" />
                        Observacoes
                      </p>
                      <p className="text-sm">{quote.quoteNotes}</p>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <Button
                      variant="outline"
                      onClick={() => void handleExportPdf(quote)}
                      disabled={exportingQuoteId === quote.id}
                    >
                      {exportingQuoteId === quote.id ? (
                        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                      ) : (
                        <FileDown className="h-4 w-4 shrink-0" />
                      )}
                      {exportingQuoteId === quote.id ? 'Gerando PDF...' : 'Exportar PDF'}
                    </Button>

                    {canDecide && (
                      <>
                        <Button
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => void handleApprove(quote.id)}
                        >
                          <ThumbsUp className="h-4 w-4 shrink-0" />
                          Aprovar e Virar Pedido
                        </Button>
                        <Button
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => void handleReject(quote.id)}
                        >
                          <ThumbsDown className="h-4 w-4 shrink-0" />
                          Rejeitar
                        </Button>
                      </>
                    )}

                    {quote.status === 'APPROVED' && (
                      <div className="inline-flex items-center rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Orcamento aprovado e convertido em pedido.
                      </div>
                    )}

                    {['PENDING', 'ANALYZING'].includes(quote.status) && (
                      <div className="inline-flex items-center rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
                        <Clock className="mr-2 h-4 w-4" />
                        Sua solicitacao esta em analise pela equipe.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <RequestQuoteModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onNavigateToProfile={onNavigateToProfile}
        onSuccess={(quote) => {
          setStatusFilter('all');
          setQuotes((previous) => [quote, ...previous.filter((item) => item.id !== quote.id)]);
        }}
      />
    </div>
  );
}
