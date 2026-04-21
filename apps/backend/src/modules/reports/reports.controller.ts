import { Request, Response } from "express";
import { reportsService } from "./reports.service.js";
import { z } from "zod";
import pdfGeneratorService from "@shared/services/pdf-generator.service.js";

// ==================== VALIDATION SCHEMAS ====================

const yearSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100).optional()
});

const growthComparisonSchema = z.object({
  currentYear: z.coerce.number().int().min(2020).max(2100).optional(),
  currentMonth: z.coerce.number().int().min(1).max(12).optional(),
  previousYear: z.coerce.number().int().min(2020).max(2100).optional(),
  previousMonth: z.coerce.number().int().min(1).max(12).optional()
});

const topCategoriesSchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).optional()
});

const exportSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100).optional(),
  format: z.enum(['csv']).optional()
});

const exportPdfSchema = z.object({
  html: z.string().min(1),
  filename: z.string().min(1).max(200).optional(),
});

// ==================== CONTROLLER ====================

export class ReportsController {

  /**
   * GET /api/admin/reports/sales-by-month
   * Get sales aggregated by month
   */
  async getSalesByMonth(req: Request, res: Response) {
    try {
      const { year } = yearSchema.parse(req.query);
      const currentYear = year || new Date().getFullYear();

      const salesByMonth = await reportsService.getSalesByMonth(currentYear);

      return res.status(200).json({
        data: salesByMonth,
        year: currentYear
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validação falhou",
          details: error.errors
        });
      }

      console.error("Error fetching sales by month:", error);
      return res.status(500).json({
        error: "Erro ao buscar vendas por mês"
      });
    }
  }

  /**
   * GET /api/admin/reports/top-categories
   * Get top selling categories
   */
  async getTopCategories(req: Request, res: Response) {
    try {
      const { limit } = topCategoriesSchema.parse(req.query);

      const topCategories = await reportsService.getTopCategories(limit || 5);

      return res.status(200).json({
        data: topCategories
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validação falhou",
          details: error.errors
        });
      }

      console.error("Error fetching top categories:", error);
      return res.status(500).json({
        error: "Erro ao buscar top categorias"
      });
    }
  }

  /**
   * GET /api/admin/reports/growth-comparison
   * Compare growth between periods
   */
  async getGrowthComparison(req: Request, res: Response) {
    try {
      const params = growthComparisonSchema.parse(req.query);

      const growthComparison = await reportsService.getGrowthComparison(
        params.currentYear,
        params.currentMonth,
        params.previousYear,
        params.previousMonth
      );

      return res.status(200).json({
        data: growthComparison
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validação falhou",
          details: error.errors
        });
      }

      console.error("Error fetching growth comparison:", error);
      return res.status(500).json({
        error: "Erro ao buscar comparação de crescimento"
      });
    }
  }

  /**
   * GET /api/admin/reports/complete
   * Get complete report with all data
   */
  async getCompleteReport(req: Request, res: Response) {
    try {
      const { year } = yearSchema.parse(req.query);
      const currentYear = year || new Date().getFullYear();

      const report = await reportsService.getCompleteReport(currentYear);

      return res.status(200).json({
        data: report,
        year: currentYear
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validação falhou",
          details: error.errors
        });
      }

      console.error("Error fetching complete report:", error);
      return res.status(500).json({
        error: "Erro ao buscar relatório completo"
      });
    }
  }

  /**
   * GET /api/admin/reports/export
   * Export report data
   */
  async exportReport(req: Request, res: Response) {
    try {
      const { year, format } = exportSchema.parse(req.query);
      const currentYear = year || new Date().getFullYear();
      const exportFormat = format || 'csv';

      if (exportFormat === 'csv') {
        const csv = await reportsService.exportToCSV(currentYear);

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=relatorio-vendas-${currentYear}.csv`);

        return res.status(200).send('\uFEFF' + csv); // BOM for UTF-8
      }

      return res.status(400).json({
        error: "Formato de exportação não suportado"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validação falhou",
          details: error.errors
        });
      }

      console.error("Error exporting report:", error);
      return res.status(500).json({
        error: "Erro ao exportar relatório"
      });
    }
  }

  /**
   * POST /api/admin/reports/export-pdf
   * Export report data as PDF
   */
  async exportReportPdf(req: Request, res: Response) {
    try {
      const { html, filename } = exportPdfSchema.parse(req.body);
      const currentYear = yearSchema.parse(req.query).year || new Date().getFullYear();
      const pdfBuffer = await pdfGeneratorService.generatePdfBuffer({
        title: `Relatorio ${currentYear}`,
        bodyHtml: html,
      });

      const safeFilename = pdfGeneratorService.sanitizeFilename(
        filename || `relatorio-vendas-${currentYear}`
      );

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);
      res.setHeader("Content-Length", pdfBuffer.length.toString());

      return res.status(200).send(pdfBuffer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validacao falhou",
          details: error.errors
        });
      }

      console.error("Error exporting report PDF:", error);
      return res.status(500).json({
        error: "Erro ao exportar relatorio em PDF"
      });
    }
  }
}

export const reportsController = new ReportsController();
