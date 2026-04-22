import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Car, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription } from '../ui/alert';
import revisionAppointmentService, {
  RevisionAppointment,
} from '@/api/revisionAppointmentService';
import { CustomerVehicle } from '@/api/vehicleService';
import { useToast } from '@/hooks/use-toast';

interface ScheduleRevisionModalProps {
  isOpen: boolean;
  vehicle: CustomerVehicle | null;
  onClose: () => void;
  onSuccess?: (appointment: RevisionAppointment) => void;
}

const formatLocalDateTimeInput = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
};

export function ScheduleRevisionModal({
  isOpen,
  vehicle,
  onClose,
  onSuccess,
}: ScheduleRevisionModalProps) {
  const { toast } = useToast();
  const [preferredDate, setPreferredDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const minDateTime = useMemo(() => formatLocalDateTimeInput(new Date()), []);

  useEffect(() => {
    if (!isOpen) {
      setPreferredDate('');
      setNotes('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!vehicle) {
      return;
    }

    if (!preferredDate) {
      toast({
        title: 'Data obrigatoria',
        description: 'Escolha a data e o horario desejados para a revisao.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const appointment = await revisionAppointmentService.createCustomerAppointment({
        vehicleId: vehicle.id,
        preferredDate: new Date(preferredDate).toISOString(),
        notes: notes.trim() || undefined,
      });

      toast({
        title: 'Agendamento solicitado',
        description: 'Sua solicitacao foi enviada. A oficina ira confirmar o horario.',
      });

      onSuccess?.(appointment);
      onClose();
    } catch (error: any) {
      toast({
        title: 'Erro ao agendar revisao',
        description:
          error.response?.data?.message ||
          error.response?.data?.error ||
          'Nao foi possivel solicitar o agendamento.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-moria-orange" />
            Agendar Revisao
          </DialogTitle>
        </DialogHeader>

        {vehicle && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Alert className="border-moria-orange/30 bg-moria-orange/5">
              <Car className="h-4 w-4" />
              <AlertDescription className="space-y-1">
                <p className="font-medium">
                  {vehicle.brand} {vehicle.model}
                </p>
                <p className="text-sm text-muted-foreground">
                  Placa {vehicle.plate} • Ano {vehicle.year}
                </p>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="preferredDate">Data e horario desejados</Label>
              <Input
                id="preferredDate"
                type="datetime-local"
                min={minDateTime}
                value={preferredDate}
                onChange={(event) => setPreferredDate(event.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                A oficina podera ajustar esse horario na confirmacao final.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observacoes para a oficina</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Descreva sintomas, urgencia ou alguma preferencia."
                rows={4}
                maxLength={2000}
              />
            </div>

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
                className="bg-moria-orange hover:bg-moria-orange/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Solicitar Agendamento'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
