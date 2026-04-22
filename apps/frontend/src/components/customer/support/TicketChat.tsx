import { useState, useEffect, useRef } from 'react';
import { useSupport } from '../../../hooks/useSupport';
import { SupportTicket } from '../../../api/supportService';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TicketChatProps {
  ticket: SupportTicket;
}

export function TicketChat({ ticket }: TicketChatProps) {
  const { addMessage, loading } = useSupport();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [ticket.messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      await addMessage(ticket.id, { message });
      setMessage('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {ticket.messages?.map((msg) => {
          const isCustomer = msg.senderType === 'customer';

          return (
            <div key={msg.id} className={`flex gap-3 ${isCustomer ? 'flex-row-reverse' : ''}`}>
              <Avatar className="h-8 w-8">
                <AvatarFallback className={isCustomer ? 'bg-blue-500' : 'bg-green-500'}>
                  {isCustomer ? 'VC' : 'SP'}
                </AvatarFallback>
              </Avatar>

              <div className={`flex-1 ${isCustomer ? 'text-right' : ''}`}>
                <div className={`inline-block max-w-[80%] rounded-lg p-3 ${
                  isCustomer ? 'bg-blue-500 text-white' : 'bg-muted'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: ptBR })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {ticket.status !== 'CLOSED' && (
        <form onSubmit={handleSend} className="p-4 border-t">
          <div className="flex gap-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              rows={2}
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !message.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
