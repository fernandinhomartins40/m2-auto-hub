import { useState } from 'react';
import { useSupport } from '../../../hooks/useSupport';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { TicketCategory, TicketPriority } from '../../../api/supportService';

interface CreateTicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categoryLabels = {
  [TicketCategory.ORDER_ISSUE]: 'Problema com Pedido',
  [TicketCategory.PRODUCT_QUESTION]: 'Dúvida sobre Produto',
  [TicketCategory.PAYMENT_ISSUE]: 'Problema de Pagamento',
  [TicketCategory.DELIVERY_ISSUE]: 'Problema de Entrega',
  [TicketCategory.REVISION_QUESTION]: 'Dúvida sobre Revisão',
  [TicketCategory.TECHNICAL_SUPPORT]: 'Suporte Técnico',
  [TicketCategory.SUGGESTION]: 'Sugestão/Feedback',
  [TicketCategory.COMPLAINT]: 'Reclamação',
  [TicketCategory.OTHER]: 'Outro',
};

const priorityLabels = {
  [TicketPriority.LOW]: 'Baixa',
  [TicketPriority.MEDIUM]: 'Média',
  [TicketPriority.HIGH]: 'Alta',
  [TicketPriority.URGENT]: 'Urgente',
};

export function CreateTicketModal({ open, onOpenChange }: CreateTicketModalProps) {
  const { createTicket, loading } = useSupport();
  const [formData, setFormData] = useState({
    subject: '',
    category: TicketCategory.OTHER,
    priority: TicketPriority.MEDIUM,
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTicket(formData);
      setFormData({
        subject: '',
        category: TicketCategory.OTHER,
        priority: TicketPriority.MEDIUM,
        message: '',
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao criar ticket:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Ticket</DialogTitle>
          <DialogDescription>
            Descreva o problema ou dúvida que você está enfrentando. Nossa equipe responderá em breve.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="subject">Assunto *</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Descreva brevemente o problema..."
              required
              minLength={5}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Categoria *</Label>
              <Select
                value={formData.category}
                onValueChange={(value: TicketCategory) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Prioridade *</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: TicketPriority) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(priorityLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="message">Mensagem *</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Descreva detalhadamente o problema..."
              required
              minLength={10}
              rows={6}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-moria-orange hover:bg-moria-orange/90">
              {loading ? 'Criando...' : 'Criar Ticket'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
