import { NextFunction, Request, Response } from 'express';
import { prisma } from '@config/database.js';
import { ellonClient } from './ellon.client.js';
import { ellonConnectionService } from './ellon-connection.service.js';
import { ellonExportService } from './ellon-export.service.js';
import { ellonJobService } from './ellon-job.service.js';
import { queryEllonJobsSchema, updateEllonConfigSchema, upsertEllonLinkSchema } from './dto/ellon.dto.js';
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
      const entityType = upsertEllonLinkSchema.shape.entityType.optional().parse(req.query.entityType);
      const data = await prisma.ellonEntityLink.findMany({
        where: entityType ? { entityType } : undefined,
        orderBy: { updatedAt: 'desc' },
      });
      res.json({ success: true, data });
    } catch (error) { next(error); }
  };

  upsertLink = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = upsertEllonLinkSchema.parse(req.body);
      const data = await prisma.ellonEntityLink.upsert({
        where: { entityType_localId: { entityType: dto.entityType, localId: dto.localId } },
        update: { externalId: dto.externalId, externalSequence: dto.externalSequence, metadata: dto.metadata as object },
        create: { ...dto, metadata: dto.metadata as object },
      });
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
