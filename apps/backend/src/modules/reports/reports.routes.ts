import { Router } from "express";
import { reportsController } from "./reports.controller.js";
import { AdminAuthMiddleware } from "@middlewares/admin-auth.middleware.js";

const router = Router();

// All reports routes require admin authentication
router.use(AdminAuthMiddleware.authenticate);

/**
 * @route   GET /api/admin/reports/sales-by-month
 * @desc    Get sales aggregated by month for a specific year
 * @access  Admin
 * @query   year (optional) - Year to get sales data (default: current year)
 */
router.get("/sales-by-month", (req, res) => reportsController.getSalesByMonth(req, res));

/**
 * @route   GET /api/admin/reports/top-categories
 * @desc    Get top selling categories
 * @access  Admin
 * @query   limit (optional) - Number of categories to return (default: 5, max: 20)
 */
router.get("/top-categories", (req, res) => reportsController.getTopCategories(req, res));

/**
 * @route   GET /api/admin/reports/growth-comparison
 * @desc    Compare growth between two periods
 * @access  Admin
 * @query   currentYear (optional) - Current year
 * @query   currentMonth (optional) - Current month (1-12)
 * @query   previousYear (optional) - Previous year
 * @query   previousMonth (optional) - Previous month (1-12)
 */
router.get("/growth-comparison", (req, res) => reportsController.getGrowthComparison(req, res));

/**
 * @route   GET /api/admin/reports/complete
 * @desc    Get complete report with all data (sales by month, top categories, growth)
 * @access  Admin
 * @query   year (optional) - Year to get report data (default: current year)
 */
router.get("/complete", (req, res) => reportsController.getCompleteReport(req, res));

/**
 * @route   GET /api/admin/reports/export
 * @desc    Export report data in CSV format
 * @access  Admin
 * @query   year (optional) - Year to export (default: current year)
 * @query   format (optional) - Export format: 'csv' (default: 'csv')
 */
router.get("/export", (req, res) => reportsController.exportReport(req, res));

/**
 * @route   POST /api/admin/reports/export-pdf
 * @desc    Export current report as PDF
 * @access  Admin
 */
router.post("/export-pdf", (req, res) => reportsController.exportReportPdf(req, res));

export default router;
