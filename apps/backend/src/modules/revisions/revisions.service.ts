import { Prisma, Revision, RevisionCheckStatus, RevisionStatus } from '@prisma/client';
import { prisma } from '@config/database.js';
import { ApiError } from '@shared/utils/error.util.js';
import { CreateRevisionDto } from './dto/create-revision.dto.js';
import { UpdateRevisionDto } from './dto/update-revision.dto.js';
import { PaginationUtil, PaginatedResponse } from '@shared/utils/pagination.util.js';
import { logger } from '@shared/utils/logger.util.js';
import revisionAppointmentsService from '@modules/revision-appointments/revision-appointments.service.js';

export interface RevisionFilters {
  customerId?: string;
  vehicleId?: string;
  status?: RevisionStatus;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
  mechanicId?: string; // ✅ NEW: Filter by assigned mechanic
}

export class RevisionsService {
  /**
   * Get all revisions (Admin) - without customer filter unless specified
   * ✅ SECURITY FIX: Supports filtering by mechanicId for STAFF role
   */
  async getAllRevisions(
    filters: RevisionFilters = {}
  ): Promise<PaginatedResponse<Revision>> {
    const { page, limit } = PaginationUtil.validateParams({
      page: filters.page,
      limit: filters.limit,
    });

    const where: any = {};

    // ✅ NEW: Filter by assigned mechanic (for STAFF role)
    if (filters.mechanicId) {
      where.assignedMechanicId = filters.mechanicId;
    }

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.vehicleId) {
      where.vehicleId = filters.vehicleId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.date = {};
      if (filters.dateFrom) {
        where.date.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.date.lte = filters.dateTo;
      }
    }

    const [revisions, totalCount] = await Promise.all([
      prisma.revision.findMany({
        where,
        skip: PaginationUtil.calculateSkip(page, limit),
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          vehicle: {
            select: {
              id: true,
              brand: true,
              model: true,
              year: true,
              plate: true,
              color: true,
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          assignedMechanic: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      prisma.revision.count({ where }),
    ]);

    return PaginationUtil.buildResponse(revisions, page, limit, totalCount);
  }

  /**
   * Get all revisions for a customer with filters
   */
  async getRevisions(
    customerId: string,
    filters: RevisionFilters = {}
  ): Promise<PaginatedResponse<Revision>> {
    const { page, limit } = PaginationUtil.validateParams({
      page: filters.page,
      limit: filters.limit,
    });

    const where: any = { customerId };

    if (filters.vehicleId) {
      where.vehicleId = filters.vehicleId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.date = {};
      if (filters.dateFrom) {
        where.date.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.date.lte = filters.dateTo;
      }
    }

    const [revisions, totalCount] = await Promise.all([
      prisma.revision.findMany({
        where,
        skip: PaginationUtil.calculateSkip(page, limit),
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          vehicle: {
            select: {
              id: true,
              brand: true,
              model: true,
              year: true,
              plate: true,
            },
          },
        },
      }),
      prisma.revision.count({ where }),
    ]);

    return PaginationUtil.buildResponse(revisions, page, limit, totalCount);
  }

  /**
   * Get revision by ID
   */
  async getRevisionById(id: string, customerId: string): Promise<Revision> {
    const revision = await prisma.revision.findFirst({
      where: { id, customerId },
      include: {
        vehicle: {
          select: {
            id: true,
            brand: true,
            model: true,
            year: true,
            plate: true,
            color: true,
            chassisNumber: true,
            mileage: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!revision) {
      throw ApiError.notFound('Revision not found');
    }

    return revision;
  }

  /**
   * Create new revision
   */
  async createRevision(
    customerId: string,
    dto: CreateRevisionDto
  ): Promise<Revision> {
    // Verify vehicle exists and belongs to customer
    const vehicle = await prisma.customerVehicle.findFirst({
      where: {
        id: dto.vehicleId,
        customerId,
      },
    });

    if (!vehicle) {
      throw ApiError.notFound('Vehicle not found');
    }

    const revision = await prisma.revision.create({
      data: {
        customerId,
        vehicleId: dto.vehicleId,
        date: new Date(dto.date),
        mileage: dto.mileage,
        status: RevisionStatus.DRAFT,
        checklistItems: dto.checklistItems,
        generalNotes: dto.generalNotes,
        recommendations: dto.recommendations,
        // Espelho relacional: o Json acima continua servindo as telas atuais,
        // e estas linhas tornam os itens consultaveis por status/categoria.
        checks: { create: await this.buildChecks(dto.checklistItems) },
      },
      include: { checks: true },
    });

    logger.info(`Revision created: ${revision.id} for vehicle ${dto.vehicleId}`);

    return revision;
  }

  /**
   * Monta as linhas de RevisionCheck a partir dos itens do checklist.
   *
   * As FKs para o catalogo so sao preenchidas quando o item/categoria ainda
   * existe - assim uma revisao antiga sobrevive a mudanca do catalogo, mantendo
   * os nomes como estavam no momento da avaliacao.
   */
  private async buildChecks(
    itens: CreateRevisionDto['checklistItems']
  ): Promise<Prisma.RevisionCheckCreateWithoutRevisionInput[]> {
    if (!itens?.length) {
      return [];
    }

    const [itensValidos, categoriasValidas] = await Promise.all([
      prisma.checklistItem.findMany({
        where: { id: { in: itens.map((i) => i.itemId) } },
        select: { id: true },
      }),
      prisma.checklistCategory.findMany({
        where: { id: { in: itens.map((i) => i.categoryId) } },
        select: { id: true },
      }),
    ]);

    const idsItens = new Set(itensValidos.map((i) => i.id));
    const idsCategorias = new Set(categoriasValidas.map((c) => c.id));

    return itens.map((item) => ({
      itemId: idsItens.has(item.itemId) ? item.itemId : null,
      categoryId: idsCategorias.has(item.categoryId) ? item.categoryId : null,
      itemName: item.itemName,
      categoryName: item.categoryName,
      status: item.status as RevisionCheckStatus,
      notes: item.notes || null,
      photos: item.photos?.length ? (item.photos as Prisma.InputJsonValue) : undefined,
    }));
  }

  /**
   * Update revision
   */
  async updateRevision(
    id: string,
    customerId: string,
    dto: UpdateRevisionDto
  ): Promise<Revision> {
    // Verify revision exists and belongs to customer
    const existingRevision = await this.getRevisionById(id, customerId);

    // Prevent updates to completed or cancelled revisions
    if (
      existingRevision.status === RevisionStatus.COMPLETED ||
      existingRevision.status === RevisionStatus.CANCELLED
    ) {
      throw ApiError.badRequest(
        `Cannot update revision with status ${existingRevision.status}`
      );
    }

    const updateData: any = {};

    if (dto.date) {
      updateData.date = new Date(dto.date);
    }

    if (dto.mileage !== undefined) {
      updateData.mileage = dto.mileage;
    }

    if (dto.status) {
      updateData.status = dto.status;

      // Set completedAt when status changes to COMPLETED
      if (dto.status === RevisionStatus.COMPLETED) {
        updateData.completedAt = new Date();
      }
    }

    if (dto.checklistItems) {
      updateData.checklistItems = dto.checklistItems;
      // O espelho relacional e regravado junto, senao Json e tabela divergem.
      // deleteMany + create mantem os dois sempre com o mesmo conteudo.
      updateData.checks = {
        deleteMany: {},
        create: await this.buildChecks(dto.checklistItems),
      };
    }

    if (dto.generalNotes !== undefined) {
      updateData.generalNotes = dto.generalNotes;
    }

    if (dto.recommendations !== undefined) {
      updateData.recommendations = dto.recommendations;
    }

    const revision = await prisma.revision.update({
      where: { id },
      data: updateData,
    });

    logger.info(`Revision updated: ${revision.id}`);

    return revision;
  }

  /**
   * Delete revision
   */
  async deleteRevision(id: string, customerId: string): Promise<void> {
    // Verify revision exists and belongs to customer
    const revision = await this.getRevisionById(id, customerId);

    // Prevent deletion of completed revisions
    if (revision.status === RevisionStatus.COMPLETED) {
      throw ApiError.badRequest('Cannot delete completed revision');
    }

    await prisma.revision.delete({
      where: { id },
    });

    logger.info(`Revision deleted: ${id}`);
  }

  /**
   * Start revision (change status to IN_PROGRESS)
   */
  async startRevision(id: string, customerId: string): Promise<Revision> {
    const revision = await this.getRevisionById(id, customerId);

    if (revision.status !== RevisionStatus.DRAFT) {
      throw ApiError.badRequest('Only draft revisions can be started');
    }

    return prisma.revision.update({
      where: { id },
      data: { status: RevisionStatus.IN_PROGRESS },
    });
  }

  /**
   * Complete revision
   */
  async completeRevision(id: string, customerId: string): Promise<Revision> {
    const revision = await this.getRevisionById(id, customerId);

    if (revision.status === RevisionStatus.COMPLETED) {
      throw ApiError.badRequest('Revision is already completed');
    }

    if (revision.status === RevisionStatus.CANCELLED) {
      throw ApiError.badRequest('Cannot complete cancelled revision');
    }

    // Update vehicle mileage if revision has mileage
    if (revision.mileage) {
      await prisma.customerVehicle.update({
        where: { id: revision.vehicleId },
        data: { mileage: revision.mileage },
      });
    }

    return prisma.revision.update({
      where: { id },
      data: {
        status: RevisionStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
  }

  /**
   * Cancel revision
   */
  async cancelRevision(id: string, customerId: string): Promise<Revision> {
    const revision = await this.getRevisionById(id, customerId);

    if (revision.status === RevisionStatus.COMPLETED) {
      throw ApiError.badRequest('Cannot cancel completed revision');
    }

    if (revision.status === RevisionStatus.CANCELLED) {
      throw ApiError.badRequest('Revision is already cancelled');
    }

    return prisma.revision.update({
      where: { id },
      data: { status: RevisionStatus.CANCELLED },
    });
  }

  /**
   * Get revision statistics for a customer
   */
  async getRevisionStatistics(customerId: string): Promise<{
    total: number;
    byStatus: Record<RevisionStatus, number>;
    byVehicle: Array<{ vehicleId: string; vehicleName: string; count: number }>;
  }> {
    const [total, byStatus, byVehicle] = await Promise.all([
      prisma.revision.count({ where: { customerId } }),
      prisma.revision.groupBy({
        by: ['status'],
        where: { customerId },
        _count: true,
      }),
      prisma.revision.groupBy({
        by: ['vehicleId'],
        where: { customerId },
        _count: true,
      }),
    ]);

    // Get vehicle details
    const vehicleIds = byVehicle.map(v => v.vehicleId);
    const vehicles = await prisma.customerVehicle.findMany({
      where: { id: { in: vehicleIds } },
      select: { id: true, brand: true, model: true, year: true, plate: true },
    });

    const vehicleMap = new Map(vehicles.map(v => [v.id, v]));

    return {
      total,
      byStatus: byStatus.reduce(
        (acc, item) => {
          acc[item.status] = item._count;
          return acc;
        },
        {} as Record<RevisionStatus, number>
      ),
      byVehicle: byVehicle.map(item => {
        const vehicle = vehicleMap.get(item.vehicleId);
        return {
          vehicleId: item.vehicleId,
          vehicleName: vehicle
            ? `${vehicle.brand} ${vehicle.model} ${vehicle.year} (${vehicle.plate})`
            : 'Unknown Vehicle',
          count: item._count,
        };
      }),
    };
  }

  /**
   * Get revision history for a vehicle
   */
  async getVehicleRevisionHistory(
    vehicleId: string,
    customerId: string
  ): Promise<Revision[]> {
    // Verify vehicle belongs to customer
    const vehicle = await prisma.customerVehicle.findFirst({
      where: { id: vehicleId, customerId },
    });

    if (!vehicle) {
      throw ApiError.notFound('Vehicle not found');
    }

    return prisma.revision.findMany({
      where: { vehicleId },
      orderBy: { date: 'desc' },
    });
  }

  // ==================== ADMIN METHODS ====================

  /**
   * Get revision by ID (Admin - no customer check)
   * ✅ SECURITY FIX: STAFF can only access their own assigned revisions
   */
  async getRevisionByIdAdmin(
    id: string,
    adminRole?: string,
    adminId?: string
  ): Promise<Revision> {
    const revision = await prisma.revision.findUnique({
      where: { id },
      include: {
        vehicle: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        assignedMechanic: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!revision) {
      throw ApiError.notFound('Revision not found');
    }

    // ✅ SECURITY FIX: STAFF can only access their own revisions
    if (
      adminRole === 'STAFF' &&
      revision.assignedMechanicId !== adminId
    ) {
      throw ApiError.forbidden('You can only access your own assigned revisions');
    }

    return revision;
  }

  /**
   * Update revision (Admin - no customer check)
   * ✅ SECURITY FIX: STAFF can only update their own assigned revisions
   */
  async updateRevisionAdmin(
    id: string,
    dto: UpdateRevisionDto,
    adminRole?: string,
    adminId?: string
  ): Promise<Revision> {
    const revision = await prisma.revision.findUnique({
      where: { id },
    });

    if (!revision) {
      throw ApiError.notFound('Revision not found');
    }

    // ✅ SECURITY FIX: STAFF can only update their own revisions
    if (
      adminRole === 'STAFF' &&
      revision.assignedMechanicId !== adminId
    ) {
      throw ApiError.forbidden('You can only update your own assigned revisions');
    }

    const checks = dto.checklistItems
      ? await this.buildChecks(dto.checklistItems)
      : undefined;

    return prisma.revision.update({
      where: { id },
      data: {
        ...(dto.mileage !== undefined && { mileage: dto.mileage }),
        ...(dto.status && { status: dto.status }),
        ...(dto.checklistItems && {
          checklistItems: dto.checklistItems,
          checks: {
            deleteMany: {},
            create: checks,
          },
        }),
        ...(dto.generalNotes !== undefined && { generalNotes: dto.generalNotes }),
        ...(dto.recommendations !== undefined && {
          recommendations: dto.recommendations,
        }),
        updatedAt: new Date(),
      },
      include: { checks: true },
    });
  }

  /**
   * Delete revision (Admin - no customer check)
   */
  async deleteRevisionAdmin(id: string): Promise<void> {
    const revision = await prisma.revision.findUnique({
      where: { id },
    });

    if (!revision) {
      throw ApiError.notFound('Revision not found');
    }

    await prisma.revision.delete({
      where: { id },
    });

    logger.info(`Revision deleted by admin: ${id}`);
  }

  /**
   * Start revision (Admin)
   */
  async startRevisionAdmin(id: string): Promise<Revision> {
    const revision = await prisma.revision.findUnique({
      where: { id },
    });

    if (!revision) {
      throw ApiError.notFound('Revision not found');
    }

    if (revision.status !== RevisionStatus.DRAFT) {
      throw ApiError.badRequest('Only draft revisions can be started');
    }

    const updated = await prisma.revision.update({
      where: { id },
      data: {
        status: RevisionStatus.IN_PROGRESS,
        updatedAt: new Date(),
      },
    });

    await revisionAppointmentsService.syncAppointmentFromRevisionStart(id);

    return updated;
  }

  /**
   * Complete revision (Admin)
   */
  async completeRevisionAdmin(id: string): Promise<Revision> {
    const revision = await prisma.revision.findUnique({
      where: { id },
    });

    if (!revision) {
      throw ApiError.notFound('Revision not found');
    }

    if (revision.status === RevisionStatus.COMPLETED) {
      throw ApiError.badRequest('Revision is already completed');
    }

    const updated = await prisma.revision.update({
      where: { id },
      data: {
        status: RevisionStatus.COMPLETED,
        completedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await revisionAppointmentsService.syncAppointmentFromRevisionCompletion(id);

    return updated;
  }

  /**
   * Cancel revision (Admin)
   */
  async cancelRevisionAdmin(id: string): Promise<Revision> {
    const revision = await prisma.revision.findUnique({
      where: { id },
    });

    if (!revision) {
      throw ApiError.notFound('Revision not found');
    }

    if (revision.status === RevisionStatus.COMPLETED) {
      throw ApiError.badRequest('Cannot cancel completed revision');
    }

    const updated = await prisma.revision.update({
      where: { id },
      data: {
        status: RevisionStatus.CANCELLED,
        updatedAt: new Date(),
      },
    });

    await revisionAppointmentsService.syncAppointmentFromRevisionCancellation(id);

    return updated;
  }

  /**
   * Get all revision statistics (Admin)
   */
  async getAllRevisionStatistics(): Promise<any> {
    const [total, draft, inProgress, completed, cancelled] = await Promise.all([
      prisma.revision.count(),
      prisma.revision.count({ where: { status: RevisionStatus.DRAFT } }),
      prisma.revision.count({ where: { status: RevisionStatus.IN_PROGRESS } }),
      prisma.revision.count({ where: { status: RevisionStatus.COMPLETED } }),
      prisma.revision.count({ where: { status: RevisionStatus.CANCELLED } }),
    ]);

    return {
      total,
      byStatus: {
        draft,
        inProgress,
        completed,
        cancelled,
      },
    };
  }

  /**
   * Get vehicle revision history (Admin - no customer check)
   */
  async getVehicleRevisionHistoryAdmin(vehicleId: string): Promise<Revision[]> {
    const vehicle = await prisma.customerVehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw ApiError.notFound('Vehicle not found');
    }

    return prisma.revision.findMany({
      where: { vehicleId },
      orderBy: { date: 'desc' },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });
  }

  // ==================== MECHANIC MANAGEMENT ====================

  /**
   * Assign mechanic to revision (Admin)
   */
  async assignMechanic(
    revisionId: string,
    mechanicId: string
  ): Promise<Revision> {
    const mechanic = await prisma.admin.findUnique({
      where: { id: mechanicId },
    });

    if (!mechanic) {
      throw ApiError.notFound('Mechanic not found');
    }

    if (mechanic.status !== 'ACTIVE') {
      throw ApiError.badRequest('Mechanic is not active');
    }

    const revision = await prisma.revision.findUnique({
      where: { id: revisionId },
    });

    if (!revision) {
      throw ApiError.notFound('Revision not found');
    }

    // Build transfer history
    const transferHistory: any[] = (revision.transferHistory as any[]) || [];
    if (revision.assignedMechanicId) {
      transferHistory.push({
        from: revision.assignedMechanicId,
        fromName: revision.mechanicName,
        to: mechanicId,
        toName: mechanic.name,
        transferredAt: new Date().toISOString(),
        reason: 'Manual assignment',
      });
    }

    const updated = await prisma.revision.update({
      where: { id: revisionId },
      data: {
        assignedMechanicId: mechanicId,
        mechanicName: mechanic.name,
        assignedAt: new Date(),
        transferHistory,
        status: revision.status === 'DRAFT' ? 'IN_PROGRESS' : revision.status,
        updatedAt: new Date(),
      },
      include: {
        vehicle: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        assignedMechanic: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    logger.info(
      `Mechanic ${mechanic.name} (${mechanicId}) assigned to revision ${revisionId}`
    );

    await revisionAppointmentsService.syncAppointmentMechanic(
      revisionId,
      updated.assignedMechanicId,
      updated.mechanicName
    );

    return updated;
  }

  /**
   * Transfer revision to another mechanic (Admin)
   */
  async transferMechanic(
    revisionId: string,
    newMechanicId: string,
    reason?: string
  ): Promise<Revision> {
    const revision = await prisma.revision.findUnique({
      where: { id: revisionId },
    });

    if (!revision) {
      throw ApiError.notFound('Revision not found');
    }

    if (!revision.assignedMechanicId) {
      throw ApiError.badRequest('Revision has no assigned mechanic to transfer from');
    }

    if (revision.assignedMechanicId === newMechanicId) {
      throw ApiError.badRequest('Cannot transfer to the same mechanic');
    }

    const newMechanic = await prisma.admin.findUnique({
      where: { id: newMechanicId },
    });

    if (!newMechanic) {
      throw ApiError.notFound('New mechanic not found');
    }

    if (newMechanic.status !== 'ACTIVE') {
      throw ApiError.badRequest('New mechanic is not active');
    }

    const transferHistory: any[] = (revision.transferHistory as any[]) || [];
    transferHistory.push({
      from: revision.assignedMechanicId,
      fromName: revision.mechanicName,
      to: newMechanicId,
      toName: newMechanic.name,
      transferredAt: new Date().toISOString(),
      reason: reason || 'Transfer requested',
    });

    const updated = await prisma.revision.update({
      where: { id: revisionId },
      data: {
        assignedMechanicId: newMechanicId,
        mechanicName: newMechanic.name,
        assignedAt: new Date(),
        transferHistory,
        updatedAt: new Date(),
      },
      include: {
        vehicle: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        assignedMechanic: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    logger.info(
      `Revision ${revisionId} transferred from ${revision.mechanicName} to ${newMechanic.name}. Reason: ${reason || 'Not specified'}`
    );

    await revisionAppointmentsService.syncAppointmentMechanic(
      revisionId,
      updated.assignedMechanicId,
      updated.mechanicName
    );

    return updated;
  }

  /**
   * Get revisions by mechanic (Admin)
   */
  async getRevisionsByMechanic(
    mechanicId: string,
    filters: RevisionFilters = {}
  ): Promise<PaginatedResponse<Revision>> {
    const mechanic = await prisma.admin.findUnique({
      where: { id: mechanicId },
    });

    if (!mechanic) {
      throw ApiError.notFound('Mechanic not found');
    }

    const { page, limit } = PaginationUtil.validateParams({
      page: filters.page,
      limit: filters.limit,
    });

    const where: any = { assignedMechanicId: mechanicId };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.vehicleId) {
      where.vehicleId = filters.vehicleId;
    }

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.date = {};
      if (filters.dateFrom) {
        where.date.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.date.lte = filters.dateTo;
      }
    }

    const [revisions, totalCount] = await Promise.all([
      prisma.revision.findMany({
        where,
        skip: PaginationUtil.calculateSkip(page, limit),
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          vehicle: {
            select: {
              id: true,
              brand: true,
              model: true,
              year: true,
              plate: true,
              color: true,
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          assignedMechanic: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      prisma.revision.count({ where }),
    ]);

    return PaginationUtil.buildResponse(revisions, page, limit, totalCount);
  }

  /**
   * Unassign mechanic from revision (Admin)
   */
  async unassignMechanic(revisionId: string): Promise<Revision> {
    const revision = await prisma.revision.findUnique({
      where: { id: revisionId },
    });

    if (!revision) {
      throw ApiError.notFound('Revision not found');
    }

    if (!revision.assignedMechanicId) {
      throw ApiError.badRequest('Revision has no assigned mechanic');
    }

    const updated = await prisma.revision.update({
      where: { id: revisionId },
      data: {
        assignedMechanicId: null,
        mechanicName: null,
        assignedAt: null,
        updatedAt: new Date(),
      },
      include: {
        vehicle: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    logger.info(`Mechanic unassigned from revision ${revisionId}`);

    await revisionAppointmentsService.syncAppointmentMechanic(revisionId, null, null);

    return updated;
  }

  /**
   * Get mechanic workload statistics (Admin)
   */
  async getMechanicWorkloadStats(mechanicId: string): Promise<any> {
    const mechanic = await prisma.admin.findUnique({
      where: { id: mechanicId },
    });

    if (!mechanic) {
      throw ApiError.notFound('Mechanic not found');
    }

    const [total, draft, inProgress, completed, cancelled] = await Promise.all([
      prisma.revision.count({ where: { assignedMechanicId: mechanicId } }),
      prisma.revision.count({
        where: { assignedMechanicId: mechanicId, status: 'DRAFT' },
      }),
      prisma.revision.count({
        where: { assignedMechanicId: mechanicId, status: 'IN_PROGRESS' },
      }),
      prisma.revision.count({
        where: { assignedMechanicId: mechanicId, status: 'COMPLETED' },
      }),
      prisma.revision.count({
        where: { assignedMechanicId: mechanicId, status: 'CANCELLED' },
      }),
    ]);

    return {
      mechanicId,
      mechanicName: mechanic.name,
      total,
      active: draft + inProgress,
      byStatus: {
        draft,
        inProgress,
        completed,
        cancelled,
      },
    };
  }

  /**
   * Get all mechanics workload (Admin)
   */
  async getAllMechanicsWorkload(): Promise<any[]> {
    const mechanics = await prisma.admin.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    const workloads = await Promise.all(
      mechanics.map(async (mechanic) => {
        const stats = await this.getMechanicWorkloadStats(mechanic.id);
        return {
          ...mechanic,
          workload: stats,
        };
      })
    );

    return workloads.sort((a, b) => b.workload.active - a.workload.active);
  }
}
