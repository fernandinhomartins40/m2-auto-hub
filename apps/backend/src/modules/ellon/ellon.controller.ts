import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ApiError } from '@shared/utils/error.util.js';
import { prisma } from '@config/database.js';
import { ellonClient } from './ellon.client.js';
import { ellonConnectionService } from './ellon-connection.service.js';
import { ellonExportService, linkMetadata } from './ellon-export.service.js';
import { ellonCancellationService } from './ellon-cancellation.service.js';
import { ellonStockService } from './ellon-stock.service.js';
import { ellonContractService } from './ellon-contract.service.js';
import { ellonStoreService, reportRange } from './ellon-store.service.js';
import { ellonJobService } from './ellon-job.service.js';
import { cancellationEntitySchema, catalogQuerySchema, salesReportQuerySchema, queryEllonJobsSchema, queryLinksSchema, querySnapshotsSchema, syncTargetSchema, updateEllonConfigSchema, upsertEllonLinkSchema } from './dto/ellon.dto.js';
import { ellonProductSyncService } from './ellon-product-sync.service.js';
import { ellonMasterSyncService } from './ellon-master-sync.service.js';

export class EllonController {
  getConfig = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { res.json({ success: true, data: await ellonConnectionService.getSafe() }); } catch (error) { next(error); }
  };

  getSyncSummary = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const [snapshots, links, products, customers, jobs] = await Promise.all([
        prisma.ellonSnapshot.groupBy({ by: ['type'], _count: { _all: true }, _max: { syncedAt: true } }),
        prisma.ellonEntityLink.groupBy({ by: ['entityType'], _count: { _all: true }, _max: { updatedAt: true } }),
        prisma.ellonEntityLink.count({ where: { entityType: 'PRODUCT' } }),
        prisma.ellonEntityLink.count({ where: { entityType: 'CUSTOMER' } }),
        prisma.ellonJob.groupBy({ by: ['status'], _count: { _all: true } }),
      ]);
      res.json({ success: true, data: { products, customers, snapshots, links, jobs } });
    } catch (error) { next(error); }
  };

  updateConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = updateEllonConfigSchema.parse(req.body);
      const data = await ellonConnectionService.update(dto);
      if (data.enabled && data.syncProducts) {
        await ellonProductSyncService.enqueue(req.admin?.adminId);
      }
      if (data.enabled) await ellonMasterSyncService.enqueueReferences();
      if (data.enabled && data.syncCustomers) await ellonMasterSyncService.enqueueCustomers();
      if (data.enabled && data.syncOrders) await ellonMasterSyncService.enqueueOrders();
      if (data.enabled) void ellonJobService.processPending();
      res.json({ success: true, data });
    } catch (error) { next(error); }
  };

  test = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await ellonClient.testConnection();
      const config = await ellonConnectionService.getSafe();
      if (config.enabled && config.syncProducts) {
        await ellonProductSyncService.enqueue(req.admin?.adminId);
      }
      if (config.enabled) await ellonMasterSyncService.enqueueReferences();
      if (config.enabled && config.syncCustomers) await ellonMasterSyncService.enqueueCustomers();
      if (config.enabled && config.syncOrders) await ellonMasterSyncService.enqueueOrders();
      if (config.enabled) void ellonJobService.processPending();
      res.json({ success: true, message: 'Conexão com a Ellon validada.' });
    } catch (error) { next(error); }
  };

  listLinks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = queryLinksSchema.parse(req.query);
      const where = query.entityType ? { entityType: query.entityType } : {};
      const [data, total] = await Promise.all([
        prisma.ellonEntityLink.findMany({ where, orderBy: { updatedAt: 'desc' }, skip: (query.page - 1) * query.limit, take: query.limit }),
        prisma.ellonEntityLink.count({ where }),
      ]);
      res.json({ success: true, data, meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } });
    } catch (error) { next(error); }
  };

  listSnapshots = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = querySnapshotsSchema.parse(req.query);
      const where = {
        ...(query.type && { type: query.type }),
        ...(query.search && {
          OR: [
            { externalId: { contains: query.search } },
            { name: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }),
      };
      const [data, total] = await Promise.all([
        prisma.ellonSnapshot.findMany({ where, orderBy: [{ syncedAt: 'desc' }, { externalId: 'desc' }], skip: (query.page - 1) * query.limit, take: query.limit }),
        prisma.ellonSnapshot.count({ where }),
      ]);
      res.json({ success: true, data, meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } });
    } catch (error) { next(error); }
  };

  syncNow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const target = syncTargetSchema.parse(req.params.target);
      const data = target === 'products' || target === 'products-full'
        ? await ellonProductSyncService.enqueue(req.admin?.adminId, true, target === 'products-full')
        : target === 'customers'
          ? await ellonMasterSyncService.enqueueCustomers()
          : target === 'references'
            ? await ellonMasterSyncService.enqueueReferences()
            : await ellonMasterSyncService.enqueueOrders();
      void ellonJobService.processPending();
      res.status(202).json({ success: true, data });
    } catch (error) { next(error); }
  };

  upsertLink = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = upsertEllonLinkSchema.parse(req.body);
      if (dto.entityType === 'SERVICE') {
        const config = await ellonConnectionService.getRaw();
        const type = await ellonExportService.ellonItemType(dto.externalId, dto.externalSequence);
        const allowed = config.serviceItemTypes.map(value => value.toUpperCase());
        if (allowed.length && (!type || !allowed.includes(type.toUpperCase()))) {
          throw ApiError.unprocessableEntity(`O item Ellon ${dto.externalId}/${dto.externalSequence} é do tipo "${type ?? 'desconhecido'}", que não está entre os tipos fiscais de serviço configurados.`);
        }
      }
      // O vínculo atual da Ellon é substituído: o par externo também é único.
      const occupied = await prisma.ellonEntityLink.findUnique({
        where: { entityType_externalId_externalSequence: { entityType: dto.entityType, externalId: dto.externalId, externalSequence: dto.externalSequence } },
      });
      if (occupied && occupied.localId !== dto.localId) {
        throw ApiError.conflict(`Este item Ellon já está vinculado a outro registro local (${occupied.localId}).`);
      }
      const data = await prisma.ellonEntityLink.upsert({
        where: { entityType_localId: { entityType: dto.entityType, localId: dto.localId } },
        update: { externalId: dto.externalId, externalSequence: dto.externalSequence, metadata: dto.metadata as object },
        create: { ...dto, metadata: dto.metadata as object },
      });
      res.json({ success: true, data });
    } catch (error) { next(error); }
  };

  /** Itens Ellon (produtos importados) para escolher o código comercial de um serviço. */
  searchCatalog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { search } = catalogQuerySchema.parse(req.query);
      const products = await prisma.product.findMany({
        where: { OR: [{ name: { contains: search, mode: 'insensitive' } }, { sku: { contains: search, mode: 'insensitive' } }] },
        select: { id: true, name: true, sku: true, salePrice: true, specifications: true },
        take: 60,
      });
      const links = await prisma.ellonEntityLink.findMany({ where: { entityType: 'PRODUCT', localId: { in: products.map(item => item.id) } } });
      const linkByProduct = new Map(links.map(link => [link.localId, link]));
      const data = products.flatMap(product => {
        const link = linkByProduct.get(product.id);
        if (!link) return [];
        const specs = linkMetadata(product.specifications);
        return [{
          externalId: link.externalId, externalSequence: link.externalSequence, name: product.name, sku: product.sku,
          salePrice: Number(product.salePrice), type: typeof specs.type === 'string' ? specs.type : null,
          unit: typeof specs.unit === 'string' ? specs.unit : null,
        }];
      }).slice(0, 30);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  };

  /** Serviços do M2 com o vínculo Ellon atual (mão de obra não existe na API). */
  listServices = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const services = await prisma.service.findMany({ where: { status: 'ACTIVE' }, select: { id: true, name: true, category: true }, orderBy: { name: 'asc' } });
      const links = await prisma.ellonEntityLink.findMany({ where: { entityType: 'SERVICE', localId: { in: services.map(item => item.id) } } });
      const linkByService = new Map(links.map(link => [link.localId, link]));
      const data = await Promise.all(services.map(async service => {
        const link = linkByService.get(service.id);
        return {
          ...service,
          link: link ? {
            id: link.id, externalId: link.externalId, externalSequence: link.externalSequence,
            ellonType: await ellonExportService.ellonItemType(link.externalId, link.externalSequence),
          } : null,
        };
      }));
      res.json({ success: true, data });
    } catch (error) { next(error); }
  };

  /** Valores usados no M2 e formas de pagamento recebidas da Ellon, para montar o mapa. */
  listPaymentMethods = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const [used, ellon] = await Promise.all([
        prisma.order.groupBy({ by: ['paymentMethod'], _count: { _all: true }, orderBy: { paymentMethod: 'asc' } }),
        prisma.ellonSnapshot.findMany({ where: { type: 'PAYMENT_METHOD' }, select: { externalId: true, name: true }, orderBy: { name: 'asc' } }),
      ]);
      res.json({ success: true, data: { m2: used.map(item => ({ value: item.paymentMethod, orders: item._count._all })), ellon } });
    } catch (error) { next(error); }
  };

  /** Tudo que exige ação humana: divergências, cancelamentos, reservas vencidas, conflitos. */
  getPending = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const [orderLinks, cancellations, reservations, customerLinks, parkedJobs] = await Promise.all([
        prisma.ellonEntityLink.findMany({
          where: { entityType: { in: ['ORDER', 'SERVICE_ORDER'] }, metadata: { path: ['totalDivergence'], not: Prisma.AnyNull } },
          orderBy: { updatedAt: 'desc' }, take: 200,
        }),
        ellonCancellationService.pendingRequests(),
        ellonStockService.reservations(),
        prisma.ellonEntityLink.findMany({
          where: { entityType: 'CUSTOMER', metadata: { path: ['conflictExternalId'], not: Prisma.AnyNull } }, take: 100,
        }),
        prisma.ellonJob.findMany({
          where: { status: 'FAILED', nextAttemptAt: { gte: new Date('9000-01-01') } }, orderBy: { updatedAt: 'desc' }, take: 50,
        }),
      ]);
      const divergences = orderLinks.filter(link => {
        const metadata = linkMetadata(link.metadata);
        const divergence = linkMetadata(metadata.totalDivergence);
        return divergence.difference !== undefined && metadata.divergenceAcknowledgedDifference !== divergence.difference;
      });
      res.json({
        success: true,
        data: {
          divergences,
          cancellations,
          reservations: {
            active: reservations.filter(item => !item.expired),
            expired: reservations.filter(item => item.expired),
          },
          customerConflicts: customerLinks.filter(link => linkMetadata(link.metadata).conflictExternalId),
          parkedJobs,
        },
      });
    } catch (error) { next(error); }
  };

  acknowledgeDivergence = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const link = await prisma.ellonEntityLink.findUnique({ where: { id: req.params.id } });
      if (!link) throw ApiError.notFound('Vínculo não encontrado.');
      const metadata = linkMetadata(link.metadata);
      const divergence = linkMetadata(metadata.totalDivergence);
      const data = await prisma.ellonEntityLink.update({
        where: { id: link.id },
        data: {
          metadata: {
            ...metadata,
            divergenceAcknowledgedDifference: divergence.difference ?? null,
            divergenceAcknowledgedAt: new Date().toISOString(),
            divergenceAcknowledgedBy: req.admin?.adminId ?? null,
          } as Prisma.InputJsonValue,
        },
      });
      res.json({ success: true, data });
    } catch (error) { next(error); }
  };

  getContract = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const [swagger, observed] = await Promise.all([ellonContractService.swaggerSummary(), ellonContractService.observed()]);
      res.json({ success: true, data: { swagger, observed } });
    } catch (error) { next(error); }
  };

  refreshContract = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { res.json({ success: true, data: await ellonContractService.refreshSwagger() }); } catch (error) { next(error); }
  };

  createDefaultCustomer = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { res.json({ success: true, data: await ellonContractService.createDefaultCustomer() }); } catch (error) { next(error); }
  };

  orderStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const entity = cancellationEntitySchema.parse(req.params.entity) === 'order' ? 'ORDER' : 'SERVICE_ORDER';
      res.json({ success: true, data: await ellonStoreService.status(entity, req.params.id) });
    } catch (error) { next(error); }
  };

  /** Consulta o pré-pedido na Ellon agora, sem esperar a sincronização. */
  refreshOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const entity = cancellationEntitySchema.parse(req.params.entity) === 'order' ? 'ORDER' : 'SERVICE_ORDER';
      const refreshed = await ellonMasterSyncService.refreshPreOrder(entity, req.params.id);
      if (!refreshed) throw ApiError.badRequest('Este registro ainda não foi enviado à Ellon.');
      res.json({ success: true, data: { ...(await ellonStoreService.status(entity, req.params.id)), found: refreshed.found, errors: refreshed.errors } });
    } catch (error) { next(error); }
  };

  customerHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { res.json({ success: true, data: await ellonStoreService.customerHistory(req.params.customerId) }); } catch (error) { next(error); }
  };

  salesReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = salesReportQuerySchema.parse(req.query);
      const { start, end } = reportRange(query.from, query.to);
      res.json({ success: true, data: await ellonStoreService.salesReport(start, end) });
    } catch (error) { next(error); }
  };

  requestCancellation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const entity = cancellationEntitySchema.parse(req.params.entity);
      const data = await ellonCancellationService.request(entity === 'order' ? 'ORDER' : 'SERVICE_ORDER', req.params.id, req.admin?.adminId);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  };

  removeLink = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await prisma.ellonEntityLink.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) { next(error); }
  };

  preflightServiceOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { res.json({ success: true, data: await ellonExportService.preflightServiceOrder(req.params.id) }); } catch (error) { next(error); }
  };

  exportServiceOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await ellonExportService.enqueueServiceOrder(req.params.id, req.admin?.adminId);
      res.status(202).json({ success: true, data });
    } catch (error) { next(error); }
  };

  listJobs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = queryEllonJobsSchema.parse(req.query);
      const result = await ellonExportService.listJobs(query.status, query.page, query.limit);
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  };

  retryJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { res.json({ success: true, data: await ellonJobService.retry(req.params.id) }); } catch (error) { next(error); }
  };

  syncProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await ellonProductSyncService.enqueue(req.admin?.adminId, true);
      res.status(202).json({ success: true, data });
    } catch (error) { next(error); }
  };
}

export const ellonController = new EllonController();
