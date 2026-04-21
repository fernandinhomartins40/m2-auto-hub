import { CustomerVehicle } from '@prisma/client';
import { prisma } from '@config/database.js';
import { ApiError } from '@shared/utils/error.util.js';
import { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import { UpdateVehicleDto } from './dto/update-vehicle.dto.js';
import { logger } from '@shared/utils/logger.util.js';

export class CustomerVehiclesService {
  /**
   * Get all vehicles for a customer
   */
  async getVehicles(customerId: string): Promise<CustomerVehicle[]> {
    return prisma.customerVehicle.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get vehicle by ID
   */
  async getVehicleById(id: string, customerId: string): Promise<CustomerVehicle> {
    const vehicle = await prisma.customerVehicle.findFirst({
      where: { id, customerId },
    });

    if (!vehicle) {
      throw ApiError.notFound('Vehicle not found');
    }

    return vehicle;
  }

  /**
   * Get vehicle by plate
   */
  async getVehicleByPlate(plate: string): Promise<CustomerVehicle | null> {
    return prisma.customerVehicle.findUnique({
      where: { plate: plate.toUpperCase() },
    });
  }

  /**
   * Create new vehicle
   */
  async createVehicle(
    customerId: string,
    dto: CreateVehicleDto
  ): Promise<CustomerVehicle> {
    // Check if plate already exists
    const existingVehicle = await this.getVehicleByPlate(dto.plate);
    if (existingVehicle) {
      throw ApiError.conflict('A vehicle with this plate already exists');
    }

    const vehicle = await prisma.customerVehicle.create({
      data: {
        customerId,
        brand: dto.brand,
        model: dto.model,
        year: dto.year,
        plate: dto.plate.toUpperCase(),
        chassisNumber: dto.chassisNumber,
        color: dto.color,
        mileage: dto.mileage,
      },
    });

    logger.info(`Vehicle created: ${vehicle.plate} for customer ${customerId}`);

    return vehicle;
  }

  /**
   * Update vehicle
   */
  async updateVehicle(
    id: string,
    customerId: string,
    dto: UpdateVehicleDto
  ): Promise<CustomerVehicle> {
    // Verify vehicle exists and belongs to customer
    await this.getVehicleById(id, customerId);

    // If plate is being changed, check if new plate exists
    if (dto.plate) {
      const existingVehicle = await prisma.customerVehicle.findFirst({
        where: {
          plate: dto.plate.toUpperCase(),
          NOT: { id },
        },
      });

      if (existingVehicle) {
        throw ApiError.conflict('A vehicle with this plate already exists');
      }
    }

    const vehicle = await prisma.customerVehicle.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.plate && { plate: dto.plate.toUpperCase() }),
      },
    });

    logger.info(`Vehicle updated: ${vehicle.plate}`);

    return vehicle;
  }

  /**
   * Delete vehicle (cascade deletes revisions)
   */
  async deleteVehicle(id: string, customerId: string): Promise<void> {
    // Verify vehicle exists and belongs to customer
    await this.getVehicleById(id, customerId);

    // Delete vehicle (revisions will be cascade deleted automatically)
    await prisma.customerVehicle.delete({
      where: { id },
    });

    logger.info(`Vehicle deleted (with cascade): ${id}`);
  }

  /**
   * Get vehicle with revisions history
   */
  async getVehicleWithRevisions(
    id: string,
    customerId: string
  ): Promise<CustomerVehicle & { revisions: any[] }> {
    const vehicle = await prisma.customerVehicle.findFirst({
      where: { id, customerId },
      include: {
        revisions: {
          orderBy: { date: 'desc' },
          select: {
            id: true,
            date: true,
            mileage: true,
            status: true,
            generalNotes: true,
            recommendations: true,
            createdAt: true,
            completedAt: true,
          },
        },
      },
    });

    if (!vehicle) {
      throw ApiError.notFound('Vehicle not found');
    }

    return vehicle;
  }

  /**
   * Update vehicle mileage
   */
  async updateMileage(
    id: string,
    customerId: string,
    mileage: number
  ): Promise<CustomerVehicle> {
    // Verify vehicle exists and belongs to customer
    const vehicle = await this.getVehicleById(id, customerId);

    // Validate new mileage is not less than current
    if (vehicle.mileage && mileage < vehicle.mileage) {
      throw ApiError.badRequest(
        'New mileage cannot be less than current mileage'
      );
    }

    return prisma.customerVehicle.update({
      where: { id },
      data: { mileage },
    });
  }
}
