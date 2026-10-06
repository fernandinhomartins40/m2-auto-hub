import { EllonEntityType, EllonJobStatus, EllonJobType, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { prisma } from '@config/database.js';
import { ellonClient } from './ellon.client.js';

type Raw = Record<string, unknown>;

interface MasterSyncResult {
  received: number;
  stored: number;
  linked: number;
  created: number;
  errors: string[];
}

const clean = (value: unknown) => typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
const digits = (value: unknown) => clean(value).replace(/\D/g, '');
const rows = (value: unknown, keys: string[] = []): Raw[] => {
  if (Array.isArray(value)) return value.filter(item => item && typeof item === 'object') as Raw[];
  if (!value || typeof value !== 'object') return [];
  const object = value as Raw;
  for (const key of keys) if (Array.isArray(object[key])) return rows(object[key]);
  return [];
};

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export class EllonMasterSyncService {
  private async enqueue(type: EllonJobType, intervalMs: number) {
    const active = await prisma.ellonJob.findFirst({
      where: { type, status: { in: [EllonJobStatus.PENDING, EllonJobStatus.PROCESSING] } },
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
  enqueueReferences() { return this.enqueue(EllonJobType.SYNC_REFERENCE_DATA, 24 * 60 * 60_000); }
  enqueueOrders() { return this.enqueue(EllonJobType.SYNC_ORDER_STATUS, 10 * 60_000); }

  private async snapshot(type: string, externalId: string, name: string | undefined, payload: Raw) {
    await prisma.ellonSnapshot.upsert({
      where: { type_externalId: { type, externalId } },
      update: { name, payload: payload as Prisma.InputJsonValue, syncedAt: new Date() },
      create: { type, externalId, name, payload: payload as Prisma.InputJsonValue },
    });
  }

  async syncReferences(): Promise<MasterSyncResult> {
    const result: MasterSyncResult = { received: 0, stored: 0, linked: 0, created: 0, errors: [] };
    const sources = [
      ['PAYMENT_METHOD', '/publico/integracoes/formaspagamento'],
      ['SELLER', '/publico/integracoes/vendedores'],
      ['CARRIER', '/publico/integracoes/transportadoras'],
      ['PRODUCT_GROUP', '/publico/integracoes/gruposprodutos'],
      ['PRODUCT_BRAND', '/publico/integracoes/marcasprodutos'],
    ] as const;
    for (const [type, path] of sources) {
      try {
        const items = rows(await ellonClient.request<unknown>('GET', path));
        result.received += items.length;
        for (const item of items) {
          const id = clean(item.id);
          if (!id) continue;
          await this.snapshot(type, id, clean(item.descricao) || clean(item.nome) || clean(item.nomecompleto), item);
          result.stored += 1;
        }
      } catch (error) {
        result.errors.push(`${type}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return result;
  }

  async syncCustomers(): Promise<MasterSyncResult> {
    const result: MasterSyncResult = { received: 0, stored: 0, linked: 0, created: 0, errors: [] };
    const seen = new Set<string>();
    for (let page = 1; page <= 1000; page += 1) {
      const items = rows(await ellonClient.request<unknown>('GET', '/publico/integracoes/clientes', { query: { pagina: page } }));
      if (!items.length) break;
      const fingerprint = items.map(item => clean(item.id)).join('|');
      if (seen.has(fingerprint)) break;
      seen.add(fingerprint);
      result.received += items.length;
      for (const item of items) {
        const externalId = clean(item.id);
        if (!externalId) continue;
        await this.snapshot('CUSTOMER', externalId, clean(item.nome) || clean(item.fantasia), item);
        result.stored += 1;
        try {
          const linked = await prisma.ellonEntityLink.findFirst({ where: { entityType: EllonEntityType.CUSTOMER, externalId } });
          if (linked) continue;
          const email = clean(item.email).toLowerCase();
          const cpf = digits(item.cpf_cnpj);
          const customer = await prisma.customer.findFirst({
            where: { OR: [...(email.includes('@') ? [{ email }] : []), ...([11, 14].includes(cpf.length) ? [{ cpf }] : [])] },
          });
          if (customer) {
            await prisma.ellonEntityLink.create({
              data: { entityType: EllonEntityType.CUSTOMER, localId: customer.id, externalId, metadata: { matchedBy: customer.email === email ? 'email' : 'cpf' } },
            });
            result.linked += 1;
            continue;
          }
          const phone = digits(item.celular) || digits(item.telefone);
          if (!email.includes('@') || !phone || !clean(item.nome)) continue;
          const password = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
          const created = await prisma.customer.create({
            data: {
              name: clean(item.nome), email, phone, password,
              cpf: [11, 14].includes(cpf.length) ? cpf : null,
              birthDate: clean(item.nascimento) ? new Date(clean(item.nascimento)) : null,
              status: clean(item.status).toUpperCase() === 'I' ? 'INACTIVE' : 'ACTIVE',
            },
          });
          await prisma.ellonEntityLink.create({
            data: { entityType: EllonEntityType.CUSTOMER, localId: created.id, externalId, metadata: { imported: true } },
          });
          result.created += 1;
        } catch (error) {
          if (result.errors.length < 100) result.errors.push(`Cliente ${externalId}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      if (items.length < 50) break;
    }
    return result;
  }

  async syncOrders(): Promise<MasterSyncResult> {
    const result: MasterSyncResult = { received: 0, stored: 0, linked: 0, created: 0, errors: [] };
    const finalDate = new Date();
    const initialDate = new Date(finalDate.getTime() - 30 * 24 * 60 * 60_000);
    const seen = new Set<string>();
    for (let page = 1; page <= 1000; page += 1) {
      const response = await ellonClient.request<unknown>('GET', '/publico/integracoes/prepedidosdetalhados', {
        query: { pagina: page, registros: 50, dataInicial: isoDate(initialDate), dataFinal: isoDate(finalDate) },
      });
      const items = rows(response, ['pedidos']);
      if (!items.length) break;
      const fingerprint = items.map(item => clean(item.numero)).join('|');
      if (seen.has(fingerprint)) break;
      seen.add(fingerprint);
      result.received += items.length;
      for (const item of items) {
        const externalId = clean(item.numero);
        if (!externalId) continue;
        await this.snapshot('PRE_ORDER', externalId, `Pré-pedido ${externalId}`, item);
        result.stored += 1;
        const links = await prisma.ellonEntityLink.findMany({
          where: { entityType: { in: [EllonEntityType.ORDER, EllonEntityType.SERVICE_ORDER] }, externalId },
        });
        for (const link of links) {
          await prisma.ellonEntityLink.update({ where: { id: link.id }, data: { metadata: item as Prisma.InputJsonValue } });
          result.linked += 1;
        }
      }
      if (items.length < 50) break;
    }

    try {
      for (let page = 1; page <= 100; page += 1) {
        const response = await ellonClient.request<unknown>('POST', '/publico/integracoes/consultaresumovendas', {
          query: { pagina: page }, body: { data_inicial: isoDate(initialDate), data_final: isoDate(finalDate), tipo_movimento: 'V' },
        });
        const items = rows(response, ['Faturamentos']);
        for (const item of items) {
          const externalId = clean(item.id_venda);
          if (externalId) await this.snapshot('SALE', externalId, `Venda ${externalId}`, item);
        }
        result.received += items.length; result.stored += items.length;
        if (!items.length) break;
      }
    } catch (error) {
      result.errors.push(`Vendas: ${error instanceof Error ? error.message : String(error)}`);
    }
    await prisma.ellonConnection.update({ where: { id: 'default' }, data: { lastOrderSyncAt: new Date() } });
    return result;
  }
}

export const ellonMasterSyncService = new EllonMasterSyncService();
