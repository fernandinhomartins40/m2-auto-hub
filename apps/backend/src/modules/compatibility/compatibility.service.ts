import { ProductVehicleCompatibility } from '@prisma/client';
import { prisma } from '@config/database.js';
import { ApiError } from '@shared/utils/error.util.js';
import { logger } from '@shared/utils/logger.util.js';
import { CreateCompatibilityDto } from './dto/create-compatibility.dto.js';
import { UpdateCompatibilityDto } from './dto/update-compatibility.dto.js';

export class CompatibilityService {
  /**
   * Get all compatibility records
   */
  async getCompatibilities(productId?: string): Promise<ProductVehicleCompatibility[]> {
    return prisma.productVehicleCompatibility.findMany({
      where: productId ? { productId } : undefined,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            category: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get compatibility by ID
   */
  async getCompatibilityById(id: string): Promise<ProductVehicleCompatibility> {
    const compatibility = await prisma.productVehicleCompatibility.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            category: true,
          },
        },
      },
    });

    if (!compatibility) {
      throw ApiError.notFound('Compatibility record not found');
    }

    return compatibility;
  }

  /**
   * Create compatibility record
   */
  async createCompatibility(dto: CreateCompatibilityDto): Promise<ProductVehicleCompatibility> {
    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    // Verify make exists if provided
    if (dto.makeId) {
      const make = await prisma.vehicleMake.findUnique({
        where: { id: dto.makeId },
      });

      if (!make) {
        throw ApiError.notFound('Vehicle make not found');
      }
    }

    // Verify model exists if provided
    if (dto.modelId) {
      const model = await prisma.vehicleModel.findUnique({
        where: { id: dto.modelId },
      });

      if (!model) {
        throw ApiError.notFound('Vehicle model not found');
      }

      // If model is provided, make must match
      if (dto.makeId && model.makeId !== dto.makeId) {
        throw ApiError.badRequest('Model does not belong to the specified make');
      }
    }

    // Verify variant exists if provided
    if (dto.variantId) {
      const variant = await prisma.vehicleVariant.findUnique({
        where: { id: dto.variantId },
      });

      if (!variant) {
        throw ApiError.notFound('Vehicle variant not found');
      }

      // If variant is provided, model must match
      if (dto.modelId && variant.modelId !== dto.modelId) {
        throw ApiError.badRequest('Variant does not belong to the specified model');
      }
    }

    // Validate year range
    if (dto.yearEnd && dto.yearStart && dto.yearEnd < dto.yearStart) {
      throw ApiError.badRequest('Year end cannot be before year start');
    }

    const compatibility = await prisma.productVehicleCompatibility.create({
      data: {
        productId: dto.productId,
        makeId: dto.makeId,
        modelId: dto.modelId,
        variantId: dto.variantId,
        yearStart: dto.yearStart,
        yearEnd: dto.yearEnd,
        compatibilityData: dto.compatibilityData,
        verified: dto.verified,
        notes: dto.notes,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            category: true,
          },
        },
      },
    });

    logger.info(`Compatibility created for product: ${product.name}`);

    return compatibility;
  }

  /**
   * Update compatibility record
   */
  async updateCompatibility(
    id: string,
    dto: UpdateCompatibilityDto
  ): Promise<ProductVehicleCompatibility> {
    const existing = await prisma.productVehicleCompatibility.findUnique({
      where: { id },
    });

    if (!existing) {
      throw ApiError.notFound('Compatibility record not found');
    }

    // Verify make exists if being changed
    if (dto.makeId !== undefined && dto.makeId !== null) {
      const make = await prisma.vehicleMake.findUnique({
        where: { id: dto.makeId },
      });

      if (!make) {
        throw ApiError.notFound('Vehicle make not found');
      }
    }

    // Verify model exists if being changed
    if (dto.modelId !== undefined && dto.modelId !== null) {
      const model = await prisma.vehicleModel.findUnique({
        where: { id: dto.modelId },
      });

      if (!model) {
        throw ApiError.notFound('Vehicle model not found');
      }
    }

    // Verify variant exists if being changed
    if (dto.variantId !== undefined && dto.variantId !== null) {
      const variant = await prisma.vehicleVariant.findUnique({
        where: { id: dto.variantId },
      });

      if (!variant) {
        throw ApiError.notFound('Vehicle variant not found');
      }
    }

    // Validate year range
    const yearStart = dto.yearStart ?? existing.yearStart;
    const yearEnd = dto.yearEnd ?? existing.yearEnd;

    if (yearEnd && yearStart && yearEnd < yearStart) {
      throw ApiError.badRequest('Year end cannot be before year start');
    }

    const compatibility = await prisma.productVehicleCompatibility.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.makeId === null && { makeId: null }),
        ...(dto.modelId === null && { modelId: null }),
        ...(dto.variantId === null && { variantId: null }),
        ...(dto.yearStart === null && { yearStart: null }),
        ...(dto.yearEnd === null && { yearEnd: null }),
        ...(dto.notes === null && { notes: null }),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            category: true,
          },
        },
      },
    });

    logger.info(`Compatibility updated: ${id}`);

    return compatibility;
  }

  /**
   * Delete compatibility record
   */
  async deleteCompatibility(id: string): Promise<void> {
    const compatibility = await prisma.productVehicleCompatibility.findUnique({
      where: { id },
    });

    if (!compatibility) {
      throw ApiError.notFound('Compatibility record not found');
    }

    await prisma.productVehicleCompatibility.delete({
      where: { id },
    });

    logger.info(`Compatibility deleted: ${id}`);
  }

  /**
   * Find compatible products for a vehicle
   */
  async findCompatibleProducts(
    makeId?: string,
    modelId?: string,
    variantId?: string,
    year?: number
  ): Promise<ProductVehicleCompatibility[]> {
    const where: any = {
      OR: [
        // Universal compatibility (no vehicle specified)
        {
          makeId: null,
          modelId: null,
          variantId: null,
        },
      ],
    };

    if (makeId) {
      where.OR.push({
        makeId,
        modelId: null,
        variantId: null,
      });
    }

    if (modelId) {
      where.OR.push({
        makeId,
        modelId,
        variantId: null,
      });
    }

    if (variantId) {
      where.OR.push({
        makeId,
        modelId,
        variantId,
      });
    }

    // Year filter
    if (year) {
      where.AND = [
        {
          OR: [{ yearStart: null }, { yearStart: { lte: year } }],
        },
        {
          OR: [{ yearEnd: null }, { yearEnd: { gte: year } }],
        },
      ];
    }

    const compatibilities = await prisma.productVehicleCompatibility.findMany({
      where,
      include: {
        product: true,
      },
      orderBy: [{ verified: 'desc' }, { createdAt: 'desc' }],
    });

    return compatibilities;
  }

  /**
   * Get compatible vehicles for a product
   */
  async getCompatibleVehicles(productId: string): Promise<ProductVehicleCompatibility[]> {
    return prisma.productVehicleCompatibility.findMany({
      where: { productId },
      orderBy: [{ verified: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Mark compatibility as verified
   */
  async verifyCompatibility(id: string, verified: boolean = true): Promise<ProductVehicleCompatibility> {
    const compatibility = await prisma.productVehicleCompatibility.findUnique({
      where: { id },
    });

    if (!compatibility) {
      throw ApiError.notFound('Compatibility record not found');
    }

    const updated = await prisma.productVehicleCompatibility.update({
      where: { id },
      data: { verified },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
      },
    });

    logger.info(`Compatibility ${verified ? 'verified' : 'unverified'}: ${id}`);

    return updated;
  }
}
