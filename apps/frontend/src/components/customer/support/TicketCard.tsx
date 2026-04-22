import { SupportTicket, TicketStatus, TicketPriority } from '../../../api/supportService';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { MessageCircle, Clock, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TicketCardProps {
  ticket: SupportTicket;
  onClick: () => void;
}

const statusConfig = {
  [TicketStatus.OPEN]: { label: 'Aberto', color: 'bg-blue-100 text-blue-800' },
  [TicketStatus.IN_PROGRESS]: { label: 'Em Progresso', color: 'bg-yellow-100 text-yellow-800' },
  [TicketStatus.WAITING_CUSTOMER]: { label: 'Aguardando Cliente', color: 'bg-purple-100 text-purple-800' },
  [TicketStatus.WAITING_SUPPORT]: { label: 'Aguardando Suporte', color: 'bg-orange-100 text-orange-800' },
  [TicketStatus.RESOLVED]: { label: 'Resolvido', color: 'bg-green-100 text-green-800' },
  [TicketStatus.CLOSED]: { label: 'Fechado', color: 'bg-gray-100 text-gray-800' },
};

const priorityConfig = {
  [TicketPriority.LOW]: { label: 'Baixa', color: 'bg-gray-100 text-gray-800' },
  [TicketPriority.MEDIUM]: { label: 'Média', color: 'bg-blue-100 text-blue-800' },
  [TicketPriority.HIGH]: { label: 'Alta', color: 'bg-orange-100 text-orange-800' },
  [TicketPriority.URGENT]: { label: 'Urgente', color: 'bg-red-100 text-red-800' },
};

export function TicketCard({ ticket, onClick }: TicketCardProps) {
  const status = statusConfig[ticket.status];
  const priority = priorityConfig[ticket.priority];

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{ticket.subject}</h3>
              <Badge variant="secondary" className={status.color}>
                {status.label}
              </Badge>
              <Badge variant="outline" className={priority.color}>
                {priority.label}
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true, locale: ptBR })}
              </div>

              {ticket._count && (
                <div className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  {ticket._count.messages} mensagens
                </div>
              )}

              {ticket.assignedTo && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {ticket.assignedTo.name}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
