import { Request, Response } from 'express';
import { CustomerRevisionsService } from './customer-revisions.service.js';
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

export class CustomerRevisionsController {
  private customerRevisionsService: CustomerRevisionsService;

  constructor() {
    this.customerRevisionsService = new CustomerRevisionsService();
  }

  /**
   * Get all revisions for authenticated customer
   * GET /customer-revisions
   */
  getCustomerRevisions = async (req: Request, res: Response): Promise<void> => {
    const customerId = req.user?.customerId;

    if (!customerId) {
      res.status(401).json({
        success: false,
        error: 'Customer not authenticated'
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const vehicleId = req.query.vehicleId as string | undefined;
    const status = req.query.status as string | undefined;

    const result = await this.customerRevisionsService.getCustomerRevisions(
      customerId,
      { page, limit, vehicleId, status }
    );

    res.status(200).json({
      success: true,
      data: result.data,
      meta: result.meta
    });
  };

  /**
   * Get specific revision by ID for authenticated customer
   * GET /customer-revisions/:id
   */
  getCustomerRevisionById = async (req: Request, res: Response): Promise<void> => {
    const customerId = req.user?.customerId;
    const revisionId = req.params.id;

    if (!customerId) {
      res.status(401).json({
        success: false,
        error: 'Customer not authenticated'
      });
      return;
    }

    const revision = await this.customerRevisionsService.getCustomerRevisionById(
      customerId,
      revisionId
    );

    res.status(200).json({
      success: true,
      data: revision
    });
  };

  /**
   * Get revisions for specific vehicle of authenticated customer
   * GET /customer-revisions/vehicle/:vehicleId
   */
  getCustomerRevisionsByVehicle = async (req: Request, res: Response): Promise<void> => {
    const customerId = req.user?.customerId;
    const vehicleId = req.params.vehicleId;

    if (!customerId) {
      res.status(401).json({
        success: false,
        error: 'Customer not authenticated'
      });
      return;
    }

    const revisions = await this.customerRevisionsService.getCustomerRevisionsByVehicle(
      customerId,
      vehicleId
    );

    res.status(200).json({
      success: true,
      data: revisions
    });
  };

  /**
   * Get upcoming maintenance reminders for authenticated customer
   * GET /customer-revisions/reminders/upcoming
   */
  getUpcomingReminders = async (req: Request, res: Response): Promise<void> => {
    const customerId = req.user?.customerId;

    if (!customerId) {
      res.status(401).json({
        success: false,
        error: 'Customer not authenticated'
      });
      return;
    }

    const reminders = await this.customerRevisionsService.getUpcomingReminders(customerId);

    res.status(200).json({
      success: true,
      data: reminders
    });
  };

  /**
   * Get revision statistics for authenticated customer
   * GET /customer-revisions/statistics
   */
  getCustomerStatistics = async (req: Request, res: Response): Promise<void> => {
    const customerId = req.user?.customerId;

    if (!customerId) {
      res.status(401).json({
        success: false,
        error: 'Customer not authenticated'
      });
      return;
    }

    const statistics = await this.customerRevisionsService.getCustomerStatistics(customerId);

    res.status(200).json({
      success: true,
      data: statistics
    });
  };

  /**
   * POST /customer-revisions/:id/export-pdf
   */
  exportCustomerRevisionPdf = async (req: Request, res: Response): Promise<void> => {
    const customerId = req.user?.customerId;
    const revisionId = req.params.id;

    if (!customerId) {
      res.status(401).json({
        success: false,
        error: 'Customer not authenticated'
      });
      return;
    }

    const { html, filename } = exportRevisionPdfSchema.parse(req.body);
    const revision = await this.customerRevisionsService.getCustomerRevisionById(
      customerId,
      revisionId
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
  };
}
