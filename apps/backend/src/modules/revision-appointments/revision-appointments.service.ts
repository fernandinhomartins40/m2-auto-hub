import { prisma } from '@config/database.js';
import { AdminRole, RevisionStatus } from '@prisma/client';
import { ApiError } from '@shared/utils/error.util.js';
import { logger } from '@shared/utils/logger.util.js';

const RevisionAppointmentStatus = {
  REQUESTED: 'REQUESTED',
  SCHEDULED: 'SCHEDULED',
  IN_SERVICE: 'IN_SERVICE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

type RevisionAppointmentStatusValue =
  (typeof RevisionAppointmentStatus)[keyof typeof RevisionAppointmentStatus];

const activeAppointmentStatuses: RevisionAppointmentStatusValue[] = [
  RevisionAppointmentStatus.REQUESTED,
  RevisionAppointmentStatus.SCHEDULED,
  RevisionAppointmentStatus.IN_SERVICE,
];

const appointmentInclude = {
  vehicle: {
    select: {
      id: true,
      customerId: true,
      brand: true,
      model: true,
      year: true,
      plate: true,
      color: true,
      mileage: true,
      chassisNumber: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  customer: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      cpf: true,
    },
  },
  assignedMechanic: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
    },
  },
  revision: {
    select: {
      id: true,
      status: true,
      date: true,
      completedAt: true,
    },
  },
};

type AppointmentWithRelations = any;

interface CustomerAppointmentFilters {
  page?: number;
  limit?: number;
  vehicleId?: string;
  status?: RevisionAppointmentStatusValue;
}

interface AdminAppointmentFilters extends CustomerAppointmentFilters {
  customerId?: string;
  assignedMechanicId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

interface CreateCustomerAppointmentInput {
  vehicleId: string;
  preferredDate: string;
  notes?: string;
}

interface ScheduleAppointmentInput {
  scheduledAt: string;
  assignedMechanicId: string;
  adminNotes?: string;
}

const revisionAppointmentClient = (prisma as any).revisionAppointment;

export class RevisionAppointmentsService {
  private buildPaginationMeta(totalCount: number, page: number, limit: number) {
    return {
      page,
      limit,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
    };
  }

  private async ensureCustomerVehicle(customerId: string, vehicleId: string) {
    const vehicle = await prisma.customerVehicle.findFirst({
      where: {
        id: vehicleId,
        customerId,
      },
    });

    if (!vehicle) {
      throw ApiError.notFound('Veiculo nao encontrado');
    }

    return vehicle;
  }

  private async ensureMechanic(mechanicId: string) {
    const mechanic = await prisma.admin.findUnique({
      where: { id: mechanicId },
    });

    if (!mechanic) {
      throw ApiError.notFound('Mecanico nao encontrado');
    }

    if (mechanic.status !== 'ACTIVE') {
      throw ApiError.badRequest('Mecanico inativo');
    }

    if (mechanic.role !== AdminRole.STAFF) {
      throw ApiError.badRequest('Somente usuarios com papel de mecanico podem ser atribuidos');
    }

    return mechanic;
  }

  private async ensureNoActiveAppointment(vehicleId: string, excludeId?: string) {
    const appointment = await revisionAppointmentClient.findFirst({
      where: {
        vehicleId,
        status: {
          in: activeAppointmentStatuses,
        },
        ...(excludeId
          ? {
              id: {
                not: excludeId,
              },
            }
          : {}),
      },
    });

    if (appointment) {
      throw ApiError.badRequest(
        'Este veiculo ja possui um agendamento ativo. Finalize ou cancele o agendamento atual antes de criar outro.'
      );
    }
  }

  private async getAppointmentOrThrow(params: {
    appointmentId: string;
    customerId?: string;
    adminRole?: string;
    adminId?: string;
  }): Promise<AppointmentWithRelations> {
    const appointment = await revisionAppointmentClient.findUnique({
      where: { id: params.appointmentId },
      include: appointmentInclude,
    });

    if (!appointment) {
      throw ApiError.notFound('Agendamento nao encontrado');
    }

    if (params.customerId && appointment.customerId !== params.customerId) {
      throw ApiError.notFound('Agendamento nao encontrado');
    }

    if (
      params.adminRole === AdminRole.STAFF &&
      appointment.assignedMechanicId !== params.adminId
    ) {
      throw ApiError.forbidden('Voce so pode acessar seus proprios agendamentos');
    }

    return appointment;
  }

  async getCustomerAppointments(
    customerId: string,
    filters: CustomerAppointmentFilters = {}
  ) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      customerId,
      ...(filters.vehicleId ? { vehicleId: filters.vehicleId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    };

    const [data, totalCount] = await Promise.all([
      revisionAppointmentClient.findMany({
        where,
        include: appointmentInclude,
        orderBy: [{ scheduledAt: 'asc' }, { preferredDate: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      revisionAppointmentClient.count({ where }),
    ]);

    return {
      data,
      meta: this.buildPaginationMeta(totalCount, page, limit),
    };
  }

  async getCustomerAppointmentById(customerId: string, appointmentId: string) {
    return this.getAppointmentOrThrow({ appointmentId, customerId });
  }

  async createCustomerAppointment(
    customerId: string,
    input: CreateCustomerAppointmentInput
  ) {
    const preferredDate = new Date(input.preferredDate);
    if (Number.isNaN(preferredDate.getTime())) {
      throw ApiError.badRequest('Data preferencial invalida');
    }

    if (preferredDate.getTime() < Date.now() - 60_000) {
      throw ApiError.badRequest('A data do agendamento deve estar no futuro');
    }

    await this.ensureCustomerVehicle(customerId, input.vehicleId);
    await this.ensureNoActiveAppointment(input.vehicleId);

    const appointment = await revisionAppointmentClient.create({
      data: {
        customerId,
        vehicleId: input.vehicleId,
        preferredDate,
        notes: input.notes,
        status: RevisionAppointmentStatus.REQUESTED,
      },
      include: appointmentInclude,
    });

    logger.info(`Revision appointment created: ${appointment.id}`);

    return appointment;
  }

  async cancelCustomerAppointment(
    customerId: string,
    appointmentId: string,
    reason?: string
  ) {
    const appointment = await this.getAppointmentOrThrow({ appointmentId, customerId });

    if (appointment.status === RevisionAppointmentStatus.COMPLETED) {
      throw ApiError.badRequest('Nao e possivel cancelar um agendamento concluido');
    }

    if (appointment.status === RevisionAppointmentStatus.IN_SERVICE) {
      throw ApiError.badRequest('A revisao ja foi iniciada e nao pode ser cancelada pelo cliente');
    }

    if (appointment.status === RevisionAppointmentStatus.CANCELLED) {
      return appointment;
    }

    return revisionAppointmentClient.update({
      where: { id: appointmentId },
      data: {
        status: RevisionAppointmentStatus.CANCELLED,
        cancellationReason: reason || 'Cancelado pelo cliente',
        cancelledAt: new Date(),
      },
      include: appointmentInclude,
    });
  }

  async getAdminAppointments(
    filters: AdminAppointmentFilters = {},
    adminRole?: string,
    adminId?: string
  ) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      ...(adminRole === AdminRole.STAFF && adminId
        ? {
            assignedMechanicId: adminId,
          }
        : {}),
      ...(filters.customerId ? { customerId: filters.customerId } : {}),
      ...(filters.vehicleId ? { vehicleId: filters.vehicleId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.assignedMechanicId ? { assignedMechanicId: filters.assignedMechanicId } : {}),
    };

    if (filters.dateFrom || filters.dateTo) {
      where.OR = [
        {
          scheduledAt: {
            ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
            ...(filters.dateTo ? { lte: filters.dateTo } : {}),
          },
        },
        {
          preferredDate: {
            ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
            ...(filters.dateTo ? { lte: filters.dateTo } : {}),
          },
        },
      ];
    }

    const [data, totalCount] = await Promise.all([
      revisionAppointmentClient.findMany({
        where,
        include: appointmentInclude,
        orderBy: [{ scheduledAt: 'asc' }, { preferredDate: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      revisionAppointmentClient.count({ where }),
    ]);

    return {
      data,
      meta: this.buildPaginationMeta(totalCount, page, limit),
    };
  }

  async getAdminAppointmentById(
    appointmentId: string,
    adminRole?: string,
    adminId?: string
  ) {
    return this.getAppointmentOrThrow({ appointmentId, adminRole, adminId });
  }

  async scheduleAppointment(
    appointmentId: string,
    input: ScheduleAppointmentInput,
    adminRole?: string,
    adminId?: string
  ) {
    if (adminRole === AdminRole.STAFF) {
      throw ApiError.forbidden('Mecanicos nao podem programar agendamentos');
    }

    const appointment = await this.getAppointmentOrThrow({ appointmentId, adminRole, adminId });

    if (
      appointment.status === RevisionAppointmentStatus.COMPLETED ||
      appointment.status === RevisionAppointmentStatus.CANCELLED
    ) {
      throw ApiError.badRequest('Nao e possivel reprogramar um agendamento finalizado');
    }

    const scheduledAt = new Date(input.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      throw ApiError.badRequest('Data e horario agendados invalidos');
    }

    if (scheduledAt.getTime() < Date.now() - 60_000) {
      throw ApiError.badRequest('A data e horario do agendamento devem estar no futuro');
    }

    const mechanic = await this.ensureMechanic(input.assignedMechanicId);

    return revisionAppointmentClient.update({
      where: { id: appointmentId },
      data: {
        scheduledAt,
        assignedMechanicId: mechanic.id,
        mechanicName: mechanic.name,
        adminNotes: input.adminNotes,
        status: RevisionAppointmentStatus.SCHEDULED,
        confirmedAt: new Date(),
      },
      include: appointmentInclude,
    });
  }

  async cancelAdminAppointment(
    appointmentId: string,
    adminRole?: string,
    adminId?: string,
    reason?: string
  ) {
    if (adminRole === AdminRole.STAFF) {
      throw ApiError.forbidden('Mecanicos nao podem cancelar agendamentos');
    }

    const appointment = await this.getAppointmentOrThrow({ appointmentId, adminRole, adminId });

    if (appointment.status === RevisionAppointmentStatus.COMPLETED) {
      throw ApiError.badRequest('Nao e possivel cancelar um agendamento concluido');
    }

    if (appointment.status === RevisionAppointmentStatus.CANCELLED) {
      return appointment;
    }

    return revisionAppointmentClient.update({
      where: { id: appointmentId },
      data: {
        status: RevisionAppointmentStatus.CANCELLED,
        cancellationReason: reason || 'Cancelado pelo administrador',
        cancelledAt: new Date(),
      },
      include: appointmentInclude,
    });
  }

  async startAppointment(
    appointmentId: string,
    adminRole?: string,
    adminId?: string
  ) {
    const appointment = await this.getAppointmentOrThrow({ appointmentId, adminRole, adminId });

    if (appointment.status === RevisionAppointmentStatus.REQUESTED) {
      throw ApiError.badRequest(
        'Defina data, horario e mecanico antes de iniciar a revisao agendada'
      );
    }

    if (appointment.status === RevisionAppointmentStatus.IN_SERVICE) {
      throw ApiError.badRequest('Este agendamento ja esta em atendimento');
    }

    if (appointment.status === RevisionAppointmentStatus.CANCELLED) {
      throw ApiError.badRequest('O agendamento foi cancelado');
    }

    if (appointment.status === RevisionAppointmentStatus.COMPLETED) {
      throw ApiError.badRequest('O agendamento ja foi concluido');
    }

    if (!appointment.assignedMechanicId || !appointment.mechanicName) {
      throw ApiError.badRequest('Defina um mecanico antes de iniciar a revisao agendada');
    }

    await prisma.$transaction(async (tx) => {
      const appointmentTx = (tx as any).revisionAppointment;
      let linkedRevision = appointment.revision;

      if (!linkedRevision) {
        const checklistCategories = await tx.checklistCategory.findMany({
          where: { isEnabled: true },
          orderBy: { order: 'asc' },
          include: {
            items: {
              where: { isEnabled: true },
              orderBy: { order: 'asc' },
            },
          },
        });

        const checklistItems = checklistCategories.flatMap((category) =>
          category.items.map((item) => ({
            categoryId: category.id,
            categoryName: category.name,
            itemId: item.id,
            itemName: item.name,
            status: 'NOT_CHECKED',
          }))
        );

        if (checklistItems.length === 0) {
          throw ApiError.badRequest(
            'Nao existem itens de checklist habilitados para iniciar a revisao'
          );
        }

        const vehicle = await tx.customerVehicle.findUnique({
          where: { id: appointment.vehicleId },
        });

        linkedRevision = await tx.revision.create({
          data: {
            customerId: appointment.customerId,
            vehicleId: appointment.vehicleId,
            date: appointment.scheduledAt || appointment.preferredDate,
            mileage: vehicle?.mileage || undefined,
            status: RevisionStatus.IN_PROGRESS,
            checklistItems,
            generalNotes: appointment.notes || undefined,
            assignedMechanicId: appointment.assignedMechanicId,
            mechanicName: appointment.mechanicName,
            assignedAt: new Date(),
          },
        });
      } else if (linkedRevision.status === RevisionStatus.DRAFT) {
        linkedRevision = await tx.revision.update({
          where: { id: linkedRevision.id },
          data: {
            status: RevisionStatus.IN_PROGRESS,
            assignedMechanicId: appointment.assignedMechanicId,
            mechanicName: appointment.mechanicName,
            assignedAt: new Date(),
          },
        });
      }

      await appointmentTx.update({
        where: { id: appointmentId },
        data: {
          revisionId: linkedRevision.id,
          status: RevisionAppointmentStatus.IN_SERVICE,
        },
      });
    });

    logger.info(`Revision appointment started: ${appointmentId}`);

    return this.getAdminAppointmentById(appointmentId, adminRole, adminId);
  }

  async syncAppointmentFromRevisionStart(revisionId: string) {
    const appointment = await revisionAppointmentClient.findFirst({
      where: { revisionId },
    });

    if (!appointment || appointment.status === RevisionAppointmentStatus.COMPLETED) {
      return;
    }

    await revisionAppointmentClient.update({
      where: { id: appointment.id },
      data: {
        status: RevisionAppointmentStatus.IN_SERVICE,
      },
    });
  }

  async syncAppointmentFromRevisionCompletion(revisionId: string) {
    const appointment = await revisionAppointmentClient.findFirst({
      where: { revisionId },
    });

    if (!appointment) {
      return;
    }

    await revisionAppointmentClient.update({
      where: { id: appointment.id },
      data: {
        status: RevisionAppointmentStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
  }

  async syncAppointmentFromRevisionCancellation(revisionId: string) {
    const appointment = await revisionAppointmentClient.findFirst({
      where: { revisionId },
    });

    if (!appointment || appointment.status === RevisionAppointmentStatus.COMPLETED) {
      return;
    }

    await revisionAppointmentClient.update({
      where: { id: appointment.id },
      data: {
        status: RevisionAppointmentStatus.CANCELLED,
        cancellationReason:
          appointment.cancellationReason || 'Cancelado junto com a revisao vinculada',
        cancelledAt: new Date(),
      },
    });
  }

  async syncAppointmentMechanic(
    revisionId: string,
    assignedMechanicId: string | null,
    mechanicName: string | null
  ) {
    const appointment = await revisionAppointmentClient.findFirst({
      where: { revisionId },
    });

    if (!appointment) {
      return;
    }

    await revisionAppointmentClient.update({
      where: { id: appointment.id },
      data: {
        assignedMechanicId,
        mechanicName,
      },
    });
  }
}

export default new RevisionAppointmentsService();
