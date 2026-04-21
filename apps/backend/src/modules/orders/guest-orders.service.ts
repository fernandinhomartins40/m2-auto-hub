import { prisma } from '@config/database.js';
import { CustomerStatus, CustomerLevel, OrderStatus, QuoteStatus, OrderItemType, OrderSource } from '@prisma/client';
import { ApiError } from '@shared/utils/error.util.js';
import { logger } from '@shared/utils/logger.util.js';
import { HashUtil } from '@shared/utils/hash.util.js';
import { PhoneUtil } from '@shared/utils/phone.util.js';
import { CreateGuestOrderDto } from './dto/create-guest-order.dto.js';

export class GuestOrdersService {
  /**
   * Find or create customer by email or phone
   */
  private async findOrCreateCustomer(data: {
    name: string;
    email: string;
    phone: string;
  }) {
    const cleanPhone = PhoneUtil.normalize(data.phone);

    // First, try to find customer by email (primary identifier)
    let customer = await prisma.customer.findUnique({
      where: { email: data.email },
    });

    // If not found by email, try to find by phone
    if (!customer && cleanPhone) {
      customer = await prisma.customer.findFirst({
        where: { phone: cleanPhone },
      });
    }

    // If customer exists, update name and phone only (not email to avoid conflicts)
    if (customer) {
      // Only update if the customer was found by email (safe to update phone)
      // or if we need to update the name
      const needsUpdate =
        customer.name !== data.name ||
        customer.phone !== cleanPhone;

      if (needsUpdate && customer.email === data.email) {
        // Safe to update - found by email
        customer = await prisma.customer.update({
          where: { id: customer.id },
          data: {
            name: data.name,
            phone: cleanPhone,
          },
        });
        logger.info(`Customer updated: ${customer.id} (${customer.email}) - Phone: ${cleanPhone}`);
      } else if (needsUpdate && customer.email !== data.email) {
        // Found by phone but email is different - check if email is available
        const emailExists = await prisma.customer.findUnique({
          where: { email: data.email },
        });

        if (emailExists) {
          // Email belongs to another customer - use that customer instead
          customer = emailExists;
          logger.info(`Using existing customer by email: ${customer.id} (${customer.email})`);
        } else {
          // Email is available - update the customer found by phone
          customer = await prisma.customer.update({
            where: { id: customer.id },
            data: {
              name: data.name,
              email: data.email,
              phone: cleanPhone,
            },
          });
          logger.info(`Customer updated with new email: ${customer.id} (${customer.email}) - Phone: ${cleanPhone}`);
        }
      } else {
        logger.info(`Existing customer found: ${customer.id} (${customer.email}) - Phone: ${cleanPhone}`);
      }
    } else {
      // Create new customer with temporary password
      const temporaryPassword = this.generateTemporaryPassword(data.name);
      const hashedPassword = await HashUtil.hashPassword(temporaryPassword);

      customer = await prisma.customer.create({
        data: {
          email: data.email,
          name: data.name,
          phone: cleanPhone,
          password: hashedPassword,
          status: CustomerStatus.ACTIVE,
          level: CustomerLevel.BRONZE,
        },
      });

      logger.info(`New customer created: ${customer.id} (${customer.email}) - Phone: ${cleanPhone} - Password: ${temporaryPassword}`);
    }

    return customer;
  }

  /**
   * Generate a temporary password from first 3 letters of name
   */
  private generateTemporaryPassword(name: string): string {
    return name.trim().toLowerCase().substring(0, 3);
  }

  /**
   * Validate products and get prices
   */
  private async validateAndPriceProducts(items: Array<{ productId?: string; quantity: number }>) {
    const productIds = items.map(item => item.productId!);

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    // Validate all products exist
    for (const item of items) {
      const product = products.find(p => p.id === item.productId);

      if (!product) {
        throw ApiError.notFound(`Product ${item.productId} not found`);
      }

      if (product.status !== 'ACTIVE') {
        throw ApiError.badRequest(`Product ${product.name} is not available`);
      }

      if (product.stock < item.quantity) {
        throw ApiError.badRequest(`Insufficient stock for product ${product.name}. Available: ${product.stock}`);
      }
    }

    // Map to order items
    return items.map(item => {
      const product = products.find(p => p.id === item.productId)!;
      const price = Number(product.promoPrice || product.salePrice);

      return {
        productId: product.id,
        serviceId: null,
        type: OrderItemType.PRODUCT,
        name: product.name,
        price,
        quantity: item.quantity,
        subtotal: price * item.quantity,
        priceQuoted: true,
      };
    });
  }

  /**
   * Validate services and get prices (if available)
   */
  private async validateAndPriceServices(items: Array<{ serviceId?: string; quantity: number }>) {
    const serviceIds = items.map(item => item.serviceId!);

    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
    });

    // Validate all services exist
    for (const item of items) {
      const service = services.find(s => s.id === item.serviceId);

      if (!service) {
        throw ApiError.notFound(`Service ${item.serviceId} not found`);
      }

      if (service.status !== 'ACTIVE') {
        throw ApiError.badRequest(`Service ${service.name} is not available`);
      }
    }

    // Map to order items
    return items.map(item => {
      const service = services.find(s => s.id === item.serviceId)!;
      const price = service.basePrice ? Number(service.basePrice) : 0;
      const hasPendingPrice = price === 0;

      return {
        productId: null,
        serviceId: service.id,
        type: OrderItemType.SERVICE,
        name: service.name,
        price,
        quantity: item.quantity,
        subtotal: price * item.quantity,
        priceQuoted: !hasPendingPrice,
      };
    });
  }

  /**
   * Update product stock
   */
  private async updateProductStock(items: Array<{ productId: string | null; quantity: number }>) {
    for (const item of items) {
      if (item.productId) {
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
  }

  /**
   * Apply coupon discount
   */
  private async applyCouponDiscount(couponCode: string | undefined, subtotal: number): Promise<number> {
    if (!couponCode) return 0;

    const coupon = await prisma.coupon.findUnique({
      where: { code: couponCode },
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

    if (coupon.minValue && subtotal < Number(coupon.minValue)) {
      throw ApiError.badRequest(`Minimum order value is ${coupon.minValue}`);
    }

    let discountAmount = 0;

    if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = subtotal * (Number(coupon.discountValue) / 100);
    } else if (coupon.discountType === 'FIXED') {
      discountAmount = Number(coupon.discountValue);
    }

    if (coupon.maxDiscount && discountAmount > Number(coupon.maxDiscount)) {
      discountAmount = Number(coupon.maxDiscount);
    }

    // Update coupon usage
    await prisma.coupon.update({
      where: { code: couponCode },
      data: {
        usedCount: {
          increment: 1,
        },
      },
    });

    return discountAmount;
  }

  /**
   * Create guest order (from checkout without authentication)
   */
  async createGuestOrder(dto: CreateGuestOrderDto) {
    try {
      // 1. Find or create customer
      const customer = await this.findOrCreateCustomer({
        name: dto.customerName,
        email: dto.customerEmail,
        phone: dto.customerPhone,
      });

      // 2. Create address
      const address = await prisma.address.create({
        data: {
          customerId: customer.id,
          street: dto.address.street,
          number: dto.address.number,
          complement: dto.address.complement,
          neighborhood: dto.address.neighborhood,
          city: dto.address.city,
          state: dto.address.state,
          zipCode: dto.address.zipCode,
          type: dto.address.type,
        },
      });

      // 3. Separate products and services
      const productItems = dto.items.filter(i => i.type === 'PRODUCT');
      const serviceItems = dto.items.filter(i => i.type === 'SERVICE');

      // 4. Validate and price products
      const products = productItems.length > 0
        ? await this.validateAndPriceProducts(productItems)
        : [];

      // 5. Validate and price services
      const services = serviceItems.length > 0
        ? await this.validateAndPriceServices(serviceItems)
        : [];

      // 6. Calculate subtotal (only items with defined price)
      const allItems = [...products, ...services];
      const subtotal = allItems.reduce((sum, item) => sum + item.subtotal, 0);

      // 7. Apply coupon discount
      const discountAmount = await this.applyCouponDiscount(dto.couponCode, subtotal);

      // 8. Determine quote status
      const hasServicesPending = services.some(s => !s.priceQuoted);
      const quoteStatus = hasServicesPending ? QuoteStatus.PENDING : null;

      // 9. Calculate total
      const total = subtotal - discountAmount;

      // 10. Create order
      const order = await prisma.order.create({
        data: {
          customerId: customer.id,
          addressId: address.id,
          source: OrderSource.WEB,
          status: OrderStatus.PENDING,
          hasProducts: productItems.length > 0,
          hasServices: serviceItems.length > 0,
          quoteStatus,
          subtotal,
          discountAmount,
          total,
          paymentMethod: dto.paymentMethod,
          couponCode: dto.couponCode,
          items: {
            create: allItems,
          },
        },
        include: {
          items: true,
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

      // 11. Update product stock
      await this.updateProductStock(products);

      // 12. Update customer stats
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          totalOrders: {
            increment: 1,
          },
          totalSpent: {
            increment: total,
          },
        },
      });

      logger.info(`Guest order created: ${order.id} for customer ${customer.email}`);

      return order;
    } catch (error) {
      logger.error('Error creating guest order:', error);
      throw error;
    }
  }
}
