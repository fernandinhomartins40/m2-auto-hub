import { Promotion, Prisma } from '@prisma/client';
import { prisma } from '@config/database.js';
import { ApiError } from '@shared/utils/error.util.js';
import { PaginationUtil, PaginatedResponse } from '@shared/utils/pagination.util.js';
import { logger } from '@shared/utils/logger.util.js';
import { CreatePromotionDto } from './dto/create-promotion.dto.js';
import { UpdatePromotionDto } from './dto/update-promotion.dto.js';

export interface PromotionFilters {
  isActive?: boolean;
  isDraft?: boolean;
  type?: string;
  search?: string;
}

export class PromotionsService {
  /**
   * Create new promotion
   */
  async createPromotion(
    createdBy: string,
    dto: CreatePromotionDto
  ): Promise<Promotion> {
    // Validate code uniqueness if provided
    if (dto.code) {
      const existing = await prisma.promotion.findUnique({
        where: { code: dto.code },
      });

      if (existing) {
        throw ApiError.conflict('Promotion code already exists');
      }
    }

    // Validate date range
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (startDate >= endDate) {
      throw ApiError.badRequest('End date must be after start date');
    }

    const promotion = await prisma.promotion.create({
      data: {
        name: dto.name,
        description: dto.description,
        shortDescription: dto.shortDescription,
        bannerImage: dto.bannerImage,
        badgeText: dto.badgeText,

        type: dto.type,
        target: dto.target,
        trigger: dto.trigger,

        customerSegments: dto.customerSegments,
        geographicRestrictions: dto.geographicRestrictions || Prisma.JsonNull,
        deviceTypes: dto.deviceTypes || Prisma.JsonNull,

        rules: dto.rules || [],
        tiers: dto.tiers || Prisma.JsonNull,

        targetProductIds: dto.targetProductIds || Prisma.JsonNull,
        targetCategories: dto.targetCategories || Prisma.JsonNull,
        targetBrands: dto.targetBrands || Prisma.JsonNull,
        targetPriceRange: dto.targetPriceRange || Prisma.JsonNull,
        excludeProductIds: dto.excludeProductIds || Prisma.JsonNull,
        excludeCategories: dto.excludeCategories || Prisma.JsonNull,

        rewards: dto.rewards,

        schedule: dto.schedule,
        startDate,
        endDate,

        usageLimit: dto.usageLimit,
        usageLimitPerCustomer: dto.usageLimitPerCustomer,

        canCombineWithOthers: dto.canCombineWithOthers,
        excludePromotionIds: dto.excludePromotionIds || Prisma.JsonNull,
        priority: dto.priority,

        code: dto.code,
        autoApply: dto.autoApply,

        isActive: dto.isDraft !== undefined ? !dto.isDraft : true,
        isDraft: dto.isDraft || false,

        createdBy,
        tags: dto.tags || Prisma.JsonNull,
        notes: dto.notes,

        customLogic: dto.customLogic,
        webhookUrl: dto.webhookUrl,
      },
    });

    logger.info(`Promotion created: ${promotion.id} by ${createdBy}`);

    return promotion;
  }

  /**
   * Get promotions with pagination and filters
   */
  async getPromotions(
    page: number = 1,
    limit: number = 20,
    filters?: PromotionFilters
  ): Promise<PaginatedResponse<Promotion>> {
    const { page: validPage, limit: validLimit } = PaginationUtil.validateParams({
      page,
      limit,
    });
    const skip = PaginationUtil.calculateSkip(validPage, validLimit);

    const where: Prisma.PromotionWhereInput = {
      ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
      ...(filters?.isDraft !== undefined && { isDraft: filters.isDraft }),
      ...(filters?.type && { type: filters.type }),
      ...(filters?.search && {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
          { code: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [promotions, totalCount] = await Promise.all([
      prisma.promotion.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: validLimit,
      }),
      prisma.promotion.count({ where }),
    ]);

    return PaginationUtil.buildResponse(promotions, validPage, validLimit, totalCount);
  }

  /**
   * Get active promotions for customer
   */
  async getActivePromotions(customerId?: string): Promise<Promotion[]> {
    const now = new Date();

    const promotions = await prisma.promotion.findMany({
      where: {
        isActive: true,
        isDraft: false,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { priority: 'desc' },
    });

    // Filter by customer segments if customerId provided
    if (customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
      });

      if (customer) {
        return promotions.filter((promo) => {
          const segments = promo.customerSegments as string[];
          return (
            segments.includes('ALL') ||
            segments.includes(customer.level) ||
            (segments.includes('NEW_CUSTOMERS') && customer.totalOrders === 0) ||
            (segments.includes('RETURNING_CUSTOMERS') && customer.totalOrders > 0)
          );
        });
      }
    }

    return promotions;
  }

  /**
   * Get promotion by ID
   */
  async getPromotionById(id: string): Promise<Promotion> {
    const promotion = await prisma.promotion.findUnique({
      where: { id },
    });

    if (!promotion) {
      throw ApiError.notFound('Promotion not found');
    }

    return promotion;
  }

  /**
   * Get promotion by code
   */
  async getPromotionByCode(code: string): Promise<Promotion> {
    const promotion = await prisma.promotion.findUnique({
      where: { code },
    });

    if (!promotion) {
      throw ApiError.notFound('Promotion not found');
    }

    if (!promotion.isActive || promotion.isDraft) {
      throw ApiError.badRequest('Promotion is not active');
    }

    const now = new Date();
    if (now < promotion.startDate || now > promotion.endDate) {
      throw ApiError.badRequest('Promotion is not available');
    }

    if (promotion.usageLimit && promotion.usedCount >= promotion.usageLimit) {
      throw ApiError.badRequest('Promotion usage limit reached');
    }

    return promotion;
  }

  /**
   * Update promotion
   */
  async updatePromotion(
    id: string,
    modifiedBy: string,
    dto: UpdatePromotionDto
  ): Promise<Promotion> {
    const existing = await this.getPromotionById(id);

    // Validate code uniqueness if being changed
    if (dto.code && dto.code !== existing.code) {
      const codeExists = await prisma.promotion.findUnique({
        where: { code: dto.code },
      });

      if (codeExists) {
        throw ApiError.conflict('Promotion code already exists');
      }
    }

    // Validate date range if being changed
    if (dto.startDate || dto.endDate) {
      const startDate = dto.startDate ? new Date(dto.startDate) : existing.startDate;
      const endDate = dto.endDate ? new Date(dto.endDate) : existing.endDate;

      if (startDate >= endDate) {
        throw ApiError.badRequest('End date must be after start date');
      }
    }

    const updateData: Prisma.PromotionUpdateInput = {
      ...(dto.name && { name: dto.name }),
      ...(dto.description && { description: dto.description }),
      ...(dto.shortDescription !== undefined && { shortDescription: dto.shortDescription }),
      ...(dto.bannerImage !== undefined && { bannerImage: dto.bannerImage }),
      ...(dto.badgeText !== undefined && { badgeText: dto.badgeText }),

      ...(dto.type && { type: dto.type }),
      ...(dto.target && { target: dto.target }),
      ...(dto.trigger && { trigger: dto.trigger }),

      ...(dto.customerSegments && { customerSegments: dto.customerSegments }),
      ...(dto.geographicRestrictions !== undefined && {
        geographicRestrictions: dto.geographicRestrictions || Prisma.JsonNull,
      }),
      ...(dto.deviceTypes !== undefined && {
        deviceTypes: dto.deviceTypes || Prisma.JsonNull,
      }),

      ...(dto.rules !== undefined && {
        rules: dto.rules || []
      }),
      ...(dto.tiers !== undefined && { tiers: dto.tiers || Prisma.JsonNull }),

      ...(dto.targetProductIds !== undefined && {
        targetProductIds: dto.targetProductIds || Prisma.JsonNull,
      }),
      ...(dto.targetCategories !== undefined && {
        targetCategories: dto.targetCategories || Prisma.JsonNull,
      }),
      ...(dto.targetBrands !== undefined && {
        targetBrands: dto.targetBrands || Prisma.JsonNull,
      }),
      ...(dto.targetPriceRange !== undefined && {
        targetPriceRange: dto.targetPriceRange || Prisma.JsonNull,
      }),
      ...(dto.excludeProductIds !== undefined && {
        excludeProductIds: dto.excludeProductIds || Prisma.JsonNull,
      }),
      ...(dto.excludeCategories !== undefined && {
        excludeCategories: dto.excludeCategories || Prisma.JsonNull,
      }),

      ...(dto.rewards && { rewards: dto.rewards }),

      ...(dto.schedule && { schedule: dto.schedule }),
      ...(dto.startDate && { startDate: new Date(dto.startDate) }),
      ...(dto.endDate && { endDate: new Date(dto.endDate) }),

      ...(dto.usageLimit !== undefined && { usageLimit: dto.usageLimit }),
      ...(dto.usageLimitPerCustomer !== undefined && {
        usageLimitPerCustomer: dto.usageLimitPerCustomer,
      }),

      ...(dto.canCombineWithOthers !== undefined && {
        canCombineWithOthers: dto.canCombineWithOthers,
      }),
      ...(dto.excludePromotionIds !== undefined && {
        excludePromotionIds: dto.excludePromotionIds || Prisma.JsonNull,
      }),
      ...(dto.priority !== undefined && { priority: dto.priority }),

      ...(dto.code !== undefined && { code: dto.code }),
      ...(dto.autoApply !== undefined && { autoApply: dto.autoApply }),

      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.isDraft !== undefined && { isDraft: dto.isDraft }),

      ...(dto.tags !== undefined && { tags: dto.tags || Prisma.JsonNull }),
      ...(dto.notes !== undefined && { notes: dto.notes }),

      ...(dto.customLogic !== undefined && { customLogic: dto.customLogic }),
      ...(dto.webhookUrl !== undefined && { webhookUrl: dto.webhookUrl }),

      lastModifiedBy: modifiedBy,
    };

    const promotion = await prisma.promotion.update({
      where: { id },
      data: updateData,
    });

    logger.info(`Promotion updated: ${id} by ${modifiedBy}`);

    return promotion;
  }

  /**
   * Delete promotion
   */
  async deletePromotion(id: string): Promise<void> {
    await this.getPromotionById(id);

    await prisma.promotion.delete({
      where: { id },
    });

    logger.info(`Promotion deleted: ${id}`);
  }

  /**
   * Activate promotion
   */
  async activatePromotion(id: string, activatedBy: string): Promise<Promotion> {
    return this.updatePromotion(id, activatedBy, { isActive: true, isDraft: false });
  }

  /**
   * Deactivate promotion
   */
  async deactivatePromotion(id: string, deactivatedBy: string): Promise<Promotion> {
    return this.updatePromotion(id, deactivatedBy, { isActive: false });
  }

  /**
   * Increment promotion usage
   */
  async incrementUsage(id: string): Promise<void> {
    await prisma.promotion.update({
      where: { id },
      data: {
        usedCount: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Get promotion statistics
   */
  async getPromotionStats(id: string): Promise<{
    totalUsage: number;
    usageLimit: number | null;
    remainingUsage: number | null;
    isExpired: boolean;
    daysRemaining: number;
  }> {
    const promotion = await this.getPromotionById(id);
    const now = new Date();

    const daysRemaining = Math.ceil(
      (promotion.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      totalUsage: promotion.usedCount,
      usageLimit: promotion.usageLimit,
      remainingUsage: promotion.usageLimit
        ? promotion.usageLimit - promotion.usedCount
        : null,
      isExpired: now > promotion.endDate,
      daysRemaining: Math.max(0, daysRemaining),
    };
  }

  /**
   * Calculate applicable promotions for cart
   */
  async calculatePromotions(cartData: {
    items: Array<{
      productId?: string;
      serviceId?: string;
      quantity: number;
      price: number;
      category?: string;
    }>;
    customerId?: string;
    totalAmount: number;
  }): Promise<{
    applicablePromotions: Array<{
      promotionId: string;
      promotionName: string;
      promotionType: string;
      discountAmount: number;
      originalAmount: number;
      finalAmount: number;
      affectedItems: string[];
      description: string;
    }>;
    totalDiscount: number;
    finalTotal: number;
  }> {
    const now = new Date();

    // Get active promotions
    const promotions = await prisma.promotion.findMany({
      where: {
        isActive: true,
        isDraft: false,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { priority: 'desc' },
    });

    // Filter by customer segment if customerId provided
    let eligiblePromotions = promotions;
    if (cartData.customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: cartData.customerId },
      });

      if (customer) {
        eligiblePromotions = promotions.filter((promo) => {
          const segments = promo.customerSegments as string[];
          return (
            segments.includes('ALL') ||
            segments.includes(customer.level) ||
            (segments.includes('NEW_CUSTOMERS') && customer.totalOrders === 0) ||
            (segments.includes('RETURNING_CUSTOMERS') && customer.totalOrders > 0)
          );
        });
      }
    }

    const applicablePromotions: Array<{
      promotionId: string;
      promotionName: string;
      promotionType: string;
      discountAmount: number;
      originalAmount: number;
      finalAmount: number;
      affectedItems: string[];
      description: string;
    }> = [];

    let currentTotal = cartData.totalAmount;

    for (const promotion of eligiblePromotions) {
      // Check usage limit
      if (promotion.usageLimit && promotion.usedCount >= promotion.usageLimit) {
        continue;
      }

      // Check minimum value rule
      const rules = promotion.rules as any;
      if (rules.minPurchaseAmount && cartData.totalAmount < rules.minPurchaseAmount) {
        continue;
      }

      // Check if promotion applies to cart items
      const targetProductIds = promotion.targetProductIds as string[] | null;
      const targetCategories = promotion.targetCategories as string[] | null;
      const target = promotion.target as string;

      let isApplicable = false;
      const affectedItems: string[] = [];

      if (target === 'ALL_PRODUCTS') {
        isApplicable = true;
        affectedItems.push(...cartData.items.map(item => item.productId || item.serviceId || ''));
      } else if (target === 'SPECIFIC_PRODUCTS' && targetProductIds && targetProductIds.length > 0) {
        const matchingItems = cartData.items.filter(item =>
          item.productId && targetProductIds.includes(item.productId)
        );
        if (matchingItems.length > 0) {
          isApplicable = true;
          affectedItems.push(...matchingItems.map(item => item.productId!));
        }
      } else if (target === 'CATEGORY' && targetCategories && targetCategories.length > 0) {
        const matchingItems = cartData.items.filter(item =>
          item.category && targetCategories.includes(item.category)
        );
        if (matchingItems.length > 0) {
          isApplicable = true;
          affectedItems.push(...matchingItems.map(item => item.productId || item.serviceId || ''));
        }
      }

      if (!isApplicable) {
        continue;
      }

      // Calculate discount
      const rewards = promotion.rewards as any;
      let discountAmount = 0;

      if (rewards?.primary?.type === 'PERCENTAGE') {
        discountAmount = (currentTotal * rewards.primary.value) / 100;

        // Apply max discount if set
        if (rewards.primary.maxAmount && discountAmount > rewards.primary.maxAmount) {
          discountAmount = rewards.primary.maxAmount;
        }
      } else if (rewards?.primary?.type === 'FIXED') {
        discountAmount = Math.min(rewards.primary.value, currentTotal);
      }

      if (discountAmount > 0) {
        const finalAmount = currentTotal - discountAmount;

        applicablePromotions.push({
          promotionId: promotion.id,
          promotionName: promotion.name,
          promotionType: promotion.type,
          discountAmount: Math.round(discountAmount * 100) / 100,
          originalAmount: currentTotal,
          finalAmount: Math.round(finalAmount * 100) / 100,
          affectedItems,
          description: promotion.shortDescription || promotion.description,
        });

        // If promotion can't combine with others, stop here
        if (!promotion.canCombineWithOthers) {
          currentTotal = finalAmount;
          break;
        }

        currentTotal = finalAmount;
      }
    }

    const totalDiscount = cartData.totalAmount - currentTotal;

    return {
      applicablePromotions,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      finalTotal: Math.round(currentTotal * 100) / 100,
    };
  }
}
