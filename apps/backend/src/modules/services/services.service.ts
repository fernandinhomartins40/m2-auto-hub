import { Service, ServiceStatus, Prisma } from '@prisma/client';
import { prisma } from '@config/database.js';
import { ApiError } from '@shared/utils/error.util.js';
import { PaginationUtil, PaginatedResponse } from '@shared/utils/pagination.util.js';
import { logger } from '@shared/utils/logger.util.js';
import { CreateServiceDto } from './dto/create-service.dto.js';
import { UpdateServiceDto } from './dto/update-service.dto.js';
import { QueryServicesDto } from './dto/query-services.dto.js';

export interface ServiceCategorySummary {
  id: string;
  name: string;
  category: string;
  count: number;
  createdAt: Date;
  updatedAt: Date;
}

export class ServicesService {
  /**
   * Generate slug from service name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-'); // Remove duplicate hyphens
  }

  /**
   * Ensure slug is unique
   */
  private async ensureUniqueSlug(slug: string, excludeId?: string): Promise<string> {
    let uniqueSlug = slug;
    let counter = 1;

    while (true) {
      const existing = await prisma.service.findFirst({
        where: {
          slug: uniqueSlug,
          ...(excludeId && { NOT: { id: excludeId } }),
        },
      });

      if (!existing) break;

      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    return uniqueSlug;
  }

  private normalizeCategoryName(name: string): string {
    return name.trim().replace(/\s+/g, ' ');
  }

  private async ensureServiceCategory(
    name: string,
    client: Prisma.TransactionClient | typeof prisma = prisma
  ): Promise<void> {
    const normalizedName = this.normalizeCategoryName(name);

    if (!normalizedName) {
      throw ApiError.badRequest('Category name is required');
    }

    const existingCategory = await client.serviceCategory.findFirst({
      where: {
        name: {
          equals: normalizedName,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
      },
    });

    if (!existingCategory) {
      await client.serviceCategory.create({
        data: {
          name: normalizedName,
        },
      });
    }
  }

  private async buildCategorySummaries(
    includeEmptyCategories: boolean,
    activeOnly: boolean
  ): Promise<ServiceCategorySummary[]> {
    const [managedCategories, categoryCounts] = await Promise.all([
      prisma.serviceCategory.findMany({
        orderBy: {
          name: 'asc',
        },
      }),
      prisma.service.groupBy({
        by: ['category'],
        _count: {
          category: true,
        },
        ...(activeOnly
          ? {
              where: {
                status: ServiceStatus.ACTIVE,
              },
            }
          : {}),
        orderBy: {
          category: 'asc',
        },
      }),
    ]);

    const countByCategory = new Map(
      categoryCounts.map((category) => [category.category, category._count.category])
    );

    if (includeEmptyCategories) {
      return managedCategories.map((category) => ({
        id: category.id,
        name: category.name,
        category: category.name,
        count: countByCategory.get(category.name) || 0,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      }));
    }

    return managedCategories
      .filter((category) => (countByCategory.get(category.name) || 0) > 0)
      .map((category) => ({
        id: category.id,
        name: category.name,
        category: category.name,
        count: countByCategory.get(category.name) || 0,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      }));
  }

  /**
   * Get all services with filters and pagination
   */
  async getServices(query: QueryServicesDto): Promise<PaginatedResponse<Service>> {
    const { page, limit } = PaginationUtil.validateParams({
      page: query.page,
      limit: query.limit,
    });

    const skip = PaginationUtil.calculateSkip(page, limit);

    // Build where clause
    const where: Prisma.ServiceWhereInput = {};

    // Search in name and description
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Filters
    if (query.category) {
      where.category = { equals: query.category, mode: 'insensitive' };
    }

    if (query.status) {
      where.status = query.status as ServiceStatus;
    }

    // Build orderBy
    const orderBy: Prisma.ServiceOrderByWithRelationInput = {
      [query.sortBy || 'createdAt']: query.sortOrder || 'desc',
    };

    // Execute query
    const [services, totalCount] = await Promise.all([
      prisma.service.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.service.count({ where }),
    ]);

    return PaginationUtil.buildResponse(services, page, limit, totalCount);
  }

  /**
   * Get service by ID
   */
  async getServiceById(id: string): Promise<Service> {
    const service = await prisma.service.findUnique({
      where: { id },
    });

    if (!service) {
      throw ApiError.notFound('Service not found');
    }

    return service;
  }

  /**
   * Get service by slug
   */
  async getServiceBySlug(slug: string): Promise<Service> {
    const service = await prisma.service.findUnique({
      where: { slug },
    });

    if (!service) {
      throw ApiError.notFound('Service not found');
    }

    return service;
  }

  /**
   * Create new service
   */
  async createService(dto: CreateServiceDto): Promise<Service> {
    // Generate and ensure unique slug
    const baseSlug = dto.slug || this.generateSlug(dto.name);
    const slug = await this.ensureUniqueSlug(baseSlug);
    const normalizedCategory = this.normalizeCategoryName(dto.category);

    await this.ensureServiceCategory(normalizedCategory);

    const service = await prisma.service.create({
      data: {
        name: dto.name,
        description: dto.description,
        category: normalizedCategory,
        estimatedTime: dto.estimatedTime,
        basePrice: dto.basePrice,
        specifications: dto.specifications ? dto.specifications as Prisma.InputJsonValue : Prisma.JsonNull,
        status: dto.status || ServiceStatus.ACTIVE,
        slug,
        metaDescription: dto.metaDescription,
      },
    });

    logger.info(`Service created: ${service.name} (ID: ${service.id})`);

    return service;
  }

  /**
   * Update service
   */
  async updateService(id: string, dto: UpdateServiceDto): Promise<Service> {
    // Check if service exists
    const existing = await prisma.service.findUnique({
      where: { id },
    });

    if (!existing) {
      throw ApiError.notFound('Service not found');
    }

    const normalizedCategory = dto.category ? this.normalizeCategoryName(dto.category) : undefined;

    if (normalizedCategory) {
      await this.ensureServiceCategory(normalizedCategory);
    }

    // Handle slug update
    let slug = dto.slug;
    if (dto.name && dto.name !== existing.name) {
      const baseSlug = this.generateSlug(dto.name);
      slug = await this.ensureUniqueSlug(baseSlug, id);
    } else if (dto.slug && dto.slug !== existing.slug) {
      slug = await this.ensureUniqueSlug(dto.slug, id);
    }

    const updateData: Prisma.ServiceUpdateInput = {
      ...(dto.name && { name: dto.name }),
      ...(dto.description && { description: dto.description }),
      ...(normalizedCategory && { category: normalizedCategory }),
      ...(dto.estimatedTime !== undefined && { estimatedTime: dto.estimatedTime }),
      ...(dto.status && { status: dto.status }),
      ...(slug && { slug }),
      ...(dto.basePrice !== undefined && { basePrice: dto.basePrice }),
      ...(dto.metaDescription !== undefined && { metaDescription: dto.metaDescription }),
    };

    // Handle specifications separately due to Prisma JSON type
    if (dto.specifications !== undefined) {
      updateData.specifications = dto.specifications
        ? dto.specifications as Prisma.InputJsonValue
        : Prisma.JsonNull;
    }

    const service = await prisma.service.update({
      where: { id },
      data: updateData,
    });

    logger.info(`Service updated: ${service.name} (ID: ${service.id})`);

    return service;
  }

  /**
   * Delete service
   */
  async deleteService(id: string): Promise<void> {
    // Check if service exists
    const service = await prisma.service.findUnique({
      where: { id },
    });

    if (!service) {
      throw ApiError.notFound('Service not found');
    }

    await prisma.service.delete({
      where: { id },
    });

    logger.info(`Service deleted: ${service.name} (ID: ${service.id})`);
  }

  /**
   * Get services by category
   */
  async getServicesByCategory(category: string, limit: number = 20): Promise<Service[]> {
    return prisma.service.findMany({
      where: {
        category: { equals: category, mode: 'insensitive' },
        status: ServiceStatus.ACTIVE,
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get service categories
   */
  async getCategories(): Promise<ServiceCategorySummary[]> {
    return this.buildCategorySummaries(false, true);
  }

  async getManagedCategories(): Promise<ServiceCategorySummary[]> {
    return this.buildCategorySummaries(true, false);
  }

  async createCategory(name: string): Promise<ServiceCategorySummary> {
    const normalizedName = this.normalizeCategoryName(name);

    if (!normalizedName) {
      throw ApiError.badRequest('Category name is required');
    }

    const existingCategory = await prisma.serviceCategory.findFirst({
      where: {
        name: {
          equals: normalizedName,
          mode: 'insensitive',
        },
      },
    });

    if (existingCategory) {
      throw ApiError.conflict(`Category "${normalizedName}" already exists`);
    }

    const createdCategory = await prisma.serviceCategory.create({
      data: {
        name: normalizedName,
      },
    });

    return {
      id: createdCategory.id,
      name: createdCategory.name,
      category: createdCategory.name,
      count: 0,
      createdAt: createdCategory.createdAt,
      updatedAt: createdCategory.updatedAt,
    };
  }

  async updateCategory(id: string, name: string): Promise<ServiceCategorySummary> {
    const normalizedName = this.normalizeCategoryName(name);

    if (!normalizedName) {
      throw ApiError.badRequest('Category name is required');
    }

    const existingCategory = await prisma.serviceCategory.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      throw ApiError.notFound('Category not found');
    }

    const conflictingCategory = await prisma.serviceCategory.findFirst({
      where: {
        id: { not: id },
        name: {
          equals: normalizedName,
          mode: 'insensitive',
        },
      },
    });

    if (conflictingCategory) {
      throw ApiError.conflict(`Category "${normalizedName}" already exists`);
    }

    const updatedCategory = await prisma.$transaction(async (tx) => {
      if (existingCategory.name !== normalizedName) {
        await tx.service.updateMany({
          where: {
            category: existingCategory.name,
          },
          data: {
            category: normalizedName,
          },
        });
      }

      return tx.serviceCategory.update({
        where: { id },
        data: {
          name: normalizedName,
        },
      });
    });

    const count = await prisma.service.count({
      where: {
        category: updatedCategory.name,
        status: ServiceStatus.ACTIVE,
      },
    });

    return {
      id: updatedCategory.id,
      name: updatedCategory.name,
      category: updatedCategory.name,
      count,
      createdAt: updatedCategory.createdAt,
      updatedAt: updatedCategory.updatedAt,
    };
  }
}
