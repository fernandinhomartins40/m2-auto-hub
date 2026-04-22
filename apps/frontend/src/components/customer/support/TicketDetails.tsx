import { useState } from 'react';
import { useSupport } from '../../../hooks/useSupport';
import { SupportTicket } from '../../../api/supportService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { TicketChat } from './TicketChat';
import { TicketRating } from './TicketRating';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface TicketDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: SupportTicket;
}

export function TicketDetails({ open, onOpenChange, ticket }: TicketDetailsProps) {
  const { closeTicket, reopenTicket, loading } = useSupport();
  const [showRating, setShowRating] = useState(false);

  const canRate = (ticket.status === 'CLOSED' || ticket.status === 'RESOLVED') && !ticket.rating;
  const canReopen = ticket.status === 'RESOLVED';
  const canClose = ticket.status !== 'CLOSED';

  const handleClose = async () => {
    try {
      await closeTicket(ticket.id);
      setShowRating(true);
    } catch (error) {
      console.error('Erro ao fechar ticket:', error);
    }
  };

  const handleReopen = async () => {
    try {
      await reopenTicket(ticket.id);
    } catch (error) {
      console.error('Erro ao reabrir ticket:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <DialogTitle>{ticket.subject}</DialogTitle>
              <div className="flex items-center gap-2">
                <Badge>
                  {ticket.category.replace('_', ' ')}
                </Badge>
                <Badge variant={ticket.status === 'CLOSED' ? 'secondary' : 'default'}>
                  {ticket.status}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              {canReopen && (
                <Button variant="outline" size="sm" onClick={handleReopen} disabled={loading}>
                  Reabrir
                </Button>
              )}
              {canClose && (
                <Button variant="outline" size="sm" onClick={handleClose} disabled={loading}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Fechar
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {showRating ? (
            <TicketRating ticket={ticket} onComplete={() => setShowRating(false)} />
          ) : (
            <TicketChat ticket={ticket} />
          )}
        </div>

        {canRate && !showRating && (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm mb-2">Seu problema foi resolvido?</p>
            <Button size="sm" onClick={() => setShowRating(true)}>
              Avaliar Atendimento
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
