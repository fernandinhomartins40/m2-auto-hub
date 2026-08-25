import { Prisma, ServiceOrder, ServiceOrderStatus } from '@prisma/client';
import { prisma } from '@config/database.js';
import { ApiError } from '@shared/utils/error.util.js';
import { PaginationUtil, PaginatedResponse } from '@shared/utils/pagination.util.js';
import { logger } from '@shared/utils/logger.util.js';
import {
  CreateServiceOrderDto,
  UpdateServiceOrderDto,
  QueryServiceOrdersDto,
  ServiceOrderItemInput,
} from './dto/service-order.dto.js';

const itemsInclude = {
  items: { orderBy: { createdAt: 'asc' } },
  assignedMechanic: { select: { id: true, name: true } },
  customer: { select: { id: true, name: true, phone: true } },
  vehicle: { select: { id: true, brand: true, model: true, year: true, plate: true } },
} satisfies Prisma.ServiceOrderInclude;

export class ServiceOrdersService {
  /** Calcula os totais a partir dos itens. */
  private computeTotals(items: ServiceOrderItemInput[], discount = 0) {
    let laborTotal = 0;
    let partsTotal = 0;
    for (const item of items) {
      const subtotal = item.unitPrice * item.quantity;
      if (item.type === 'SERVICE') laborTotal += subtotal;
      else partsTotal += subtotal;
    }
    const total = Math.max(0, laborTotal + partsTotal - discount);
    return { laborTotal, partsTotal, total };
  }

  private mapItemsToCreate(items: ServiceOrderItemInput[]): Prisma.ServiceOrderItemCreateWithoutServiceOrderInput[] {
    return items.map(item => ({
      type: item.type,
      productId: item.type === 'PRODUCT' ? item.productId ?? null : null,
      serviceId: item.type === 'SERVICE' ? item.serviceId ?? null : null,
      name: item.name,
      unitPrice: new Prisma.Decimal(item.unitPrice),
      quantity: item.quantity,
      subtotal: new Prisma.Decimal(item.unitPrice * item.quantity),
      revisionCheckId: item.revisionCheckId ?? null,
    }));
  }

  /** Resolve os campos de cache de cliente/veiculo a partir do cadastro (se houver). */
  private async resolveCache(dto: {
    customerId?: string | null;
    vehicleId?: string | null;
    customerName?: string;
    customerPhone?: string | null;
    vehicleLabel?: string | null;
    vehiclePlate?: string | null;
  }) {
    let customerName = dto.customerName;
    let customerPhone = dto.customerPhone ?? null;
    let vehicleLabel = dto.vehicleLabel ?? null;
    let vehiclePlate = dto.vehiclePlate ?? null;

    if (dto.customerId) {
      const customer = await prisma.customer.findUnique({ where: { id: dto.customerId } });
      if (!customer) throw ApiError.badRequest('Cliente selecionado não encontrado.');
      customerName = customerName || customer.name;
      customerPhone = customerPhone || customer.phone;
    }

    if (dto.vehicleId) {
      const vehicle = await prisma.customerVehicle.findUnique({ where: { id: dto.vehicleId } });
      if (!vehicle) throw ApiError.badRequest('Veículo selecionado não encontrado.');
      vehicleLabel = vehicleLabel || `${vehicle.brand} ${vehicle.model} ${vehicle.year} - ${vehicle.plate}`;
      vehiclePlate = vehiclePlate || vehicle.plate;
    }

    return { customerName, customerPhone, vehicleLabel, vehiclePlate };
  }

  private async resolveMechanicName(mechanicId?: string | null): Promise<string | null> {
    if (!mechanicId) return null;
    const mechanic = await prisma.admin.findUnique({ where: { id: mechanicId } });
    if (!mechanic) throw ApiError.badRequest('Mecânico não encontrado.');
    return mechanic.name;
  }

  async create(dto: CreateServiceOrderDto): Promise<ServiceOrder> {
    // Uma revisao origina uma unica OS. Em uma repeticao de requisicao (por
    // queda de rede entre criar a OS e concluir a revisao), devolve a mesma OS
    // em vez de duplicar o orcamento.
    if (dto.revisionId) {
      const existingFromRevision = await prisma.serviceOrder.findFirst({
        where: { revisionId: dto.revisionId },
        include: itemsInclude,
      });
      if (existingFromRevision) return existingFromRevision;
    }

    const cache = await this.resolveCache(dto);
    if (!cache.customerName) {
      throw ApiError.badRequest('Informe o cliente (cadastrado ou nome avulso).');
    }

    const discount = dto.discount ?? 0;
    const totals = this.computeTotals(dto.items, discount);
    const mechanicName = await this.resolveMechanicName(dto.assignedMechanicId);

    const created = await prisma.serviceOrder.create({
      data: {
        customerId: dto.customerId ?? null,
        vehicleId: dto.vehicleId ?? null,
        customerName: cache.customerName,
        customerPhone: cache.customerPhone,
        vehicleLabel: cache.vehicleLabel,
        vehiclePlate: cache.vehiclePlate,
        mileage: dto.mileage ?? null,
        description: dto.description ?? null,
        internalNotes: dto.internalNotes ?? null,
        assignedMechanicId: dto.assignedMechanicId ?? null,
        mechanicName,
        assignedAt: dto.assignedMechanicId ? new Date() : null,
        discount: new Prisma.Decimal(discount),
        laborTotal: new Prisma.Decimal(totals.laborTotal),
        partsTotal: new Prisma.Decimal(totals.partsTotal),
        total: new Prisma.Decimal(totals.total),
        revisionId: dto.revisionId ?? null,
        items: { create: this.mapItemsToCreate(dto.items) },
      },
      include: itemsInclude,
    });

    logger.info(`ServiceOrder created: #${created.number} (ID: ${created.id})`);
    return created;
  }

  async findAll(query: QueryServiceOrdersDto): Promise<PaginatedResponse<ServiceOrder>> {
    const { page, limit } = PaginationUtil.validateParams(query);
    const skip = PaginationUtil.calculateSkip(page, limit);

    const where: Prisma.ServiceOrderWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.mechanicId) where.assignedMechanicId = query.mechanicId;
    if (query.vehicleId) where.vehicleId = query.vehicleId;
    if (query.search) {
      const search = query.search;
      const asNumber = Number(search.replace(/\D/g, ''));
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { vehiclePlate: { contains: search, mode: 'insensitive' } },
        { vehicleLabel: { contains: search, mode: 'insensitive' } },
        ...(Number.isFinite(asNumber) && asNumber > 0 ? [{ number: asNumber }] : []),
      ];
    }

    const [data, totalCount] = await Promise.all([
      prisma.serviceOrder.findMany({ where, include: itemsInclude, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.serviceOrder.count({ where }),
    ]);

    return PaginationUtil.buildResponse(data, page, limit, totalCount);
  }

  async findById(id: string): Promise<ServiceOrder> {
    const order = await prisma.serviceOrder.findUnique({ where: { id }, include: itemsInclude });
    if (!order) throw ApiError.notFound('Ordem de serviço não encontrada.');
    return order;
  }

  async update(id: string, dto: UpdateServiceOrderDto): Promise<ServiceOrder> {
    const existing = await prisma.serviceOrder.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Ordem de serviço não encontrada.');
    if (existing.status === ServiceOrderStatus.COMPLETED || existing.status === ServiceOrderStatus.CANCELLED) {
      throw ApiError.badRequest('Não é possível editar uma OS concluída ou cancelada.');
    }

    const cache = await this.resolveCache({
      customerId: dto.customerId ?? existing.customerId,
      vehicleId: dto.vehicleId ?? existing.vehicleId,
      customerName: dto.customerName ?? existing.customerName,
      customerPhone: dto.customerPhone ?? existing.customerPhone,
      vehicleLabel: dto.vehicleLabel ?? existing.vehicleLabel,
      vehiclePlate: dto.vehiclePlate ?? existing.vehiclePlate,
    });

    const discount = dto.discount ?? Number(existing.discount);
    const mechanicName =
      dto.assignedMechanicId !== undefined
        ? await this.resolveMechanicName(dto.assignedMechanicId)
        : existing.mechanicName;

    const data: Prisma.ServiceOrderUpdateInput = {
      customerName: cache.customerName,
      customerPhone: cache.customerPhone,
      vehicleLabel: cache.vehicleLabel,
      vehiclePlate: cache.vehiclePlate,
      ...(dto.customerId !== undefined && { customer: dto.customerId ? { connect: { id: dto.customerId } } : { disconnect: true } }),
      ...(dto.vehicleId !== undefined && { vehicle: dto.vehicleId ? { connect: { id: dto.vehicleId } } : { disconnect: true } }),
      ...(dto.mileage !== undefined && { mileage: dto.mileage }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.internalNotes !== undefined && { internalNotes: dto.internalNotes }),
      ...(dto.assignedMechanicId !== undefined && {
        assignedMechanic: dto.assignedMechanicId ? { connect: { id: dto.assignedMechanicId } } : { disconnect: true },
        mechanicName,
        assignedAt: dto.assignedMechanicId ? existing.assignedAt ?? new Date() : null,
      }),
      discount: new Prisma.Decimal(discount),
    };

    // Se os itens vierem, substitui todos e recalcula
    if (dto.items) {
      const totals = this.computeTotals(dto.items, discount);
      data.laborTotal = new Prisma.Decimal(totals.laborTotal);
      data.partsTotal = new Prisma.Decimal(totals.partsTotal);
      data.total = new Prisma.Decimal(totals.total);
      data.items = { deleteMany: {}, create: this.mapItemsToCreate(dto.items) };
    } else {
      // recalcula total apenas com novo desconto sobre itens existentes
      data.total = new Prisma.Decimal(
        Math.max(0, Number(existing.laborTotal) + Number(existing.partsTotal) - discount)
      );
    }

    const updated = await prisma.serviceOrder.update({ where: { id }, data, include: itemsInclude });
    return updated;
  }

  async start(id: string): Promise<ServiceOrder> {
    const order = await this.findById(id);
    if (order.status !== ServiceOrderStatus.OPEN) {
      throw ApiError.badRequest('Só é possível iniciar uma OS aberta.');
    }
    return prisma.serviceOrder.update({
      where: { id },
      data: { status: ServiceOrderStatus.IN_PROGRESS },
      include: itemsInclude,
    });
  }

  /** Conclui a OS e dá baixa de estoque dos produtos usados (idempotente e transacional). */
  async complete(id: string): Promise<ServiceOrder> {
    const order = await prisma.serviceOrder.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw ApiError.notFound('Ordem de serviço não encontrada.');
    if (order.status === ServiceOrderStatus.CANCELLED) {
      throw ApiError.badRequest('OS cancelada não pode ser concluída.');
    }
    if (order.status === ServiceOrderStatus.COMPLETED) {
      return this.findById(id);
    }

    const productItems = order.items.filter(i => i.type === 'PRODUCT' && i.productId);

    return prisma.$transaction(async tx => {
      if (!order.stockApplied && productItems.length > 0) {
        // Valida estoque suficiente antes de baixar
        for (const item of productItems) {
          const product = await tx.product.findUnique({ where: { id: item.productId as string } });
          if (!product) continue;
          if (product.stock < item.quantity) {
            throw ApiError.badRequest(
              `Estoque insuficiente para "${product.name}" (disponível: ${product.stock}, necessário: ${item.quantity}).`
            );
          }
        }
        // Baixa
        for (const item of productItems) {
          await tx.product.update({
            where: { id: item.productId as string },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }

      const completed = await tx.serviceOrder.update({
        where: { id },
        data: {
          status: ServiceOrderStatus.COMPLETED,
          completedAt: new Date(),
          stockApplied: true,
        },
        include: itemsInclude,
      });

      logger.info(`ServiceOrder completed: #${completed.number}`);
      return completed;
    });
  }

  /** Cancela a OS; se estava concluída com baixa aplicada, estorna o estoque. */
  async cancel(id: string): Promise<ServiceOrder> {
    const order = await prisma.serviceOrder.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw ApiError.notFound('Ordem de serviço não encontrada.');
    if (order.status === ServiceOrderStatus.CANCELLED) {
      return this.findById(id);
    }

    const productItems = order.items.filter(i => i.type === 'PRODUCT' && i.productId);

    return prisma.$transaction(async tx => {
      if (order.stockApplied && productItems.length > 0) {
        for (const item of productItems) {
          await tx.product.update({
            where: { id: item.productId as string },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
      return tx.serviceOrder.update({
        where: { id },
        data: {
          status: ServiceOrderStatus.CANCELLED,
          cancelledAt: new Date(),
          stockApplied: false,
        },
        include: itemsInclude,
      });
    });
  }

  async assignMechanic(id: string, mechanicId: string): Promise<ServiceOrder> {
    const mechanicName = await this.resolveMechanicName(mechanicId);
    return prisma.serviceOrder.update({
      where: { id },
      data: { assignedMechanicId: mechanicId, mechanicName, assignedAt: new Date() },
      include: itemsInclude,
    });
  }

  async unassignMechanic(id: string): Promise<ServiceOrder> {
    return prisma.serviceOrder.update({
      where: { id },
      data: { assignedMechanicId: null, mechanicName: null, assignedAt: null },
      include: itemsInclude,
    });
  }

  async remove(id: string): Promise<void> {
    const order = await prisma.serviceOrder.findUnique({ where: { id } });
    if (!order) throw ApiError.notFound('Ordem de serviço não encontrada.');
    await prisma.serviceOrder.delete({ where: { id } });
  }

  async statistics(mechanicId?: string) {
    const where: Prisma.ServiceOrderWhereInput = mechanicId ? { assignedMechanicId: mechanicId } : {};
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [open, inProgress, completedToday, total] = await Promise.all([
      prisma.serviceOrder.count({ where: { ...where, status: ServiceOrderStatus.OPEN } }),
      prisma.serviceOrder.count({ where: { ...where, status: ServiceOrderStatus.IN_PROGRESS } }),
      prisma.serviceOrder.count({
        where: { ...where, status: ServiceOrderStatus.COMPLETED, completedAt: { gte: startOfDay } },
      }),
      prisma.serviceOrder.count({ where }),
    ]);

    return { open, inProgress, completedToday, total };
  }
}

export const serviceOrdersService = new ServiceOrdersService();
