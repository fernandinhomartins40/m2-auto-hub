import {
  EllonEntityType,
  EllonJobStatus,
  EllonJobType,
  Prisma,
  OrderStatus,
  ServiceOrderStatus,
} from '@prisma/client';
import { prisma } from '@config/database.js';
import { ApiError } from '@shared/utils/error.util.js';
import { ellonClient } from './ellon.client.js';
import { ellonConnectionService } from './ellon-connection.service.js';

interface EllonCustomerResponse { id?: number }
interface EllonOrderResponse { numeroPedido?: number; status?: string }

export class EllonExportService {
  async preflightServiceOrder(serviceOrderId: string) {
    const serviceOrder = await prisma.serviceOrder.findUnique({
      where: { id: serviceOrderId },
      include: { items: true, customer: { include: { addresses: { orderBy: { isDefault: 'desc' }, take: 1 } } } },
    });
    if (!serviceOrder) throw ApiError.notFound('Ordem de serviço não encontrada.');

    const localRefs = serviceOrder.items.map(item => ({
      itemId: item.id,
      type: item.type,
      localId: item.type === 'PRODUCT' ? item.productId : item.serviceId,
      name: item.name,
    }));
    const ids = localRefs.flatMap(item => item.localId ? [item.localId] : []);
    const links = await prisma.ellonEntityLink.findMany({
      where: { localId: { in: ids }, entityType: { in: [EllonEntityType.PRODUCT, EllonEntityType.SERVICE] } },
    });
    const linked = new Map(links.map(link => [`${link.entityType}:${link.localId}`, link]));
    const unmappedItems = localRefs.filter(item => {
      if (!item.localId) return true;
      const entityType = item.type === 'PRODUCT' ? EllonEntityType.PRODUCT : EllonEntityType.SERVICE;
      return !linked.has(`${entityType}:${item.localId}`);
    });

    const customerLink = serviceOrder.customerId
      ? await prisma.ellonEntityLink.findUnique({
          where: { entityType_localId: { entityType: EllonEntityType.CUSTOMER, localId: serviceOrder.customerId } },
        })
      : null;
    const config = await ellonConnectionService.getRaw();
    const missingConfig = [
      !config.enabled && 'integração habilitada',
      !config.companyCode && 'empresa',
      !config.transactionCode && 'transação',
      !config.costCenterCode && 'centro de custo',
      !config.sellerCode && 'vendedor',
      !config.warehouseCode && 'depósito',
      !config.paymentMethodCode && 'forma de pagamento',
    ].filter(Boolean) as string[];

    return {
      ready: serviceOrder.status === ServiceOrderStatus.COMPLETED
        && Boolean(serviceOrder.customerId && serviceOrder.customer)
        && unmappedItems.length === 0
        && missingConfig.length === 0,
      serviceOrderStatus: serviceOrder.status,
      hasRegisteredCustomer: Boolean(serviceOrder.customerId && serviceOrder.customer),
      customerWillBeCreated: Boolean(serviceOrder.customerId && serviceOrder.customer && !customerLink),
      unmappedItems,
      missingConfig,
    };
  }

  async enqueueServiceOrder(serviceOrderId: string, createdById?: string) {
    const check = await this.preflightServiceOrder(serviceOrderId);
    if (!check.ready) {
      throw ApiError.unprocessableEntity(`OS ainda não pode ser enviada à Ellon: ${JSON.stringify(check)}`);
    }
    return prisma.ellonJob.upsert({
      where: { idempotencyKey: `service-order:${serviceOrderId}:v1` },
      update: {},
      create: {
        type: EllonJobType.EXPORT_SERVICE_ORDER,
        idempotencyKey: `service-order:${serviceOrderId}:v1`,
        localEntityId: serviceOrderId,
        payload: { serviceOrderId },
        createdById,
      },
    });
  }

  async enqueueOrder(orderId: string, createdById?: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw ApiError.notFound('Pedido não encontrado.');
    if (order.status !== OrderStatus.CONFIRMED) throw ApiError.unprocessableEntity('Somente pedido confirmado pode ser enviado à Ellon.');
    if (!order.items.length) throw ApiError.unprocessableEntity('Pedido não possui itens.');
    const localRefs = order.items.map(item => ({
      localId: item.type === 'PRODUCT' ? item.productId : item.serviceId,
      entityType: item.type === 'PRODUCT' ? EllonEntityType.PRODUCT : EllonEntityType.SERVICE,
    }));
    if (localRefs.some(item => !item.localId)) throw ApiError.unprocessableEntity('Pedido possui item sem vínculo com o catálogo.');
    const uniqueRefs = [...new Map(localRefs.map(item => [`${item.entityType}:${item.localId}`, item])).values()];
    const links = await prisma.ellonEntityLink.findMany({
      where: { OR: uniqueRefs.map(item => ({ entityType: item.entityType, localId: item.localId as string })) },
    });
    if (links.length !== uniqueRefs.length) throw ApiError.unprocessableEntity('Pedido possui item sem mapeamento Ellon.');
    return prisma.ellonJob.upsert({
      where: { idempotencyKey: `order:${orderId}:v1` }, update: {},
      create: { type: EllonJobType.EXPORT_ORDER, idempotencyKey: `order:${orderId}:v1`, localEntityId: orderId, payload: { orderId }, createdById },
    });
  }

  private async ensureCustomer(customerId: string): Promise<string> {
    const existing = await prisma.ellonEntityLink.findUnique({
      where: { entityType_localId: { entityType: EllonEntityType.CUSTOMER, localId: customerId } },
    });
    if (existing) return existing.externalId;

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { addresses: { orderBy: { isDefault: 'desc' }, take: 1 } },
    });
    if (!customer) throw new Error('Cliente da OS não foi encontrado.');
    const address = customer.addresses[0];
    const response = await ellonClient.request<EllonCustomerResponse>('POST', '/publico/integracoes/cadastrocliente', {
      body: {
        nome: customer.name,
        fantasia: customer.name,
        cpf_cnpj: customer.cpf ?? '',
        nascimento: customer.birthDate?.toISOString().slice(0, 10) ?? '',
        email: customer.email,
        telefone: customer.phone,
        celular: customer.phone,
        endereco: address?.street ?? '',
        numero: address?.number ?? '',
        complemento: address?.complement ?? '',
        bairro: address?.neighborhood ?? '',
        cidade: address?.city ?? '',
        cep: address?.zipCode ?? '',
        status: customer.status === 'ACTIVE' ? 'A' : 'I',
      },
    });
    if (!response.id) throw new Error('Ellon não retornou o ID do cliente cadastrado.');
    await prisma.ellonEntityLink.create({
      data: { entityType: EllonEntityType.CUSTOMER, localId: customerId, externalId: String(response.id) },
    });
    return String(response.id);
  }

  async exportServiceOrder(serviceOrderId: string): Promise<EllonOrderResponse> {
    const serviceOrder = await prisma.serviceOrder.findUnique({
      where: { id: serviceOrderId },
      include: { items: true },
    });
    if (!serviceOrder || !serviceOrder.customerId) throw new Error('OS ou cliente vinculado não encontrado.');
    if (serviceOrder.status !== ServiceOrderStatus.COMPLETED) throw new Error('Somente OS concluída pode ser faturada.');

    const customerExternalId = await this.ensureCustomer(serviceOrder.customerId);
    const itemLinks = await Promise.all(serviceOrder.items.map(async item => {
      const localId = item.type === 'PRODUCT' ? item.productId : item.serviceId;
      const entityType = item.type === 'PRODUCT' ? EllonEntityType.PRODUCT : EllonEntityType.SERVICE;
      if (!localId) throw new Error(`Item "${item.name}" não está vinculado ao catálogo.`);
      const link = await prisma.ellonEntityLink.findUnique({ where: { entityType_localId: { entityType, localId } } });
      if (!link) throw new Error(`Item "${item.name}" não possui mapeamento Ellon.`);
      return { id_produto: Number(link.externalId), id_sequencia: link.externalSequence ?? 0, quantidade: item.quantity };
    }));
    if (itemLinks.some(item => !Number.isFinite(item.id_produto))) throw new Error('Há mapeamento Ellon com ID de produto inválido.');

    const config = await ellonConnectionService.getRaw();
    if (!config.paymentMethodCode) throw new Error('Forma de pagamento Ellon não configurada.');
    const response = await ellonClient.request<EllonOrderResponse>('POST', '/publico/integracoes/gerarprepedido', {
      body: {
        id_cliente: Number(customerExternalId),
        id_pedido_site: `OS-${serviceOrder.id}`,
        id_vendedor: config.sellerCode ?? undefined,
        forma_pagto: config.paymentMethodCode,
        transportadora: config.carrierCode ?? 0,
        valor_frete: 0,
        observacao: `Ordem de serviço M2 nº ${serviceOrder.number}`,
        itens: itemLinks,
      },
    });
    if (!response.numeroPedido) throw new Error('Ellon não retornou o número do pré-pedido.');
    await prisma.ellonEntityLink.upsert({
      where: { entityType_localId: { entityType: EllonEntityType.SERVICE_ORDER, localId: serviceOrder.id } },
      update: { externalId: String(response.numeroPedido), metadata: response as Prisma.InputJsonValue },
      create: {
        entityType: EllonEntityType.SERVICE_ORDER,
        localId: serviceOrder.id,
        externalId: String(response.numeroPedido),
        metadata: response as Prisma.InputJsonValue,
      },
    });
    return response;
  }

  async exportOrder(orderId: string): Promise<EllonOrderResponse> {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw new Error('Pedido não encontrado.');
    if (order.status !== OrderStatus.CONFIRMED) throw new Error('Somente pedido confirmado pode ser enviado à Ellon.');
    const customerExternalId = await this.ensureCustomer(order.customerId);
    const itemLinks = await Promise.all(order.items.map(async item => {
      const localId = item.type === 'PRODUCT' ? item.productId : item.serviceId;
      const entityType = item.type === 'PRODUCT' ? EllonEntityType.PRODUCT : EllonEntityType.SERVICE;
      if (!localId) throw new Error(`Item "${item.name}" não está vinculado ao catálogo.`);
      const link = await prisma.ellonEntityLink.findUnique({ where: { entityType_localId: { entityType, localId } } });
      if (!link) throw new Error(`Item "${item.name}" não possui mapeamento Ellon.`);
      return { id_produto: Number(link.externalId), id_sequencia: link.externalSequence, quantidade: item.quantity };
    }));
    const config = await ellonConnectionService.getRaw();
    if (!config.paymentMethodCode) throw new Error('Forma de pagamento Ellon não configurada.');
    const response = await ellonClient.request<EllonOrderResponse>('POST', '/publico/integracoes/gerarprepedido', {
      body: {
        id_cliente: Number(customerExternalId), id_pedido_site: `PED-${order.id}`,
        id_vendedor: config.sellerCode ?? undefined, forma_pagto: config.paymentMethodCode,
        transportadora: config.carrierCode ?? 0, valor_frete: 0,
        observacao: `Pedido M2 ${order.id}`, itens: itemLinks,
      },
    });
    if (!response.numeroPedido) throw new Error('Ellon não retornou o número do pré-pedido.');
    await prisma.ellonEntityLink.upsert({
      where: { entityType_localId: { entityType: EllonEntityType.ORDER, localId: order.id } },
      update: { externalId: String(response.numeroPedido), metadata: response as Prisma.InputJsonValue },
      create: { entityType: EllonEntityType.ORDER, localId: order.id, externalId: String(response.numeroPedido), metadata: response as Prisma.InputJsonValue },
    });
    return response;
  }

  async listJobs(status: EllonJobStatus | undefined, page: number, limit: number) {
    const where = status ? { status } : {};
    const [data, total] = await Promise.all([
      prisma.ellonJob.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.ellonJob.count({ where }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
}

export const ellonExportService = new EllonExportService();
