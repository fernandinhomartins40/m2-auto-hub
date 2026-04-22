import { useState } from 'react';
import { useSupport } from '../../../hooks/useSupport';
import { SupportTicket } from '../../../api/supportService';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import { Label } from '../../ui/label';
import { Star } from 'lucide-react';

interface TicketRatingProps {
  ticket: SupportTicket;
  onComplete: () => void;
}

export function TicketRating({ ticket, onComplete }: TicketRatingProps) {
  const { rateTicket, loading } = useSupport();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;

    try {
      await rateTicket(ticket.id, { rating, feedback });
      onComplete();
    } catch (error) {
      console.error('Erro ao avaliar ticket:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Como foi o atendimento?</h3>
        <p className="text-sm text-muted-foreground">
          Sua opinião nos ajuda a melhorar
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`h-10 w-10 ${
                  star <= (hoveredRating || rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>

        <div>
          <Label htmlFor="feedback">Comentário (opcional)</Label>
          <Textarea
            id="feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Conte-nos mais sobre sua experiência..."
            rows={4}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onComplete}>
            Pular
          </Button>
          <Button type="submit" disabled={loading || rating === 0} className="bg-moria-orange">
            Enviar Avaliação
          </Button>
        </div>
      </form>
    </div>
  );
}
