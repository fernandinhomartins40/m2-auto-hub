import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@shared/utils/error.util.js';
import { mlPanelService } from './services/ml-panel.service.js';
import { listingService } from './services/listing.service.js';
import { mlOrderService } from './services/ml-order.service.js';
import {
  mlBulkApproveSchema,
  mlCategorySearchSchema,
  mlImagesSchema,
  mlOrderMoveSchema,
  mlOrdersQuerySchema,
  mlPanelQuerySchema,
  mlProfileSchema,
  mlSettingsSchema,
} from './dto/ml-panel.dto.js';

type Handler = (req: Request, res: Response) => Promise<unknown>;

/** Envelopa o handler no padrao { success, data } com o erro indo para o middleware. */
function handle(fn: Handler) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json({ success: true, data: await fn(req, res) });
    } catch (error) {
      next(error);
    }
  };
}

/** Painel do Mercado Livre (aptos, edicao rapida, aprovacao e regras). */
export const mlPanelController = {
  getSettings: handle(() => mlPanelService.getSettings()),
  updateSettings: handle(req => mlPanelService.updateSettings(mlSettingsSchema.parse(req.body))),
  list: handle(req => mlPanelService.list(mlPanelQuerySchema.parse(req.query))),
  detail: handle(req => mlPanelService.detail(req.params.productId)),
  suggestCategories: handle(req =>
    mlPanelService.suggestCategories(req.params.productId, mlCategorySearchSchema.parse(req.query).q)
  ),
  updateProfile: handle(req => mlPanelService.updateProfile(req.params.productId, mlProfileSchema.parse(req.body))),
  addImages: handle(req => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) throw ApiError.badRequest('Envie ao menos uma imagem.');
    return mlPanelService.addImages(req.params.productId, files);
  }),
  setImages: handle(req => mlPanelService.setImages(req.params.productId, mlImagesSchema.parse(req.body).images)),
  approve: handle(req => mlPanelService.approveAndPublish(req.params.productId, req.admin?.adminId)),
  approveMany: handle(req => mlPanelService.approveMany(mlBulkApproveSchema.parse(req.body).productIds, req.admin?.adminId)),
  activateListing: handle(req => listingService.activate(req.params.id)),

  // --- Vendas ---
  listOrders: handle(req => {
    const query = mlOrdersQuerySchema.parse(req.query);
    return mlOrderService.list(query.stage, query.page, query.pageSize);
  }),
  moveOrder: handle(req => mlOrderService.move(req.params.id, mlOrderMoveSchema.parse(req.body).action)),
  refreshOrder: handle(req => mlOrderService.refresh(req.params.id)),
  syncOrders: handle(async () => {
    await mlOrderService.pollRecent();
    return { ok: true };
  }),
  label: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { pdf, filename } = await mlOrderService.label(req.params.id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.status(200).send(pdf);
    } catch (error) {
      next(error);
    }
  },
};
