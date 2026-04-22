import api from "./apiClient";

// ==================== TYPES ====================

export interface SalesByMonth {
  month: string;
  year: number;
  monthNumber: number;
  orders: number;
  revenue: number;
}

export interface TopCategory {
  name: string;
  salesCount: number;
  revenue: number;
  percentage: number;
}

export interface GrowthComparison {
  current: {
    revenue: number;
    orders: number;
    averageTicket: number;
    period: string;
  };
  previous: {
    revenue: number;
    orders: number;
    averageTicket: number;
    period: string;
  };
  growth: {
    revenuePercentage: number;
    ordersPercentage: number;
    averageTicketPercentage: number;
  };
}

export interface CompleteReportData {
  salesByMonth: SalesByMonth[];
  topCategories: TopCategory[];
  growthComparison: GrowthComparison;
  totalRevenue: number;
  totalOrders: number;
  averageTicket: number;
}

// ==================== API RESPONSES ====================

interface SalesByMonthResponse {
  data: SalesByMonth[];
  year: number;
}

interface TopCategoriesResponse {
  data: TopCategory[];
}

interface GrowthComparisonResponse {
  data: GrowthComparison;
}

interface CompleteReportResponse {
  data: CompleteReportData;
  year: number;
}

interface ExportReportPdfPayload {
  html: string;
  filename?: string;
  year?: number;
}

// ==================== SERVICE ====================

class ReportsService {
  private baseUrl = "/admin/reports";

  /**
   * Get sales aggregated by month for a specific year
   */
  async getSalesByMonth(year?: number): Promise<SalesByMonth[]> {
    const params = year ? { year: year.toString() } : {};
    const response = await api.get<SalesByMonthResponse>(
      `${this.baseUrl}/sales-by-month`,
      { params }
    );
    return response.data.data;
  }

  /**
   * Get top selling categories
   */
  async getTopCategories(limit: number = 5): Promise<TopCategory[]> {
    const response = await api.get<TopCategoriesResponse>(
      `${this.baseUrl}/top-categories`,
      { params: { limit: limit.toString() } }
    );
    return response.data.data;
  }

  /**
   * Get growth comparison between periods
   */
  async getGrowthComparison(params?: {
    currentYear?: number;
    currentMonth?: number;
    previousYear?: number;
    previousMonth?: number;
  }): Promise<GrowthComparison> {
    const queryParams: Record<string, string> = {};

    if (params?.currentYear) queryParams.currentYear = params.currentYear.toString();
    if (params?.currentMonth) queryParams.currentMonth = params.currentMonth.toString();
    if (params?.previousYear) queryParams.previousYear = params.previousYear.toString();
    if (params?.previousMonth) queryParams.previousMonth = params.previousMonth.toString();

    const response = await api.get<GrowthComparisonResponse>(
      `${this.baseUrl}/growth-comparison`,
      { params: queryParams }
    );
    return response.data.data;
  }

  /**
   * Get complete report with all data
   */
  async getCompleteReport(year?: number): Promise<CompleteReportData> {
    const params = year ? { year: year.toString() } : {};
    const response = await api.get<CompleteReportResponse>(
      `${this.baseUrl}/complete`,
      { params }
    );
    return response.data.data;
  }

  /**
   * Export report data as CSV
   */
  async exportToCSV(year?: number): Promise<void> {
    const params = year ? { year: year.toString(), format: 'csv' } : { format: 'csv' };

    const response = await api.get(`${this.baseUrl}/export`, {
      params,
      responseType: 'blob'
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio-vendas-${year || new Date().getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  async exportToPDF(payload: ExportReportPdfPayload): Promise<void> {
    const params = payload.year ? { year: payload.year.toString() } : undefined;
    const response = await api.post(`${this.baseUrl}/export-pdf`, payload, {
      params,
      responseType: "blob",
      timeout: 30000,
    });

    const contentDisposition = response.headers["content-disposition"];
    const fallbackFilename =
      payload.filename || `relatorio-vendas-${payload.year || new Date().getFullYear()}.pdf`;
    const matchedFilename = contentDisposition?.match(/filename="?([^"]+)"?/i)?.[1];
    const filename = matchedFilename || fallbackFilename;

    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
}

export const reportsService = new ReportsService();
