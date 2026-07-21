import { prisma } from '../../config/database.js';
import { CustomerLevel, CustomerStatus, OrderStatus, Prisma, OrderItemType, QuoteStatus, OrderSource, RevisionStatus, RelationshipMessageStatus, RelationshipMessageOutcome } from '@prisma/client';
import { HashUtil } from '@shared/utils/hash.util.js';
import { ApiError } from '@shared/utils/error.util.js';
import { LicensePlateUtil } from '@shared/utils/license-plate.util.js';
import { PhoneUtil } from '@shared/utils/phone.util.js';
import { randomUUID } from 'crypto';
import {
  matchesRules,
  parseRules,
  sortInsights,
  type RelationshipRule,
} from './relationship-rules.js';

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
  publicQuoteApprovalToken?: string | null;
  publicQuoteApprovalExpiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  items: OrderItemWithRelations[];
  address?: {
    id: string;
    street: string;
    number: string;
    complement?: string | null;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    type: string;
  } | null;
}

interface RelationshipInsightCustomer {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  level: CustomerLevel;
  status: CustomerStatus;
  birthDate: string | null;
  totalSpent: number;
  deliveredOrders: number;
  completedRevisions: number;
  lastOrderAt: string | null;
  lastRevisionAt: string | null;
  lastInteractionAt: string | null;
  daysSinceLastOrder: number | null;
  daysSinceLastRevision: number | null;
  daysSinceLastInteraction: number | null;
  daysUntilBirthday: number | null;
  interactionType: 'sale' | 'revision' | 'both';
}

interface RelationshipCategoryTemplate {
  id: string;
  name: string;
  body: string;
  isDefault: boolean;
}

interface RelationshipCategoryResult {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  accentColor: string;
  isSystem: boolean;
  sortOrder: number;
  count: number;
  customers: RelationshipInsightCustomer[];
  templates: RelationshipCategoryTemplate[];
}

interface CustomerRelationshipInsightsResponse {
  generatedAt: string;
  config: {
    inactivityDays: number;
    postSaleDays: number;
    birthdayWindowDays: number;
    vipThreshold: number;
  };
  summary: {
    birthdays: number;
    inactiveSales: number;
    inactiveRevisions: number;
    postSaleFollowUps: number;
    vipAtRisk: number;
  };
  birthdays: RelationshipInsightCustomer[];
  inactiveSales: RelationshipInsightCustomer[];
  inactiveRevisions: RelationshipInsightCustomer[];
  postSaleFollowUps: RelationshipInsightCustomer[];
  vipAtRisk: RelationshipInsightCustomer[];
  /** Categorias dinâmicas (sistema + customizadas) com seus templates. */
  categories: RelationshipCategoryResult[];
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
      where: { id },
      include: {
        addresses: true,
      },
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

  async getCustomerRelationshipInsights(params?: {
    inactivityDays?: number;
    postSaleDays?: number;
    birthdayWindowDays?: number;
  }): Promise<CustomerRelationshipInsightsResponse> {
    const inactivityDays = Math.max(7, Math.min(365, params?.inactivityDays || 90));
    const postSaleDays = Math.max(3, Math.min(60, params?.postSaleDays || 15));
    const birthdayWindowDays = Math.max(1, Math.min(60, params?.birthdayWindowDays || 30));
    const vipThreshold = 1000;
    const now = new Date();

    const [customers, orderAggregates, revisionAggregates] = await Promise.all([
      prisma.customer.findMany({
        where: {
          status: {
            in: [CustomerStatus.ACTIVE, CustomerStatus.INACTIVE],
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          birthDate: true,
          level: true,
          status: true,
          totalSpent: true,
        },
      }),
      prisma.order.groupBy({
        by: ['customerId'],
        where: {
          status: OrderStatus.DELIVERED,
        },
        _count: {
          _all: true,
        },
        _max: {
          createdAt: true,
        },
      }),
      prisma.revision.groupBy({
        by: ['customerId'],
        where: {
          status: RevisionStatus.COMPLETED,
        },
        _count: {
          _all: true,
        },
        _max: {
          completedAt: true,
          date: true,
        },
      }),
    ]);

    const orderMap = new Map(
      orderAggregates.map((item) => [
        item.customerId,
        {
          count: item._count._all,
          lastAt: item._max.createdAt,
        },
      ])
    );

    const revisionMap = new Map(
      revisionAggregates.map((item) => [
        item.customerId,
        {
          count: item._count._all,
          lastAt: item._max.completedAt || item._max.date,
        },
      ])
    );

    const insights = customers
      .map((customer) => {
        const orderData = orderMap.get(customer.id);
        const revisionData = revisionMap.get(customer.id);
        const lastOrderAt = orderData?.lastAt || null;
        const lastRevisionAt = revisionData?.lastAt || null;
        const lastInteractionAt = this.getLatestDate(lastOrderAt, lastRevisionAt);
        const daysUntilBirthday = customer.birthDate
          ? this.getDaysUntilBirthday(customer.birthDate, now)
          : null;

        return {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          whatsapp: customer.phone,
          level: customer.level,
          status: customer.status,
          birthDate: customer.birthDate?.toISOString() || null,
          totalSpent: Number(customer.totalSpent || 0),
          deliveredOrders: orderData?.count || 0,
          completedRevisions: revisionData?.count || 0,
          lastOrderAt: lastOrderAt?.toISOString() || null,
          lastRevisionAt: lastRevisionAt?.toISOString() || null,
          lastInteractionAt: lastInteractionAt?.toISOString() || null,
          daysSinceLastOrder: this.getDaysSince(lastOrderAt, now),
          daysSinceLastRevision: this.getDaysSince(lastRevisionAt, now),
          daysSinceLastInteraction: this.getDaysSince(lastInteractionAt, now),
          daysUntilBirthday,
          interactionType: orderData && revisionData ? 'both' : orderData ? 'sale' : 'revision',
        } satisfies RelationshipInsightCustomer;
      })
      .filter((customer) => customer.whatsapp);

    // Regras padrão das categorias de sistema. As categorias persistidas podem
    // sobrescrever essas regras; este mapa serve de fallback caso a categoria
    // de sistema use os parâmetros dinâmicos (janelas configuráveis na tela).
    const systemRuleBuilders: Record<string, () => RelationshipRule[]> = {
      birthdays: () => [
        { field: 'daysUntilBirthday', operator: 'notNull' },
        { field: 'daysUntilBirthday', operator: 'lte', value: birthdayWindowDays },
      ],
      'inactive-sales': () => [
        { field: 'deliveredOrders', operator: 'gte', value: 1 },
        { field: 'daysSinceLastOrder', operator: 'gte', value: inactivityDays },
      ],
      'inactive-revisions': () => [
        { field: 'completedRevisions', operator: 'gte', value: 1 },
        { field: 'daysSinceLastRevision', operator: 'gte', value: inactivityDays },
      ],
      'post-sale': () => [
        { field: 'daysSinceLastInteraction', operator: 'notNull' },
        { field: 'daysSinceLastInteraction', operator: 'lte', value: postSaleDays },
      ],
      vip: () => [
        { field: 'totalSpent', operator: 'gte', value: vipThreshold },
        { field: 'daysSinceLastInteraction', operator: 'gte', value: inactivityDays },
      ],
    };

    const categoryRecords = await prisma.relationshipCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        templates: {
          where: { isActive: true },
          orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    const categories: RelationshipCategoryResult[] = categoryRecords.map((category) => {
      // Categorias de sistema cujas regras ainda dependem das janelas
      // configuráveis usam o builder; as demais usam as regras salvas no banco.
      const persistedRules = parseRules(category.rules);
      const builder = systemRuleBuilders[category.key];
      const rules =
        category.isSystem && persistedRules.length === 0 && builder ? builder() : persistedRules;

      const matched = sortInsights(
        insights.filter((customer) => matchesRules(rules, customer)),
        category.sortBy,
        category.sortDir === 'desc' ? 'desc' : 'asc'
      );

      return {
        id: category.id,
        key: category.key,
        name: category.name,
        description: category.description,
        icon: category.icon,
        accentColor: category.accentColor,
        isSystem: category.isSystem,
        sortOrder: category.sortOrder,
        count: matched.length,
        customers: matched,
        templates: category.templates.map((template) => ({
          id: template.id,
          name: template.name,
          body: template.body,
          isDefault: template.isDefault,
        })),
      };
    });

    const byKey = (key: string) =>
      categories.find((category) => category.key === key)?.customers ?? [];

    // Retrocompatibilidade: se o banco ainda não tem as categorias de sistema
    // (antes do seed rodar), recai para o cálculo direto.
    const hasSystemCategories = categories.some((category) => category.isSystem);
    const birthdays = hasSystemCategories
      ? byKey('birthdays')
      : sortInsights(insights.filter((c) => matchesRules(systemRuleBuilders.birthdays(), c)), 'daysUntilBirthday', 'asc');
    const inactiveSales = hasSystemCategories
      ? byKey('inactive-sales')
      : sortInsights(insights.filter((c) => matchesRules(systemRuleBuilders['inactive-sales'](), c)), 'daysSinceLastOrder', 'desc');
    const inactiveRevisions = hasSystemCategories
      ? byKey('inactive-revisions')
      : sortInsights(insights.filter((c) => matchesRules(systemRuleBuilders['inactive-revisions'](), c)), 'daysSinceLastRevision', 'desc');
    const postSaleFollowUps = hasSystemCategories
      ? byKey('post-sale')
      : sortInsights(insights.filter((c) => matchesRules(systemRuleBuilders['post-sale'](), c)), 'daysSinceLastInteraction', 'asc');
    const vipAtRisk = hasSystemCategories
      ? byKey('vip')
      : sortInsights(insights.filter((c) => matchesRules(systemRuleBuilders.vip(), c)), 'totalSpent', 'desc');

    return {
      generatedAt: now.toISOString(),
      config: {
        inactivityDays,
        postSaleDays,
        birthdayWindowDays,
        vipThreshold,
      },
      summary: {
        birthdays: birthdays.length,
        inactiveSales: inactiveSales.length,
        inactiveRevisions: inactiveRevisions.length,
        postSaleFollowUps: postSaleFollowUps.length,
        vipAtRisk: vipAtRisk.length,
      },
      birthdays,
      inactiveSales,
      inactiveRevisions,
      postSaleFollowUps,
      vipAtRisk,
      categories,
    };
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
        throw new Error('Já existe um cliente com este telefone');
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
    const possiblePlates = LicensePlateUtil.toPossibleValidPlates(plate);

    if (possiblePlates.length === 0) {
      throw ApiError.badRequest('Placa invalida');
    }

    for (const normalizedPlate of possiblePlates) {
      const vehicle = await prisma.customerVehicle.findUnique({
        where: { plate: normalizedPlate },
        include: {
          customer: true,
        },
      });

      if (!vehicle) {
        continue;
      }

      return {
        found: true,
        plate: vehicle.plate,
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

    return {
      found: false,
      plate: possiblePlates[0],
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

  async updateQuotePrices(
    id: string,
    items: Array<{ id: string; quotedPrice: number }>,
    options?: { observations?: string; validityDays?: number }
  ) {
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
        quoteNotes: options?.observations ?? order.quoteNotes,
        publicQuoteApprovalToken: this.generatePublicQuoteApprovalToken(),
        publicQuoteApprovalExpiresAt: this.getPublicQuoteApprovalExpiry(options?.validityDays),
      },
      include: {
        items: true,
        customer: { select: { name: true, phone: true, email: true } },
        address: true,
      },
    });

    return this.mapOrderToQuote(updatedOrder as unknown as OrderWithRelations);
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

    // ✅ MUDANÇA CRÃTICA: Ao aprovar orçamento, muda status para IN_PRODUCTION
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

  async getQuoteByPublicApprovalToken(token: string) {
    const order = await prisma.order.findFirst({
      where: { publicQuoteApprovalToken: token },
      include: {
        customer: { select: { name: true, phone: true, email: true } },
        items: {
          where: { type: 'SERVICE' },
        },
        address: true,
      },
    }) as unknown as OrderWithRelations | null;

    if (!order) {
      throw ApiError.notFound('Orçamento não encontrado');
    }

    return this.mapOrderToQuote(order);
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
      orderStatus: order.status,
      createdAt: order.createdAt.toISOString(),
      quotedAt: order.quotedAt?.toISOString() || null,
      quoteApprovedAt: order.quoteApprovedAt?.toISOString() || null,
      quoteNotes: order.quoteNotes || null,
      publicApprovalToken: order.publicQuoteApprovalToken || null,
      publicApprovalExpiresAt: order.publicQuoteApprovalExpiresAt?.toISOString() || null,
      source: this.mapOrderSource(order.source),
    };
  }

  private generatePublicQuoteApprovalToken() {
    return randomUUID();
  }

  private getPublicQuoteApprovalExpiry(validityDays = 7) {
    const normalizedDays = Math.max(1, Math.min(30, validityDays || 7));
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + normalizedDays);
    return expiresAt;
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

  private getDaysSince(date: Date | null, now: Date): number | null {
    if (!date) {
      return null;
    }

    return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  }

  private getLatestDate(first: Date | null, second: Date | null): Date | null {
    if (!first) return second;
    if (!second) return first;
    return first > second ? first : second;
  }

  private getDaysUntilBirthday(birthDate: Date, now: Date): number {
    const nextBirthday = new Date(now.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    nextBirthday.setHours(0, 0, 0, 0);

    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    if (nextBirthday < today) {
      nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
    }

    return Math.floor((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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
      throw ApiError.badRequest('Ã‰ necessário informar um endereço ou selecionar um endereço já cadastrado');
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
      throw ApiError.badRequest('Cliente não encontrado ou não pÃ´de ser criado');
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
      throw new Error('Cliente não encontrado ou não pÃ´de ser criado');
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
      publicQuoteApprovalToken: data.sendToClient ? this.generatePublicQuoteApprovalToken() : null,
      publicQuoteApprovalExpiresAt: data.sendToClient ? this.getPublicQuoteApprovalExpiry(data.validityDays) : null,
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

  // ==================== RELATIONSHIP CATEGORIES ====================

  async listRelationshipCategories() {
    return prisma.relationshipCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        templates: {
          orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });
  }

  private slugifyCategoryKey(name: string) {
    const base = name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    return base || `cat-${randomUUID().slice(0, 8)}`;
  }

  async createRelationshipCategory(data: {
    name: string;
    description?: string;
    icon?: string;
    accentColor?: string;
    isActive?: boolean;
    sortOrder?: number;
    rules?: unknown;
    sortBy?: string;
    sortDir?: string;
  }) {
    if (!data.name?.trim()) {
      throw new ApiError(400, 'Nome da categoria é obrigatório');
    }

    let key = this.slugifyCategoryKey(data.name);
    const existing = await prisma.relationshipCategory.findUnique({ where: { key } });
    if (existing) {
      key = `${key}-${randomUUID().slice(0, 6)}`;
    }

    return prisma.relationshipCategory.create({
      data: {
        key,
        name: data.name.trim(),
        description: data.description?.trim() ?? '',
        icon: data.icon?.trim() || 'MessageCircle',
        accentColor: data.accentColor?.trim() || '#f97316',
        isSystem: false,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 100,
        rules: parseRules(data.rules) as unknown as Prisma.InputJsonValue,
        sortBy: data.sortBy?.trim() || 'daysSinceLastInteraction',
        sortDir: data.sortDir === 'desc' ? 'desc' : 'asc',
      },
    });
  }

  async updateRelationshipCategory(
    id: string,
    data: {
      name?: string;
      description?: string;
      icon?: string;
      accentColor?: string;
      isActive?: boolean;
      sortOrder?: number;
      rules?: unknown;
      sortBy?: string;
      sortDir?: string;
    }
  ) {
    const category = await prisma.relationshipCategory.findUnique({ where: { id } });
    if (!category) {
      throw new ApiError(404, 'Categoria não encontrada');
    }

    const updateData: Prisma.RelationshipCategoryUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined) updateData.description = data.description.trim();
    if (data.icon !== undefined) updateData.icon = data.icon.trim() || 'MessageCircle';
    if (data.accentColor !== undefined) updateData.accentColor = data.accentColor.trim() || '#f97316';
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
    if (data.rules !== undefined) updateData.rules = parseRules(data.rules) as unknown as Prisma.InputJsonValue;
    if (data.sortBy !== undefined) updateData.sortBy = data.sortBy.trim() || 'daysSinceLastInteraction';
    if (data.sortDir !== undefined) updateData.sortDir = data.sortDir === 'desc' ? 'desc' : 'asc';

    return prisma.relationshipCategory.update({ where: { id }, data: updateData });
  }

  async deleteRelationshipCategory(id: string) {
    const category = await prisma.relationshipCategory.findUnique({ where: { id } });
    if (!category) {
      throw new ApiError(404, 'Categoria não encontrada');
    }
    if (category.isSystem) {
      throw new ApiError(400, 'Categorias de sistema não podem ser excluídas. Você pode desativá-la.');
    }
    await prisma.relationshipCategory.delete({ where: { id } });
    return { success: true };
  }

  // ==================== RELATIONSHIP TEMPLATES ====================

  async createRelationshipTemplate(
    categoryId: string,
    data: { name: string; body: string; isDefault?: boolean; isActive?: boolean; sortOrder?: number }
  ) {
    const category = await prisma.relationshipCategory.findUnique({ where: { id: categoryId } });
    if (!category) {
      throw new ApiError(404, 'Categoria não encontrada');
    }
    if (!data.name?.trim()) {
      throw new ApiError(400, 'Nome do template é obrigatório');
    }
    if (!data.body?.trim()) {
      throw new ApiError(400, 'Mensagem do template é obrigatória');
    }

    return prisma.$transaction(async (tx) => {
      const makeDefault = data.isDefault ?? false;
      if (makeDefault) {
        await tx.relationshipTemplate.updateMany({
          where: { categoryId },
          data: { isDefault: false },
        });
      }
      return tx.relationshipTemplate.create({
        data: {
          categoryId,
          name: data.name.trim(),
          body: data.body,
          isDefault: makeDefault,
          isActive: data.isActive ?? true,
          sortOrder: data.sortOrder ?? 0,
        },
      });
    });
  }

  async updateRelationshipTemplate(
    id: string,
    data: { name?: string; body?: string; isDefault?: boolean; isActive?: boolean; sortOrder?: number }
  ) {
    const template = await prisma.relationshipTemplate.findUnique({ where: { id } });
    if (!template) {
      throw new ApiError(404, 'Template não encontrado');
    }

    return prisma.$transaction(async (tx) => {
      if (data.isDefault === true) {
        await tx.relationshipTemplate.updateMany({
          where: { categoryId: template.categoryId, id: { not: id } },
          data: { isDefault: false },
        });
      }

      const updateData: Prisma.RelationshipTemplateUpdateInput = {};
      if (data.name !== undefined) updateData.name = data.name.trim();
      if (data.body !== undefined) updateData.body = data.body;
      if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

      return tx.relationshipTemplate.update({ where: { id }, data: updateData });
    });
  }

  async deleteRelationshipTemplate(id: string) {
    const template = await prisma.relationshipTemplate.findUnique({ where: { id } });
    if (!template) {
      throw new ApiError(404, 'Template não encontrado');
    }
    await prisma.relationshipTemplate.delete({ where: { id } });
    return { success: true };
  }

  // ==================== RELATIONSHIP MESSAGES (HISTÓRICO/ENVIOS) ====================

  /**
   * Registra um envio de mensagem de relacionamento. Cria o registro em estado
   * PENDING (WhatsApp aberto, aguardando confirmação do admin). Guarda snapshots
   * do cliente/categoria/mensagem para o histórico sobreviver a alterações.
   */
  async createRelationshipMessage(
    adminId: string | undefined,
    data: {
      customerId: string;
      categoryId?: string | null;
      templateId?: string | null;
      messageBody: string;
    }
  ) {
    if (!data.customerId) {
      throw new ApiError(400, 'Cliente é obrigatório');
    }
    if (!data.messageBody?.trim()) {
      throw new ApiError(400, 'Mensagem é obrigatória');
    }

    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
      select: { id: true, name: true, phone: true },
    });
    if (!customer) {
      throw new ApiError(404, 'Cliente não encontrado');
    }

    let categoryKey = 'custom';
    let categoryName = 'Contato avulso';
    if (data.categoryId) {
      const category = await prisma.relationshipCategory.findUnique({
        where: { id: data.categoryId },
        select: { key: true, name: true },
      });
      if (category) {
        categoryKey = category.key;
        categoryName = category.name;
      }
    }

    let templateName: string | null = null;
    if (data.templateId) {
      const template = await prisma.relationshipTemplate.findUnique({
        where: { id: data.templateId },
        select: { name: true },
      });
      templateName = template?.name ?? null;
    }

    return prisma.relationshipMessage.create({
      data: {
        customerId: customer.id,
        categoryId: data.categoryId ?? null,
        templateId: data.templateId ?? null,
        adminId: adminId ?? null,
        customerName: customer.name,
        customerPhone: customer.phone,
        categoryKey,
        categoryName,
        templateName,
        messageBody: data.messageBody,
        status: RelationshipMessageStatus.PENDING,
        outcome: RelationshipMessageOutcome.PENDING,
      },
    });
  }

  /** Confirma que a mensagem foi realmente enviada e, opcionalmente, o resultado. */
  async confirmRelationshipMessage(
    id: string,
    data?: { outcome?: RelationshipMessageOutcome; notes?: string }
  ) {
    const message = await prisma.relationshipMessage.findUnique({ where: { id } });
    if (!message) {
      throw new ApiError(404, 'Registro de mensagem não encontrado');
    }

    return prisma.relationshipMessage.update({
      where: { id },
      data: {
        status: RelationshipMessageStatus.SENT,
        confirmedAt: message.confirmedAt ?? new Date(),
        ...(data?.outcome ? { outcome: data.outcome } : {}),
        ...(data?.notes !== undefined ? { notes: data.notes } : {}),
      },
    });
  }

  /** Atualiza o resultado/anotações de um contato já registrado. */
  async updateRelationshipMessageOutcome(
    id: string,
    data: { outcome?: RelationshipMessageOutcome; notes?: string }
  ) {
    const message = await prisma.relationshipMessage.findUnique({ where: { id } });
    if (!message) {
      throw new ApiError(404, 'Registro de mensagem não encontrado');
    }

    return prisma.relationshipMessage.update({
      where: { id },
      data: {
        ...(data.outcome ? { outcome: data.outcome } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
    });
  }

  async deleteRelationshipMessage(id: string) {
    const message = await prisma.relationshipMessage.findUnique({ where: { id } });
    if (!message) {
      throw new ApiError(404, 'Registro de mensagem não encontrado');
    }
    await prisma.relationshipMessage.delete({ where: { id } });
    return { success: true };
  }

  /** Histórico paginado de mensagens, com filtros. */
  async listRelationshipMessages(params?: {
    page?: number;
    limit?: number;
    categoryKey?: string;
    status?: string;
    outcome?: string;
    customerId?: string;
    from?: string;
    to?: string;
  }) {
    const page = Math.max(1, params?.page || 1);
    const limit = Math.min(100, Math.max(1, params?.limit || 20));

    const where: Prisma.RelationshipMessageWhereInput = {};
    if (params?.categoryKey) where.categoryKey = params.categoryKey;
    if (params?.customerId) where.customerId = params.customerId;
    if (
      params?.status &&
      Object.values(RelationshipMessageStatus).includes(params.status as RelationshipMessageStatus)
    ) {
      where.status = params.status as RelationshipMessageStatus;
    }
    if (
      params?.outcome &&
      Object.values(RelationshipMessageOutcome).includes(params.outcome as RelationshipMessageOutcome)
    ) {
      where.outcome = params.outcome as RelationshipMessageOutcome;
    }
    if (params?.from || params?.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = new Date(params.from);
      if (params.to) where.createdAt.lte = new Date(params.to);
    }

    const [total, items] = await Promise.all([
      prisma.relationshipMessage.count({ where }),
      prisma.relationshipMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          admin: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        customerId: item.customerId,
        customerName: item.customerName,
        customerPhone: item.customerPhone,
        categoryKey: item.categoryKey,
        categoryName: item.categoryName,
        templateName: item.templateName,
        messageBody: item.messageBody,
        status: item.status,
        outcome: item.outcome,
        notes: item.notes,
        adminName: item.admin?.name ?? null,
        createdAt: item.createdAt.toISOString(),
        confirmedAt: item.confirmedAt?.toISOString() ?? null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Dashboard de relacionamento: métricas agregadas, série temporal, distribuição
   * por categoria/resultado e cobertura das oportunidades atuais.
   */
  async getRelationshipDashboard(params?: { days?: number }) {
    const days = Math.min(365, Math.max(7, params?.days || 30));
    const now = new Date();
    const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const messages = await prisma.relationshipMessage.findMany({
      where: { createdAt: { gte: since } },
      select: {
        customerId: true,
        categoryKey: true,
        categoryName: true,
        status: true,
        outcome: true,
        createdAt: true,
      },
    });

    const sentMessages = messages.filter((m) => m.status === RelationshipMessageStatus.SENT);
    const uniqueCustomers = new Set(
      sentMessages.map((m) => m.customerId).filter((id): id is string => Boolean(id))
    );

    // Distribuição por categoria.
    const byCategoryMap = new Map<string, { name: string; total: number }>();
    for (const m of sentMessages) {
      const entry = byCategoryMap.get(m.categoryKey) ?? { name: m.categoryName, total: 0 };
      entry.total += 1;
      byCategoryMap.set(m.categoryKey, entry);
    }
    const byCategory = Array.from(byCategoryMap.entries())
      .map(([key, value]) => ({ key, name: value.name, total: value.total }))
      .sort((a, b) => b.total - a.total);

    // Distribuição por resultado.
    const outcomeOrder: RelationshipMessageOutcome[] = [
      RelationshipMessageOutcome.PENDING,
      RelationshipMessageOutcome.REPLIED,
      RelationshipMessageOutcome.SCHEDULED,
      RelationshipMessageOutcome.PURCHASED,
      RelationshipMessageOutcome.NO_REPLY,
    ];
    const byOutcome = outcomeOrder.map((outcome) => ({
      outcome,
      total: sentMessages.filter((m) => m.outcome === outcome).length,
    }));

    // Série temporal (envios por dia).
    const dayMap = new Map<string, number>();
    for (let i = 0; i < days; i += 1) {
      const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
      dayMap.set(d.toISOString().slice(0, 10), 0);
    }
    for (const m of sentMessages) {
      const key = m.createdAt.toISOString().slice(0, 10);
      if (dayMap.has(key)) {
        dayMap.set(key, (dayMap.get(key) || 0) + 1);
      }
    }
    const timeline = Array.from(dayMap.entries()).map(([date, total]) => ({ date, total }));

    // Cobertura: dos clientes atualmente em cada categoria de oportunidade,
    // quantos já foram contatados (envio confirmado nos últimos `days`).
    const insights = await this.getCustomerRelationshipInsights();
    const contactedByCategory = new Map<string, Set<string>>();
    for (const m of sentMessages) {
      if (!m.customerId) continue;
      const set = contactedByCategory.get(m.categoryKey) ?? new Set<string>();
      set.add(m.customerId);
      contactedByCategory.set(m.categoryKey, set);
    }
    const coverage = insights.categories.map((category) => {
      const contactedSet = contactedByCategory.get(category.key) ?? new Set<string>();
      const contacted = category.customers.filter((c) => contactedSet.has(c.id)).length;
      return {
        key: category.key,
        name: category.name,
        accentColor: category.accentColor,
        totalOpportunities: category.count,
        contacted,
        pending: Math.max(0, category.count - contacted),
      };
    });

    return {
      generatedAt: now.toISOString(),
      periodDays: days,
      summary: {
        totalSent: sentMessages.length,
        pendingConfirmation: messages.filter((m) => m.status === RelationshipMessageStatus.PENDING)
          .length,
        customersImpacted: uniqueCustomers.size,
        replied: sentMessages.filter(
          (m) =>
            m.outcome === RelationshipMessageOutcome.REPLIED ||
            m.outcome === RelationshipMessageOutcome.SCHEDULED ||
            m.outcome === RelationshipMessageOutcome.PURCHASED
        ).length,
      },
      byCategory,
      byOutcome,
      timeline,
      coverage,
    };
  }
}


