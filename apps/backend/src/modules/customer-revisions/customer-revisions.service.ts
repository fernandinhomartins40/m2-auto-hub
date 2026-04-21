import { prisma } from '@config/database.js';
import { ApiError } from '@shared/utils/error.util.js';
import { RevisionStatus } from '@prisma/client';

export class CustomerRevisionsService {
  /**
   * Get all revisions for a specific customer with pagination
   */
  async getCustomerRevisions(
    customerId: string,
    options: {
      page?: number;
      limit?: number;
      vehicleId?: string;
      status?: string;
    } = {}
  ) {
    const { page = 1, limit = 50, vehicleId, status } = options;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      customerId
    };

    if (vehicleId) {
      where.vehicleId = vehicleId;
    }

    if (status) {
      where.status = status as RevisionStatus;
    }

    // Get total count
    const total = await prisma.revision.count({ where });

    // Get revisions with related data
    const revisions = await prisma.revision.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        date: 'desc'
      },
      include: {
        vehicle: {
          select: {
            id: true,
            plate: true,
            brand: true,
            model: true,
            year: true,
            color: true
          }
        },
        assignedMechanic: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return {
      data: revisions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get specific revision by ID for a customer
   */
  async getCustomerRevisionById(customerId: string, revisionId: string) {
    const revision = await prisma.revision.findFirst({
      where: {
        id: revisionId,
        customerId
      },
      include: {
        vehicle: {
          select: {
            id: true,
            plate: true,
            brand: true,
            model: true,
            year: true,
            color: true
          }
        },
        assignedMechanic: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!revision) {
      throw ApiError.notFound('Revision not found or access denied');
    }

    return revision;
  }

  /**
   * Get revisions for specific vehicle of a customer
   */
  async getCustomerRevisionsByVehicle(customerId: string, vehicleId: string) {
    // Verify vehicle belongs to customer
    const vehicle = await prisma.customerVehicle.findFirst({
      where: {
        id: vehicleId,
        customerId
      }
    });

    if (!vehicle) {
      throw ApiError.notFound('Vehicle not found or access denied');
    }

    const revisions = await prisma.revision.findMany({
      where: {
        vehicleId,
        customerId
      },
      orderBy: {
        date: 'desc'
      },
      include: {
        vehicle: {
          select: {
            id: true,
            plate: true,
            brand: true,
            model: true,
            year: true,
            color: true
          }
        },
        assignedMechanic: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return revisions;
  }

  /**
   * Get upcoming maintenance reminders for a customer
   */
  async getUpcomingReminders(customerId: string) {
    // Get all customer vehicles
    const vehicles = await prisma.customerVehicle.findMany({
      where: {
        customerId
      }
    });

    const reminders = [];
    const today = new Date();

    for (const vehicle of vehicles) {
      // Get last revision for this vehicle
      const lastRevision = await prisma.revision.findFirst({
        where: {
          vehicleId: vehicle.id,
          status: RevisionStatus.COMPLETED
        },
        orderBy: {
          date: 'desc'
        }
      });

      if (lastRevision) {
        // Calculate time since last revision
        const daysSinceLastRevision = Math.floor(
          (today.getTime() - new Date(lastRevision.date).getTime()) / (1000 * 60 * 60 * 24)
        );

        // Recommend revision every 6 months (180 days) or 10,000 km
        const mileageSinceLastRevision = vehicle.mileage && lastRevision.mileage
          ? vehicle.mileage - lastRevision.mileage
          : 0;

        if (daysSinceLastRevision >= 150 || mileageSinceLastRevision >= 8000) {
          reminders.push({
            vehicle: {
              id: vehicle.id,
              plate: vehicle.plate,
              brand: vehicle.brand,
              model: vehicle.model,
              year: vehicle.year
            },
            lastRevisionDate: lastRevision.date,
            daysSinceLastRevision,
            mileageSinceLastRevision,
            priority: daysSinceLastRevision >= 180 || mileageSinceLastRevision >= 10000 ? 'high' : 'medium',
            message: this.getRemindermessage(daysSinceLastRevision, mileageSinceLastRevision)
          });
        }
      } else {
        // No revision yet - high priority
        reminders.push({
          vehicle: {
            id: vehicle.id,
            plate: vehicle.plate,
            brand: vehicle.brand,
            model: vehicle.model,
            year: vehicle.year
          },
          lastRevisionDate: null,
          daysSinceLastRevision: null,
          mileageSinceLastRevision: null,
          priority: 'high',
          message: 'Nenhuma revisão registrada. Agende uma vistoria completa.'
        });
      }
    }

    return reminders;
  }

  /**
   * Get statistics for customer revisions
   */
  async getCustomerStatistics(customerId: string) {
    const [
      totalRevisions,
      completedRevisions,
      inProgressRevisions,
      vehicles,
      criticalItems
    ] = await Promise.all([
      // Total revisions
      prisma.revision.count({
        where: { customerId }
      }),

      // Completed revisions
      prisma.revision.count({
        where: {
          customerId,
          status: RevisionStatus.COMPLETED
        }
      }),

      // In progress revisions
      prisma.revision.count({
        where: {
          customerId,
          status: RevisionStatus.IN_PROGRESS
        }
      }),

      // Total vehicles
      prisma.customerVehicle.count({
        where: {
          customerId
        }
      }),

      // Get completed revisions to count critical items
      prisma.revision.findMany({
        where: {
          customerId,
          status: RevisionStatus.COMPLETED
        },
        select: {
          checklistItems: true
        }
      })
    ]);

    // Count critical items from all completed revisions
    let criticalItemCount = 0;
    criticalItems.forEach(revision => {
      const items = revision.checklistItems as any[];
      if (Array.isArray(items)) {
        criticalItemCount += items.filter((item: any) => item.status === 'CRITICAL').length;
      }
    });

    return {
      totalRevisions,
      completedRevisions,
      inProgressRevisions,
      totalVehicles: vehicles,
      criticalItemsFound: criticalItemCount
    };
  }

  /**
   * Helper to generate reminder message
   */
  private getRemindermessage(days: number, mileage: number): string {
    if (days >= 180) {
      return `Já se passaram ${days} dias desde a última revisão. Recomendamos agendar uma nova vistoria.`;
    }
    if (mileage >= 10000) {
      return `Seu veículo rodou ${mileage.toLocaleString()} km desde a última revisão. Hora de revisar!`;
    }
    if (days >= 150) {
      return `Faltam ${180 - days} dias para completar 6 meses desde a última revisão.`;
    }
    if (mileage >= 8000) {
      return `Faltam ${(10000 - mileage).toLocaleString()} km para a próxima revisão recomendada.`;
    }
    return 'Em breve será necessário agendar uma nova revisão.';
  }
}
