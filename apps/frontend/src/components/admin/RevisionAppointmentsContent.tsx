import { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  Car,
  ClipboardCheck,
  Loader2,
  RefreshCw,
  Search,
  User,
  UserCog,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Alert, AlertDescription } from '../ui/alert';
import revisionAppointmentService, {
  RevisionAppointment,
  RevisionAppointmentStatus,
} from '@/api/revisionAppointmentService';
import { ScheduleRevisionAppointmentModal } from './ScheduleRevisionAppointmentModal';
import { useToast } from '@/hooks/use-toast';

const statusConfig: Record<
  RevisionAppointmentStatus,
  { label: string; className: string }
> = {
  REQUESTED: { label: 'Solicitado', className: 'bg-amber-100 text-amber-800' },
  SCHEDULED: { label: 'Agendado', className: 'bg-blue-100 text-blue-800' },
  IN_SERVICE: { label: 'Em atendimento', className: 'bg-indigo-100 text-indigo-800' },
  COMPLETED: { label: 'Concluido', className: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Cancelado', className: 'bg-red-100 text-red-800' },
};

export function RevisionAppointmentsContent() {
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<RevisionAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | RevisionAppointmentStatus>('ALL');
  const [selectedAppointment, setSelectedAppointment] = useState<RevisionAppointment | null>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const response = await revisionAppointmentService.getAdminAppointments({
        page: 1,
        limit: 100,
      });
      setAppointments(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
      toast({
        title: 'Erro ao carregar agendamentos',
        description: 'Nao foi possivel carregar a agenda de revisoes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAppointments();
  }, []);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const matchesStatus =
        statusFilter === 'ALL' ? true : appointment.status === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!searchTerm.trim()) {
        return true;
      }

      const search = searchTerm.trim().toLowerCase();
      return (
        appointment.customer?.name?.toLowerCase().includes(search) ||
        appointment.customer?.phone?.toLowerCase().includes(search) ||
        appointment.vehicle?.plate?.toLowerCase().includes(search) ||
        appointment.vehicle?.model?.toLowerCase().includes(search) ||
        appointment.vehicle?.brand?.toLowerCase().includes(search) ||
        appointment.mechanicName?.toLowerCase().includes(search)
      );
    });
  }, [appointments, searchTerm, statusFilter]);

  const stats = useMemo(
    () => ({
      requested: appointments.filter((appointment) => appointment.status === 'REQUESTED').length,
      scheduled: appointments.filter((appointment) => appointment.status === 'SCHEDULED').length,
      inService: appointments.filter((appointment) => appointment.status === 'IN_SERVICE').length,
    }),
    [appointments]
  );

  const formatDateTime = (value?: string | null) => {
    if (!value) {
      return 'Nao definido';
    }

    return new Date(value).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSchedule = async (payload: {
    scheduledAt: string;
    assignedMechanicId: string;
    adminNotes?: string;
  }) => {
    if (!selectedAppointment) {
      return;
    }

    try {
      const updated = await revisionAppointmentService.scheduleAppointment(
        selectedAppointment.id,
        payload
      );
      setAppointments((prev) =>
        prev.map((appointment) => (appointment.id === updated.id ? updated : appointment))
      );
      toast({
        title: 'Agendamento salvo',
        description: 'Data, horario e mecanico foram vinculados com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar agendamento',
        description:
          error.response?.data?.message || 'Nao foi possivel salvar a programacao.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleStart = async (appointmentId: string) => {
    try {
      const updated = await revisionAppointmentService.startAppointment(appointmentId);
      setAppointments((prev) =>
        prev.map((appointment) => (appointment.id === updated.id ? updated : appointment))
      );
      toast({
        title: 'Revisao iniciada',
        description: 'O atendimento foi iniciado e a revisao foi vinculada ao agendamento.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao iniciar revisao',
        description:
          error.response?.data?.message || 'Nao foi possivel iniciar a revisao agendada.',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = async (appointmentId: string) => {
    try {
      const updated = await revisionAppointmentService.cancelAdminAppointment(appointmentId);
      setAppointments((prev) =>
        prev.map((appointment) => (appointment.id === updated.id ? updated : appointment))
      );
      toast({
        title: 'Agendamento cancelado',
        description: 'O agendamento foi cancelado com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao cancelar',
        description:
          error.response?.data?.message || 'Nao foi possivel cancelar o agendamento.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Solicitados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.requested}</div>
            <p className="text-xs text-muted-foreground">Aguardando programacao</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Agendados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.scheduled}</div>
            <p className="text-xs text-muted-foreground">Com data e mecanico definidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Em atendimento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.inService}</div>
            <p className="text-xs text-muted-foreground">Revisoes ja iniciadas</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-9"
                placeholder="Buscar por cliente, telefone, placa ou mecanico"
              />
            </div>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as 'ALL' | RevisionAppointmentStatus)
              }
            >
              <option value="ALL">Todos os status</option>
              <option value="REQUESTED">Solicitado</option>
              <option value="SCHEDULED">Agendado</option>
              <option value="IN_SERVICE">Em atendimento</option>
              <option value="COMPLETED">Concluido</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
            <Button variant="outline" onClick={() => void loadAppointments()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="py-12 text-center">
          <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-moria-orange" />
          <p className="text-muted-foreground">Carregando agendamentos...</p>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarClock className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <p className="mb-2 text-lg font-semibold">Nenhum agendamento encontrado</p>
            <p className="text-sm text-muted-foreground">
              Assim que clientes solicitarem revisoes, a agenda aparecera aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map((appointment) => {
            const badge = statusConfig[appointment.status];
            const canSchedule =
              appointment.status === 'REQUESTED' || appointment.status === 'SCHEDULED';
            const canStart = appointment.status === 'SCHEDULED';
            const canCancel =
              appointment.status === 'REQUESTED' || appointment.status === 'SCHEDULED';

            return (
              <Card key={appointment.id} className="transition-shadow hover:shadow-lg">
                <CardHeader className="space-y-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <CardTitle className="text-xl">
                        {appointment.customer?.name || 'Cliente'} • {appointment.vehicle?.brand}{' '}
                        {appointment.vehicle?.model}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {appointment.customer?.phone || appointment.customer?.email}
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <Car className="h-4 w-4" />
                          {appointment.vehicle?.plate}
                        </span>
                      </div>
                    </div>
                    <Badge className={badge.className}>{badge.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border bg-gray-50 p-3">
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Preferencia do cliente
                      </p>
                      <p className="text-sm font-semibold">{formatDateTime(appointment.preferredDate)}</p>
                    </div>
                    <div className="rounded-lg border bg-gray-50 p-3">
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Data confirmada
                      </p>
                      <p className="text-sm font-semibold">{formatDateTime(appointment.scheduledAt)}</p>
                    </div>
                    <div className="rounded-lg border bg-gray-50 p-3">
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Mecanico
                      </p>
                      <p className="text-sm font-semibold">
                        {appointment.mechanicName || 'Nao atribuido'}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-gray-50 p-3">
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Revisao vinculada
                      </p>
                      <p className="text-sm font-semibold">
                        {appointment.revisionId ? `#${appointment.revisionId.slice(0, 8)}` : 'Ainda nao'}
                      </p>
                    </div>
                  </div>

                  {appointment.notes && (
                    <Alert>
                      <ClipboardCheck className="h-4 w-4" />
                      <AlertDescription>{appointment.notes}</AlertDescription>
                    </Alert>
                  )}

                  {appointment.adminNotes && (
                    <Alert className="border-blue-200 bg-blue-50">
                      <AlertDescription>{appointment.adminNotes}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    {canSchedule && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedAppointment(appointment);
                          setIsScheduleOpen(true);
                        }}
                      >
                        <CalendarClock className="mr-2 h-4 w-4" />
                        {appointment.status === 'SCHEDULED' ? 'Reagendar' : 'Programar'}
                      </Button>
                    )}
                    {canStart && (
                      <Button
                        className="bg-moria-orange hover:bg-moria-orange/90"
                        onClick={() => void handleStart(appointment.id)}
                      >
                        <ClipboardCheck className="mr-2 h-4 w-4" />
                        Iniciar revisao
                      </Button>
                    )}
                    {canCancel && (
                      <Button
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => void handleCancel(appointment.id)}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Cancelar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ScheduleRevisionAppointmentModal
        isOpen={isScheduleOpen}
        appointment={selectedAppointment}
        onClose={() => {
          setIsScheduleOpen(false);
          setSelectedAppointment(null);
        }}
        onSave={handleSchedule}
      />
    </div>
  );
}
