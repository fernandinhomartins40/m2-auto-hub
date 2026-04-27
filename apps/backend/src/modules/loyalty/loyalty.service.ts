import {
  CustomerLevel,
  LoyaltyRedemptionStatus,
  LoyaltyRewardStatus,
  LoyaltyRewardType,
  LoyaltyTransactionType,
  Prisma,
  type Settings,
} from '@prisma/client';
import { prisma } from '@config/database.js';
import { ApiError } from '@shared/utils/error.util.js';
import { settingsService } from '@modules/settings/settings.service.js';
import type {
  AdminLoyaltyStats,
  LoyaltyReward,
  LoyaltySettings,
  LoyaltyStats,
  PointTransaction,
  RedeemedReward,
  PaginatedResponse,
} from '@moria/types';

const DEFAULT_TIER_MULTIPLIERS: Record<CustomerLevel, number> = {
  BRONZE: 1,
  SILVER: 1.1,
  GOLD: 1.25,
  PLATINUM: 1.5,
};

const LEVEL_ORDER: CustomerLevel[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];

type LoyaltyRewardInput = {
  name: string;
  description: string;
  type: LoyaltyRewardType;
  pointsCost: number;
  discountValue?: number | null;
  minLevel: CustomerLevel;
  status: LoyaltyRewardStatus;
  usageInstructions?: string;
  expiresAt?: string | null;
};

type LoyaltySettingsInput = Partial<
  Pick<
    LoyaltySettings,
    | 'programName'
    | 'programDescription'
    | 'pointsPerReal'
    | 'minPurchaseForPoints'
    | 'revisionBonusPoints'
    | 'isActive'
    | 'tierMultipliers'
    | 'termsAndConditions'
  >
>;

export class LoyaltyService {
  private parseTierMultipliers(value: Prisma.JsonValue | null | undefined): Record<CustomerLevel, number> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return DEFAULT_TIER_MULTIPLIERS;
    }

    return {
      BRONZE: Number((value as Record<string, unknown>).BRONZE ?? DEFAULT_TIER_MULTIPLIERS.BRONZE),
      SILVER: Number((value as Record<string, unknown>).SILVER ?? DEFAULT_TIER_MULTIPLIERS.SILVER),
      GOLD: Number((value as Record<string, unknown>).GOLD ?? DEFAULT_TIER_MULTIPLIERS.GOLD),
      PLATINUM: Number((value as Record<string, unknown>).PLATINUM ?? DEFAULT_TIER_MULTIPLIERS.PLATINUM),
    };
  }

  private toSettingsDto(settings: Settings): LoyaltySettings {
    return {
      programName: settings.loyaltyProgramName,
      programDescription: settings.loyaltyProgramDescription,
      pointsPerReal: Number(settings.loyaltyPointsPerReal),
      minPurchaseForPoints: Number(settings.loyaltyMinPurchaseForPoints),
      revisionBonusPoints: settings.loyaltyRevisionBonusPoints,
      signupBonusPoints: settings.loyaltySignupBonusPoints,
      birthdayBonusPoints: settings.loyaltyBirthdayBonusPoints,
      pointsValidityDays: settings.loyaltyPointsValidityDays,
      isActive: settings.loyaltyProgramActive,
      tierMultipliers: this.parseTierMultipliers(settings.loyaltyTierMultipliers),
      termsAndConditions: settings.loyaltyTermsAndConditions,
    };
  }

  private toRewardDto(reward: any): LoyaltyReward {
    return {
      id: reward.id,
      name: reward.name,
      description: reward.description,
      type: reward.type,
      pointsCost: reward.pointsCost,
      discountValue: reward.discountValue !== null && reward.discountValue !== undefined ? Number(reward.discountValue) : null,
      minLevel: reward.minLevel,
      status: reward.status,
      usageInstructions: reward.usageInstructions,
      expiresAt: reward.expiresAt?.toISOString() ?? null,
      createdAt: reward.createdAt?.toISOString?.() ?? undefined,
      updatedAt: reward.updatedAt?.toISOString?.() ?? undefined,
    };
  }

  private toTransactionDto(transaction: any): PointTransaction {
    return {
      id: transaction.id,
      customerId: transaction.customerId,
      rewardId: transaction.rewardId,
      redemptionId: transaction.redemptionId,
      orderId: transaction.orderId,
      revisionId: transaction.revisionId,
      type: transaction.type,
      points: transaction.points,
      description: transaction.description,
      createdAt: transaction.createdAt.toISOString(),
    };
  }

  private toRedemptionDto(redemption: any): RedeemedReward {
    return {
      id: redemption.id,
      customerId: redemption.customerId,
      rewardId: redemption.rewardId,
      code: redemption.code,
      pointsSpent: redemption.pointsSpent,
      status: redemption.status,
      notes: redemption.notes,
      expiresAt: redemption.expiresAt?.toISOString() ?? null,
      usedAt: redemption.usedAt?.toISOString() ?? null,
      createdAt: redemption.createdAt.toISOString(),
      updatedAt: redemption.updatedAt.toISOString(),
      reward: redemption.reward ? this.toRewardDto(redemption.reward) : undefined,
      customer: redemption.customer
        ? {
            id: redemption.customer.id,
            name: redemption.customer.name,
            email: redemption.customer.email,
            phone: redemption.customer.phone,
            level: redemption.customer.level,
          }
        : undefined,
    };
  }

  private allowedMinLevels(level: CustomerLevel): CustomerLevel[] {
    const index = LEVEL_ORDER.indexOf(level);
    return LEVEL_ORDER.slice(0, index + 1);
  }

  private getTierMultiplier(level: CustomerLevel, settings: LoyaltySettings) {
    return Number(settings.tierMultipliers[level] ?? 1) || 1;
  }

  private async ensureCustomerExists(customerId: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, name: true, email: true, phone: true, level: true, createdAt: true },
    });

    if (!customer) {
      throw ApiError.notFound('Cliente nao encontrado');
    }

    return customer;
  }

  private async generateRedemptionCode() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = `FID-${Math.random().toString(36).slice(2, 6)}-${Date.now().toString(36).slice(-5)}`.toUpperCase();
      const existing = await prisma.loyaltyRedemption.findUnique({ where: { code } });
      if (!existing) {
        return code;
      }
    }

    throw ApiError.internal('Nao foi possivel gerar codigo de resgate');
  }

  private async syncHistoricalTransactions() {
    const rawSettings = await settingsService.getSettings();
    const settings = this.toSettingsDto(rawSettings);

    if (!settings.isActive) {
      return settings;
    }

    const [existingOrderTransactions, existingRevisionTransactions, existingSignupTransactions] = await Promise.all([
      prisma.loyaltyTransaction.findMany({
        where: { type: LoyaltyTransactionType.EARN_ORDER, orderId: { not: null } },
        select: { orderId: true },
      }),
      prisma.loyaltyTransaction.findMany({
        where: { type: LoyaltyTransactionType.EARN_REVISION, revisionId: { not: null } },
        select: { revisionId: true },
      }),
      prisma.loyaltyTransaction.findMany({
        where: { type: LoyaltyTransactionType.EARN_SIGNUP },
        select: { customerId: true },
      }),
    ]);

    const existingOrderIds = new Set(existingOrderTransactions.map((item) => item.orderId).filter(Boolean));
    const existingRevisionIds = new Set(existingRevisionTransactions.map((item) => item.revisionId).filter(Boolean));
    const existingSignupCustomerIds = new Set(existingSignupTransactions.map((item) => item.customerId));

    const [orders, revisions, customers] = await Promise.all([
      prisma.order.findMany({
        where: {
          status: { not: 'CANCELLED' },
          total: { gte: settings.minPurchaseForPoints },
        },
        select: {
          id: true,
          customerId: true,
          total: true,
          createdAt: true,
          customer: {
            select: {
              level: true,
              name: true,
            },
          },
        },
      }),
      prisma.revision.findMany({
        where: { status: 'COMPLETED' },
        select: {
          id: true,
          customerId: true,
          completedAt: true,
          createdAt: true,
          customer: {
            select: {
              level: true,
              name: true,
            },
          },
        },
      }),
      prisma.customer.findMany({
        select: {
          id: true,
          name: true,
          createdAt: true,
          level: true,
        },
      }),
    ]);

    const transactionsToCreate: Prisma.LoyaltyTransactionCreateManyInput[] = [];

    for (const order of orders) {
      if (existingOrderIds.has(order.id)) {
        continue;
      }

      const multiplier = this.getTierMultiplier(order.customer.level, settings);
      const points = Math.floor(Number(order.total) * settings.pointsPerReal * multiplier);
      if (points <= 0) {
        continue;
      }

      transactionsToCreate.push({
        customerId: order.customerId,
        orderId: order.id,
        type: LoyaltyTransactionType.EARN_ORDER,
        points,
        description: `Pontos gerados pela compra ${order.id.slice(0, 8)}`,
        metadata: {
          source: 'order',
          customerName: order.customer.name,
          total: Number(order.total),
          multiplier,
        },
        createdAt: order.createdAt,
      });
    }

    for (const revision of revisions) {
      if (existingRevisionIds.has(revision.id) || settings.revisionBonusPoints <= 0) {
        continue;
      }

      const multiplier = this.getTierMultiplier(revision.customer.level, settings);
      const points = Math.floor(settings.revisionBonusPoints * multiplier);
      if (points <= 0) {
        continue;
      }

      transactionsToCreate.push({
        customerId: revision.customerId,
        revisionId: revision.id,
        type: LoyaltyTransactionType.EARN_REVISION,
        points,
        description: `Bonus pela revisao ${revision.id.slice(0, 8)}`,
        metadata: {
          source: 'revision',
          customerName: revision.customer.name,
          multiplier,
        },
        createdAt: revision.completedAt ?? revision.createdAt,
      });
    }

    if (rawSettings.loyaltySignupBonusPoints > 0) {
      for (const customer of customers) {
        if (existingSignupCustomerIds.has(customer.id)) {
          continue;
        }

        transactionsToCreate.push({
          customerId: customer.id,
          type: LoyaltyTransactionType.EARN_SIGNUP,
          points: rawSettings.loyaltySignupBonusPoints,
          description: 'Bonus de boas-vindas do programa de fidelidade',
          metadata: {
            source: 'signup',
            customerName: customer.name,
          },
          createdAt: customer.createdAt,
        });
      }
    }

    if (transactionsToCreate.length > 0) {
      await prisma.loyaltyTransaction.createMany({
        data: transactionsToCreate,
        skipDuplicates: true,
      });
    }

    return settings;
  }

  private async getCustomerPointSummaryMap(customerIds: string[]) {
    if (customerIds.length === 0) {
      return new Map<string, { currentPoints: number; totalPointsEarned: number; totalPointsRedeemed: number }>();
    }

    const transactions = await prisma.loyaltyTransaction.findMany({
      where: { customerId: { in: customerIds } },
      select: {
        customerId: true,
        type: true,
        points: true,
      },
    });

    const summaryMap = new Map<string, { currentPoints: number; totalPointsEarned: number; totalPointsRedeemed: number }>();
    for (const customerId of customerIds) {
      summaryMap.set(customerId, {
        currentPoints: 0,
        totalPointsEarned: 0,
        totalPointsRedeemed: 0,
      });
    }

    for (const transaction of transactions) {
      const current = summaryMap.get(transaction.customerId) ?? {
        currentPoints: 0,
        totalPointsEarned: 0,
        totalPointsRedeemed: 0,
      };

      current.currentPoints += transaction.points;

      if (transaction.points > 0) {
        current.totalPointsEarned += transaction.points;
      }

      if (transaction.points < 0) {
        current.totalPointsRedeemed += Math.abs(transaction.points);
      }

      summaryMap.set(transaction.customerId, current);
    }

    return summaryMap;
  }

  async getSettings(): Promise<LoyaltySettings> {
    const settings = await settingsService.getSettings();
    return this.toSettingsDto(settings);
  }

  async updateSettings(data: LoyaltySettingsInput): Promise<LoyaltySettings> {
    const settings = await settingsService.getSettings();
    const tierMultipliers = data.tierMultipliers
      ? {
          BRONZE: Number(data.tierMultipliers.BRONZE ?? DEFAULT_TIER_MULTIPLIERS.BRONZE),
          SILVER: Number(data.tierMultipliers.SILVER ?? DEFAULT_TIER_MULTIPLIERS.SILVER),
          GOLD: Number(data.tierMultipliers.GOLD ?? DEFAULT_TIER_MULTIPLIERS.GOLD),
          PLATINUM: Number(data.tierMultipliers.PLATINUM ?? DEFAULT_TIER_MULTIPLIERS.PLATINUM),
        }
      : undefined;

    const updated = await prisma.settings.update({
      where: { id: settings.id },
      data: {
        loyaltyProgramName: data.programName,
        loyaltyProgramDescription: data.programDescription,
        loyaltyProgramActive: data.isActive,
        loyaltyPointsPerReal:
          typeof data.pointsPerReal === 'number' ? new Prisma.Decimal(data.pointsPerReal) : undefined,
        loyaltyMinPurchaseForPoints:
          typeof data.minPurchaseForPoints === 'number'
            ? new Prisma.Decimal(data.minPurchaseForPoints)
            : undefined,
        loyaltyRevisionBonusPoints: data.revisionBonusPoints,
        loyaltyTierMultipliers: tierMultipliers,
        loyaltyTermsAndConditions: data.termsAndConditions,
      },
    });

    return this.toSettingsDto(updated);
  }

  async getAdminStats(): Promise<AdminLoyaltyStats> {
    const settings = await this.syncHistoricalTransactions();
    const [transactions, redemptionsCount, activeRewards] = await Promise.all([
      prisma.loyaltyTransaction.findMany({
        select: { customerId: true, points: true, type: true },
      }),
      prisma.loyaltyRedemption.count(),
      prisma.loyaltyReward.count({ where: { status: LoyaltyRewardStatus.ACTIVE } }),
    ]);

    const pointsByCustomer = new Map<string, number>();
    let totalPointsDistributed = 0;
    let totalPointsRedeemed = 0;

    for (const transaction of transactions) {
      pointsByCustomer.set(transaction.customerId, (pointsByCustomer.get(transaction.customerId) ?? 0) + transaction.points);
      if (transaction.points > 0) {
        totalPointsDistributed += transaction.points;
      }
      if (transaction.points < 0) {
        totalPointsRedeemed += Math.abs(transaction.points);
      }
    }

    const customerBalances = Array.from(pointsByCustomer.values()).filter((value) => value > 0);
    const totalCurrentPoints = customerBalances.reduce((sum, value) => sum + value, 0);

    return {
      totalCustomersWithPoints: customerBalances.length,
      totalPointsDistributed,
      totalPointsRedeemed,
      totalRedemptions: redemptionsCount,
      activeRewards,
      programStatus: settings.isActive ? 'ACTIVE' : 'INACTIVE',
      averagePointsPerCustomer: customerBalances.length ? Math.round(totalCurrentPoints / customerBalances.length) : 0,
    };
  }

  async getCustomerStats(customerId: string): Promise<LoyaltyStats> {
    await this.syncHistoricalTransactions();
    const customer = await this.ensureCustomerExists(customerId);
    const summaryMap = await this.getCustomerPointSummaryMap([customerId]);
    const summary = summaryMap.get(customerId) ?? {
      currentPoints: 0,
      totalPointsEarned: 0,
      totalPointsRedeemed: 0,
    };
    const availableRewardsCount = await prisma.loyaltyReward.count({
      where: {
        status: LoyaltyRewardStatus.ACTIVE,
        minLevel: { in: this.allowedMinLevels(customer.level) },
        pointsCost: { lte: summary.currentPoints },
      },
    });
    const recentTransactionsCount = await prisma.loyaltyTransaction.count({
      where: {
        customerId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    return {
      currentPoints: summary.currentPoints,
      totalPointsEarned: summary.totalPointsEarned,
      totalPointsRedeemed: summary.totalPointsRedeemed,
      level: customer.level,
      availableRewardsCount,
      recentTransactionsCount,
    };
  }

  async getTransactions(customerId: string, page = 1, limit = 20): Promise<PaginatedResponse<PointTransaction>> {
    await this.syncHistoricalTransactions();
    await this.ensureCustomerExists(customerId);

    const [totalCount, transactions] = await Promise.all([
      prisma.loyaltyTransaction.count({ where: { customerId } }),
      prisma.loyaltyTransaction.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: transactions.map((transaction) => this.toTransactionDto(transaction)),
      totalCount,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
    };
  }

  async getCustomerRewards(customerId: string, page = 1, limit = 20): Promise<PaginatedResponse<LoyaltyReward>> {
    await this.syncHistoricalTransactions();
    const customer = await this.ensureCustomerExists(customerId);
    const stats = await this.getCustomerStats(customerId);
    const where = {
      status: LoyaltyRewardStatus.ACTIVE,
      minLevel: { in: this.allowedMinLevels(customer.level) },
      pointsCost: { lte: stats.currentPoints },
    };

    const [totalCount, rewards] = await Promise.all([
      prisma.loyaltyReward.count({ where }),
      prisma.loyaltyReward.findMany({
        where,
        orderBy: [{ pointsCost: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: rewards.map((reward) => this.toRewardDto(reward)),
      totalCount,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
    };
  }

  async redeemReward(customerId: string, rewardId: string): Promise<RedeemedReward> {
    const rawSettings = await settingsService.getSettings();
    if (!rawSettings.loyaltyProgramActive) {
      throw ApiError.badRequest('O programa de fidelidade esta desativado');
    }

    await this.syncHistoricalTransactions();
    const customer = await this.ensureCustomerExists(customerId);
    const reward = await prisma.loyaltyReward.findUnique({ where: { id: rewardId } });

    if (!reward || reward.status !== LoyaltyRewardStatus.ACTIVE) {
      throw ApiError.notFound('Recompensa nao encontrada');
    }

    if (!this.allowedMinLevels(customer.level).includes(reward.minLevel)) {
      throw ApiError.forbidden('Nivel do cliente nao permite este resgate');
    }

    const stats = await this.getCustomerStats(customerId);
    if (stats.currentPoints < reward.pointsCost) {
      throw ApiError.badRequest('Pontos insuficientes para resgatar esta recompensa');
    }

    const code = await this.generateRedemptionCode();
    const expirationDate = rawSettings.loyaltyPointsValidityDays
      ? new Date(Date.now() + rawSettings.loyaltyPointsValidityDays * 24 * 60 * 60 * 1000)
      : null;

    const result = await prisma.$transaction(async (tx) => {
      const redemption = await tx.loyaltyRedemption.create({
        data: {
          customerId,
          rewardId,
          code,
          pointsSpent: reward.pointsCost,
          expiresAt: expirationDate,
        },
        include: {
          reward: true,
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              level: true,
            },
          },
        },
      });

      await tx.loyaltyTransaction.create({
        data: {
          customerId,
          rewardId,
          redemptionId: redemption.id,
          type: LoyaltyTransactionType.REDEEM_REWARD,
          points: reward.pointsCost * -1,
          description: `Resgate da recompensa ${reward.name}`,
        },
      });

      return redemption;
    });

    return this.toRedemptionDto(result);
  }

  async getRedeemedRewards(customerId: string, page = 1, limit = 20): Promise<PaginatedResponse<RedeemedReward>> {
    await this.ensureCustomerExists(customerId);

    const [totalCount, redemptions] = await Promise.all([
      prisma.loyaltyRedemption.count({ where: { customerId } }),
      prisma.loyaltyRedemption.findMany({
        where: { customerId },
        include: { reward: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: redemptions.map((redemption) => this.toRedemptionDto(redemption)),
      totalCount,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
    };
  }

  async getAdminRewards(
    page = 1,
    limit = 20,
    filters?: { status?: string; type?: string; minLevel?: string }
  ): Promise<PaginatedResponse<LoyaltyReward>> {
    const where: Prisma.LoyaltyRewardWhereInput = {};
    if (filters?.status && filters.status !== 'all') {
      where.status = filters.status as LoyaltyRewardStatus;
    }
    if (filters?.type && filters.type !== 'all') {
      where.type = filters.type as LoyaltyRewardType;
    }
    if (filters?.minLevel && filters.minLevel !== 'all') {
      where.minLevel = filters.minLevel as CustomerLevel;
    }

    const [totalCount, rewards] = await Promise.all([
      prisma.loyaltyReward.count({ where }),
      prisma.loyaltyReward.findMany({
        where,
        orderBy: [{ status: 'asc' }, { pointsCost: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: rewards.map((reward) => this.toRewardDto(reward)),
      totalCount,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
    };
  }

  async createReward(input: LoyaltyRewardInput): Promise<LoyaltyReward> {
    if (!input.name?.trim()) {
      throw ApiError.badRequest('Nome da recompensa e obrigatorio');
    }
    if (!input.description?.trim()) {
      throw ApiError.badRequest('Descricao da recompensa e obrigatoria');
    }
    if (!input.pointsCost || input.pointsCost <= 0) {
      throw ApiError.badRequest('O custo em pontos precisa ser maior que zero');
    }

    const reward = await prisma.loyaltyReward.create({
      data: {
        name: input.name.trim(),
        description: input.description.trim(),
        type: input.type,
        pointsCost: Math.round(input.pointsCost),
        discountValue:
          input.discountValue !== null && input.discountValue !== undefined
            ? new Prisma.Decimal(input.discountValue)
            : null,
        minLevel: input.minLevel,
        status: input.status,
        usageInstructions: input.usageInstructions?.trim() || null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      },
    });

    return this.toRewardDto(reward);
  }

  async updateReward(rewardId: string, input: Partial<LoyaltyRewardInput>): Promise<LoyaltyReward> {
    const existing = await prisma.loyaltyReward.findUnique({ where: { id: rewardId } });
    if (!existing) {
      throw ApiError.notFound('Recompensa nao encontrada');
    }

    const reward = await prisma.loyaltyReward.update({
      where: { id: rewardId },
      data: {
        name: input.name?.trim(),
        description: input.description?.trim(),
        type: input.type,
        pointsCost: typeof input.pointsCost === 'number' ? Math.round(input.pointsCost) : undefined,
        discountValue:
          input.discountValue !== null && input.discountValue !== undefined
            ? new Prisma.Decimal(input.discountValue)
            : input.discountValue === null
              ? null
              : undefined,
        minLevel: input.minLevel,
        status: input.status,
        usageInstructions:
          input.usageInstructions !== undefined ? input.usageInstructions.trim() || null : undefined,
        expiresAt:
          input.expiresAt !== undefined ? (input.expiresAt ? new Date(input.expiresAt) : null) : undefined,
      },
    });

    return this.toRewardDto(reward);
  }

  async deleteReward(rewardId: string): Promise<void> {
    const existing = await prisma.loyaltyReward.findUnique({ where: { id: rewardId } });
    if (!existing) {
      throw ApiError.notFound('Recompensa nao encontrada');
    }

    await prisma.loyaltyReward.delete({ where: { id: rewardId } });
  }

  async getCustomersWithPoints(
    page = 1,
    limit = 20,
    filters?: { minPoints?: number; level?: string }
  ): Promise<
    PaginatedResponse<{
      id: string;
      name: string;
      email: string;
      phone: string;
      loyaltyPoints: number;
      totalPointsEarned: number;
      totalPointsRedeemed: number;
      level: CustomerLevel;
    }>
  > {
    await this.syncHistoricalTransactions();
    const where: Prisma.CustomerWhereInput = {};
    if (filters?.level && filters.level !== 'all') {
      where.level = filters.level as CustomerLevel;
    }

    const customers = await prisma.customer.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        level: true,
      },
    });

    const summaryMap = await this.getCustomerPointSummaryMap(customers.map((customer) => customer.id));
    const enriched = customers
      .map((customer) => {
        const summary = summaryMap.get(customer.id) ?? {
          currentPoints: 0,
          totalPointsEarned: 0,
          totalPointsRedeemed: 0,
        };

        return {
          ...customer,
          loyaltyPoints: summary.currentPoints,
          totalPointsEarned: summary.totalPointsEarned,
          totalPointsRedeemed: summary.totalPointsRedeemed,
        };
      })
      .filter((customer) => customer.loyaltyPoints > 0 || customer.totalPointsEarned > 0)
      .filter((customer) => (typeof filters?.minPoints === 'number' ? customer.loyaltyPoints >= filters.minPoints : true))
      .sort((a, b) => {
        if (b.loyaltyPoints !== a.loyaltyPoints) {
          return b.loyaltyPoints - a.loyaltyPoints;
        }
        return a.name.localeCompare(b.name);
      });

    const totalCount = enriched.length;
    const paged = enriched.slice((page - 1) * limit, page * limit);

    return {
      data: paged,
      totalCount,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
    };
  }

  async adjustPoints(data: { customerId: string; points: number; description: string; type?: 'EARN_MANUAL' | 'ADJUST_MANUAL' }) {
    await this.ensureCustomerExists(data.customerId);
    if (!data.points || Number.isNaN(data.points)) {
      throw ApiError.badRequest('Informe uma quantidade de pontos valida');
    }
    if (!data.description?.trim()) {
      throw ApiError.badRequest('Informe o motivo do ajuste');
    }

    const transaction = await prisma.loyaltyTransaction.create({
      data: {
        customerId: data.customerId,
        type:
          data.type === 'EARN_MANUAL'
            ? LoyaltyTransactionType.EARN_MANUAL
            : LoyaltyTransactionType.ADJUST_MANUAL,
        points: Math.round(data.points),
        description: data.description.trim(),
        metadata: {
          source: 'manual_adjustment',
        },
      },
    });

    return this.toTransactionDto(transaction);
  }

  async getAdminRedemptions(
    page = 1,
    limit = 20,
    status?: string
  ): Promise<PaginatedResponse<RedeemedReward>> {
    const where: Prisma.LoyaltyRedemptionWhereInput = {};
    if (status && status !== 'all') {
      where.status = status as LoyaltyRedemptionStatus;
    }

    const [totalCount, redemptions] = await Promise.all([
      prisma.loyaltyRedemption.count({ where }),
      prisma.loyaltyRedemption.findMany({
        where,
        include: {
          reward: true,
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              level: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: redemptions.map((redemption) => this.toRedemptionDto(redemption)),
      totalCount,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
    };
  }

  async markRewardAsUsed(redemptionCode: string): Promise<RedeemedReward> {
    const redemption = await prisma.loyaltyRedemption.findUnique({
      where: { code: redemptionCode },
      include: {
        reward: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            level: true,
          },
        },
      },
    });

    if (!redemption) {
      throw ApiError.notFound('Resgate nao encontrado');
    }

    if (redemption.status !== LoyaltyRedemptionStatus.AVAILABLE) {
      throw ApiError.badRequest('Este resgate nao esta disponivel para uso');
    }

    const updated = await prisma.loyaltyRedemption.update({
      where: { id: redemption.id },
      data: {
        status: LoyaltyRedemptionStatus.USED,
        usedAt: new Date(),
      },
      include: {
        reward: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            level: true,
          },
        },
      },
    });

    return this.toRedemptionDto(updated);
  }
}

export const loyaltyService = new LoyaltyService();
