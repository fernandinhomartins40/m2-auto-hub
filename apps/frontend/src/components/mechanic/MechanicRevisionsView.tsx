import { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import adminService, { AdminRevision } from '@/api/adminService';
import revisionService from '@/api/revisionService';
import revisionAppointmentService, {
  RevisionAppointment,
} from '@/api/revisionAppointmentService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RevisionCard } from '@/components/revisions/RevisionCard';
import { RevisionEditPage } from '@/components/admin/RevisionEditPage';
import { RevisionDetailsModal } from '@/components/admin/RevisionDetailsModal';

export default function MechanicRevisionsView() {
  const [revisions, setRevisions] = useState<AdminRevision[]>([]);
  const [appointments, setAppointments] = useState<RevisionAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pending: 0,
    inProgress: 0,
    completedToday: 0,
    total: 0,
    scheduled: 0,
  });

  const [selectedRevision, setSelectedRevision] = useState<AdminRevision | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  // Preencher o checklist vira pagina: em modal os 170+ itens ficavam cortados.
  const [editandoRevisao, setEditandoRevisao] = useState<AdminRevision | null>(null);

  const fetchMyRevisions = async () => {
    try {
      setLoading(true);

      const [revisionResponse, appointmentResponse] = await Promise.all([
        adminService.getRevisions({
          page: 1,
          limit: 100,
        }),
        revisionAppointmentService.getAdminAppointments({
          page: 1,
          limit: 100,
        }),
      ]);

      const myRevisions = revisionResponse.data || [];
      const myAppointments = appointmentResponse.data || [];

      setRevisions(myRevisions);
      setAppointments(myAppointments);

      const pending = myRevisions.filter((revision) => revision.status === 'DRAFT').length;
      const inProgress = myRevisions.filter((revision) => revision.status === 'IN_PROGRESS').length;
      const today = new Date().toDateString();
      const completedToday = myRevisions.filter(
        (revision) =>
          revision.status === 'COMPLETED' &&
          revision.completedAt &&
          new Date(revision.completedAt).toDateString() === today
      ).length;
      const scheduled = myAppointments.filter((appointment) => appointment.status === 'SCHEDULED').length;

      setStats({
        pending,
        inProgress,
        completedToday,
        total: myRevisions.length,
        scheduled,
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error('Erro ao carregar revisoes', {
        description: err.response?.data?.message || 'Erro desconhecido',
      });
      setRevisions([]);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchMyRevisions();
  }, []);

  const handleViewDetails = (revision: AdminRevision) => {
    setSelectedRevision(revision);
    setDetailsModalOpen(true);
  };

  const handleEditRevision = (revision: AdminRevision) => {
    setEditandoRevisao(revision);
  };

  const handleChangeStatus = async (revisionId: string, newStatus: string) => {
    try {
      if (newStatus === 'IN_PROGRESS') {
        await revisionService.startRevision(revisionId);
        toast.success('Revisao iniciada');
      } else if (newStatus === 'COMPLETED') {
        await revisionService.completeRevision(revisionId);
        toast.success('Revisao concluida');
      } else if (newStatus === 'CANCELLED') {
        await revisionService.cancelRevision(revisionId);
        toast.success('Revisao cancelada');
      }

      void fetchMyRevisions();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error('Erro ao alterar status', {
        description: err.response?.data?.message || 'Erro desconhecido',
      });
    }
  };

  const handleStartAppointment = async (appointmentId: string) => {
    try {
      await revisionAppointmentService.startAppointment(appointmentId);
      toast.success('Revisao iniciada a partir do agendamento');
      void fetchMyRevisions();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error('Erro ao iniciar revisao agendada', {
        description: err.response?.data?.message || 'Erro desconhecido',
      });
    }
  };

  const pendingRevisions = revisions.filter((revision) => revision.status === 'DRAFT');
  const inProgressRevisions = revisions.filter((revision) => revision.status === 'IN_PROGRESS');
  const completedRevisions = revisions.filter((revision) => revision.status === 'COMPLETED');
  const scheduledAppointments = appointments.filter(
    (appointment) => appointment.status === 'SCHEDULED'
  );

  // Editando: a pagina do checklist toma o lugar da lista.
  if (editandoRevisao) {
    return (
      <RevisionEditPage
        revision={editandoRevisao}
        onClose={() => setEditandoRevisao(null)}
        onSuccess={() => {
          setEditandoRevisao(null);
          void fetchMyRevisions();
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {scheduledAppointments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Proximos Agendamentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {scheduledAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="rounded-lg border border-moria-orange/20 bg-moria-orange/5 p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold">
                      {appointment.customer?.name} • {appointment.vehicle?.brand}{' '}
                      {appointment.vehicle?.model}
                    </p>
                    <p className="text-sm text-gray-600">
                      {appointment.vehicle?.plate} •{' '}
                      {appointment.scheduledAt
                        ? new Date(appointment.scheduledAt).toLocaleString('pt-BR')
                        : 'Sem horario confirmado'}
                    </p>
                    {appointment.notes ? (
                      <p className="text-sm text-gray-600">{appointment.notes}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Badge className="bg-blue-100 text-blue-800">Agendado</Badge>
                    <Button onClick={() => void handleStartAppointment(appointment.id)}>
                      Iniciar revisao
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendados</CardTitle>
            <Clock className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.scheduled}</div>
            <p className="text-xs text-gray-600">Fila de hoje e proximos horarios</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.pending}</div>
            <p className="text-xs text-gray-600">Aguardando inicio</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em andamento</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.inProgress}</div>
            <p className="text-xs text-gray-600">Trabalhos ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluidas hoje</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.completedToday}</div>
            <p className="text-xs text-gray-600">Trabalhos finalizados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de revisoes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
            <p className="text-xs text-gray-600">Todas as atribuidas</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">
                Todas
                <Badge variant="secondary" className="ml-2">
                  {stats.total}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pendentes
                <Badge variant="secondary" className="ml-2">
                  {stats.pending}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="in-progress">
                Em andamento
                <Badge variant="secondary" className="ml-2">
                  {stats.inProgress}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="completed">
                Concluidas
                <Badge variant="secondary" className="ml-2">
                  {completedRevisions.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              {revisions.length === 0 ? (
                <div className="py-10 text-center">
                  <FileText className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                  <p className="text-gray-500">Nenhuma revisao atribuida.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {revisions.map((revision) => (
                    <RevisionCard
                      key={revision.id}
                      revision={revision}
                      onViewDetails={handleViewDetails}
                      onEditRevision={handleEditRevision}
                      onChangeStatus={handleChangeStatus}
                      showAssignMechanic={false}
                      showDelete={false}
                      showMechanicInfo={false}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="pending" className="mt-6">
              {pendingRevisions.length === 0 ? (
                <div className="py-10 text-center">
                  <FileText className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                  <p className="text-gray-500">Nenhuma revisao pendente.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRevisions.map((revision) => (
                    <RevisionCard
                      key={revision.id}
                      revision={revision}
                      onViewDetails={handleViewDetails}
                      onEditRevision={handleEditRevision}
                      onChangeStatus={handleChangeStatus}
                      showAssignMechanic={false}
                      showDelete={false}
                      showMechanicInfo={false}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="in-progress" className="mt-6">
              {inProgressRevisions.length === 0 ? (
                <div className="py-10 text-center">
                  <FileText className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                  <p className="text-gray-500">Nenhuma revisao em andamento.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {inProgressRevisions.map((revision) => (
                    <RevisionCard
                      key={revision.id}
                      revision={revision}
                      onViewDetails={handleViewDetails}
                      onEditRevision={handleEditRevision}
                      onChangeStatus={handleChangeStatus}
                      showAssignMechanic={false}
                      showDelete={false}
                      showMechanicInfo={false}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed" className="mt-6">
              {completedRevisions.length === 0 ? (
                <div className="py-10 text-center">
                  <FileText className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                  <p className="text-gray-500">Nenhuma revisao concluida ainda.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {completedRevisions.map((revision) => (
                    <RevisionCard
                      key={revision.id}
                      revision={revision}
                      onViewDetails={handleViewDetails}
                      showAssignMechanic={false}
                      showDelete={false}
                      showMechanicInfo={false}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button onClick={() => void fetchMyRevisions()} disabled={loading}>
          {loading ? 'Atualizando...' : 'Atualizar lista'}
        </Button>
      </div>

      <RevisionDetailsModal
        revision={selectedRevision}
        isOpen={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedRevision(null);
        }}
        onChangeStatus={handleChangeStatus}
      />

    </div>
  );
}
