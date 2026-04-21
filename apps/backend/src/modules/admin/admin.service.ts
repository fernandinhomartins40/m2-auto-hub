import { prisma } from '../../config/database.js';
import { CustomerLevel, CustomerStatus, OrderStatus, Prisma, OrderItemType, QuoteStatus, OrderSource } from '@prisma/client';
import { HashUtil } from '@shared/utils/hash.util.js';
import { ApiError } from '@shared/utils/error.util.js';
import { LicensePlateUtil } from '@shared/utils/license-plate.util.js';
import { PhoneUtil } from '@shared/utils/phone.util.js';

// ==================== TYPES ====================

interface OrderItemWithRelations {
  id: string;
  orderId: string;
  productId: string | null;
  serviceId: string | null;
  quantity: number;
  price: Prisma.Decimal;
  subtotal: Prisma.Decimal;
  type: string;
  name: string;
  priceQuoted: boolean;
  quotedPrice: Prisma.Decimal | null;
  quotedAt: Date | null;
  createdAt: Date;
}

interface OrderWithRelations {
  id: string;
  customerId: string;
  addressId: string;
  source: OrderSource;
  subtotal: Prisma.Decimal;
  shippingCost?: Prisma.Decimal;
  total: Prisma.Decimal;
  status: OrderStatus;
  paymentMethod: string;
  couponId?: string | null;
  discountAmount: Prisma.Decimal;
  hasProducts: boolean;
  hasServices: boolean;
  quoteStatus: QuoteStatus | null;
  quotedAt: Date | null;
  quoteApprovedAt: Date | null;
  quoteNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  items: OrderItemWithRelations[];
}

const DEFAULT_ORDER_STATUS_FLOW: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

const SERVICE_ORDER_STATUS_FLOW: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.IN_PRODUCTION,
  OrderStatus.PREPARING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

const CANCELLABLE_ORDER_STATUSES = new Set<OrderStatus>([
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.IN_PRODUCTION,
  OrderStatus.PREPARING,
]);

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  IN_PRODUCTION: 'Em producao',
  PREPARING: 'Preparando',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

// ==================== SERVICE ====================

export class AdminService {
  // ==================== DASHBOARD ====================

  async getDashboardStats() {
    const [
      totalOrders,
      totalRevenue,
      pendingOrders,
      completedOrders,
      totalCustomers,
      activeProducts,
      lowStockProducts,
      activeCoupons
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.aggregate({
        _sum: { total: true },
        where: { status: { in: [OrderStatus.DELIVERED] } }
      }),
      prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      prisma.order.count({ where: { status: { in: [OrderStatus.DELIVERED] } } }),
      prisma.customer.count({ where: { status: CustomerStatus.ACTIVE } }),
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      // Fix: Use raw query for comparing with another column
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM "products"
        WHERE stock <= "minStock"
      `.then((result: Array<{ count: bigint }>) => Number(result[0].count)),
      prisma.coupon.count({ where: { isActive: true } })
    ]);

    // Get recent orders
    const recentOrders = await prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true, phone: true } },
        items: true,
        address: true
      }
    }) as unknown as OrderWithRelations[];

    return {
      totalOrders,
      totalRevenue: totalRevenue._sum.total || 0,
      pendingOrders,
      completedOrders,
      totalCustomers,
      activeProducts,
      lowStockProducts,
      activeCoupons,
      recentOrders: recentOrders.map((order: OrderWithRelations) => this.mapOrderToResponse(order))
    };
  }

  // ==================== ORDERS ====================

  async getOrders(params: {
    page: number;
    limit: number;
    status?: string;
    search?: string;
  }) {
    const { page, limit, status, search } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    if (status) {
      where.status = status as OrderStatus;
    }

    if (search) {
      where.OR = [
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { email: { contains: search, mode: 'insensitive' } } },
        { customer: { phone: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true, phone: true } },
          items: true,
          address: true
        }
      }) as unknown as Promise<OrderWithRelations[]>,
      prisma.order.count({ where })
    ]);

    return {
      orders: orders.map((order: OrderWithRelations) => ({
        ...this.mapOrderToResponse(order),
        updatedAt: order.updatedAt.toISOString()
      })),
      totalCount
    };
  }

  async getOrderById(id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: { select: { name: true, phone: true } },
        items: true,
        address: true
      }
    }) as unknown as OrderWithRelations | null;

    if (!order) {
      throw new Error('Pedido não encontrado');
    }

    return {
      ...this.mapOrderToResponse(order),
      updatedAt: order.updatedAt.toISOString()
    };
  }

  async updateOrderStatus(id: string, status: string) {
    if (!Object.values(OrderStatus).includes(status as OrderStatus)) {
      throw ApiError.badRequest('Status de pedido invalido');
    }

    const nextStatus = status as OrderStatus;

    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: { select: { name: true, phone: true } },
        items: true,
      },
    }) as unknown as OrderWithRelations | null;

    if (!existingOrder) {
      throw ApiError.notFound('Pedido nao encontrado');
    }

    if (existingOrder.status === nextStatus) {
      throw ApiError.badRequest(
        `O pedido ja esta com o status ${this.getOrderStatusLabel(existingOrder.status)}.`
      );
    }

    const allowedTransitions = this.getAllowedOrderStatusTransitions(existingOrder);
    if (!allowedTransitions.includes(nextStatus)) {
      const allowedLabels = allowedTransitions.map((allowedStatus) =>
        this.getOrderStatusLabel(allowedStatus)
      );

      if (allowedLabels.length === 0) {
        throw ApiError.badRequest(
          `O pedido esta ${this.getOrderStatusLabel(existingOrder.status)} e nao aceita novas transicoes.`
        );
      }

      const transitionLabel =
        allowedLabels.length === 1
          ? allowedLabels[0]
          : `${allowedLabels.slice(0, -1).join(', ')} ou ${allowedLabels[allowedLabels.length - 1]}`;

      throw ApiError.badRequest(
        `Transicao invalida. A partir de ${this.getOrderStatusLabel(existingOrder.status)}, o proximo status permitido e ${transitionLabel}.`
      );
    }

    const order = await prisma.order.update({
      where: { id },
      data: { status: nextStatus },
      include: {
        customer: { select: { name: true, phone: true } },
        items: true
      }
    }) as unknown as OrderWithRelations;

    return {
      ...this.mapOrderToResponse(order),
      updatedAt: order.updatedAt.toISOString()
    };
  }

  // ==================== CUSTOMERS ====================

  async getCustomers(params: {
    page: number;
    limit: number;
    search?: string;
    level?: string;
    status?: string;
  }) {
    const { page, limit, search, level, status } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {};

    if (level) {
      where.level = level as CustomerLevel;
    }

    if (status) {
      where.status = status as CustomerStatus;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { cpf: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [customers, totalCount] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          addresses: true
        }
      }),
      prisma.customer.count({ where })
    ]);

    return {
      customers: customers.map((customer: any) => this.mapCustomerToResponse(customer)),
      totalCount
    };
  }

  async getCustomerById(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id }
    });

    if (!customer) {
      throw new Error('Cliente não encontrado');
    }

    return this.mapCustomerToResponse(customer);
  }

  async updateCustomerLevel(id: string, level: string) {
    const customer = await prisma.customer.update({
      where: { id },
      data: { level: level as CustomerLevel }
    });

    return this.mapCustomerToResponse(customer);
  }

  async updateCustomerStatus(id: string, status: string) {
    const customer = await prisma.customer.update({
      where: { id },
      data: { status: status as CustomerStatus }
    });

    return this.mapCustomerToResponse(customer);
  }

  async createCustomer(data: {
    name: string;
    email: string;
    phone: string;
    cpf?: string;
  }) {
    const normalizedPhone = PhoneUtil.normalize(data.phone);
    const normalizedCpf = data.cpf?.replace(/\D/g, '');
    const normalizedEmail = data.email.trim().toLowerCase();
    // Verificar se já existe cliente com mesmo email ou CPF
    if (normalizedEmail) {
      const existingByEmail = await prisma.customer.findUnique({
        where: { email: normalizedEmail }
      });
      if (existingByEmail) {
        throw new Error('Já existe um cliente com este email');
      }
    }

    if (normalizedCpf) {
      const existingByCpf = await prisma.customer.findFirst({
        where: { cpf: normalizedCpf }
      });
      if (existingByCpf) {
        throw new Error('Já existe um cliente com este CPF');
      }
    }

    if (normalizedPhone) {
      const existingByPhone = await prisma.customer.findFirst({
        where: {
          OR: [
            { phone: normalizedPhone },
            { phone: `55${normalizedPhone}` }
          ]
        }
      });
      if (existingByPhone) {
        throw new Error('JÃ¡ existe um cliente com este telefone');
      }
    }

    // Criar cliente sem senha (provisional user)
    const customer = await prisma.customer.create({
      data: {
        name: data.name,
        email: normalizedEmail,
        phone: normalizedPhone,
        cpf: normalizedCpf || null,
        password: '', // Cliente criado pelo admin não tem senha inicialmente
        level: CustomerLevel.BRONZE,
        status: CustomerStatus.ACTIVE,
      }
    });

    return this.mapCustomerToResponse(customer);
  }

  // ==================== CUSTOMER VEHICLES ====================

  async lookupVehicleByPlate(plate: string) {
    const normalizedPlate = LicensePlateUtil.normalize(plate);

    if (!LicensePlateUtil.isValid(normalizedPlate)) {
      throw ApiError.badRequest('Placa invalida');
    }

    const vehicle = await prisma.customerVehicle.findUnique({
      where: { plate: normalizedPlate },
      include: {
        customer: true,
      },
    });

    if (!vehicle) {
      return {
        found: false,
        plate: normalizedPlate,
      };
    }

    return {
      found: true,
      plate: normalizedPlate,
      vehicle: {
        id: vehicle.id,
        customerId: vehicle.customerId,
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        plate: vehicle.plate,
        color: vehicle.color,
        mileage: vehicle.mileage,
        chassisNumber: vehicle.chassisNumber,
        createdAt: vehicle.createdAt,
        updatedAt: vehicle.updatedAt,
      },
      customer: this.mapCustomerToResponse(vehicle.customer),
    };
  }

  async getCustomerVehicles(customerId: string) {
    const vehicles = await prisma.customerVehicle.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' }
    });

    return vehicles;
  }

  async createVehicleForCustomer(customerId: string, data: {
    brand: string;
    model: string;
    year: number;
    plate: string;
    color: string;
    mileage?: number;
    chassisNumber?: string;
  }) {
    try {
      // Verificar se o cliente existe
      const customer = await prisma.customer.findUnique({
        where: { id: customerId }
      });

      if (!customer) {
        throw new Error('Cliente não encontrado');
      }

      // Normalizar placa (remover espaços e converter para maiúsculas)
      const normalizedPlate = LicensePlateUtil.normalize(data.plate);

      if (!LicensePlateUtil.isValid(normalizedPlate)) {
        throw new Error('Placa invalida');
      }

      // Verificar se já existe veículo com a mesma placa
      const existingVehicle = await prisma.customerVehicle.findFirst({
        where: {
          plate: {
            equals: normalizedPlate,
            mode: 'insensitive'
          }
        }
      });

      if (existingVehicle) {
        throw new Error('Já existe um veículo cadastrado com esta placa');
      }

      // Criar veículo
      const vehicle = await prisma.customerVehicle.create({
        data: {
          customerId,
          brand: data.brand.trim(),
          model: data.model.trim(),
          year: data.year,
          plate: normalizedPlate,
          color: data.color.trim(),
          mileage: data.mileage || null,
          chassisNumber: data.chassisNumber ? data.chassisNumber.trim().toUpperCase() : null,
        }
      });

      return vehicle;
    } catch (error: any) {
      console.error('Error creating vehicle:', error);
      throw error;
    }
  }

  // ==================== QUOTES (ORÇAMENTOS) ====================

  async getQuotes(params: {
    page: number;
    limit: number;
    status?: string;
    search?: string;
  }) {
    const { page, limit, status, search } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      hasServices: true, // Filtro principal: apenas pedidos com serviços
    };

    if (status) {
      where.quoteStatus = status as any;
    }

    if (search) {
      where.OR = [
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { email: { contains: search, mode: 'insensitive' } } },
        { customer: { phone: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true, phone: true, email: true } },
          items: {
            where: { type: 'SERVICE' }, // Apenas itens de serviço
          },
          address: true
        },
      }) as unknown as Promise<OrderWithRelations[]>,
      prisma.order.count({ where })
    ]);

    return {
      quotes: orders.map((order: OrderWithRelations) => this.mapOrderToQuote(order)),
      totalCount
    };
  }

  async getQuoteById(id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: { select: { name: true, phone: true, email: true } },
        items: {
          where: { type: 'SERVICE' },
        },
        address: true
      },
    }) as unknown as OrderWithRelations | null;

    if (!order) {
      throw new Error('Orçamento não encontrado');
    }

    if (!order.hasServices) {
      throw new Error('Este pedido não contém serviços');
    }

    return this.mapOrderToQuote(order);
  }

  async updateQuotePrices(id: string, items: Array<{ id: string; quotedPrice: number }>) {
    // Atualizar preços dos itens
    await Promise.all(
      items.map(item =>
        prisma.orderItem.update({
          where: { id: item.id },
          data: {
            quotedPrice: item.quotedPrice,
            price: item.quotedPrice,
            subtotal: item.quotedPrice, // Será multiplicado pela quantidade via raw query
            priceQuoted: true,
            quotedAt: new Date(),
          },
        })
      )
    );

    // Buscar pedido com itens atualizados
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, address: true },
    });

    if (!order) {
      throw new Error('Pedido não encontrado');
    }

    // Recalcular total do pedido
    const newTotal = order.items.reduce((sum, item) => {
      return sum + (Number(item.price) * item.quantity);
    }, 0);

    // Atualizar pedido
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        total: newTotal,
        quoteStatus: 'QUOTED',
        quotedAt: new Date(),
      },
      include: { items: true, customer: true },
    });

    return updatedOrder;
  }

  async approveQuote(id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new Error('Orçamento não encontrado');
    }

    if (order.quoteStatus !== 'QUOTED') {
      throw new Error('Orçamento precisa estar no status QUOTED para ser aprovado');
    }

    // ✅ MUDANÇA CRÍTICA: Ao aprovar orçamento, muda status para IN_PRODUCTION
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        quoteStatus: 'APPROVED',
        quoteApprovedAt: new Date(),
        status: 'IN_PRODUCTION', // ✅ Orçamento aprovado vira pedido em produção!
      },
    });

    return updatedOrder;
  }

  async rejectQuote(id: string) {
    return prisma.order.update({
      where: { id },
      data: {
        quoteStatus: 'REJECTED',
      },
    });
  }

  async updateQuoteStatus(id: string, status: string) {
    return prisma.order.update({
      where: { id },
      data: {
        quoteStatus: status as any,
      },
    });
  }

  // ==================== HELPER METHODS ====================

  private mapOrderItemToResponse(item: OrderItemWithRelations) {
    return {
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: Number(item.price),
      type: (item.productId ? 'product' : 'service') as 'product' | 'service'
    };
  }

  private mapOrderSource(source?: string) {
    switch (source) {
      case OrderSource.PHONE:
        return 'phone' as const;
      case OrderSource.APP:
        return 'website' as const;
      case OrderSource.WEB:
      default:
        return 'website' as const;
    }
  }

  private mapOrderToResponse(order: OrderWithRelations) {
    return {
      id: order.id,
      userId: order.customerId,
      customerName: order.customer.name,
      customerWhatsApp: order.customer.phone,
      items: order.items.map((item: OrderItemWithRelations) => this.mapOrderItemToResponse(item)),
      total: Number(order.total),
      hasProducts: order.items.some((item: OrderItemWithRelations) => item.productId !== null),
      hasServices: order.items.some((item: OrderItemWithRelations) => item.serviceId !== null),
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      source: this.mapOrderSource(order.source)
    };
  }

  private getOrderStatusLabel(status: OrderStatus) {
    return ORDER_STATUS_LABELS[status] || status;
  }

  private getOrderStatusFlow(order: Pick<OrderWithRelations, 'status' | 'hasServices'>) {
    if (order.status === OrderStatus.IN_PRODUCTION || order.hasServices) {
      return SERVICE_ORDER_STATUS_FLOW;
    }

    return DEFAULT_ORDER_STATUS_FLOW;
  }

  private getAllowedOrderStatusTransitions(order: Pick<OrderWithRelations, 'status' | 'hasServices'>) {
    if (order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED) {
      return [];
    }

    const flow = this.getOrderStatusFlow(order);
    const currentIndex = flow.indexOf(order.status);
    const allowedTransitions: OrderStatus[] = [];

    if (currentIndex >= 0 && currentIndex < flow.length - 1) {
      allowedTransitions.push(flow[currentIndex + 1]);
    }

    if (CANCELLABLE_ORDER_STATUSES.has(order.status)) {
      allowedTransitions.push(OrderStatus.CANCELLED);
    }

    return allowedTransitions;
  }

  private mapOrderToQuote(order: OrderWithRelations) {
    return {
      id: order.id,
      userId: order.customerId,
      customerName: order.customer.name,
      customerWhatsApp: order.customer.phone,
      items: order.items.map((item: OrderItemWithRelations) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: Number(item.price),
        quotedPrice: item.quotedPrice ? Number(item.quotedPrice) : null,
        priceQuoted: item.priceQuoted,
        type: 'service' as const,
      })),
      total: Number(order.total),
      hasProducts: order.hasProducts,
      hasServices: order.hasServices,
      status: order.quoteStatus || 'PENDING',
      createdAt: order.createdAt.toISOString(),
      quotedAt: order.quotedAt?.toISOString() || null,
      quoteApprovedAt: order.quoteApprovedAt?.toISOString() || null,
      quoteNotes: order.quoteNotes || null,
      source: this.mapOrderSource(order.source),
    };
  }

  private mapCustomerToResponse(customer: any) {
    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      whatsapp: customer.phone,
      cpf: customer.cpf,
      level: customer.level,
      status: customer.status,
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
      addresses: customer.addresses?.map((addr: any) => ({
        id: addr.id,
        street: addr.street,
        number: addr.number,
        complement: addr.complement,
        neighborhood: addr.neighborhood,
        city: addr.city,
        state: addr.state,
        zipCode: addr.zipCode,
        type: addr.type
      })) || []
    };
  }

  // ==================== CUSTOMER ADDRESSES ====================

  async createCustomerAddress(customerId: string, data: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    type: 'HOME' | 'WORK' | 'OTHER';
  }) {
    // Verificar se cliente existe
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      throw new Error('Cliente não encontrado');
    }

    // Criar endereço
    const address = await prisma.address.create({
      data: {
        customerId,
        street: data.street,
        number: data.number,
        complement: data.complement || null,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode.replace(/\D/g, ''),
        type: data.type
      }
    });

    return {
      id: address.id,
      street: address.street,
      number: address.number,
      complement: address.complement,
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      type: address.type
    };
  }

  // ==================== CREATE ORDER ====================

  private async findOrCreateCustomer(data: {
    name: string;
    email: string;
    phone: string;
    cpf?: string;
  }) {
    const cleanPhone = PhoneUtil.normalize(data.phone);
    const normalizedCpf = data.cpf?.replace(/\D/g, '');
    const normalizedEmail = data.email.trim().toLowerCase();

    let customer = await prisma.customer.findUnique({
      where: { email: normalizedEmail },
    });

    if (!customer && cleanPhone) {
      customer = await prisma.customer.findFirst({
        where: { phone: cleanPhone },
      });
    }

    if (customer) {
      const needsUpdate =
        customer.name !== data.name ||
        customer.phone !== cleanPhone ||
        (!!normalizedCpf && customer.cpf !== normalizedCpf);

      if (needsUpdate && customer.email === normalizedEmail) {
        customer = await prisma.customer.update({
          where: { id: customer.id },
          data: {
            name: data.name,
            phone: cleanPhone,
            ...(normalizedCpf ? { cpf: normalizedCpf } : {}),
          },
        });
      } else if (needsUpdate && customer.email !== normalizedEmail) {
        const emailExists = await prisma.customer.findUnique({
          where: { email: normalizedEmail },
        });

        if (emailExists) {
          customer = emailExists;
        } else {
          customer = await prisma.customer.update({
            where: { id: customer.id },
            data: {
              name: data.name,
              email: normalizedEmail,
              phone: cleanPhone,
              ...(normalizedCpf ? { cpf: normalizedCpf } : {}),
            },
          });
        }
      }

      return customer;
    }

    const temporaryPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await HashUtil.hashPassword(temporaryPassword);

    return prisma.customer.create({
      data: {
        email: normalizedEmail,
        name: data.name,
        phone: cleanPhone,
        cpf: normalizedCpf || null,
        password: hashedPassword,
        status: CustomerStatus.ACTIVE,
        level: CustomerLevel.BRONZE,
      },
    });
  }

  private async validateAndPriceProducts(items: Array<{ productId?: string; quantity: number }>) {
    const productIds = items.map(item => item.productId!).filter(Boolean);

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    for (const item of items) {
      const product = products.find(p => p.id === item.productId);

      if (!product) {
        throw ApiError.notFound(`Produto ${item.productId} não encontrado`);
      }

      if (product.status !== 'ACTIVE') {
        throw ApiError.badRequest(`Produto ${product.name} não está disponível`);
      }

      if (product.stock < item.quantity) {
        throw ApiError.badRequest(`Estoque insuficiente para ${product.name}. Disponível: ${product.stock}`);
      }
    }

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
        quotedPrice: price,
        quotedAt: new Date(),
      };
    });
  }

  private async validateAndPriceServices(items: Array<{ serviceId?: string; quantity: number }>) {
    const serviceIds = items.map(item => item.serviceId!).filter(Boolean);

    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
    });

    for (const item of items) {
      const service = services.find(s => s.id === item.serviceId);

      if (!service) {
        throw ApiError.notFound(`Serviço ${item.serviceId} não encontrado`);
      }

      if (service.status !== 'ACTIVE') {
        throw ApiError.badRequest(`Serviço ${service.name} não está disponível`);
      }
    }

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
        quotedPrice: hasPendingPrice ? null : price,
        quotedAt: hasPendingPrice ? null : new Date(),
      };
    });
  }

  private async updateProductStock(items: Array<{ productId: string | null; quantity: number }>) {
    for (const item of items) {
      if (!item.productId) continue;

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

  private async applyCouponDiscount(couponCode: string | undefined, subtotal: number): Promise<number> {
    if (!couponCode) return 0;

    const coupon = await prisma.coupon.findUnique({
      where: { code: couponCode },
    });

    if (!coupon) {
      throw ApiError.notFound('Cupom não encontrado');
    }

    if (!coupon.isActive) {
      throw ApiError.badRequest('Cupom está inativo');
    }

    if (new Date() > coupon.expiresAt) {
      throw ApiError.badRequest('Cupom expirado');
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw ApiError.badRequest('Limite de uso do cupom atingido');
    }

    if (coupon.minValue && subtotal < Number(coupon.minValue)) {
      throw ApiError.badRequest(`Valor mínimo para uso do cupom é ${coupon.minValue}`);
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

  private async resolveOrderAddressId(
    customerId: string,
    data: {
      addressId?: string;
      address?: {
        street: string;
        number: string;
        complement?: string;
        neighborhood: string;
        city: string;
        state: string;
        zipCode: string;
        type: 'HOME' | 'WORK' | 'OTHER';
      };
    }
  ) {
    if (data.addressId) {
      const existingAddress = await prisma.address.findFirst({
        where: {
          id: data.addressId,
          customerId,
        },
      });

      if (!existingAddress) {
        throw ApiError.badRequest('O endereço selecionado não pertence ao cliente informado');
      }

      return existingAddress.id;
    }

    if (data.address) {
      const newAddress = await prisma.address.create({
        data: {
          customerId,
          street: data.address.street,
          number: data.address.number,
          complement: data.address.complement || null,
          neighborhood: data.address.neighborhood,
          city: data.address.city,
          state: data.address.state,
          zipCode: data.address.zipCode.replace(/\D/g, ''),
          type: data.address.type,
        },
      });

      return newAddress.id;
    }

    const fallbackAddress = await prisma.address.findFirst({
      where: { customerId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    if (!fallbackAddress) {
      throw ApiError.badRequest('É necessário informar um endereço ou selecionar um endereço já cadastrado');
    }

    return fallbackAddress.id;
  }

  async createOrder(data: {
    customerId?: string;
    addressId?: string;
    customerData?: {
      name: string;
      email: string;
      phone: string;
      cpf?: string;
    };
    address?: {
      street: string;
      number: string;
      complement?: string;
      neighborhood: string;
      city: string;
      state: string;
      zipCode: string;
      type: 'HOME' | 'WORK' | 'OTHER';
    };
    items: Array<{
      productId?: string;
      serviceId?: string;
      type: 'PRODUCT' | 'SERVICE';
      quantity: number;
    }>;
    paymentMethod: string;
    couponCode?: string;
  }) {
    let customerId = data.customerId;

    if (!customerId && data.customerData) {
      const customer = await this.findOrCreateCustomer(data.customerData);
      customerId = customer.id;
    }

    if (!customerId) {
      throw ApiError.badRequest('Cliente não encontrado ou não pôde ser criado');
    }

    const addressId = await this.resolveOrderAddressId(customerId, {
      addressId: data.addressId,
      address: data.address,
    });

    const productItems = data.items.filter(item => item.type === 'PRODUCT');
    const serviceItems = data.items.filter(item => item.type === 'SERVICE');

    const products = productItems.length > 0
      ? await this.validateAndPriceProducts(productItems)
      : [];

    const services = serviceItems.length > 0
      ? await this.validateAndPriceServices(serviceItems)
      : [];

    const allItems = [...products, ...services];
    const subtotal = allItems.reduce((sum, item) => sum + item.subtotal, 0);
    const discountAmount = await this.applyCouponDiscount(data.couponCode, subtotal);
    const hasServicesPending = services.some(service => !service.priceQuoted);
    const total = subtotal - discountAmount;

    const order = await prisma.order.create({
      data: {
        customerId,
        addressId,
        source: OrderSource.PHONE,
        status: OrderStatus.PENDING,
        hasProducts: productItems.length > 0,
        hasServices: serviceItems.length > 0,
        quoteStatus: hasServicesPending ? QuoteStatus.PENDING : null,
        subtotal,
        discountAmount,
        total,
        paymentMethod: data.paymentMethod,
        couponCode: data.couponCode,
        items: {
          create: allItems,
        },
      },
      include: {
        items: true,
        customer: {
          select: {
            name: true,
            phone: true,
            email: true,
          },
        },
        address: true,
      },
    }) as unknown as OrderWithRelations;

    await this.updateProductStock(products);

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

    return {
      ...this.mapOrderToResponse(order),
      updatedAt: order.updatedAt.toISOString(),
    };
  }

  // ==================== CREATE QUOTE ====================

  async createQuote(data: {
    customerId?: string;
    addressId?: string;
    customerData?: {
      name: string;
      email: string;
      phone: string;
      cpf?: string;
    };
    items: Array<{
      serviceId: string;
      quantity: number;
      quotedPrice: number;
      observations?: string;
    }>;
    observations?: string;
    validityDays: number;
    address?: {
      street: string;
      number: string;
      complement?: string;
      neighborhood: string;
      city: string;
      state: string;
      zipCode: string;
      type: 'HOME' | 'WORK' | 'OTHER';
    };
    sendToClient: boolean;
  }) {
    let customerId = data.customerId;

    // Se não tem customerId, criar novo cliente
    if (!customerId && data.customerData) {
      const existingCustomer = await prisma.customer.findFirst({
        where: {
          OR: [
            { email: data.customerData.email },
            { phone: data.customerData.phone }
          ]
        }
      });

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        // Gerar senha temporária
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await HashUtil.hashPassword(tempPassword);

        const newCustomer = await prisma.customer.create({
          data: {
            name: data.customerData.name,
            email: data.customerData.email,
            phone: data.customerData.phone,
            cpf: data.customerData.cpf || null,
            password: hashedPassword,
            level: 'BRONZE',
            status: 'ACTIVE'
          }
        });
        customerId = newCustomer.id;
      }
    }

    if (!customerId) {
      throw new Error('Cliente não encontrado ou não pôde ser criado');
    }

    // Buscar dados dos serviços
    const serviceIds = data.items.map(item => item.serviceId);
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } }
    });

    // Mapear serviços por ID
    const servicesMap = new Map(services.map(s => [s.id, s]));

    // Calcular total
    const total = data.items.reduce((sum, item) => {
      return sum + (item.quotedPrice * item.quantity);
    }, 0);

    // Criar endereço se fornecido
    let addressId: string | null = null;
    if (data.address) {
      const newAddress = await prisma.address.create({
        data: {
          customerId,
          street: data.address.street,
          number: data.address.number,
          complement: data.address.complement || null,
          neighborhood: data.address.neighborhood,
          city: data.address.city,
          state: data.address.state,
          zipCode: data.address.zipCode.replace(/\D/g, ''),
          type: data.address.type
        }
      });
      addressId = newAddress.id;
    }

    if (data.addressId) {
      const existingAddress = await prisma.address.findFirst({
        where: {
          id: data.addressId,
          customerId
        }
      });

      if (!existingAddress) {
        throw ApiError.badRequest('O endereco selecionado nao pertence ao cliente informado');
      }

      addressId = existingAddress.id;
    }

    if (!addressId) {
      const fallbackAddress = await prisma.address.findFirst({
        where: { customerId },
        orderBy: [
          { isDefault: 'desc' },
          { createdAt: 'asc' }
        ]
      });

      if (!fallbackAddress) {
        throw ApiError.badRequest('E necessario informar um endereco ou selecionar um endereco ja cadastrado para o cliente');
      }

      addressId = fallbackAddress.id;
    }

    // Criar Order (orçamento)
    const orderData: any = {
      customerId,
      addressId,
      status: 'PENDING',
      quoteStatus: data.sendToClient ? 'QUOTED' : 'ANALYZING',
      quotedAt: data.sendToClient ? new Date() : null,
      quoteNotes: data.observations || null,
      hasProducts: false,
      hasServices: true,
      subtotal: total,
      discountAmount: 0,
      total: total,
      paymentMethod: 'A_DEFINIR',
      items: {
          create: data.items.map(item => {
            const service = servicesMap.get(item.serviceId);
            return {
              type: OrderItemType.SERVICE,
              serviceId: item.serviceId,
              name: service?.name || 'Serviço',
              quantity: item.quantity,
              price: item.quotedPrice,
              subtotal: item.quotedPrice * item.quantity,
              quotedPrice: item.quotedPrice,
              priceQuoted: true
            };
          })
        }
    };

    if (addressId) {
      orderData.addressId = addressId;
    }

    const order = await prisma.order.create({
      data: orderData,
      include: {
        items: true,
        customer: {
          select: {
            name: true,
            phone: true,
            email: true
          }
        }
      }
    });

    // Retornar no formato Quote
    return this.mapOrderToQuote(order as any);
  }
}
