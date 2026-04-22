import { useEffect, useState } from 'react';
import { useSupport } from '../../../hooks/useSupport';
import { TicketCard } from './TicketCard';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Search } from 'lucide-react';
import { TicketStatus, TicketCategory } from '../../../api/supportService';

interface TicketListProps {
  onOpenTicket: (ticketId: string) => void;
}

export function TicketList({ onOpenTicket }: TicketListProps) {
  const { tickets, loadTickets, loading } = useSupport();
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'ALL'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const filters = statusFilter !== 'ALL' ? { status: statusFilter } : undefined;
    loadTickets(filters, { silent: true }).catch(() => {
      // Silently fail - user might not be authenticated yet
    });
  }, [statusFilter, loadTickets]);

  const filteredTickets = tickets.filter(ticket => {
    const matchesCategory = categoryFilter === 'ALL' || ticket.category === categoryFilter;
    const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Status</SelectItem>
                <SelectItem value={TicketStatus.OPEN}>Aberto</SelectItem>
                <SelectItem value={TicketStatus.IN_PROGRESS}>Em Progresso</SelectItem>
                <SelectItem value={TicketStatus.WAITING_CUSTOMER}>Aguardando Cliente</SelectItem>
                <SelectItem value={TicketStatus.WAITING_SUPPORT}>Aguardando Suporte</SelectItem>
                <SelectItem value={TicketStatus.RESOLVED}>Resolvido</SelectItem>
                <SelectItem value={TicketStatus.CLOSED}>Fechado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={(value: any) => setCategoryFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas as Categorias</SelectItem>
                <SelectItem value={TicketCategory.ORDER_ISSUE}>Problema com Pedido</SelectItem>
                <SelectItem value={TicketCategory.PRODUCT_QUESTION}>Dúvida sobre Produto</SelectItem>
                <SelectItem value={TicketCategory.PAYMENT_ISSUE}>Problema de Pagamento</SelectItem>
                <SelectItem value={TicketCategory.DELIVERY_ISSUE}>Problema de Entrega</SelectItem>
                <SelectItem value={TicketCategory.REVISION_QUESTION}>Dúvida sobre Revisão</SelectItem>
                <SelectItem value={TicketCategory.TECHNICAL_SUPPORT}>Suporte Técnico</SelectItem>
                <SelectItem value={TicketCategory.SUGGESTION}>Sugestão</SelectItem>
                <SelectItem value={TicketCategory.COMPLAINT}>Reclamação</SelectItem>
                <SelectItem value={TicketCategory.OTHER}>Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Tickets */}
      <div className="space-y-3">
        {loading && <p className="text-center text-muted-foreground">Carregando tickets...</p>}

        {!loading && filteredTickets.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground">Nenhum ticket encontrado</p>
            </CardContent>
          </Card>
        )}

        {!loading && filteredTickets.map((ticket) => (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            onClick={() => onOpenTicket(ticket.id)}
          />
        ))}
      </div>
    </div>
  );
}
