import {
  Address,
  Customer,
  EllonEntityType,
  EllonJobStatus,
  EllonJobType,
  Prisma,
  OrderStatus,
  ServiceOrderStatus,
} from '@prisma/client';
import { prisma } from '@config/database.js';
import { ApiError } from '@shared/utils/error.util.js';
import { AmbiguousEllonError, ellonClient } from './ellon.client.js';
import { ellonConnectionService } from './ellon-connection.service.js';
import { logger } from '@shared/utils/logger.util.js';
import { payloadHash } from './ellon-sync.util.js';

interface EllonCustomerResponse { id?: number }
interface EllonOrderResponse { numeroPedido?: number; status?: string }

interface LocalItem { id: string; type: string; productId: string | null; serviceId: string | null; name: string; quantity: number }

const SHORT_OBSERVATION = 250;
const hasDocument = (cpf: string | null | undefined) => [11, 14].includes((cpf ?? '').replace(/\D/g, '').length);
const money = (value: Prisma.Decimal | number) => Number(value).toFixed(2).replace('.', ',');

/** Observação do pré-pedido: contexto e valores aprovados no M2, já que a API não recebe preço. */
export function observation(parts: string[], limit = 1000): string {
  const text = parts.filter(Boolean).join(' | ');
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

/** Recusa da Ellon que indica observação longa demais (o contrato não informa o limite). */
const isSizeRejection = (error: unknown) =>
  error instanceof ApiError && !(error instanceof AmbiguousEllonError)
  && /observa|tamanho|caracter|length|long|trunc|excede|maior que|size/i.test(error.message);

/** Código Ellon da forma de pagamento do M2, pelo mapa configurado (sem diferenciar maiúsculas). */
export function paymentCode(map: Prisma.JsonValue | null, method: string): number | null {
  if (!map || typeof map !== 'object' || Array.isArray(map)) return null;
  const wanted = method.trim().toLowerCase();
  for (const [key, value] of Object.entries(map)) {
    if (key.trim().toLowerCase() === wanted && Number.isInteger(Number(value)) && Number(value) > 0) return Number(value);
  }
  return null;
}

type CustomerForExport = Pick<Customer, 'name' | 'cpf' | 'birthDate' | 'email' | 'phone' | 'status'>;
type AddressForExport = Pick<Address, 'street' | 'number' | 'complement' | 'neighborhood' | 'city' | 'state' | 'zipCode'> | undefined;

export const isSyntheticEmail = (email: string) => email.endsWith('@sync.invalid');

export function linkMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

/** Corpo de `cadastrocliente`; o hash dele detecta alterações locais ainda não enviadas. */
export function customerPayload(customer: CustomerForExport, address: AddressForExport) {
  const phone = customer.phone === 'Não informado' ? '' : customer.phone;
  return {
    nome: customer.name,
    fantasia: customer.name,
    cpf_cnpj: customer.cpf ?? '',
    nascimento: customer.birthDate?.toISOString().slice(0, 10) ?? '',
    email: isSyntheticEmail(customer.email) ? '' : customer.email,
    telefone: phone,
    celular: phone,
    endereco: address?.street ?? '',
    numero: address?.number ?? '',
    complemento: address?.complement ?? '',
    bairro: address?.neighborhood ?? '',
    cidade: address?.city ?? '',
    uf: address?.state ?? '',
    cep: address?.zipCode ?? '',
    status: customer.status === 'ACTIVE' ? 'A' : 'I',
  };
}

export class EllonExportService {
  /** Itens sem vínculo Ellon e o mapa de vínculos dos que têm. */
  private async itemLinks(items: LocalItem[]) {
    const refs = items.map(item => ({
      item,
      entityType: item.type === 'PRODUCT' ? EllonEntityType.PRODUCT : EllonEntityType.SERVICE,
      localId: item.type === 'PRODUCT' ? item.productId : item.serviceId,
    }));
    const ids = refs.flatMap(ref => ref.localId ? [ref.localId] : []);
    const links = ids.length
      ? await prisma.ellonEntityLink.findMany({ where: { localId: { in: ids }, entityType: { in: [EllonEntityType.PRODUCT, EllonEntityType.SERVICE] } } })
      : [];
    const byKey = new Map(links.map(link => [`${link.entityType}:${link.localId}`, link]));
    const linkOf = (ref: typeof refs[number]) => ref.localId ? byKey.get(`${ref.entityType}:${ref.localId}`) : undefined;
    return {
      refs,
      linkOf,
      unmapped: refs.filter(ref => !linkOf(ref)).map(ref => ({ itemId: ref.item.id, type: ref.item.type, localId: ref.localId, name: ref.item.name })),
    };
  }

  /**
   * Mão de obra precisa ir com um código Ellon de serviço (ISS/NFS-e), não de mercadoria (ICMS/NF-e).
   * O tipo vem do campo `tipo` do produto Ellon importado; os valores válidos são configurados.
   */
  private async fiscalCheck(items: LocalItem[], serviceItemTypes: string[]) {
    const issues: Array<{ itemId: string; name: string; ellonType: string | null; message: string }> = [];
    const warnings: string[] = [];
    const services = items.filter(item => item.type === 'SERVICE');
    if (!services.length) return { issues, warnings };
    if (!serviceItemTypes.length) {
      warnings.push('Tipos fiscais de serviço da Ellon não configurados: a natureza fiscal da mão de obra não foi validada.');
      return { issues, warnings };
    }
    const allowed = new Set(serviceItemTypes.map(value => value.trim().toUpperCase()));
    const { refs, linkOf } = await this.itemLinks(services);
    for (const ref of refs) {
      const link = linkOf(ref);
      if (!link) continue;
      const type = await this.ellonItemType(link.externalId, link.externalSequence);
      if (!type || !allowed.has(type.toUpperCase())) {
        issues.push({
          itemId: ref.item.id, name: ref.item.name, ellonType: type,
          message: type
            ? `Serviço "${ref.item.name}" está vinculado a um item Ellon do tipo "${type}", que não é de serviço.`
            : `Serviço "${ref.item.name}" está vinculado a um item Ellon sem tipo conhecido (sincronize os produtos).`,
        });
      }
    }
    return { issues, warnings };
  }

  async ellonItemType(externalId: string, sequence: number): Promise<string | null> {
    const productLink = await prisma.ellonEntityLink.findUnique({
      where: { entityType_externalId_externalSequence: { entityType: EllonEntityType.PRODUCT, externalId, externalSequence: sequence } },
    });
    if (!productLink) return null;
    const product = await prisma.product.findUnique({ where: { id: productLink.localId }, select: { specifications: true } });
    const type = linkMetadata(product?.specifications).type;
    return typeof type === 'string' && type.trim() ? type.trim() : null;
  }

  /** Como o cliente será identificado na Ellon. */
  private async customerCheck(customerId: string | null, defaultCustomerCode: number | null) {
    if (customerId) {
      const [link, customer] = await Promise.all([
        prisma.ellonEntityLink.findUnique({ where: { entityType_localId: { entityType: EllonEntityType.CUSTOMER, localId: customerId } } }),
        prisma.customer.findUnique({ where: { id: customerId }, select: { cpf: true } }),
      ]);
      if (link) return { mode: 'linked' as const, problem: null };
      if (customer && hasDocument(customer.cpf)) return { mode: 'export' as const, problem: null };
      if (defaultCustomerCode) return { mode: 'default' as const, problem: null };
      return { mode: 'missing' as const, problem: 'Cliente sem CPF/CNPJ: informe o documento ou configure o cliente consumidor final.' };
    }
    if (defaultCustomerCode) return { mode: 'default' as const, problem: null };
    return { mode: 'missing' as const, problem: 'OS sem cliente cadastrado: cadastre o cliente ou configure o cliente consumidor final.' };
  }

  private async resolveCustomer(customerId: string | null, defaultCustomerCode: number | null) {
    const check = await this.customerCheck(customerId, defaultCustomerCode);
    if (check.mode === 'missing') throw new Error(check.problem ?? 'Cliente não identificado.');
    if (check.mode === 'default') return { externalId: String(defaultCustomerCode), usedDefault: true };
    return { externalId: await this.ensureCustomer(customerId as string), usedDefault: false };
  }

  async preflightServiceOrder(serviceOrderId: string) {
    const serviceOrder = await prisma.serviceOrder.findUnique({ where: { id: serviceOrderId }, include: { items: true } });
    if (!serviceOrder) throw ApiError.notFound('Ordem de serviço não encontrada.');

    const config = await ellonConnectionService.getRaw();
    const [{ unmapped }, fiscal, customer] = await Promise.all([
      this.itemLinks(serviceOrder.items),
      this.fiscalCheck(serviceOrder.items, config.serviceItemTypes),
      this.customerCheck(serviceOrder.customerId, config.defaultCustomerCode),
    ]);
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
        && customer.mode !== 'missing'
        && unmapped.length === 0
        && fiscal.issues.length === 0
        && missingConfig.length === 0,
      serviceOrderStatus: serviceOrder.status,
      hasRegisteredCustomer: Boolean(serviceOrder.customerId),
      customerWillBeCreated: customer.mode === 'export',
      customerMode: customer.mode,
      customerProblem: customer.problem,
      unmappedItems: unmapped,
      fiscalIssues: fiscal.issues,
      warnings: fiscal.warnings,
      missingConfig,
    };
  }

  async enqueueServiceOrder(serviceOrderId: string, createdById?: string) {
    const check = await this.preflightServiceOrder(serviceOrderId);
    if (!check.ready) {
      const reasons = [
        ...check.missingConfig.map(item => `configuração: ${item}`),
        ...check.unmappedItems.map(item => `sem vínculo Ellon: ${item.name}`),
        ...check.fiscalIssues.map(item => item.message),
        ...(check.customerProblem ? [check.customerProblem] : []),
        ...(check.serviceOrderStatus !== ServiceOrderStatus.COMPLETED ? ['a OS precisa estar concluída'] : []),
      ];
      throw ApiError.unprocessableEntity(`OS ainda não pode ser enviada à Ellon: ${reasons.join('; ')}.`);
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
    const config = await ellonConnectionService.getRaw();
    if (!config.exportOrderSources.includes(order.source)) {
      throw ApiError.unprocessableEntity(`Pedidos de origem ${order.source} não são enviados à Ellon (configuração).`);
    }
    const { unmapped } = await this.itemLinks(order.items);
    if (unmapped.length) throw ApiError.unprocessableEntity(`Pedido possui item sem mapeamento Ellon: ${unmapped.map(item => item.name).join(', ')}.`);
    const customer = await this.customerCheck(order.customerId, config.defaultCustomerCode);
    if (customer.problem) throw ApiError.unprocessableEntity(customer.problem);
    return prisma.ellonJob.upsert({
      where: { idempotencyKey: `order:${orderId}:v1` }, update: {},
      create: { type: EllonJobType.EXPORT_ORDER, idempotencyKey: `order:${orderId}:v1`, localEntityId: orderId, payload: { orderId }, createdById },
    });
  }

  async exportCustomer(customerId: string): Promise<{ externalId: string; skipped: boolean }> {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { addresses: { orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }], take: 1 } },
    });
    if (!customer) throw new Error('Cliente não encontrado.');
    const link = await prisma.ellonEntityLink.findUnique({
      where: { entityType_localId: { entityType: EllonEntityType.CUSTOMER, localId: customerId } },
    });
    const payload = customerPayload(customer, customer.addresses[0]);
    const hash = payloadHash(payload);
    const metadata = linkMetadata(link?.metadata);
    if (link && metadata.exportHash === hash) return { externalId: link.externalId, skipped: true };
    if (link) {
      const connection = await prisma.ellonConnection.findUnique({ where: { id: 'default' }, select: { customerUpdatesEnabled: true } });
      // Desligado ao detectar que a atualização duplica cadastros na Ellon.
      if (connection && !connection.customerUpdatesEnabled) return { externalId: link.externalId, skipped: true };
    }

    // O contrato não documenta a chave do upsert; enviamos o ID Ellon conhecido para atualização.
    const response = await ellonClient.request<EllonCustomerResponse>('POST', '/publico/integracoes/cadastrocliente', {
      // UF vai nas duas grafias usuais; a Ellon ignora a que não usa.
      body: link ? await this.updateBody(link.externalId, payload) : { ...payload, estado: payload.uf },
    });
    const returnedId = response.id ? String(response.id) : null;
    const exported = { exportHash: hash, exportedAt: new Date().toISOString() };

    if (link) {
      await prisma.ellonEntityLink.update({
        where: { id: link.id },
        data: {
          metadata: {
            ...metadata,
            ...exported,
            conflictExternalId: returnedId && returnedId !== link.externalId ? returnedId : null,
          },
        },
      });
      return { externalId: link.externalId, skipped: false };
    }

    if (!returnedId) throw new Error('Ellon não retornou o ID do cliente cadastrado.');
    const owner = await prisma.ellonEntityLink.findUnique({
      where: { entityType_externalId_externalSequence: { entityType: EllonEntityType.CUSTOMER, externalId: returnedId, externalSequence: 0 } },
    });
    if (owner && owner.localId !== customerId) {
      throw new Error(`Ellon associou o cliente ao cadastro ${returnedId}, já vinculado a outro cliente local (${owner.localId}). Concilie os cadastros duplicados.`);
    }
    await prisma.ellonEntityLink.create({
      data: { entityType: EllonEntityType.CUSTOMER, localId: customerId, externalId: returnedId, metadata: { createdBy: 'm2', ...exported } },
    });
    return { externalId: returnedId, skipped: false };
  }

  /**
   * Atualização parte do cadastro atual da Ellon (último espelho) e sobrepõe só o que o M2
   * tem preenchido, para não apagar RG/IE, telefone fixo ou endereço que o M2 não conhece.
   */
  private async updateBody(externalId: string, payload: ReturnType<typeof customerPayload>) {
    const snapshot = await prisma.ellonSnapshot.findUnique({ where: { type_externalId: { type: 'CUSTOMER', externalId } } });
    const base = linkMetadata(snapshot?.payload);
    const filled = Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== ''));
    const keep = (key: string, fallback: string) => (typeof base[key] === 'string' && (base[key] as string).trim()) || fallback;
    return {
      ...base,
      ...filled,
      ...(payload.uf && { estado: payload.uf }),
      fantasia: keep('fantasia', payload.fantasia),
      telefone: keep('telefone', payload.telefone),
      id: Number(externalId),
      id_cliente: Number(externalId),
    };
  }

  /** Garante o cliente na Ellon antes de um pré-pedido, enviando também dados alterados localmente. */
  private async ensureCustomer(customerId: string): Promise<string> {
    const existing = await prisma.ellonEntityLink.findUnique({
      where: { entityType_localId: { entityType: EllonEntityType.CUSTOMER, localId: customerId } },
    });
    if (!existing) return (await this.exportCustomer(customerId)).externalId;
    try {
      await this.exportCustomer(customerId);
    } catch (error) {
      logger.warn('[Ellon] atualização do cliente antes do pré-pedido falhou; usando cadastro já vinculado', { customerId, error: String(error) });
    }
    return existing.externalId;
  }

  async enqueueCustomer(customerId: string, hash: string) {
    const idempotencyKey = `customer:${customerId}:${hash.slice(0, 24)}`;
    return prisma.ellonJob.upsert({
      where: { idempotencyKey },
      update: {},
      create: { type: EllonJobType.EXPORT_CUSTOMER, idempotencyKey, localEntityId: customerId, payload: { customerId, hash } },
    });
  }

  /**
   * Detecta clientes criados ou alterados no M2 (inclusive endereços) e enfileira o envio.
   * Só clientes já vinculados ou com CPF/CNPJ e e-mail real vão automaticamente: a Ellon
   * exige documento fiscal e sem ele o cadastro duplicaria a cada tentativa.
   */
  async scanCustomerChanges(): Promise<number> {
    const connection = await prisma.ellonConnection.findUnique({ where: { id: 'default' } });
    // Antes da primeira importação completa, clientes que já existem na Ellon ainda não estão
    // vinculados por e-mail/CPF e seriam duplicados lá.
    if (!connection?.lastCustomerSyncAt) return 0;
    const since = connection.lastCustomerExportScanAt ?? new Date(0);
    const scanStartedAt = new Date();
    const batch = 500;
    const [customers, addresses] = await Promise.all([
      prisma.customer.findMany({ where: { updatedAt: { gt: since } }, select: { id: true, updatedAt: true }, orderBy: { updatedAt: 'asc' }, take: batch }),
      prisma.address.findMany({ where: { updatedAt: { gt: since } }, select: { customerId: true, updatedAt: true }, orderBy: { updatedAt: 'asc' }, take: batch }),
    ]);
    const ids = [...new Set([...customers.map(item => item.id), ...addresses.map(item => item.customerId)])];
    let enqueued = 0;
    for (const id of ids) {
      const customer = await prisma.customer.findUnique({
        where: { id },
        include: { addresses: { orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }], take: 1 } },
      });
      if (!customer) continue;
      const link = await prisma.ellonEntityLink.findUnique({
        where: { entityType_localId: { entityType: EllonEntityType.CUSTOMER, localId: id } },
      });
      // Vínculo antigo sem base de comparação: aguarda a próxima importação registrar o estado da Ellon.
      if (link && !linkMetadata(link.metadata).exportHash) continue;
      const eligible = link || ([11, 14].includes((customer.cpf ?? '').replace(/\D/g, '').length) && !isSyntheticEmail(customer.email));
      if (!eligible) continue;
      const hash = payloadHash(customerPayload(customer, customer.addresses[0]));
      if (linkMetadata(link?.metadata).exportHash === hash) continue;
      await this.enqueueCustomer(id, hash);
      enqueued += 1;
    }
    const cursors = [
      customers.length === batch ? customers[customers.length - 1].updatedAt : null,
      addresses.length === batch ? addresses[addresses.length - 1].updatedAt : null,
    ].filter((value): value is Date => Boolean(value));
    const next = cursors.length ? new Date(Math.min(...cursors.map(value => value.getTime()))) : scanStartedAt;
    await prisma.ellonConnection.update({ where: { id: 'default' }, data: { lastCustomerExportScanAt: next } });
    return enqueued;
  }

  /** Itens do pré-pedido. A API não aceita preço: valores seguem na observação para conferência. */
  private async preOrderItems(items: LocalItem[]) {
    const { refs, linkOf } = await this.itemLinks(items);
    return refs.map(ref => {
      if (!ref.localId) throw new Error(`Item "${ref.item.name}" não está vinculado ao catálogo.`);
      const link = linkOf(ref);
      if (!link) throw new Error(`Item "${ref.item.name}" não possui mapeamento Ellon.`);
      const id = Number(link.externalId);
      if (!Number.isFinite(id)) throw new Error(`Mapeamento Ellon inválido para "${ref.item.name}".`);
      return { id_produto: id, id_sequencia: link.externalSequence ?? 0, quantidade: ref.item.quantity };
    });
  }

  /**
   * Guarda a quantidade Ellon de cada produto no momento do envio. Comparando com a próxima
   * sincronização, o M2 mede se a Ellon baixa estoque já no pré-pedido (ver EllonContractService).
   */
  private async stockAtExport(items: LocalItem[]) {
    const ids = items.flatMap(item => item.type === 'PRODUCT' && item.productId ? [item.productId] : []);
    if (!ids.length) return {};
    const products = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, specifications: true } });
    return Object.fromEntries(products.flatMap(product => {
      const ellonStock = linkMetadata(product.specifications).ellonStock;
      const quantity = items.filter(item => item.productId === product.id).reduce((total, item) => total + item.quantity, 0);
      return typeof ellonStock === 'number' ? [[product.id, { ellonStock, quantity }]] : [];
    }));
  }

  /** Envia o pré-pedido; se a Ellon recusar a observação por tamanho, reenvia uma vez com texto curto. */
  private async sendPreOrder(body: Record<string, unknown>, parts: string[], limit: number): Promise<EllonOrderResponse> {
    const send = (size: number) => ellonClient.request<EllonOrderResponse>('POST', '/publico/integracoes/gerarprepedido', {
      body: { ...body, observacao: observation(parts, size) },
    });
    try {
      return await send(limit);
    } catch (error) {
      if (limit <= SHORT_OBSERVATION || !isSizeRejection(error)) throw error;
      // Recusa explícita (não ambígua): nada foi criado, o reenvio é seguro.
      const response = await send(SHORT_OBSERVATION);
      await prisma.ellonConnection.update({ where: { id: 'default' }, data: { observationLimit: SHORT_OBSERVATION } });
      logger.warn('[Ellon] observação reduzida após recusa por tamanho', { limit: SHORT_OBSERVATION });
      return response;
    }
  }

  private async saveExportLink(entityType: EllonEntityType, localId: string, response: EllonOrderResponse, m2Total: number, items: LocalItem[]) {
    const metadata = { ...response, m2Total, exportedAt: new Date().toISOString(), stockAtExport: await this.stockAtExport(items) } as Prisma.InputJsonValue;
    await prisma.ellonEntityLink.upsert({
      where: { entityType_localId: { entityType, localId } },
      update: { externalId: String(response.numeroPedido), metadata },
      create: { entityType, localId, externalId: String(response.numeroPedido), metadata },
    });
  }

  async exportServiceOrder(serviceOrderId: string): Promise<EllonOrderResponse> {
    const serviceOrder = await prisma.serviceOrder.findUnique({ where: { id: serviceOrderId }, include: { items: true } });
    if (!serviceOrder) throw new Error('OS não encontrada.');
    if (serviceOrder.status !== ServiceOrderStatus.COMPLETED) throw new Error('Somente OS concluída pode ser faturada.');

    const config = await ellonConnectionService.getRaw();
    if (!config.paymentMethodCode) throw new Error('Forma de pagamento Ellon não configurada.');
    const fiscal = await this.fiscalCheck(serviceOrder.items, config.serviceItemTypes);
    if (fiscal.issues.length) throw new Error(fiscal.issues.map(item => item.message).join(' '));
    const itens = await this.preOrderItems(serviceOrder.items);
    const customer = await this.resolveCustomer(serviceOrder.customerId, config.defaultCustomerCode);

    const response = await this.sendPreOrder({
      id_cliente: Number(customer.externalId),
      id_pedido_site: `OS-${serviceOrder.id}`,
      id_vendedor: config.sellerCode ?? undefined,
      forma_pagto: config.paymentMethodCode,
      transportadora: config.carrierCode ?? 0,
      valor_frete: 0,
      itens,
    }, [
      `OS M2 nº ${serviceOrder.number}`,
      customer.usedDefault ? `Cliente: ${serviceOrder.customerName}${serviceOrder.customerPhone ? ` ${serviceOrder.customerPhone}` : ''}` : '',
      serviceOrder.vehicleLabel || serviceOrder.vehiclePlate ? `Veículo: ${[serviceOrder.vehicleLabel, serviceOrder.vehiclePlate].filter(Boolean).join(' ')}` : '',
      serviceOrder.mileage ? `Km: ${serviceOrder.mileage}` : '',
      serviceOrder.mechanicName ? `Mecânico: ${serviceOrder.mechanicName}` : '',
      serviceOrder.revisionId ? 'Origem: revisão M2' : '',
      `Itens: ${serviceOrder.items.map(item => `${item.quantity}x ${item.name} R$ ${money(item.unitPrice)}`).join('; ')}`,
      `Mão de obra R$ ${money(serviceOrder.laborTotal)}`,
      `Peças R$ ${money(serviceOrder.partsTotal)}`,
      Number(serviceOrder.discount) > 0 ? `Desconto R$ ${money(serviceOrder.discount)}` : '',
      `Total aprovado R$ ${money(serviceOrder.total)}`,
    ], config.observationLimit);
    if (!response.numeroPedido) throw new Error('Ellon não retornou o número do pré-pedido.');
    await this.saveExportLink(EllonEntityType.SERVICE_ORDER, serviceOrder.id, response, Number(serviceOrder.total), serviceOrder.items);
    return response;
  }

  async exportOrder(orderId: string): Promise<EllonOrderResponse> {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw new Error('Pedido não encontrado.');
    if (order.status !== OrderStatus.CONFIRMED) throw new Error('Somente pedido confirmado pode ser enviado à Ellon.');
    const config = await ellonConnectionService.getRaw();
    if (!config.exportOrderSources.includes(order.source)) throw new Error(`Pedidos de origem ${order.source} não são enviados à Ellon.`);
    const formaPagto = paymentCode(config.paymentMethodMap, order.paymentMethod) ?? config.paymentMethodCode;
    if (!formaPagto) throw new Error('Forma de pagamento Ellon não configurada.');
    const itens = await this.preOrderItems(order.items);
    const customer = await this.resolveCustomer(order.customerId, config.defaultCustomerCode);
    const localCustomer = customer.usedDefault
      ? await prisma.customer.findUnique({ where: { id: order.customerId }, select: { name: true, phone: true } })
      : null;

    const response = await this.sendPreOrder({
      id_cliente: Number(customer.externalId), id_pedido_site: `PED-${order.id}`,
      id_vendedor: config.sellerCode ?? undefined, forma_pagto: formaPagto,
      transportadora: config.carrierCode ?? 0, valor_frete: 0,
      itens,
    }, [
      `Pedido M2 ${order.id.slice(0, 8)} (${order.source})`,
      order.externalOrderId ? `Pedido externo ${order.externalOrderId}` : '',
      localCustomer ? `Cliente: ${localCustomer.name} ${localCustomer.phone}` : '',
      `Pagamento: ${order.paymentMethod}`,
      `Itens: ${order.items.map(item => `${item.quantity}x ${item.name} R$ ${money(item.quotedPrice ?? item.price)}`).join('; ')}`,
      Number(order.discountAmount) > 0 ? `Desconto R$ ${money(order.discountAmount)}` : '',
      order.couponCode ? `Cupom ${order.couponCode}` : '',
      `Total aprovado R$ ${money(order.total)}`,
    ], config.observationLimit);
    if (!response.numeroPedido) throw new Error('Ellon não retornou o número do pré-pedido.');
    await this.saveExportLink(EllonEntityType.ORDER, order.id, response, Number(order.total), order.items);
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
