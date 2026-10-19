import { Customer, EllonEntityType, EllonJobStatus, EllonJobType, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { prisma } from '@config/database.js';
import { logger } from '@shared/utils/logger.util.js';
import { EllonResponseError, ellonClient, isEmptyResult } from './ellon.client.js';
import { ellonCancellationService } from './ellon-cancellation.service.js';
import { customerPayload, isSyntheticEmail, linkMetadata } from './ellon-export.service.js';
import {
  DAY_MS, Raw, decimal, digits, errorMessage, localDate, parseDate, payloadHash, pick, rows, state as stateCode, text, withoutXml,
} from './ellon-sync.util.js';

interface MasterSyncResult {
  received: number;
  stored: number;
  linked: number;
  created: number;
  updated: number;
  addresses: number;
  reconciled: number;
  cancelled: number;
  invoices: number;
  divergences: number;
  preOrders: number;
  sales: number;
  errors: string[];
}

/** Estado persistido no payload do job para retomar após falha sem recomeçar do zero. */
export interface PagedProgress {
  nextPage: number;
  fingerprints: string[];
  windowStart?: string;
  windowEnd?: string;
  runStartedAt: string;
  result: MasterSyncResult;
}

type Checkpoint = (progress: PagedProgress) => Promise<void>;

const emptyResult = (): MasterSyncResult => ({
  received: 0, stored: 0, linked: 0, created: 0, updated: 0, addresses: 0, reconciled: 0, cancelled: 0, invoices: 0, divergences: 0, preOrders: 0, sales: 0, errors: [],
});
const pushError = (result: MasterSyncResult, message: string) => { if (result.errors.length < 100) result.errors.push(message); };

const HISTORY_DAYS = Math.max(30, Number(process.env.ELLON_HISTORY_DAYS) || 730);
const ORDER_OVERLAP_DAYS = 3;
const WINDOW_DAYS = 31;
const SITE_ID = /^(PED|OS)-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/** Diferença acima de R$ 0,05 entre o total aprovado no M2 e o total do pré-pedido na Ellon. */
export function divergenceOf(m2Total: unknown, ellonTotal: string) {
  const expected = typeof m2Total === 'number' ? m2Total : NaN;
  const actual = ellonTotal ? decimal(ellonTotal) : NaN;
  if (!Number.isFinite(expected) || !Number.isFinite(actual) || actual <= 0) return null;
  const difference = Math.round((actual - expected) * 100) / 100;
  return Math.abs(difference) > 0.05 ? { m2Total: expected, ellonTotal: actual, difference } : null;
}

export type PreOrderState = 'OPEN' | 'INVOICED' | 'CANCELLED';
export const STATUS_KEYS = ['status', 'situacao', 'status_pedido', 'Status'];

function isCancelled(item: Raw): boolean {
  const flag = pick(item, ['cancelado', 'cancelada', 'flag_cancelado']).toUpperCase();
  const status = pick(item, STATUS_KEYS);
  return ['S', 'SIM', '1', 'TRUE'].includes(flag) || /cancel/i.test(status) || Boolean(pick(item, ['data_cancelamento', 'dt_cancelamento']));
}

/**
 * O contrato não lista os status possíveis. O mapa configurado no painel (a partir dos valores
 * realmente recebidos) prevalece; sem mapeamento, vale a heurística por texto/flags.
 */
export function classifyPreOrder(item: Raw, statusMap: Record<string, unknown> = {}): PreOrderState {
  const status = pick(item, STATUS_KEYS).toUpperCase();
  const mapped = statusMap[status];
  if (mapped === 'OPEN' || mapped === 'INVOICED' || mapped === 'CANCELLED') return mapped;
  if (isCancelled(item)) return 'CANCELLED';
  if (/fatur|emitid|conclu/i.test(status) || Boolean(pick(item, ['data_faturamento', 'nota_fiscal', 'numero_nf']))) return 'INVOICED';
  return 'OPEN';
}

export class EllonMasterSyncService {
  private statusMap: Record<string, unknown> = {};

  private async enqueue(type: EllonJobType, intervalMs: number) {
    const active = await prisma.ellonJob.findFirst({
      where: {
        type,
        // Falha com retentativa agendada continua de onde parou; não abre uma sincronização paralela.
        OR: [
          { status: { in: [EllonJobStatus.PENDING, EllonJobStatus.PROCESSING] } },
          { status: EllonJobStatus.FAILED, nextAttemptAt: { lt: new Date('9000-01-01') } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
    if (active) return active;
    const bucket = Math.floor(Date.now() / intervalMs);
    return prisma.ellonJob.upsert({
      where: { idempotencyKey: `${type.toLowerCase()}:${bucket}` },
      update: {},
      create: { type, idempotencyKey: `${type.toLowerCase()}:${bucket}`, payload: { requestedAt: new Date().toISOString() } },
    });
  }

  enqueueCustomers() { return this.enqueue(EllonJobType.SYNC_CUSTOMERS, 60 * 60_000); }
  enqueueReferences() { return this.enqueue(EllonJobType.SYNC_REFERENCE_DATA, DAY_MS); }
  enqueueOrders() { return this.enqueue(EllonJobType.SYNC_ORDER_STATUS, 10 * 60_000); }

  private async snapshot(type: string, externalId: string, name: string | undefined, payload: Raw) {
    const clean = withoutXml(payload) as Prisma.InputJsonValue;
    await prisma.ellonSnapshot.upsert({
      where: { type_externalId: { type, externalId } },
      update: { name, payload: clean, syncedAt: new Date() },
      create: { type, externalId, name, payload: clean },
    });
  }

  async syncReferences(): Promise<MasterSyncResult> {
    const result = emptyResult();
    const sources = [
      ['PAYMENT_METHOD', '/publico/integracoes/formaspagamento'],
      ['SELLER', '/publico/integracoes/vendedores'],
      ['CARRIER', '/publico/integracoes/transportadoras'],
      ['PRODUCT_GROUP', '/publico/integracoes/gruposprodutos'],
      ['PRODUCT_BRAND', '/publico/integracoes/marcasprodutos'],
    ] as const;
    for (const [type, path] of sources) {
      try {
        const items = rows(await ellonClient.request<unknown>('GET', path), ['formas', 'vendedores', 'transportadoras', 'grupos', 'marcas']);
        result.received += items.length;
        for (const item of items) {
          const id = pick(item, ['id', 'codigo', 'Id']);
          if (!id) continue;
          await this.snapshot(type, id, pick(item, ['descricao', 'nome', 'nomecompleto', 'fantasia']) || undefined, item);
          result.stored += 1;
        }
      } catch (error) {
        pushError(result, `${type}: ${errorMessage(error)}`);
      }
    }
    if (result.stored === 0 && result.errors.length) throw new Error(result.errors.join(' | '));
    return result;
  }

  // ==================== CLIENTES ====================

  /** Há alteração local ainda não enviada? Nesse caso o M2 prevalece até o envio concluir. */
  private async hasPendingLocalChanges(customer: Customer, metadata: Record<string, unknown>): Promise<boolean> {
    const pendingJob = await prisma.ellonJob.findFirst({
      where: { type: EllonJobType.EXPORT_CUSTOMER, localEntityId: customer.id, status: { in: [EllonJobStatus.PENDING, EllonJobStatus.PROCESSING, EllonJobStatus.FAILED] } },
      select: { id: true },
    });
    if (pendingJob) return true;
    if (!metadata.exportHash) return false;
    const address = await prisma.address.findFirst({ where: { customerId: customer.id }, orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }] });
    return payloadHash(customerPayload(customer, address ?? undefined)) !== metadata.exportHash;
  }

  private async upsertAddress(customerId: string, item: Raw, metadata: Record<string, unknown>): Promise<string | null> {
    const zipCode = digits(item.cep);
    const uf = stateCode(pick(item, ['uf', 'estado', 'sigla_uf', 'UF']));
    const street = pick(item, ['endereco', 'logradouro', 'rua']);
    const city = pick(item, ['cidade', 'municipio', 'nome_cidade']);
    if (zipCode.length !== 8 || !uf || !street || !city) return null;
    const data = {
      street: street.slice(0, 255),
      number: pick(item, ['numero', 'nro']) || 'S/N',
      complement: pick(item, ['complemento']) || null,
      neighborhood: pick(item, ['bairro']) || 'Não informado',
      city,
      state: uf,
      zipCode,
    };
    const tracked = typeof metadata.addressId === 'string'
      ? await prisma.address.findFirst({ where: { id: metadata.addressId, customerId } })
      : null;
    const existing = tracked ?? await prisma.address.findFirst({ where: { customerId, zipCode, number: data.number } });
    if (existing) {
      const changed = (Object.keys(data) as Array<keyof typeof data>).some(key => existing[key] !== data[key]);
      if (changed) await prisma.address.update({ where: { id: existing.id }, data });
      return existing.id;
    }
    const hasAddress = await prisma.address.count({ where: { customerId } });
    const created = await prisma.address.create({ data: { ...data, customerId, isDefault: hasAddress === 0 } });
    return created.id;
  }

  /** Aplica os dados cadastrais da Ellon a um cliente local já vinculado. */
  private async applyCustomer(customer: Customer, item: Raw, metadata: Record<string, unknown>): Promise<boolean> {
    const data: Prisma.CustomerUpdateInput = {};
    const name = pick(item, ['nome', 'fantasia']);
    if (name && name !== customer.name) data.name = name;
    const phone = digits(item.celular) || digits(item.telefone);
    if (phone && phone !== digits(customer.phone)) data.phone = phone;
    const birthDate = parseDate(item.nascimento);
    if (birthDate && birthDate.toISOString().slice(0, 10) !== customer.birthDate?.toISOString().slice(0, 10)) data.birthDate = birthDate;
    const cpf = digits(item.cpf_cnpj);
    if ([11, 14].includes(cpf.length) && cpf !== customer.cpf) {
      const owner = await prisma.customer.findUnique({ where: { cpf }, select: { id: true } });
      if (!owner) data.cpf = cpf;
    }
    const email = text(item.email).toLowerCase();
    if (isSyntheticEmail(customer.email) && email.includes('@')) {
      const owner = await prisma.customer.findUnique({ where: { email }, select: { id: true } });
      if (!owner) data.email = email;
    }
    // Bloqueio de acesso é decisão do M2 para contas próprias; só importadas seguem o status do ERP.
    if (metadata.imported) {
      const status = text(item.status).toUpperCase() === 'I' ? 'INACTIVE' : 'ACTIVE';
      if (customer.status !== 'BLOCKED' && status !== customer.status) data.status = status;
    }
    if (!Object.keys(data).length) return false;
    await prisma.customer.update({ where: { id: customer.id }, data });
    return true;
  }

  private async createCustomer(item: Raw, externalId: string, duplicateOf: Customer | null): Promise<Customer> {
    const email = text(item.email).toLowerCase();
    const cpf = digits(item.cpf_cnpj);
    const phone = digits(item.celular) || digits(item.telefone);
    const emailFree = email.includes('@') && !duplicateOf
      && !(await prisma.customer.findUnique({ where: { email }, select: { id: true } }));
    const cpfFree = [11, 14].includes(cpf.length) && !duplicateOf
      && !(await prisma.customer.findUnique({ where: { cpf }, select: { id: true } }));
    return prisma.customer.create({
      data: {
        name: pick(item, ['nome', 'fantasia']) || `Cliente Ellon ${externalId}`,
        email: emailFree ? email : `ellon-${externalId}@sync.invalid`,
        phone: phone || 'Não informado',
        // Senha aleatória descartada: o acesso exige o fluxo de definição de senha por e-mail.
        password: await bcrypt.hash(randomBytes(32).toString('hex'), 12),
        cpf: cpfFree ? cpf : null,
        birthDate: parseDate(item.nascimento),
        status: text(item.status).toUpperCase() === 'I' ? 'INACTIVE' : 'ACTIVE',
      },
    });
  }

  private async importCustomer(item: Raw, externalId: string, result: MasterSyncResult) {
    let link = await prisma.ellonEntityLink.findFirst({ where: { entityType: EllonEntityType.CUSTOMER, externalId } });
    let customer = link ? await prisma.customer.findUnique({ where: { id: link.localId } }) : null;
    if (link && !customer) {
      await prisma.ellonEntityLink.delete({ where: { id: link.id } });
      link = null;
    }
    let metadata = linkMetadata(link?.metadata);

    if (link && customer) {
      if (await this.hasPendingLocalChanges(customer, metadata)) return;
      if (await this.applyCustomer(customer, item, metadata)) result.updated += 1;
    } else {
      const email = text(item.email).toLowerCase();
      const cpf = digits(item.cpf_cnpj);
      const match = await prisma.customer.findFirst({
        where: { OR: [...(email.includes('@') ? [{ email }] : []), ...([11, 14].includes(cpf.length) ? [{ cpf }] : [])] },
      });
      const matchLinked = match
        ? await prisma.ellonEntityLink.findUnique({ where: { entityType_localId: { entityType: EllonEntityType.CUSTOMER, localId: match.id } } })
        : null;
      if (match && !matchLinked) {
        customer = match;
        metadata = { matchedBy: match.email === email ? 'email' : 'cpf' };
        result.linked += 1;
      } else {
        customer = await this.createCustomer(item, externalId, match);
        metadata = { imported: true, missingPhone: !(digits(item.celular) || digits(item.telefone)), ...(match && { duplicateOfLocalId: match.id }) };
        result.created += 1;
      }
      link = await prisma.ellonEntityLink.create({ data: { entityType: EllonEntityType.CUSTOMER, localId: customer.id, externalId, metadata: metadata as Prisma.InputJsonValue } });
      // Cliente local pré-existente: completa apenas o que falta, sem sobrescrever dados do M2.
      if (match && !matchLinked) await this.fillMissing(customer, item);
    }

    const addressId = await this.upsertAddress(customer.id, item, metadata);
    if (addressId && addressId !== metadata.addressId) result.addresses += 1;
    const fresh = await prisma.customer.findUniqueOrThrow({ where: { id: customer.id } });
    const address = await prisma.address.findFirst({ where: { customerId: customer.id }, orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }] });
    // Registra o estado atual como já sincronizado para não reenviar à Ellon o que veio dela.
    await prisma.ellonEntityLink.update({
      where: { id: link.id },
      data: {
        metadata: {
          ...metadata,
          ...(addressId && { addressId }),
          exportHash: payloadHash(customerPayload(fresh, address ?? undefined)),
          importedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    });
  }

  private async fillMissing(customer: Customer, item: Raw) {
    const data: Prisma.CustomerUpdateInput = {};
    const cpf = digits(item.cpf_cnpj);
    if (!customer.cpf && [11, 14].includes(cpf.length) && !(await prisma.customer.findUnique({ where: { cpf }, select: { id: true } }))) data.cpf = cpf;
    if (!customer.birthDate) { const birthDate = parseDate(item.nascimento); if (birthDate) data.birthDate = birthDate; }
    const phone = digits(item.celular) || digits(item.telefone);
    if ((!customer.phone || customer.phone === 'Não informado') && phone) data.phone = phone;
    if (Object.keys(data).length) await prisma.customer.update({ where: { id: customer.id }, data });
  }

  async syncCustomers(progress?: PagedProgress | null, checkpoint?: Checkpoint): Promise<MasterSyncResult> {
    const state = progress ?? { nextPage: 1, fingerprints: [], runStartedAt: new Date().toISOString(), result: emptyResult() };
    const { result } = state;
    const seen = new Set(state.fingerprints);
    let finished = false;
    for (let page = state.nextPage; page <= 5000; page += 1) {
      // "Nenhum cliente encontrado" devolvido como erro marca o fim da listagem.
      const response = await ellonClient.request<unknown>('GET', '/publico/integracoes/clientes', { query: { pagina: page } })
        .catch(error => { if (isEmptyResult(error)) return []; throw error; });
      const items = rows(response, ['clientes', 'Clientes']);
      const fingerprint = items.map(item => text(item.id)).join('|');
      if (!items.length || seen.has(fingerprint)) { finished = true; break; }
      seen.add(fingerprint);
      result.received += items.length;
      for (const item of items) {
        const externalId = text(item.id);
        if (!externalId) continue;
        try {
          await this.snapshot('CUSTOMER', externalId, pick(item, ['nome', 'fantasia']) || undefined, item);
          result.stored += 1;
          await this.importCustomer(item, externalId, result);
        } catch (error) {
          pushError(result, `Cliente ${externalId}: ${errorMessage(error)}`);
        }
      }
      state.nextPage = page + 1;
      state.fingerprints = [...seen].slice(-3);
      await checkpoint?.(state);
    }
    if (!finished) throw new Error('Limite de páginas de clientes atingido antes do fim da listagem Ellon.');
    try {
      await this.guardCustomerUpdates(result);
    } catch (error) {
      pushError(result, `Verificação de duplicidade: ${errorMessage(error)}`);
    }
    await prisma.ellonConnection.update({ where: { id: 'default' }, data: { lastCustomerSyncAt: new Date(state.runStartedAt) } });
    return result;
  }

  /** CPF/CNPJ que aparecem em mais de um cadastro da Ellon. */
  async duplicateCustomers(): Promise<Array<{ document: string; externalIds: string[] }>> {
    const rows = await prisma.$queryRaw<Array<{ document: string; external_ids: string[] }>>`
      SELECT regexp_replace(COALESCE(payload->>'cpf_cnpj', ''), '[^0-9]', '', 'g') AS document,
             array_agg("externalId" ORDER BY "createdAt") AS external_ids
      FROM "ellon_snapshots"
      WHERE "type" = 'CUSTOMER'
      GROUP BY 1
      HAVING count(*) > 1 AND length(regexp_replace(COALESCE(payload->>'cpf_cnpj', ''), '[^0-9]', '', 'g')) IN (11, 14)
      LIMIT 500`;
    return rows.map(row => ({ document: row.document, externalIds: row.external_ids }));
  }

  /**
   * O contrato não diz como `cadastrocliente` decide entre criar e atualizar. Se surgir na Ellon
   * um cadastro novo com o mesmo CPF/CNPJ de um cliente que o M2 atualizou antes, a atualização
   * está criando duplicatas: o envio de atualizações é desligado e o caso vai para conferência.
   */
  private async guardCustomerUpdates(result: MasterSyncResult) {
    const duplicates = await this.duplicateCustomers();
    if (!duplicates.length) return;
    const ids = duplicates.flatMap(item => item.externalIds);
    const [links, snapshots] = await Promise.all([
      prisma.ellonEntityLink.findMany({ where: { entityType: EllonEntityType.CUSTOMER, externalId: { in: ids } } }),
      prisma.ellonSnapshot.findMany({ where: { type: 'CUSTOMER', externalId: { in: ids } }, select: { externalId: true, createdAt: true } }),
    ]);
    const firstSeen = new Map(snapshots.map(item => [item.externalId, item.createdAt.getTime()]));
    const causedByM2 = duplicates.some(group => links.some(link => {
      const exportedAt = Date.parse(String(linkMetadata(link.metadata).exportedAt ?? ''));
      if (!group.externalIds.includes(link.externalId) || !Number.isFinite(exportedAt) || linkMetadata(link.metadata).createdBy === 'm2') return false;
      return group.externalIds.some(id => id !== link.externalId && (firstSeen.get(id) ?? 0) > exportedAt);
    }));
    pushError(result, `${duplicates.length} CPF/CNPJ com mais de um cadastro na Ellon.`);
    if (!causedByM2) return;
    await prisma.ellonConnection.update({
      where: { id: 'default' },
      data: {
        customerUpdatesEnabled: false,
        lastError: 'Atualizações de clientes M2 → Ellon foram desligadas: uma atualização criou cadastro duplicado na Ellon. Novos clientes continuam sendo enviados.',
      },
    });
    logger.warn('[Ellon] atualização de clientes desligada por duplicidade detectada');
  }

  // ==================== PEDIDOS, VENDAS E NF-e ====================

  private async mergeLinkMetadata(id: string, current: unknown, patch: Record<string, unknown>) {
    await prisma.ellonEntityLink.update({ where: { id }, data: { metadata: { ...linkMetadata(current), ...patch } as Prisma.InputJsonValue } });
  }

  /** Vincula pré-pedidos criados pelo M2 (inclusive após timeout ambíguo) e aplica cancelamentos da Ellon. */
  private async reconcilePreOrder(item: Raw, externalId: string, result: MasterSyncResult) {
    const status = pick(item, STATUS_KEYS);
    const state = classifyPreOrder(item, this.statusMap);
    const cancelled = state === 'CANCELLED';
    const ellonTotal = pick(item, ['valor_total', 'total', 'valor_liquido', 'valor_pedido']);
    const summary = {
      ellonStatus: status || null,
      ellonCancelled: cancelled,
      ...(state === 'INVOICED' && { ellonInvoiced: true }),
      ellonTotal: ellonTotal || null,
      ellonSyncedAt: new Date().toISOString(),
    };
    let links = await prisma.ellonEntityLink.findMany({
      where: { entityType: { in: [EllonEntityType.ORDER, EllonEntityType.SERVICE_ORDER] }, externalId },
    });

    const siteId = pick(item, ['id_pedido_site', 'pedido_site', 'idPedidoSite', 'id_pedido_externo', 'pedido_externo']).match(SITE_ID);
    if (!links.length && siteId) {
      const entityType = siteId[1].toUpperCase() === 'PED' ? EllonEntityType.ORDER : EllonEntityType.SERVICE_ORDER;
      const localId = siteId[2].toLowerCase();
      const exists = entityType === EllonEntityType.ORDER
        ? await prisma.order.findUnique({ where: { id: localId }, select: { id: true } })
        : await prisma.serviceOrder.findUnique({ where: { id: localId }, select: { id: true } });
      const alreadyLinked = await prisma.ellonEntityLink.findUnique({ where: { entityType_localId: { entityType, localId } } });
      if (exists && !alreadyLinked) {
        const link = await prisma.ellonEntityLink.create({ data: { entityType, localId, externalId, metadata: { reconciledFrom: 'pre-order-sync' } } });
        // O envio original terminou em timeout, mas a Ellon criou o pré-pedido: encerra o job sem reenviar.
        await prisma.ellonJob.updateMany({
          where: {
            type: entityType === EllonEntityType.ORDER ? EllonJobType.EXPORT_ORDER : EllonJobType.EXPORT_SERVICE_ORDER,
            localEntityId: localId,
            status: { in: [EllonJobStatus.FAILED, EllonJobStatus.PENDING] },
          },
          data: { status: EllonJobStatus.SUCCEEDED, processedAt: new Date(), lastError: null, response: { numeroPedido: externalId, reconciled: true } },
        });
        links = [link];
        result.reconciled += 1;
      }
    }

    for (const link of links) {
      const metadata = linkMetadata(link.metadata);
      // A Ellon recalcula preços: total diferente do aprovado no M2 vai para conferência.
      const divergence = divergenceOf(metadata.m2Total, ellonTotal);
      await this.mergeLinkMetadata(link.id, link.metadata, { ...summary, totalDivergence: divergence });
      result.linked += 1;
      if (divergence && !metadata.totalDivergence) result.divergences += 1;
      if (!cancelled || metadata.ellonCancelled) continue;
      const entity = link.entityType === EllonEntityType.ORDER ? 'ORDER' : 'SERVICE_ORDER';
      // OS só é cancelada automaticamente se o M2 pediu; sem pedido, as peças já foram usadas.
      if (entity === 'SERVICE_ORDER' && !metadata.cancellationRequestedAt) {
        pushError(result, `Pré-pedido ${externalId} da OS ${link.localId} foi cancelado na Ellon sem solicitação do M2; conferir.`);
        continue;
      }
      try {
        const done = await ellonCancellationService.completeLocalCancel(entity, link.localId);
        if (done) result.cancelled += 1;
        else pushError(result, `Pré-pedido ${externalId} cancelado na Ellon, mas o pedido M2 ${link.localId} já avançou; conferir manualmente.`);
      } catch (error) {
        pushError(result, `Cancelamento local de ${link.localId}: ${errorMessage(error)}`);
      }
    }
  }

  private async reconcileSale(item: Raw, result: MasterSyncResult) {
    const preOrder = pick(item, ['numero_prepedido', 'prepedido', 'numero_pedido', 'pedido']);
    if (!preOrder) return;
    const links = await prisma.ellonEntityLink.findMany({
      where: { entityType: { in: [EllonEntityType.ORDER, EllonEntityType.SERVICE_ORDER] }, externalId: preOrder },
    });
    for (const link of links) {
      await this.mergeLinkMetadata(link.id, link.metadata, {
        ellonSaleId: pick(item, ['id_venda']),
        ellonInvoicedAt: pick(item, ['data', 'data_venda', 'data_emissao']) || null,
        ellonSaleCancelled: isCancelled(item),
      });
    }
  }

  /**
   * Percorre as páginas de uma consulta por período. "Nenhum registro" devolvido como erro vale
   * como fim da lista; erro respondido pela Ellon fica registrado sem travar o restante (repetir
   * não muda a resposta); só falha de comunicação interrompe para nova tentativa.
   */
  private async eachPage(label: string, result: MasterSyncResult, fetchPage: (page: number) => Promise<unknown>, keys: string[], idKeys: string[], handle: (item: Raw, id: string) => Promise<void>) {
    const seen = new Set<string>();
    for (let page = 1; page <= 2000; page += 1) {
      let response: unknown;
      try {
        response = await fetchPage(page);
      } catch (error) {
        if (isEmptyResult(error)) return;
        if (error instanceof EllonResponseError) { pushError(result, `${label} (página ${page}): ${error.message}`); return; }
        throw error;
      }
      const items = rows(response, keys);
      // Sem identificador conhecido, o próprio conteúdo identifica o registro (o contrato não garante o nome do campo).
      const ids = items.map(item => pick(item, idKeys) || `h${payloadHash(item).slice(0, 16)}`);
      const fingerprint = ids.join('|');
      if (!items.length || seen.has(fingerprint)) return;
      seen.add(fingerprint);
      result.received += items.length;
      for (const [index, item] of items.entries()) {
        try {
          await handle(item, ids[index]);
          result.stored += 1;
        } catch (error) {
          pushError(result, `${label} ${ids[index]}: ${errorMessage(error)}`);
        }
      }
    }
  }

  private async syncWindow(start: Date, end: Date, state: PagedProgress, checkpoint?: Checkpoint) {
    const { result } = state;
    const range = { dataInicial: localDate(start), dataFinal: localDate(end) };
    const period = `${range.dataInicial} a ${range.dataFinal}`;

    // Pré-pedidos e vendas são independentes: falha em um não impede o outro.
    await this.eachPage(`Pré-pedidos ${period}`, result,
      page => ellonClient.request<unknown>('GET', '/publico/integracoes/prepedidosdetalhados', { query: { pagina: page, registros: 50, ...range } }),
      ['pedidos', 'Pedidos', 'prepedidos'], ['numero', 'numeroPedido', 'numero_pedido'],
      async (item, id) => {
        await this.snapshot('PRE_ORDER', id, `Pré-pedido ${id}`, item);
        result.preOrders += 1;
        await this.reconcilePreOrder(item, id, result);
      });

    await this.eachPage(`Vendas ${period}`, result,
      page => ellonClient.request<unknown>('POST', '/publico/integracoes/consultaresumovendas', {
        query: { pagina: page },
        body: { data_inicial: range.dataInicial, data_final: range.dataFinal, tipo_movimento: 'V' },
        read: true,
      }),
      ['Faturamentos', 'faturamentos', 'vendas', 'Vendas'], ['id_venda', 'idVenda', 'id', 'numero_venda', 'numero', 'documento'],
      async (item, id) => {
        await this.snapshot('SALE', id, `Venda ${pick(item, ['numero_nf', 'numero', 'documento']) || id}`, item);
        result.sales += 1;
        await this.reconcileSale(item, result);
      });

    state.windowStart = new Date(end.getTime() + 1).toISOString();
    await checkpoint?.(state);
  }

  /** Busca metadados de NF-e dos pedidos enviados pelo M2 (o XML não é armazenado). */
  private async syncInvoices(result: MasterSyncResult) {
    const links = await prisma.ellonEntityLink.findMany({
      where: { entityType: { in: [EllonEntityType.ORDER, EllonEntityType.SERVICE_ORDER] }, createdAt: { gte: new Date(Date.now() - 120 * DAY_MS) } },
      orderBy: { updatedAt: 'asc' },
      take: 200,
    });
    let checked = 0;
    for (const link of links) {
      const metadata = linkMetadata(link.metadata);
      if (metadata.nfe || checked >= 50) continue;
      checked += 1;
      const siteId = `${link.entityType === EllonEntityType.ORDER ? 'PED' : 'OS'}-${link.localId}`;
      try {
        const response = await ellonClient.request<unknown>('GET', `/publico/integracoes/consultanfe/${encodeURIComponent(siteId)}`);
        const invoice = rows(response, ['nfe', 'NFe', 'notas'])[0] ?? (response && typeof response === 'object' && !Array.isArray(response) ? response as Raw : null);
        const key = invoice ? pick(invoice, ['chave', 'chave_nfe', 'chaveNfe', 'chave_acesso']) : '';
        if (!invoice || !key) { await this.mergeLinkMetadata(link.id, link.metadata, { nfeCheckedAt: new Date().toISOString() }); continue; }
        const nfe = { key, number: pick(invoice, ['numero', 'numero_nfe', 'nNF']), series: pick(invoice, ['serie']), issuedAt: pick(invoice, ['data_emissao', 'emissao', 'data']) };
        await this.snapshot('NFE', key, `NF-e ${nfe.number || key}`, { ...invoice, siteId });
        await this.mergeLinkMetadata(link.id, link.metadata, { nfe });
        result.invoices += 1;
      } catch (error) {
        // Nota ainda não emitida também chega como erro; tenta de novo nas próximas execuções.
        await this.mergeLinkMetadata(link.id, link.metadata, { nfeCheckedAt: new Date().toISOString(), nfeLastError: errorMessage(error).slice(0, 300) });
      }
    }
  }

  async syncOrders(progress?: PagedProgress | null, checkpoint?: Checkpoint): Promise<MasterSyncResult> {
    const connection = await prisma.ellonConnection.findUnique({ where: { id: 'default' } });
    this.statusMap = linkMetadata(connection?.preOrderStatusMap);
    const runStartedAt = new Date();
    const firstStart = connection?.lastOrderSyncAt
      ? new Date(connection.lastOrderSyncAt.getTime() - ORDER_OVERLAP_DAYS * DAY_MS)
      : new Date(runStartedAt.getTime() - HISTORY_DAYS * DAY_MS);
    const state: PagedProgress = progress ?? {
      nextPage: 1, fingerprints: [], runStartedAt: runStartedAt.toISOString(), windowStart: firstStart.toISOString(),
      windowEnd: runStartedAt.toISOString(), result: emptyResult(),
    };
    const end = new Date(state.windowEnd ?? runStartedAt);
    // Janelas de 31 dias: a carga histórica inicial não depende de uma consulta gigante.
    for (let start = new Date(state.windowStart ?? firstStart); start < end; start = new Date(state.windowStart as string)) {
      const windowEnd = new Date(Math.min(end.getTime(), start.getTime() + WINDOW_DAYS * DAY_MS));
      await this.syncWindow(start, windowEnd, state, checkpoint);
    }
    try {
      await this.syncInvoices(state.result);
    } catch (error) {
      logger.warn('[Ellon] consulta de NF-e falhou', { error: errorMessage(error) });
      pushError(state.result, `NF-e: ${errorMessage(error)}`);
    }
    await prisma.ellonConnection.update({ where: { id: 'default' }, data: { lastOrderSyncAt: new Date(state.runStartedAt) } });
    return state.result;
  }
}

export const ellonMasterSyncService = new EllonMasterSyncService();
