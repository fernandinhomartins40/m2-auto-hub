import { EllonEntityType, Prisma } from '@prisma/client';
import { prisma } from '@config/database.js';
import { ApiError } from '@shared/utils/error.util.js';
import { ellonClient } from './ellon.client.js';
import { ellonConnectionService } from './ellon-connection.service.js';
import { linkMetadata } from './ellon-export.service.js';
import { STATUS_KEYS, classifyPreOrder } from './ellon-master-sync.service.js';
import { isInvoiced } from './ellon-stock.service.js';
import { DAY_MS, errorMessage } from './ellon-sync.util.js';

type Json = Record<string, unknown>;
const SWAGGER_PATHS = ['/swagger/doc.json', '/swagger/swagger.json', '/swagger/v1/swagger.json'];

/** Nomes de campos de um schema Swagger 2.0, resolvendo `$ref` e arrays. */
function schemaFields(schema: unknown, definitions: Json, depth = 0): Json | string[] {
  const node = linkMetadata(schema);
  if (depth > 3) return [];
  if (typeof node.$ref === 'string') return schemaFields(definitions[node.$ref.split('/').pop() ?? ''], definitions, depth + 1);
  if (node.type === 'array') return schemaFields(node.items, definitions, depth + 1);
  const properties = linkMetadata(node.properties);
  if (!Object.keys(properties).length) return [];
  return Object.fromEntries(Object.entries(properties).map(([key, value]) => {
    const child = linkMetadata(value);
    const nested = child.$ref || child.type === 'array' || child.properties ? schemaFields(child, definitions, depth + 1) : [];
    const label = [child.type, child.format, child.maxLength ? `max ${child.maxLength}` : '', child.description].filter(Boolean).join(' · ');
    return [key, Array.isArray(nested) && !nested.length ? label || 'campo' : nested];
  }));
}

/**
 * A Ellon não altera nem esclarece a API: o M2 descobre o contrato sozinho, lendo o Swagger
 * publicado (acessível a partir do servidor) e os dados realmente recebidos.
 */
export class EllonContractService {
  async refreshSwagger() {
    const config = await ellonConnectionService.getRaw();
    let lastError = '';
    for (const path of SWAGGER_PATHS) {
      try {
        const response = await fetch(new URL(path, config.baseUrl), { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(20_000) });
        if (!response.ok) { lastError = `${path}: HTTP ${response.status}`; continue; }
        const doc = await response.json() as Json;
        if (!doc.paths) { lastError = `${path}: documento sem paths`; continue; }
        await prisma.ellonSnapshot.upsert({
          where: { type_externalId: { type: 'CONTRACT', externalId: 'swagger' } },
          update: { name: `Swagger ${linkMetadata(doc.info).version ?? ''}`.trim(), payload: doc as Prisma.InputJsonValue, syncedAt: new Date() },
          create: { type: 'CONTRACT', externalId: 'swagger', name: `Swagger ${linkMetadata(doc.info).version ?? ''}`.trim(), payload: doc as Prisma.InputJsonValue },
        });
        return this.swaggerSummary();
      } catch (error) {
        lastError = `${path}: ${errorMessage(error)}`;
      }
    }
    throw new ApiError(502, `Não foi possível ler o Swagger da Ellon (${lastError}).`);
  }

  async swaggerSummary() {
    const snapshot = await prisma.ellonSnapshot.findUnique({ where: { type_externalId: { type: 'CONTRACT', externalId: 'swagger' } } });
    if (!snapshot) return null;
    const doc = linkMetadata(snapshot.payload);
    const definitions = linkMetadata(doc.definitions);
    const operations = Object.entries(linkMetadata(doc.paths)).flatMap(([path, methods]) =>
      Object.entries(linkMetadata(methods)).map(([method, raw]) => {
        const operation = linkMetadata(raw);
        const parameters = (Array.isArray(operation.parameters) ? operation.parameters : []).map(item => linkMetadata(item));
        const body = parameters.find(item => item.in === 'body');
        const ok = linkMetadata(linkMetadata(operation.responses)['200']);
        return {
          method: method.toUpperCase(),
          path,
          summary: String(operation.summary ?? operation.description ?? ''),
          parameters: parameters.filter(item => item.in !== 'body').map(item => `${item.name}${item.required ? '*' : ''} (${item.in})`),
          body: body ? schemaFields(body.schema, definitions) : null,
          response: ok.schema ? schemaFields(ok.schema, definitions) : null,
        };
      }));
    return { fetchedAt: snapshot.syncedAt, version: snapshot.name, operations };
  }

  /** Valores reais recebidos que substituem as perguntas que a Ellon não responde. */
  async observed() {
    const config = await ellonConnectionService.getRaw();
    const statusExpr = Prisma.raw(`COALESCE(${STATUS_KEYS.map(key => `NULLIF(payload->>'${key}', '')`).join(', ')}, '(vazio)')`);
    const [productTypes, statuses, keys, consumers] = await Promise.all([
      prisma.$queryRaw<Array<{ type: string | null; total: bigint; examples: string[] }>>`
        SELECT NULLIF(specifications->>'type', '') AS type, count(*) AS total, (array_agg(name ORDER BY name))[1:3] AS examples
        FROM "products" WHERE specifications ? 'ellonId' GROUP BY 1 ORDER BY 2 DESC LIMIT 50`,
      prisma.$queryRaw<Array<{ status: string; total: bigint; sample: Json }>>`
        SELECT upper(btrim(${statusExpr})) AS status, count(*) AS total, (array_agg(payload))[1] AS sample
        FROM "ellon_snapshots" WHERE "type" = 'PRE_ORDER' GROUP BY 1 ORDER BY 2 DESC LIMIT 30`,
      prisma.$queryRaw<Array<{ type: string; key: string; total: bigint }>>`
        SELECT s."type", k.key, count(*) AS total
        FROM "ellon_snapshots" s CROSS JOIN LATERAL jsonb_object_keys(CASE WHEN jsonb_typeof(s.payload) = 'object' THEN s.payload ELSE '{}'::jsonb END) AS k(key)
        WHERE s."type" IN ('PRE_ORDER', 'SALE', 'NFE', 'CUSTOMER') GROUP BY 1, 2 ORDER BY 1, 3 DESC`,
      prisma.ellonSnapshot.findMany({
        where: { type: 'CUSTOMER', name: { contains: 'consumidor', mode: 'insensitive' } },
        select: { externalId: true, name: true }, take: 10,
      }),
    ]);
    const statusMap = linkMetadata(config.preOrderStatusMap);
    const fieldsByType: Record<string, Array<{ key: string; total: number }>> = {};
    for (const row of keys) (fieldsByType[row.type] ??= []).push({ key: row.key, total: Number(row.total) });

    return {
      productTypes: productTypes.map(row => ({
        type: row.type, total: Number(row.total), examples: row.examples,
        isService: config.serviceItemTypes.map(value => value.toUpperCase()).includes((row.type ?? '').toUpperCase()),
      })),
      preOrderStatuses: statuses.map(row => ({
        status: row.status, total: Number(row.total),
        mapped: typeof statusMap[row.status] === 'string' ? statusMap[row.status] : null,
        detected: classifyPreOrder(linkMetadata(row.sample), statusMap),
      })),
      fieldsByType,
      consumerCandidates: consumers,
      stockEvidence: await this.stockEvidence(),
      settings: {
        observationLimit: config.observationLimit,
        customerUpdatesEnabled: config.customerUpdatesEnabled,
        stockIncludesPreOrders: config.stockIncludesPreOrders,
      },
    };
  }

  /**
   * Mede, nos pré-pedidos enviados e ainda não faturados, se a quantidade da Ellon caiu logo
   * após o envio. Queda consistente = a Ellon já reserva no pré-pedido (ligar a chave correspondente).
   */
  async stockEvidence() {
    const links = await prisma.ellonEntityLink.findMany({
      where: {
        entityType: { in: [EllonEntityType.ORDER, EllonEntityType.SERVICE_ORDER] },
        createdAt: { gte: new Date(Date.now() - 3 * DAY_MS), lte: new Date(Date.now() - 15 * 60_000) },
        metadata: { path: ['stockAtExport'], not: Prisma.AnyNull },
      },
      take: 200,
    });
    const samples: Array<{ productId: string; before: number; quantity: number; now: number }> = [];
    for (const link of links) {
      const metadata = linkMetadata(link.metadata);
      if (isInvoiced(metadata) || metadata.ellonCancelled) continue;
      for (const [productId, raw] of Object.entries(linkMetadata(metadata.stockAtExport))) {
        const entry = linkMetadata(raw);
        if (typeof entry.ellonStock === 'number' && typeof entry.quantity === 'number') {
          samples.push({ productId, before: entry.ellonStock, quantity: entry.quantity, now: NaN });
        }
      }
    }
    const products = samples.length
      ? await prisma.product.findMany({ where: { id: { in: [...new Set(samples.map(item => item.productId))] } }, select: { id: true, specifications: true } })
      : [];
    const current = new Map(products.map(product => [product.id, linkMetadata(product.specifications).ellonStock]));
    let dropped = 0;
    let unchanged = 0;
    for (const sample of samples) {
      const now = current.get(sample.productId);
      if (typeof now !== 'number') continue;
      if (now <= sample.before - sample.quantity) dropped += 1;
      else if (now >= sample.before) unchanged += 1;
    }
    const measured = dropped + unchanged;
    const suggestion = measured < 3 ? 'INCONCLUSIVE' : dropped / measured >= 0.8 ? 'INCLUDES' : unchanged / measured >= 0.8 ? 'EXCLUDES' : 'INCONCLUSIVE';
    return { measured, dropped, unchanged, suggestion };
  }

  /** Cria na Ellon, pela própria API, o cliente "consumidor final" e o define como padrão. */
  async createDefaultCustomer() {
    const response = await ellonClient.request<{ id?: number }>('POST', '/publico/integracoes/cadastrocliente', {
      body: { nome: 'CONSUMIDOR FINAL', fantasia: 'CONSUMIDOR FINAL', cpf_cnpj: '', status: 'A' },
    });
    if (!response.id) throw new ApiError(502, 'A Ellon não retornou o ID do cliente criado.');
    await prisma.ellonConnection.update({ where: { id: 'default' }, data: { defaultCustomerCode: response.id } });
    return { defaultCustomerCode: response.id };
  }
}

export const ellonContractService = new EllonContractService();
