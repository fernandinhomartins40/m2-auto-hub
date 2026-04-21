import { VehicleMake, VehicleModel, VehicleVariant } from '@prisma/client';
import { prisma } from '@config/database.js';
import { ApiError } from '@shared/utils/error.util.js';
import { logger } from '@shared/utils/logger.util.js';
import { CreateVehicleMakeDto } from './dto/create-vehicle-make.dto.js';
import { UpdateVehicleMakeDto } from './dto/update-vehicle-make.dto.js';
import { CreateVehicleModelDto } from './dto/create-vehicle-model.dto.js';
import { UpdateVehicleModelDto } from './dto/update-vehicle-model.dto.js';
import { CreateVehicleVariantDto } from './dto/create-vehicle-variant.dto.js';
import { UpdateVehicleVariantDto } from './dto/update-vehicle-variant.dto.js';

export class VehiclesService {
  // =========================================================================
  // VEHICLE MAKES
  // =========================================================================

  /**
   * Get all vehicle makes
   */
  async getMakes(activeOnly: boolean = false): Promise<VehicleMake[]> {
    return prisma.vehicleMake.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { models: true },
        },
      },
    });
  }

  /**
   * Get vehicle make by ID
   */
  async getMakeById(id: string, includeModels: boolean = false): Promise<VehicleMake> {
    const make = await prisma.vehicleMake.findUnique({
      where: { id },
      include: includeModels
        ? {
            models: {
              orderBy: { name: 'asc' },
              include: {
                _count: {
                  select: { variants: true },
                },
              },
            },
          }
        : undefined,
    });

    if (!make) {
      throw ApiError.notFound('Vehicle make not found');
    }

    return make;
  }

  /**
   * Create vehicle make
   */
  async createMake(dto: CreateVehicleMakeDto): Promise<VehicleMake> {
    // Check if make already exists
    const existing = await prisma.vehicleMake.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw ApiError.conflict(`Vehicle make "${dto.name}" already exists`);
    }

    const make = await prisma.vehicleMake.create({
      data: {
        name: dto.name,
        country: dto.country,
        logo: dto.logo,
        active: dto.active,
      },
    });

    logger.info(`Vehicle make created: ${make.name}`);

    return make;
  }

  /**
   * Update vehicle make
   */
  async updateMake(id: string, dto: UpdateVehicleMakeDto): Promise<VehicleMake> {
    const existing = await prisma.vehicleMake.findUnique({
      where: { id },
    });

    if (!existing) {
      throw ApiError.notFound('Vehicle make not found');
    }

    // Check name uniqueness if being changed
    if (dto.name && dto.name !== existing.name) {
      const duplicateName = await prisma.vehicleMake.findUnique({
        where: { name: dto.name },
      });

      if (duplicateName) {
        throw ApiError.conflict(`Vehicle make "${dto.name}" already exists`);
      }
    }

    const make = await prisma.vehicleMake.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.logo === null && { logo: null }),
      },
    });

    logger.info(`Vehicle make updated: ${make.name}`);

    return make;
  }

  /**
   * Delete vehicle make
   */
  async deleteMake(id: string): Promise<void> {
    const make = await prisma.vehicleMake.findUnique({
      where: { id },
      include: {
        _count: {
          select: { models: true },
        },
      },
    });

    if (!make) {
      throw ApiError.notFound('Vehicle make not found');
    }

    if (make._count.models > 0) {
      throw ApiError.badRequest('Cannot delete make with existing models');
    }

    await prisma.vehicleMake.delete({
      where: { id },
    });

    logger.info(`Vehicle make deleted: ${make.name}`);
  }

  // =========================================================================
  // VEHICLE MODELS
  // =========================================================================

  /**
   * Get all vehicle models
   */
  async getModels(makeId?: string, activeOnly: boolean = false): Promise<VehicleModel[]> {
    return prisma.vehicleModel.findMany({
      where: {
        ...(makeId && { makeId }),
        ...(activeOnly && { active: true }),
      },
      include: {
        make: true,
        _count: {
          select: { variants: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get vehicle model by ID
   */
  async getModelById(id: string, includeVariants: boolean = false): Promise<VehicleModel> {
    const model = await prisma.vehicleModel.findUnique({
      where: { id },
      include: {
        make: true,
        ...(includeVariants && {
          variants: {
            orderBy: { yearStart: 'desc' },
          },
        }),
      },
    });

    if (!model) {
      throw ApiError.notFound('Vehicle model not found');
    }

    return model;
  }

  /**
   * Create vehicle model
   */
  async createModel(dto: CreateVehicleModelDto): Promise<VehicleModel> {
    // Verify make exists
    const make = await prisma.vehicleMake.findUnique({
      where: { id: dto.makeId },
    });

    if (!make) {
      throw ApiError.notFound('Vehicle make not found');
    }

    const model = await prisma.vehicleModel.create({
      data: {
        makeId: dto.makeId,
        name: dto.name,
        segment: dto.segment,
        bodyType: dto.bodyType,
        fuelTypes: dto.fuelTypes,
        active: dto.active,
      },
      include: {
        make: true,
      },
    });

    logger.info(`Vehicle model created: ${make.name} ${model.name}`);

    return model;
  }

  /**
   * Update vehicle model
   */
  async updateModel(id: string, dto: UpdateVehicleModelDto): Promise<VehicleModel> {
    const existing = await prisma.vehicleModel.findUnique({
      where: { id },
    });

    if (!existing) {
      throw ApiError.notFound('Vehicle model not found');
    }

    // Verify make exists if being changed
    if (dto.makeId && dto.makeId !== existing.makeId) {
      const make = await prisma.vehicleMake.findUnique({
        where: { id: dto.makeId },
      });

      if (!make) {
        throw ApiError.notFound('Vehicle make not found');
      }
    }

    const model = await prisma.vehicleModel.update({
      where: { id },
      data: dto,
      include: {
        make: true,
      },
    });

    logger.info(`Vehicle model updated: ${model.name}`);

    return model;
  }

  /**
   * Delete vehicle model
   */
  async deleteModel(id: string): Promise<void> {
    const model = await prisma.vehicleModel.findUnique({
      where: { id },
      include: {
        _count: {
          select: { variants: true },
        },
      },
    });

    if (!model) {
      throw ApiError.notFound('Vehicle model not found');
    }

    if (model._count.variants > 0) {
      throw ApiError.badRequest('Cannot delete model with existing variants');
    }

    await prisma.vehicleModel.delete({
      where: { id },
    });

    logger.info(`Vehicle model deleted: ${model.name}`);
  }

  // =========================================================================
  // VEHICLE VARIANTS
  // =========================================================================

  /**
   * Get all vehicle variants
   */
  async getVariants(modelId?: string, activeOnly: boolean = false): Promise<VehicleVariant[]> {
    return prisma.vehicleVariant.findMany({
      where: {
        ...(modelId && { modelId }),
        ...(activeOnly && { active: true }),
      },
      include: {
        model: {
          include: {
            make: true,
          },
        },
      },
      orderBy: { yearStart: 'desc' },
    });
  }

  /**
   * Get vehicle variant by ID
   */
  async getVariantById(id: string): Promise<VehicleVariant> {
    const variant = await prisma.vehicleVariant.findUnique({
      where: { id },
      include: {
        model: {
          include: {
            make: true,
          },
        },
      },
    });

    if (!variant) {
      throw ApiError.notFound('Vehicle variant not found');
    }

    return variant;
  }

  /**
   * Create vehicle variant
   */
  async createVariant(dto: CreateVehicleVariantDto): Promise<VehicleVariant> {
    // Verify model exists
    const model = await prisma.vehicleModel.findUnique({
      where: { id: dto.modelId },
      include: { make: true },
    });

    if (!model) {
      throw ApiError.notFound('Vehicle model not found');
    }

    // Validate year range
    if (dto.yearEnd && dto.yearEnd < dto.yearStart) {
      throw ApiError.badRequest('Year end cannot be before year start');
    }

    const variant = await prisma.vehicleVariant.create({
      data: {
        modelId: dto.modelId,
        name: dto.name,
        engineInfo: dto.engineInfo,
        transmission: dto.transmission,
        yearStart: dto.yearStart,
        yearEnd: dto.yearEnd,
        specifications: dto.specifications,
        active: dto.active,
      },
      include: {
        model: {
          include: {
            make: true,
          },
        },
      },
    });

    logger.info(`Vehicle variant created: ${model.make.name} ${model.name} ${variant.name}`);

    return variant;
  }

  /**
   * Update vehicle variant
   */
  async updateVariant(id: string, dto: UpdateVehicleVariantDto): Promise<VehicleVariant> {
    const existing = await prisma.vehicleVariant.findUnique({
      where: { id },
    });

    if (!existing) {
      throw ApiError.notFound('Vehicle variant not found');
    }

    // Verify model exists if being changed
    if (dto.modelId && dto.modelId !== existing.modelId) {
      const model = await prisma.vehicleModel.findUnique({
        where: { id: dto.modelId },
      });

      if (!model) {
        throw ApiError.notFound('Vehicle model not found');
      }
    }

    // Validate year range
    const yearStart = dto.yearStart ?? existing.yearStart;
    const yearEnd = dto.yearEnd ?? existing.yearEnd;

    if (yearEnd && yearEnd < yearStart) {
      throw ApiError.badRequest('Year end cannot be before year start');
    }

    const variant = await prisma.vehicleVariant.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.yearEnd === null && { yearEnd: null }),
      },
      include: {
        model: {
          include: {
            make: true,
          },
        },
      },
    });

    logger.info(`Vehicle variant updated: ${variant.name}`);

    return variant;
  }

  /**
   * Delete vehicle variant
   */
  async deleteVariant(id: string): Promise<void> {
    const variant = await prisma.vehicleVariant.findUnique({
      where: { id },
    });

    if (!variant) {
      throw ApiError.notFound('Vehicle variant not found');
    }

    await prisma.vehicleVariant.delete({
      where: { id },
    });

    logger.info(`Vehicle variant deleted: ${variant.name}`);
  }

  // =========================================================================
  // UTILITY METHODS
  // =========================================================================

  /**
   * Get complete vehicle hierarchy (makes > models > variants)
   */
  async getVehicleHierarchy(): Promise<VehicleMake[]> {
    return prisma.vehicleMake.findMany({
      where: { active: true },
      include: {
        models: {
          where: { active: true },
          include: {
            variants: {
              where: { active: true },
              orderBy: { yearStart: 'desc' },
            },
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Search vehicles by make and model name
   */
  async searchVehicles(query: string): Promise<VehicleModel[]> {
    return prisma.vehicleModel.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { make: { name: { contains: query, mode: 'insensitive' } } },
        ],
        active: true,
      },
      include: {
        make: true,
        _count: {
          select: { variants: true },
        },
      },
      take: 20,
      orderBy: { name: 'asc' },
    });
  }
}
