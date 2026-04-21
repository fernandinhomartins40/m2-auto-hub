import { Order, OrderItem, OrderStatus, OrderItemType, Prisma, Address } from '@prisma/client';
import { prisma } from '@config/database.js';
import { ApiError } from '@shared/utils/error.util.js';
import { PaginationUtil, PaginatedResponse } from '@shared/utils/pagination.util.js';
import { logger } from '@shared/utils/logger.util.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { UpdateOrderDto } from './dto/update-order.dto.js';

export type OrderWithItems = Order & {
  items: OrderItem[];
  address: Address;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
};

export interface OrderFilters {
  status?: OrderStatus;
  startDate?: Date;
  endDate?: Date;
}

export class OrdersService {
  /**
   * Create new order
   */
  async createOrder(customerId: string, dto: CreateOrderDto): Promise<OrderWithItems> {
    // Verify address belongs to customer
    const address = await prisma.address.findFirst({
      where: { id: dto.addressId, customerId },
    });

    if (!address) {
      throw ApiError.notFound('Address not found');
    }

    // Fetch products and services
    const productIds = dto.items
      .filter((item) => item.type === 'PRODUCT' && item.productId)
      .map((item) => item.productId!);

    const serviceIds = dto.items
      .filter((item) => item.type === 'SERVICE' && item.serviceId)
      .map((item) => item.serviceId!);

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
    });

    // Validate all items exist
    for (const item of dto.items) {
      if (item.type === 'PRODUCT') {
        const product = products.find((p) => p.id === item.productId);
        if (!product) {
          throw ApiError.notFound(`Product ${item.productId} not found`);
        }
        if (product.status !== 'ACTIVE') {
          throw ApiError.badRequest(`Product ${product.name} is not available`);
        }
        if (product.stock < item.quantity) {
          throw ApiError.badRequest(`Insufficient stock for product ${product.name}`);
        }
      } else {
        const service = services.find((s) => s.id === item.serviceId);
        if (!service) {
          throw ApiError.notFound(`Service ${item.serviceId} not found`);
        }
        if (service.status !== 'ACTIVE') {
          throw ApiError.badRequest(`Service ${service.name} is not available`);
        }
      }
    }

    // Validate and apply coupon if provided
    let discountAmount = 0;
    if (dto.couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: dto.couponCode },
      });

      if (!coupon) {
        throw ApiError.notFound('Coupon not found');
      }

      if (!coupon.isActive) {
        throw ApiError.badRequest('Coupon is not active');
      }

      if (new Date() > coupon.expiresAt) {
        throw ApiError.badRequest('Coupon has expired');
      }

      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        throw ApiError.badRequest('Coupon usage limit reached');
      }
    }

    // Calculate order totals
    let subtotal = 0;
    const orderItems: Array<{
      productId?: string;
      serviceId?: string;
      type: OrderItemType;
      name: string;
      price: number;
      quantity: number;
      subtotal: number;
    }> = [];

    for (const item of dto.items) {
      let price = 0;
      let name = '';

      if (item.type === 'PRODUCT') {
        const product = products.find((p) => p.id === item.productId)!;
        price = Number(product.promoPrice || product.salePrice);
        name = product.name;
      } else {
        const service = services.find((s) => s.id === item.serviceId)!;
        price = Number(service.basePrice || 0);
        name = service.name;
      }

      const itemSubtotal = price * item.quantity;
      subtotal += itemSubtotal;

      orderItems.push({
        productId: item.productId,
        serviceId: item.serviceId,
        type: item.type as OrderItemType,
        name,
        price,
        quantity: item.quantity,
        subtotal: itemSubtotal,
      });
    }

    // Apply coupon discount
    if (dto.couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: dto.couponCode },
      });

      if (coupon) {
        if (coupon.minValue && subtotal < Number(coupon.minValue)) {
          throw ApiError.badRequest(`Minimum order value is ${coupon.minValue}`);
        }

        if (coupon.discountType === 'PERCENTAGE') {
          discountAmount = subtotal * (Number(coupon.discountValue) / 100);
        } else {
          discountAmount = Number(coupon.discountValue);
        }

        if (coupon.maxDiscount && discountAmount > Number(coupon.maxDiscount)) {
          discountAmount = Number(coupon.maxDiscount);
        }
      }
    }

    const total = subtotal - discountAmount;

    // Create order with items
    const order = await prisma.order.create({
      data: {
        customerId,
        addressId: dto.addressId,
        source: dto.source,
        hasProducts: orderItems.some((item) => item.type === 'PRODUCT'),
        hasServices: orderItems.some((item) => item.type === 'SERVICE'),
        subtotal,
        discountAmount,
        total,
        paymentMethod: dto.paymentMethod,
        couponCode: dto.couponCode,
        status: 'PENDING',
        items: {
          create: orderItems,
        },
      },
      include: {
        items: true,
        address: true,
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

    // Update product stock
    for (const item of dto.items) {
      if (item.type === 'PRODUCT') {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }
    }

    // Update coupon usage
    if (dto.couponCode) {
      await prisma.coupon.update({
        where: { code: dto.couponCode },
        data: {
          usedCount: {
            increment: 1,
          },
        },
      });
    }

    // Update customer stats
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        totalOrders: {
          increment: 1,
        },
        totalSpent: {
          increment: total,
        },
      },
    });

    logger.info(`Order created: ${order.id} for customer ${customerId}`);

    return order;
  }

  /**
   * Get orders for customer with pagination
   */
  async getOrders(
    customerId: string,
    page: number = 1,
    limit: number = 20,
    filters?: OrderFilters
  ): Promise<PaginatedResponse<OrderWithItems>> {
    const { page: validPage, limit: validLimit } = PaginationUtil.validateParams({ page, limit });
    const skip = PaginationUtil.calculateSkip(validPage, validLimit);

    const where: Prisma.OrderWhereInput = {
      customerId,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.startDate &&
        filters?.endDate && {
          createdAt: {
            gte: filters.startDate,
            lte: filters.endDate,
          },
        }),
    };

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: true,
          address: true,
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: validLimit,
      }),
      prisma.order.count({ where }),
    ]);

    return PaginationUtil.buildResponse(orders, validPage, validLimit, totalCount);
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: string, customerId: string): Promise<OrderWithItems> {
    const order = await prisma.order.findFirst({
      where: { id: orderId, customerId },
      include: {
        items: true,
        address: true,
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

    if (!order) {
      throw ApiError.notFound('Order not found');
    }

    return order;
  }

  /**
   * Update order
   */
  async updateOrder(
    orderId: string,
    customerId: string,
    dto: UpdateOrderDto
  ): Promise<OrderWithItems> {
    // Verify order exists and belongs to customer
    await this.getOrderById(orderId, customerId);

    const updateData: Prisma.OrderUpdateInput = {};

    if (dto.status) {
      updateData.status = dto.status;

      if (dto.status === 'DELIVERED') {
        updateData.deliveredAt = new Date();
      }

      if (dto.status === 'CANCELLED') {
        updateData.cancelledAt = new Date();

        // Restore product stock
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: { items: true },
        });

        if (order) {
          for (const item of order.items) {
            if (item.type === 'PRODUCT' && item.productId) {
              await prisma.product.update({
                where: { id: item.productId },
                data: {
                  stock: {
                    increment: item.quantity,
                  },
                },
              });
            }
          }
        }
      }
    }

    if (dto.trackingCode) {
      updateData.trackingCode = dto.trackingCode;
    }

    if (dto.estimatedDelivery) {
      updateData.estimatedDelivery = new Date(dto.estimatedDelivery);
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        items: true,
        address: true,
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

    logger.info(`Order updated: ${orderId}`);

    return order;
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string, customerId: string): Promise<OrderWithItems> {
    const order = await this.getOrderById(orderId, customerId);

    if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
      throw ApiError.badRequest('Cannot cancel order with current status');
    }

    return this.updateOrder(orderId, customerId, { status: 'CANCELLED' });
  }

  /**
   * Get order statistics for customer
   */
  async getOrderStats(customerId: string): Promise<{
    totalOrders: number;
    totalSpent: number;
    ordersByStatus: Record<string, number>;
  }> {
    const [orders, customer] = await Promise.all([
      prisma.order.findMany({
        where: { customerId },
        select: { status: true },
      }),
      prisma.customer.findUnique({
        where: { id: customerId },
        select: { totalOrders: true, totalSpent: true },
      }),
    ]);

    const ordersByStatus = orders.reduce(
      (acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalOrders: customer?.totalOrders || 0,
      totalSpent: Number(customer?.totalSpent || 0),
      ordersByStatus,
    };
  }
}
