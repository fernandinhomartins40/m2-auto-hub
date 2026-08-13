import { Request, Response, NextFunction } from 'express';
import { RevisionsService } from './revisions.service.js';
import { createRevisionSchema } from './dto/create-revision.dto.js';
import { updateRevisionSchema } from './dto/update-revision.dto.js';
import { RevisionStatus } from '@prisma/client';
import { z } from 'zod';
import pdfGeneratorService from '@shared/services/pdf-generator.service.js';

const exportRevisionPdfSchema = z.object({
  html: z
    .string()
    .trim()
    .min(1, 'HTML do PDF e obrigatorio')
    .max(2_000_000, 'HTML do PDF excede o limite suportado'),
  filename: z.string().trim().min(1).max(120).optional(),
});

export class RevisionsController {
  private revisionsService: RevisionsService;

  constructor() {
    this.revisionsService = new RevisionsService();
  }

  /**
   * GET /revisions
   * Get all revisions (Admin only - removes customer filter)
   * ✅ SECURITY FIX: STAFF (mechanics) only see their assigned revisions
   */
  getRevisions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.admin) {
        throw new Error('Admin not authenticated');
      }

      const filters: any = {};

      // ✅ CRITICAL SECURITY FIX: Filter by mechanic for STAFF role
      if (req.admin.role === 'STAFF') {
        filters.mechanicId = req.admin.adminId;
      }

      // Allow filtering by customer
      if (req.query.customerId) {
        filters.customerId = req.query.customerId as string;
      }

      if (req.query.vehicleId) {
        filters.vehicleId = req.query.vehicleId as string;
      }

      if (req.query.status) {
        filters.status = req.query.status as RevisionStatus;
      }

      if (req.query.dateFrom) {
        filters.dateFrom = new Date(req.query.dateFrom as string);
      }

      if (req.query.dateTo) {
        filters.dateTo = new Date(req.query.dateTo as string);
      }

      if (req.query.page) {
        filters.page = parseInt(req.query.page as string, 10);
      }

      if (req.query.limit) {
        filters.limit = parseInt(req.query.limit as string, 10);
      }

      const result = await this.revisionsService.getAllRevisions(filters);

      res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /revisions/:id
   * Get revision by ID (Admin)
   * ✅ SECURITY FIX: Validate ownership for STAFF
   */
  getRevisionById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.admin) {
        throw new Error('Admin not authenticated');
      }

      const revision = await this.revisionsService.getRevisionByIdAdmin(
        req.params.id,
        req.admin.role,
        req.admin.adminId
      );

      res.status(200).json({
        success: true,
        data: revision,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /revisions/:id/export-pdf
   * Export revision as PDF (Admin)
   */
  exportRevisionPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.admin) {
        throw new Error('Admin not authenticated');
      }

      const { html, filename } = exportRevisionPdfSchema.parse(req.body);
      const revision = await this.revisionsService.getRevisionByIdAdmin(
        req.params.id,
        req.admin.role,
        req.admin.adminId
      );

      const pdfBuffer = await pdfGeneratorService.generatePdfBuffer({
        title: `Revisao ${revision.id}`,
        bodyHtml: html,
      });

      const safeFilename = pdfGeneratorService.sanitizeFilename(
        filename || `revisao-${revision.id.slice(0, 8)}`
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
      res.setHeader('Content-Length', pdfBuffer.length.toString());
      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /revisions
   * Create new revision (Admin)
   */
  createRevision = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.admin) {
        throw new Error('Admin not authenticated');
      }

      const dto = createRevisionSchema.parse(req.body);
      const revision = await this.revisionsService.createRevision(
        dto.customerId,
        dto
      );

      res.status(201).json({
        success: true,
        data: revision,
      });
    } catch (error: any) {
      // Log detalhado de erros Zod
      if (error.name === 'ZodError') {
        console.error('❌ Zod validation error:', JSON.stringify(error.errors, null, 2));
        console.error('📦 Payload recebido:', JSON.stringify(req.body, null, 2));
      }
      next(error);
    }
  };

  /**
   * PUT /revisions/:id
   * Update revision (Admin)
   * ✅ SECURITY FIX: Validate ownership for STAFF
   */
  updateRevision = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.admin) {
        throw new Error('Admin not authenticated');
      }

      const dto = updateRevisionSchema.parse(req.body);
      const revision = await this.revisionsService.updateRevisionAdmin(
        req.params.id,
        dto,
        req.admin.role,
        req.admin.adminId
      );

      res.status(200).json({
        success: true,
        data: revision,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /revisions/:id
   * Delete revision (Admin)
   */
  deleteRevision = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.admin) {
        throw new Error('Admin not authenticated');
      }

      await this.revisionsService.deleteRevisionAdmin(req.params.id);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /revisions/:id/start
   * Start revision (Admin)
   */
  startRevision = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.admin) {
        throw new Error('Admin not authenticated');
      }

      const revision = await this.revisionsService.startRevisionAdmin(req.params.id);

      res.status(200).json({
        success: true,
        data: revision,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /revisions/:id/complete
   * Complete revision (Admin)
   */
  completeRevision = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.admin) {
        throw new Error('Admin not authenticated');
      }

      const revision = await this.revisionsService.completeRevisionAdmin(req.params.id);

      res.status(200).json({
        success: true,
        data: revision,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /revisions/:id/cancel
   * Cancel revision (Admin)
   */
  cancelRevision = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.admin) {
        throw new Error('Admin not authenticated');
      }

      const revision = await this.revisionsService.cancelRevisionAdmin(req.params.id);

      res.status(200).json({
        success: true,
        data: revision,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /revisions/statistics
   * Get revision statistics (Admin - all customers)
   */
  getStatistics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.admin) {
        throw new Error('Admin not authenticated');
      }

      const statistics = await this.revisionsService.getAllRevisionStatistics();

      res.status(200).json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /revisions/vehicle/:vehicleId/history
   * Get revision history for a vehicle (Admin)
   */
  getVehicleHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.admin) {
        throw new Error('Admin not authenticated');
      }

      const revisions = await this.revisionsService.getVehicleRevisionHistoryAdmin(
        req.params.vehicleId
      );

      res.status(200).json({
        success: true,
        data: revisions,
      });
    } catch (error) {
      next(error);
    }
  };

  // ==================== MECHANIC MANAGEMENT ====================

  /**
   * POST /revisions/:id/assign-mechanic
   * Assign mechanic to revision
   */
  assignMechanic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.admin) {
        throw new Error('Admin not authenticated');
      }

      const { mechanicId } = req.body;
      const revision = await this.revisionsService.assignMechanic(
        req.params.id,
        mechanicId
      );

      res.status(200).json({
        success: true,
        data: revision,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /revisions/:id/transfer-mechanic
   * Transfer revision to another mechanic
   */
  transferMechanic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.admin) {
        throw new Error('Admin not authenticated');
      }

      const { newMechanicId, reason } = req.body;
      const revision = await this.revisionsService.transferMechanic(
        req.params.id,
        newMechanicId,
        reason
      );

      res.status(200).json({
        success: true,
        data: revision,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /revisions/:id/unassign-mechanic
   * Unassign mechanic from revision
   */
  unassignMechanic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.admin) {
        throw new Error('Admin not authenticated');
      }

      const revision = await this.revisionsService.unassignMechanic(req.params.id);

      res.status(200).json({
        success: true,
        data: revision,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /revisions/mechanic/:mechanicId
   * Get revisions by mechanic
   */
  getRevisionsByMechanic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.admin) {
        throw new Error('Admin not authenticated');
      }

      const filters: any = {};

      if (req.query.status) {
        filters.status = req.query.status as string;
      }

      if (req.query.page) {
        filters.page = parseInt(req.query.page as string, 10);
      }

      if (req.query.limit) {
        filters.limit = parseInt(req.query.limit as string, 10);
      }

      const result = await this.revisionsService.getRevisionsByMechanic(
        req.params.mechanicId,
        filters
      );

      res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /revisions/mechanics/workload
   * Get all mechanics workload
   */
  getAllMechanicsWorkload = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.admin) {
        throw new Error('Admin not authenticated');
      }

      const workloads = await this.revisionsService.getAllMechanicsWorkload();

      res.status(200).json({
        success: true,
        data: workloads,
      });
    } catch (error) {
      next(error);
    }
  };
}
