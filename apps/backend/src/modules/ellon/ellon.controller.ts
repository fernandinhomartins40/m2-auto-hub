import { NextFunction, Request, Response } from 'express';
import { prisma } from '@config/database.js';
import { ellonClient } from './ellon.client.js';
import { ellonConnectionService } from './ellon-connection.service.js';
import { ellonExportService } from './ellon-export.service.js';
import { ellonJobService } from './ellon-job.service.js';
import { queryEllonJobsSchema, updateEllonConfigSchema, upsertEllonLinkSchema } from './dto/ellon.dto.js';

export class EllonController {
  getConfig = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { res.json({ success: true, data: await ellonConnectionService.getSafe() }); } catch (error) { next(error); }
  };

  updateConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = updateEllonConfigSchema.parse(req.body);
      res.json({ success: true, data: await ellonConnectionService.update(dto) });
    } catch (error) { next(error); }
  };

  test = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await ellonClient.testConnection();
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
}

export const ellonController = new EllonController();
