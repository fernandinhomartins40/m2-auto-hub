import { Coupon, Prisma } from '@prisma/client';
import { prisma } from '@config/database.js';
import { ApiError } from '@shared/utils/error.util.js';
import { PaginationUtil, PaginatedResponse } from '@shared/utils/pagination.util.js';
import { logger } from '@shared/utils/logger.util.js';
import { CreateCouponDto } from './dto/create-coupon.dto.js';
import { UpdateCouponDto } from './dto/update-coupon.dto.js';
import { ValidateCouponDto } from './dto/validate-coupon.dto.js';

export interface CouponFilters {
  isActive?: boolean;
  isExpired?: boolean;
  search?: string;
}

export interface CouponValidationResult {
  isValid: boolean;
  coupon?: Coupon;
  discount: number;
  finalValue: number;
  message?: string;
}

export class CouponsService {
  /**
   * Create new coupon
   */
  async createCoupon(dto: CreateCouponDto): Promise<Coupon> {
    // Check if code already exists
    const existing = await prisma.coupon.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw ApiError.conflict('Coupon code already exists');
    }

    const expiresAt = new Date(dto.expiresAt);

    if (expiresAt <= new Date()) {
      throw ApiError.badRequest('Expiration date must be in the future');
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: dto.code,
        description: dto.description,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        minValue: dto.minValue,
        maxDiscount: dto.maxDiscount,
        expiresAt,
        usageLimit: dto.usageLimit,
        isActive: dto.isActive,
      },
    });

    logger.info(`Coupon created: ${coupon.code}`);

    return coupon;
  }

  /**
   * Get coupons with pagination and filters
   */
  async getCoupons(
    page: number = 1,
    limit: number = 20,
    filters?: CouponFilters
  ): Promise<PaginatedResponse<Coupon>> {
    const { page: validPage, limit: validLimit } = PaginationUtil.validateParams({
      page,
      limit,
    });
    const skip = PaginationUtil.calculateSkip(validPage, validLimit);

    const where: Prisma.CouponWhereInput = {
      ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
      ...(filters?.isExpired !== undefined && {
        expiresAt: filters.isExpired
          ? { lt: new Date() }
          : { gte: new Date() },
      }),
      ...(filters?.search && {
        OR: [
          { code: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [coupons, totalCount] = await Promise.all([
      prisma.coupon.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: validLimit,
      }),
      prisma.coupon.count({ where }),
    ]);

    return PaginationUtil.buildResponse(coupons, validPage, validLimit, totalCount);
  }

  /**
   * Get coupon by ID
   */
  async getCouponById(id: string): Promise<Coupon> {
    const coupon = await prisma.coupon.findUnique({
      where: { id },
    });

    if (!coupon) {
      throw ApiError.notFound('Coupon not found');
    }

    return coupon;
  }

  /**
   * Get coupon by code
   */
  async getCouponByCode(code: string): Promise<Coupon> {
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      throw ApiError.notFound('Coupon not found');
    }

    return coupon;
  }

  /**
   * Update coupon
   */
  async updateCoupon(id: string, dto: UpdateCouponDto): Promise<Coupon> {
    await this.getCouponById(id);

    const updateData: Prisma.CouponUpdateInput = {
      ...(dto.description && { description: dto.description }),
      ...(dto.discountType && { discountType: dto.discountType }),
      ...(dto.discountValue !== undefined && { discountValue: dto.discountValue }),
      ...(dto.minValue !== undefined && { minValue: dto.minValue }),
      ...(dto.maxDiscount !== undefined && { maxDiscount: dto.maxDiscount }),
      ...(dto.expiresAt && { expiresAt: new Date(dto.expiresAt) }),
      ...(dto.usageLimit !== undefined && { usageLimit: dto.usageLimit }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    };

    const coupon = await prisma.coupon.update({
      where: { id },
      data: updateData,
    });

    logger.info(`Coupon updated: ${id}`);

    return coupon;
  }

  /**
   * Delete coupon
   */
  async deleteCoupon(id: string): Promise<void> {
    await this.getCouponById(id);

    await prisma.coupon.delete({
      where: { id },
    });

    logger.info(`Coupon deleted: ${id}`);
  }

  /**
   * Activate coupon
   */
  async activateCoupon(id: string): Promise<Coupon> {
    return this.updateCoupon(id, { isActive: true });
  }

  /**
   * Deactivate coupon
   */
  async deactivateCoupon(id: string): Promise<Coupon> {
    return this.updateCoupon(id, { isActive: false });
  }

  /**
   * Validate coupon for cart
   */
  async validateCoupon(dto: ValidateCouponDto): Promise<CouponValidationResult> {
    try {
      const coupon = await this.getCouponByCode(dto.code);

      // Check if active
      if (!coupon.isActive) {
        return {
          isValid: false,
          discount: 0,
          finalValue: dto.cartValue,
          message: 'Coupon is not active',
        };
      }

      // Check if expired
      if (new Date() > coupon.expiresAt) {
        return {
          isValid: false,
          discount: 0,
          finalValue: dto.cartValue,
          message: 'Coupon has expired',
        };
      }

      // Check usage limit
      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        return {
          isValid: false,
          discount: 0,
          finalValue: dto.cartValue,
          message: 'Coupon usage limit reached',
        };
      }

      // Check minimum value
      if (coupon.minValue && dto.cartValue < Number(coupon.minValue)) {
        return {
          isValid: false,
          discount: 0,
          finalValue: dto.cartValue,
          message: `Minimum cart value is ${coupon.minValue}`,
        };
      }

      // Calculate discount
      let discount = 0;

      if (coupon.discountType === 'PERCENTAGE') {
        discount = dto.cartValue * (Number(coupon.discountValue) / 100);
      } else {
        discount = Number(coupon.discountValue);
      }

      // Apply max discount if set
      if (coupon.maxDiscount && discount > Number(coupon.maxDiscount)) {
        discount = Number(coupon.maxDiscount);
      }

      // Ensure discount doesn't exceed cart value
      discount = Math.min(discount, dto.cartValue);

      const finalValue = dto.cartValue - discount;

      return {
        isValid: true,
        coupon,
        discount,
        finalValue,
        message: 'Coupon applied successfully',
      };
    } catch (error) {
      return {
        isValid: false,
        discount: 0,
        finalValue: dto.cartValue,
        message: error instanceof Error ? error.message : 'Invalid coupon',
      };
    }
  }

  /**
   * Apply coupon (increment usage count)
   */
  async applyCoupon(code: string): Promise<Coupon> {
    const coupon = await this.getCouponByCode(code);

    const updated = await prisma.coupon.update({
      where: { id: coupon.id },
      data: {
        usedCount: {
          increment: 1,
        },
      },
    });

    logger.info(`Coupon applied: ${code}`);

    return updated;
  }

  /**
   * Get coupon statistics
   */
  async getCouponStats(id: string): Promise<{
    totalUsage: number;
    usageLimit: number | null;
    remainingUsage: number | null;
    isExpired: boolean;
    daysRemaining: number;
    discountType: string;
    discountValue: number;
  }> {
    const coupon = await this.getCouponById(id);
    const now = new Date();

    const daysRemaining = Math.ceil(
      (coupon.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      totalUsage: coupon.usedCount,
      usageLimit: coupon.usageLimit,
      remainingUsage: coupon.usageLimit ? coupon.usageLimit - coupon.usedCount : null,
      isExpired: now > coupon.expiresAt,
      daysRemaining: Math.max(0, daysRemaining),
      discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue),
    };
  }

  /**
   * Get active coupons
   */
  async getActiveCoupons(): Promise<Coupon[]> {
    const now = new Date();

    return prisma.coupon.findMany({
      where: {
        isActive: true,
        expiresAt: { gte: now },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get count of active coupons
   */
  async getActiveCouponCount(): Promise<number> {
    const now = new Date();

    return prisma.coupon.count({
      where: {
        isActive: true,
        expiresAt: { gte: now },
      },
    });
  }

  /**
   * ✅ ETAPA 3.1: Get coupons available for customer based on cart value
   */
  async getCustomerAvailableCoupons(cartValue: number): Promise<Coupon[]> {
    const now = new Date();

    const allActiveCoupons = await prisma.coupon.findMany({
      where: {
        isActive: true,
        expiresAt: { gte: now },
        OR: [
          { minValue: null },
          { minValue: { lte: cartValue } },
        ],
      },
      orderBy: [
        { discountValue: 'desc' }, // Maiores descontos primeiro
        { createdAt: 'desc' },
      ],
    });

    // Filtrar cupons que ainda têm usos disponíveis
    return allActiveCoupons.filter(coupon => {
      if (!coupon.usageLimit) return true;
      return coupon.usedCount < coupon.usageLimit;
    });
  }
}
