import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRevisions } from '../../contexts/RevisionsContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CalendarClock,
  Car,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileText,
  Gauge,
  Loader2,
  TrendingUp,
  UserCog,
  XCircle,
} from 'lucide-react';
import { Revision, ItemStatus } from '../../types/revisions';
import { RevisionDetailsModal } from '../admin/RevisionDetailsModal';
import { AdminRevision } from '../../api/adminService';
import revisionAppointmentService, {
  RevisionAppointment,
} from '@/api/revisionAppointmentService';
import { useToast } from '@/hooks/use-toast';

const appointmentStatusConfig = {
  REQUESTED: { label: 'Solicitado', className: 'bg-amber-100 text-amber-800' },
  SCHEDULED: { label: 'Agendado', className: 'bg-blue-100 text-blue-800' },
  IN_SERVICE: { label: 'Em atendimento', className: 'bg-indigo-100 text-indigo-800' },
  COMPLETED: { label: 'Concluido', className: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Cancelado', className: 'bg-red-100 text-red-800' },
} as const;

const revisionStatusConfig = {
  draft: { label: 'Rascunho', className: 'bg-gray-500 text-white' },
  in_progress: { label: 'Em andamento', className: 'bg-blue-500 text-white' },
  completed: { label: 'Concluida', className: 'bg-green-500 text-white' },
  cancelled: { label: 'Cancelada', className: 'bg-red-500 text-white' },
} as const;

export function CustomerRevisions() {
  const { customer } = useAuth();
  const { toast } = useToast();
  const { revisions, getRevisionsByCustomer, getVehicle, categories } = useRevisions();
  const [appointments, setAppointments] = useState<RevisionAppointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [selectedRevision, setSelectedRevision] = useState<AdminRevision | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const convertToAdminRevision = (revision: Revision): AdminRevision => {
    const vehicle = revision.vehicle || getVehicle(revision.vehicleId);

    const checklistItems = revision.checklistItems
      .map((checkItem) => {
        for (const category of categories) {
          const item = category.items.find((entry) => entry.id === checkItem.itemId);
          if (item) {
            return {
              categoryName: category.name,
              itemName: item.name,
              itemDescription: item.description,
              status: checkItem.status,
              notes: checkItem.notes,
              checkedAt: checkItem.checkedAt,
              checkedBy: checkItem.checkedBy,
            };
          }
        }

        return null;
      })
      .filter(Boolean);

    return {
      id: revision.id,
      customerId: revision.customerId,
      vehicleId: revision.vehicleId,
      date: revision.date.toString(),
      mileage: revision.mileage,
      status: revision.status.toUpperCase() as AdminRevision['status'],
      checklistItems: checklistItems as any[],
      generalNotes: revision.generalNotes,
      recommendations: revision.recommendations,
      createdAt: revision.createdAt.toString(),
      updatedAt: revision.updatedAt.toString(),
      completedAt: revision.completedAt?.toString() || null,
      customer: customer
        ? {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone || '',
          }
        : undefined,
      vehicle: vehicle
        ? {
            id: vehicle.id,
            brand: vehicle.brand,
            model: vehicle.model,
            year: vehicle.year,
            plate: vehicle.plate,
            color: vehicle.color || '',
          }
        : undefined,
      assignedMechanicId: null,
      mechanicName: null,
      assignedMechanic: null,
      assignedAt: null,
      mechanicNotes: null,
      transferHistory: [],
    };
  };

  const customerRevisions = useMemo(() => {
    if (!customer) {
      return [];
    }

    return getRevisionsByCustomer(customer.id).sort(
      (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()
    );
  }, [customer, revisions]);

  const alerts = useMemo(() => {
    const summary: Array<{
      type: 'critical' | 'attention';
      vehicleName: string;
      revisionDate: Date;
      items: Array<{ categoryName: string; itemName: string; notes?: string }>;
    }> = [];

    customerRevisions.forEach((revision) => {
      if (revision.status !== 'completed') {
        return;
      }

      const vehicle = revision.vehicle || getVehicle(revision.vehicleId);
      if (!vehicle) {
        return;
      }

      const criticalItems: Array<{ categoryName: string; itemName: string; notes?: string }> = [];
      const attentionItems: Array<{ categoryName: string; itemName: string; notes?: string }> = [];

      revision.checklistItems.forEach((checkItem) => {
        if (checkItem.status !== ItemStatus.CRITICAL && checkItem.status !== ItemStatus.ATTENTION) {
          return;
        }

        for (const category of categories) {
          const item = category.items.find((entry) => entry.id === checkItem.itemId);
          if (item) {
            const alertItem = {
              categoryName: category.name,
              itemName: item.name,
              notes: checkItem.notes,
            };

            if (checkItem.status === ItemStatus.CRITICAL) {
              criticalItems.push(alertItem);
            } else {
              attentionItems.push(alertItem);
            }

            break;
          }
        }
      });

      if (criticalItems.length > 0) {
        summary.push({
          type: 'critical',
          vehicleName: `${vehicle.brand} ${vehicle.model} - ${vehicle.plate}`,
          revisionDate: revision.date,
          items: criticalItems,
        });
      }

      if (attentionItems.length > 0) {
        summary.push({
          type: 'attention',
          vehicleName: `${vehicle.brand} ${vehicle.model} - ${vehicle.plate}`,
          revisionDate: revision.date,
          items: attentionItems,
        });
      }
    });

    return summary;
  }, [categories, customerRevisions, getVehicle]);

  const activeAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.status !== 'COMPLETED' && appointment.status !== 'CANCELLED'),
    [appointments]
  );

  useEffect(() => {
    if (!customer) {
      setAppointments([]);
      return;
    }

    const loadAppointments = async () => {
      try {
        setLoadingAppointments(true);
        const response = await revisionAppointmentService.getCustomerAppointments({
          page: 1,
          limit: 50,
        });
        setAppointments(response.data || []);
      } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
        setAppointments([]);
      } finally {
        setLoadingAppointments(false);
      }
    };

    void loadAppointments();
  }, [customer?.id]);

  const formatDate = (date: Date | string) =>
    new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

  const formatDateTime = (date: string | null) => {
    if (!date) {
      return 'Aguardando confirmacao da oficina';
    }

    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRevisionStats = (revision: Revision) => {
    const total = revision.checklistItems.length;
    const checked = revision.checklistItems.filter((item) => item.status !== ItemStatus.NOT_CHECKED).length;
    const critical = revision.checklistItems.filter((item) => item.status === ItemStatus.CRITICAL).length;
    const attention = revision.checklistItems.filter((item) => item.status === ItemStatus.ATTENTION).length;
    const ok = revision.checklistItems.filter((item) => item.status === ItemStatus.OK).length;

    return { total, checked, critical, attention, ok };
  };

  const handleViewDetails = (revision: Revision) => {
    setSelectedRevision(convertToAdminRevision(revision));
    setIsDetailsOpen(true);
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      const updated = await revisionAppointmentService.cancelCustomerAppointment(appointmentId);
      setAppointments((prev) =>
        prev.map((appointment) => (appointment.id === updated.id ? updated : appointment))
      );
      toast({
        title: 'Agendamento cancelado',
        description: 'Sua solicitacao foi cancelada com sucesso.',
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

  if (!customer) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Minhas Revisoes</h1>
        <p className="text-muted-foreground">
          Acompanhe seus agendamentos, historico de revisoes e alertas importantes
        </p>
      </div>

      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <Alert
              key={`${alert.type}-${index}`}
              className={
                alert.type === 'critical'
                  ? 'border-red-500 bg-red-50'
                  : 'border-yellow-500 bg-yellow-50'
              }
            >
              {alert.type === 'critical' ? (
                <XCircle className="h-5 w-5 text-red-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              )}
              <AlertDescription className="space-y-2">
                <p className="font-semibold">
                  {alert.type === 'critical' ? 'Atencao imediata' : 'Manutencao recomendada'} •{' '}
                  {alert.vehicleName}
                </p>
                <p className="text-sm text-muted-foreground">
                  Revisao em {formatDate(alert.revisionDate)}
                </p>
                <ul className="space-y-1 text-sm">
                  {alert.items.slice(0, 3).map((item, itemIndex) => (
                    <li key={`${item.categoryName}-${item.itemName}-${itemIndex}`}>
                      {item.itemName} ({item.categoryName})
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <Tabs defaultValue="appointments" className="space-y-4">
        <TabsList className="flex w-full flex-wrap gap-2">
          <TabsTrigger value="appointments">
            Agendamentos ({appointments.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            Todas ({customerRevisions.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Concluidas ({customerRevisions.filter((revision) => revision.status === 'completed').length})
          </TabsTrigger>
          <TabsTrigger value="in_progress">
            Em andamento ({customerRevisions.filter((revision) => revision.status === 'in_progress').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="space-y-4">
          {loadingAppointments ? (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-moria-orange" />
              <p className="text-muted-foreground">Carregando agendamentos...</p>
            </div>
          ) : appointments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarClock className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <p className="mb-2 text-lg font-semibold">Nenhum agendamento encontrado</p>
                <p className="text-sm text-muted-foreground">
                  Acesse a aba de veiculos para solicitar sua proxima revisao.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {activeAppointments.length > 0 && (
                <Alert className="border-moria-orange/30 bg-moria-orange/5">
                  <CalendarClock className="h-4 w-4 text-moria-orange" />
                  <AlertDescription>
                    {activeAppointments.length} agendamento(s) ativo(s). A oficina pode confirmar ou ajustar o horario informado.
                  </AlertDescription>
                </Alert>
              )}

              {appointments.map((appointment) => {
                const badge = appointmentStatusConfig[appointment.status];
                const canCancel =
                  appointment.status === 'REQUESTED' || appointment.status === 'SCHEDULED';

                return (
                  <Card key={appointment.id} className="transition-shadow hover:shadow-lg">
                    <CardHeader>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                          <CardTitle className="flex items-center gap-2 text-xl">
                            <Car className="h-5 w-5 text-moria-orange" />
                            {appointment.vehicle?.brand} {appointment.vehicle?.model}
                          </CardTitle>
                          <CardDescription className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Badge variant="secondary" className="font-mono">
                                {appointment.vehicle?.plate}
                              </Badge>
                              <span>•</span>
                              <span>Ano {appointment.vehicle?.year}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Solicitado para {formatDateTime(appointment.preferredDate)}
                            </div>
                          </CardDescription>
                        </div>
                        <Badge className={badge.className}>{badge.label}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-lg border bg-gray-50 p-3">
                          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Horario confirmado
                          </p>
                          <p className="text-sm font-semibold">
                            {formatDateTime(appointment.scheduledAt)}
                          </p>
                        </div>
                        <div className="rounded-lg border bg-gray-50 p-3">
                          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Mecanico responsavel
                          </p>
                          <p className="flex items-center gap-2 text-sm font-semibold">
                            <UserCog className="h-4 w-4 text-moria-orange" />
                            {appointment.mechanicName || 'Aguardando atribuicao'}
                          </p>
                        </div>
                      </div>

                      {appointment.notes && (
                        <Alert>
                          <FileText className="h-4 w-4" />
                          <AlertDescription>{appointment.notes}</AlertDescription>
                        </Alert>
                      )}

                      {appointment.adminNotes && (
                        <Alert className="border-blue-200 bg-blue-50">
                          <AlertCircle className="h-4 w-4 text-blue-600" />
                          <AlertDescription>{appointment.adminNotes}</AlertDescription>
                        </Alert>
                      )}

                      {appointment.revisionId && (
                        <Alert className="border-green-200 bg-green-50">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <AlertDescription>
                            Revisao vinculada #{appointment.revisionId.slice(0, 8)} criada para este atendimento.
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="flex flex-col gap-2 sm:flex-row">
                        {canCancel && (
                          <Button
                            variant="outline"
                            className="sm:w-auto"
                            onClick={() => handleCancelAppointment(appointment.id)}
                          >
                            <XCircle className="h-4 w-4 shrink-0" />
                            Cancelar solicitacao
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {customerRevisions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ClipboardCheck className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <p className="mb-2 text-lg font-semibold">Nenhuma revisao encontrada</p>
                <p className="text-sm text-muted-foreground">Suas revisoes aparecerao aqui.</p>
              </CardContent>
            </Card>
          ) : (
            customerRevisions.map((revision) => {
              const vehicle = revision.vehicle || getVehicle(revision.vehicleId);
              if (!vehicle) {
                return null;
              }

              const stats = getRevisionStats(revision);
              const badge = revisionStatusConfig[revision.status] || revisionStatusConfig.draft;

              return (
                <Card key={revision.id} className="transition-shadow hover:shadow-lg">
                  <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-moria-orange/10 p-3">
                          <Car className="h-6 w-6 text-moria-orange" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">
                            {vehicle.brand} {vehicle.model}
                          </CardTitle>
                          <CardDescription className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <span>Placa {vehicle.plate}</span>
                              <span>•</span>
                              <span>Ano {vehicle.year}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(revision.date)}</span>
                              {revision.mileage ? (
                                <>
                                  <span>•</span>
                                  <Gauge className="h-3 w-3" />
                                  <span>{revision.mileage.toLocaleString()} km</span>
                                </>
                              ) : null}
                            </div>
                          </CardDescription>
                        </div>
                      </div>
                      <Badge className={badge.className}>{badge.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      <div className="rounded-lg bg-gray-50 p-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-gray-600">
                          <FileText className="h-4 w-4" />
                          <span className="text-2xl font-bold">{stats.checked}</span>
                          <span className="text-sm">/{stats.total}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">Verificados</p>
                      </div>
                      <div className="rounded-lg bg-green-50 p-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-2xl font-bold">{stats.ok}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">OK</p>
                      </div>
                      <div className="rounded-lg bg-yellow-50 p-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-yellow-600">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-2xl font-bold">{stats.attention}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">Atencao</p>
                      </div>
                      <div className="rounded-lg bg-red-50 p-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-red-600">
                          <XCircle className="h-4 w-4" />
                          <span className="text-2xl font-bold">{stats.critical}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">Critico</p>
                      </div>
                    </div>

                    {revision.recommendations && (
                      <Alert>
                        <TrendingUp className="h-4 w-4" />
                        <AlertDescription>
                          <p className="mb-1 text-sm font-semibold">Recomendacoes</p>
                          <p className="text-sm">{revision.recommendations}</p>
                        </AlertDescription>
                      </Alert>
                    )}

                    <Button onClick={() => handleViewDetails(revision)} className="w-full" variant="outline">
                      <Eye className="h-4 w-4 shrink-0" />
                      Ver detalhes completos
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {customerRevisions
            .filter((revision) => revision.status === 'completed')
            .map((revision) => {
              const vehicle = revision.vehicle || getVehicle(revision.vehicleId);
              if (!vehicle) {
                return null;
              }

              return (
                <Card key={revision.id}>
                  <CardHeader>
                    <CardTitle>
                      {vehicle.brand} {vehicle.model}
                    </CardTitle>
                    <CardDescription>
                      Revisao concluida em {formatDate(revision.completedAt || revision.date)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={() => handleViewDetails(revision)} className="w-full" variant="outline">
                      <Eye className="h-4 w-4 shrink-0" />
                      Ver relatorio completo
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
        </TabsContent>

        <TabsContent value="in_progress" className="space-y-4">
          {customerRevisions
            .filter((revision) => revision.status === 'in_progress')
            .map((revision) => {
              const vehicle = revision.vehicle || getVehicle(revision.vehicleId);
              if (!vehicle) {
                return null;
              }

              return (
                <Card key={revision.id}>
                  <CardHeader>
                    <CardTitle>
                      {vehicle.brand} {vehicle.model}
                    </CardTitle>
                    <CardDescription>Revisao iniciada em {formatDate(revision.date)}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Esta revisao ainda esta em andamento. Aguarde a conclusao da oficina.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              );
            })}
        </TabsContent>
      </Tabs>

      <RevisionDetailsModal
        revision={selectedRevision}
        isOpen={isDetailsOpen}
        exportScope="customer"
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedRevision(null);
        }}
      />
    </div>
  );
}
