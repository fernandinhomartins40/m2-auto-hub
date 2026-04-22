import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Loader2, UserCog } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription } from '../ui/alert';
import adminService from '@/api/adminService';
import { RevisionAppointment } from '@/api/revisionAppointmentService';

interface MechanicOption {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

interface ScheduleRevisionAppointmentModalProps {
  isOpen: boolean;
  appointment: RevisionAppointment | null;
  onClose: () => void;
  onSave: (payload: {
    scheduledAt: string;
    assignedMechanicId: string;
    adminNotes?: string;
  }) => Promise<void>;
}

const toDateTimeLocalValue = (value?: string | null) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
};

export function ScheduleRevisionAppointmentModal({
  isOpen,
  appointment,
  onClose,
  onSave,
}: ScheduleRevisionAppointmentModalProps) {
  const [mechanics, setMechanics] = useState<MechanicOption[]>([]);
  const [loadingMechanics, setLoadingMechanics] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [assignedMechanicId, setAssignedMechanicId] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  const minDateTime = useMemo(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60_000);
    return local.toISOString().slice(0, 16);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setScheduledAt(toDateTimeLocalValue(appointment?.scheduledAt || appointment?.preferredDate));
    setAssignedMechanicId(appointment?.assignedMechanicId || '');
    setAdminNotes(appointment?.adminNotes || '');

    const loadMechanics = async () => {
      try {
        setLoadingMechanics(true);
        const response = await adminService.getAdminUsers({
          page: 1,
          limit: 100,
          role: 'STAFF',
          status: 'ACTIVE',
        });
        setMechanics(response.data || []);
      } catch (error) {
        console.error('Erro ao carregar mecanicos:', error);
        setMechanics([]);
      } finally {
        setLoadingMechanics(false);
      }
    };

    void loadMechanics();
  }, [isOpen, appointment]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!scheduledAt || !assignedMechanicId) {
      return;
    }

    setSaving(true);
    try {
      await onSave({
        scheduledAt: new Date(scheduledAt).toISOString(),
        assignedMechanicId,
        adminNotes: adminNotes.trim() || undefined,
      });
      onClose();
    } catch {
      // Errors are handled by the parent component.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-moria-orange" />
            {appointment?.status === 'SCHEDULED' ? 'Reagendar revisao' : 'Programar revisao'}
          </DialogTitle>
        </DialogHeader>

        {appointment && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Alert className="border-moria-orange/30 bg-moria-orange/5">
              <AlertDescription className="space-y-1">
                <p className="font-semibold">
                  {appointment.customer?.name} • {appointment.vehicle?.brand} {appointment.vehicle?.model}
                </p>
                <p className="text-sm text-muted-foreground">
                  Placa {appointment.vehicle?.plate} • Preferencia do cliente:{' '}
                  {new Date(appointment.preferredDate).toLocaleString('pt-BR')}
                </p>
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="scheduledAt">Data e horario confirmados</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  min={minDateTime}
                  value={scheduledAt}
                  onChange={(event) => setScheduledAt(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignedMechanicId">Mecanico responsavel</Label>
                <div className="relative">
                  {loadingMechanics && (
                    <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  <select
                    id="assignedMechanicId"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={assignedMechanicId}
                    onChange={(event) => setAssignedMechanicId(event.target.value)}
                    required
                  >
                    <option value="">Selecione um mecanico</option>
                    {mechanics.map((mechanic) => (
                      <option key={mechanic.id} value={mechanic.id}>
                        {mechanic.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {appointment.notes && (
              <Alert>
                <UserCog className="h-4 w-4" />
                <AlertDescription>
                  <p className="mb-1 text-sm font-semibold">Observacao do cliente</p>
                  <p className="text-sm">{appointment.notes}</p>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="adminNotes">Observacoes internas</Label>
              <Textarea
                id="adminNotes"
                rows={4}
                value={adminNotes}
                onChange={(event) => setAdminNotes(event.target.value)}
                placeholder="Oriente a equipe, detalhe o atendimento ou confirme alguma combinacao."
              />
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving || loadingMechanics}
                className="bg-moria-orange hover:bg-moria-orange/90"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar agendamento'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
