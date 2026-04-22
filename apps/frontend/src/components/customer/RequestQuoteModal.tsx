import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Loader2,
  MapPin,
  Minus,
  Plus,
  Search,
  Trash2,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import customerService, { CustomerQuote } from '@/api/customerService';
import serviceService, { Service } from '@/api/serviceService';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Textarea } from '../ui/textarea';

interface RequestQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (quote: CustomerQuote) => void;
  onNavigateToProfile?: () => void;
}

interface SelectedService {
  id: string;
  name: string;
  category: string;
  estimatedTime: string;
  basePrice?: number;
  quantity: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

export function RequestQuoteModal({
  isOpen,
  onClose,
  onSuccess,
  onNavigateToProfile,
}: RequestQuoteModalProps) {
  const { customer } = useAuth();
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [observations, setObservations] = useState('');
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setObservations('');
      setSelectedServices([]);
      setIsSubmitting(false);
      setServices([]);
      return;
    }

    const defaultAddress =
      customer?.addresses?.find((address) => address.isDefault) || customer?.addresses?.[0];
    setSelectedAddressId(defaultAddress?.id || '');

    const loadServices = async () => {
      try {
        setLoadingServices(true);
        const response = await serviceService.getServices({
          page: 1,
          limit: 100,
          status: 'ACTIVE',
        });
        setServices(response.services || []);
      } catch (error: any) {
        toast({
          title: 'Erro ao carregar servicos',
          description:
            error.response?.data?.message ||
            error.response?.data?.error ||
            'Nao foi possivel carregar os servicos disponiveis.',
          variant: 'destructive',
        });
        setServices([]);
      } finally {
        setLoadingServices(false);
      }
    };

    void loadServices();
  }, [customer?.addresses, isOpen, toast]);

  const filteredServices = useMemo(() => {
    if (!searchTerm.trim()) {
      return services;
    }

    const normalizedSearch = searchTerm.trim().toLowerCase();
    return services.filter(
      (service) =>
        service.name.toLowerCase().includes(normalizedSearch) ||
        service.category.toLowerCase().includes(normalizedSearch) ||
        service.description.toLowerCase().includes(normalizedSearch)
    );
  }, [searchTerm, services]);

  const estimatedTotal = useMemo(
    () =>
      selectedServices.reduce(
        (sum, service) => sum + (service.basePrice || 0) * service.quantity,
        0
      ),
    [selectedServices]
  );

  const handleAddService = (service: Service) => {
    setSelectedServices((previous) => {
      const existing = previous.find((item) => item.id === service.id);
      if (existing) {
        return previous.map((item) =>
          item.id === service.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [
        ...previous,
        {
          id: service.id,
          name: service.name,
          category: service.category,
          estimatedTime: service.estimatedTime,
          basePrice: service.basePrice,
          quantity: 1,
        },
      ];
    });
  };

  const handleQuantityChange = (serviceId: string, delta: number) => {
    setSelectedServices((previous) =>
      previous
        .map((item) =>
          item.id === serviceId
            ? { ...item, quantity: Math.max(1, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveService = (serviceId: string) => {
    setSelectedServices((previous) => previous.filter((item) => item.id !== serviceId));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (selectedServices.length === 0) {
      toast({
        title: 'Nenhum servico selecionado',
        description: 'Adicione pelo menos um servico ao seu pedido de orcamento.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedAddressId) {
      toast({
        title: 'Endereco obrigatorio',
        description: 'Selecione um endereco para vincular ao pedido de orcamento.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const quote = await customerService.createQuoteRequest({
        addressId: selectedAddressId,
        observations: observations.trim() || undefined,
        items: selectedServices.map((service) => ({
          serviceId: service.id,
          quantity: service.quantity,
        })),
      });

      toast({
        title: 'Orcamento solicitado',
        description: 'Sua solicitacao foi enviada para a equipe da loja.',
      });

      onSuccess?.(quote);
      onClose();
    } catch (error: any) {
      toast({
        title: 'Erro ao solicitar orcamento',
        description:
          error.response?.data?.message ||
          error.response?.data?.error ||
          'Nao foi possivel enviar sua solicitacao agora.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasAddresses = (customer?.addresses?.length || 0) > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] md:w-[calc(100vw-4rem)] max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-3rem)] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gray-50/50 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-moria-orange" />
            Solicitar Orcamento
          </DialogTitle>
          <DialogDescription>
            Selecione os servicos desejados e envie sua solicitacao para analise da loja.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
          <ScrollArea className="flex-1 min-h-0 px-6">
            <div className="py-4 space-y-4">
              {!hasAddresses && (
                <Alert className="border-amber-300 bg-amber-50">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="space-y-3">
                    <p>
                      Voce precisa cadastrar ao menos um endereco antes de solicitar um
                      orcamento.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        onClose();
                        onNavigateToProfile?.();
                      }}
                    >
                      Ir para Meu Perfil
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="quote-service-search">Buscar servicos</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="quote-service-search"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        className="pl-9"
                        placeholder="Buscar por nome, categoria ou descricao"
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border">
                    <div className="border-b px-4 py-3">
                      <p className="font-medium">Catalogo de servicos</p>
                      <p className="text-xs text-muted-foreground">
                        Escolha os servicos que deseja incluir no orcamento.
                      </p>
                    </div>
                    <ScrollArea className="h-[320px]">
                      <div className="p-4 space-y-3">
                        {loadingServices ? (
                          <div className="py-10 text-center">
                            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-moria-orange" />
                            <p className="text-sm text-muted-foreground">
                              Carregando servicos...
                            </p>
                          </div>
                        ) : filteredServices.length === 0 ? (
                          <div className="py-10 text-center text-muted-foreground">
                            Nenhum servico encontrado.
                          </div>
                        ) : (
                          filteredServices.map((service) => {
                            const isSelected = selectedServices.some(
                              (item) => item.id === service.id
                            );

                            return (
                              <div
                                key={service.id}
                                className="rounded-lg border bg-white p-4 space-y-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="space-y-1">
                                    <p className="font-medium">{service.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {service.description}
                                    </p>
                                  </div>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={isSelected ? 'outline' : 'default'}
                                    className={
                                      isSelected
                                        ? ''
                                        : 'bg-moria-orange hover:bg-moria-orange/90'
                                    }
                                    onClick={() => handleAddService(service)}
                                  >
                                    <Plus className="mr-1 h-4 w-4" />
                                    {isSelected ? 'Adicionar mais' : 'Adicionar'}
                                  </Button>
                                </div>

                                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                  <span>Categoria: {service.category}</span>
                                  <span>Tempo: {service.estimatedTime}</span>
                                  <span>
                                    {service.basePrice && service.basePrice > 0
                                      ? `A partir de ${formatCurrency(service.basePrice)}`
                                      : 'Preco sob analise'}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-lg border bg-gray-50 p-4 space-y-3">
                    <div>
                      <p className="font-medium">Endereco vinculado</p>
                      <p className="text-xs text-muted-foreground">
                        O endereco sera usado como referencia do atendimento.
                      </p>
                    </div>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={selectedAddressId}
                      onChange={(event) => setSelectedAddressId(event.target.value)}
                      disabled={!hasAddresses}
                    >
                      {hasAddresses ? (
                        customer?.addresses.map((address) => (
                          <option key={address.id} value={address.id}>
                            {address.street}, {address.number} - {address.city}/{address.state}
                          </option>
                        ))
                      ) : (
                        <option value="">Cadastre um endereco primeiro</option>
                      )}
                    </select>
                  </div>

                  <div className="rounded-lg border">
                    <div className="border-b px-4 py-3">
                      <p className="font-medium">Itens selecionados</p>
                      <p className="text-xs text-muted-foreground">
                        Ajuste a quantidade antes de enviar.
                      </p>
                    </div>
                    <div className="p-4 space-y-3">
                      {selectedServices.length === 0 ? (
                        <div className="py-8 text-center text-sm text-muted-foreground">
                          Nenhum servico selecionado.
                        </div>
                      ) : (
                        selectedServices.map((service) => (
                          <div
                            key={service.id}
                            className="rounded-lg border bg-white p-3 space-y-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-medium truncate">{service.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {service.category}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveService(service.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleQuantityChange(service.id, -1)}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <span className="w-8 text-center font-medium">
                                  {service.quantity}
                                </span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleQuantityChange(service.id, 1)}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold">
                                  {service.basePrice && service.basePrice > 0
                                    ? formatCurrency(service.basePrice * service.quantity)
                                    : 'Sob analise'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {service.basePrice && service.basePrice > 0
                                    ? 'Estimativa inicial'
                                    : 'Sem preco base'}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quote-observations">Observacoes</Label>
                    <Textarea
                      id="quote-observations"
                      rows={4}
                      maxLength={2000}
                      value={observations}
                      onChange={(event) => setObservations(event.target.value)}
                      placeholder="Descreva o problema, detalhes do servico ou alguma preferencia."
                    />
                  </div>

                  <Alert className="border-moria-orange/30 bg-moria-orange/5">
                    <MapPin className="h-4 w-4 text-moria-orange" />
                    <AlertDescription>
                      Total estimado atual:{' '}
                      <strong>
                        {estimatedTotal > 0 ? formatCurrency(estimatedTotal) : 'Sob analise'}
                      </strong>
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="border-t bg-gray-50/50 px-6 py-3 shrink-0">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !hasAddresses}
                className="bg-moria-orange hover:bg-moria-orange/90"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Solicitar orcamento'
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
