import { prisma } from "@config/database.js";
import { Prisma } from "@prisma/client";

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

export interface ReportData {
  salesByMonth: SalesByMonth[];
  topCategories: TopCategory[];
  growthComparison: GrowthComparison;
  totalRevenue: number;
  totalOrders: number;
  averageTicket: number;
}

// ==================== SERVICE ====================

export class ReportsService {

  /**
   * Get sales aggregated by month for a specific year
   */
  async getSalesByMonth(year: number = new Date().getFullYear()): Promise<SalesByMonth[]> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    // Query to get sales by month
    const salesData = await prisma.$queryRaw<Array<{
      month: number;
      orders: bigint;
      revenue: Prisma.Decimal;
    }>>`
      SELECT
        EXTRACT(MONTH FROM "createdAt")::integer as month,
        COUNT(*)::bigint as orders,
        COALESCE(SUM(total), 0) as revenue
      FROM "orders"
      WHERE "createdAt" >= ${startDate}
        AND "createdAt" <= ${endDate}
        AND status IN ('DELIVERED', 'CONFIRMED', 'IN_PRODUCTION', 'SHIPPED')
      GROUP BY EXTRACT(MONTH FROM "createdAt")
      ORDER BY month
    `;

    // Create array for all 12 months
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const salesByMonth: SalesByMonth[] = [];

    for (let i = 1; i <= 12; i++) {
      const monthData = salesData.find((d: { month: number }) => d.month === i);
      salesByMonth.push({
        month: monthNames[i - 1],
        year,
        monthNumber: i,
        orders: monthData ? Number(monthData.orders) : 0,
        revenue: monthData ? Number(monthData.revenue) : 0
      });
    }

    return salesByMonth;
  }

  /**
   * Get top selling categories
   */
  async getTopCategories(limit: number = 5): Promise<TopCategory[]> {
    const categoriesData = await prisma.$queryRaw<Array<{
      category: string;
      sales_count: bigint;
      revenue: Prisma.Decimal;
    }>>`
      SELECT
        p.category,
        COUNT(oi.id)::bigint as sales_count,
        COALESCE(SUM(oi.price * oi.quantity), 0) as revenue
      FROM "order_items" oi
      JOIN "products" p ON oi."productId" = p.id
      JOIN "orders" o ON oi."orderId" = o.id
      WHERE o.status IN ('DELIVERED', 'CONFIRMED', 'IN_PRODUCTION', 'SHIPPED')
      GROUP BY p.category
      ORDER BY revenue DESC
      LIMIT ${limit}
    `;

    // Calculate total revenue for percentage
    const totalRevenue = categoriesData.reduce((sum: number, cat: any) => sum + Number(cat.revenue), 0);

    return categoriesData.map((cat: any) => ({
      name: cat.category,
      salesCount: Number(cat.sales_count),
      revenue: Number(cat.revenue),
      percentage: totalRevenue > 0 ? (Number(cat.revenue) / totalRevenue) * 100 : 0
    }));
  }

  /**
   * Compare growth between two periods
   */
  async getGrowthComparison(
    currentYear: number = new Date().getFullYear(),
    currentMonth: number = new Date().getMonth() + 1,
    previousYear?: number,
    previousMonth?: number
  ): Promise<GrowthComparison> {
    // Default to previous month
    if (!previousYear || !previousMonth) {
      if (currentMonth === 1) {
        previousYear = currentYear - 1;
        previousMonth = 12;
      } else {
        previousYear = currentYear;
        previousMonth = currentMonth - 1;
      }
    }

    // Current period
    const currentStart = new Date(currentYear, currentMonth - 1, 1);
    const currentEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59);

    // Previous period
    const previousStart = new Date(previousYear, previousMonth - 1, 1);
    const previousEnd = new Date(previousYear, previousMonth, 0, 23, 59, 59);

    const [currentData, previousData] = await Promise.all([
      this.getPeriodStats(currentStart, currentEnd),
      this.getPeriodStats(previousStart, previousEnd)
    ]);

    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    return {
      current: {
        revenue: currentData.revenue,
        orders: currentData.orders,
        averageTicket: currentData.averageTicket,
        period: `${monthNames[currentMonth - 1]}/${currentYear}`
      },
      previous: {
        revenue: previousData.revenue,
        orders: previousData.orders,
        averageTicket: previousData.averageTicket,
        period: `${monthNames[previousMonth - 1]}/${previousYear}`
      },
      growth: {
        revenuePercentage: this.calculateGrowth(currentData.revenue, previousData.revenue),
        ordersPercentage: this.calculateGrowth(currentData.orders, previousData.orders),
        averageTicketPercentage: this.calculateGrowth(currentData.averageTicket, previousData.averageTicket)
      }
    };
  }

  /**
   * Get complete report data
   */
  async getCompleteReport(year: number = new Date().getFullYear()): Promise<ReportData> {
    const [salesByMonth, topCategories, growthComparison] = await Promise.all([
      this.getSalesByMonth(year),
      this.getTopCategories(5),
      this.getGrowthComparison()
    ]);

    const totalRevenue = salesByMonth.reduce((sum, month) => sum + month.revenue, 0);
    const totalOrders = salesByMonth.reduce((sum, month) => sum + month.orders, 0);
    const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      salesByMonth,
      topCategories,
      growthComparison,
      totalRevenue,
      totalOrders,
      averageTicket
    };
  }

  /**
   * Export report data as CSV
   */
  async exportToCSV(year: number = new Date().getFullYear()): Promise<string> {
    const report = await this.getCompleteReport(year);

    let csv = 'RELATÓRIO DE VENDAS - MORIA PEÇAS E SERVIÇOS\n\n';

    // Sales by month
    csv += 'VENDAS POR MÊS\n';
    csv += 'Mês,Pedidos,Receita\n';
    report.salesByMonth.forEach(month => {
      csv += `${month.month}/${year},${month.orders},R$ ${month.revenue.toFixed(2)}\n`;
    });

    csv += '\n';

    // Top categories
    csv += 'TOP CATEGORIAS\n';
    csv += 'Categoria,Vendas,Receita,Porcentagem\n';
    report.topCategories.forEach(cat => {
      csv += `${cat.name},${cat.salesCount},R$ ${cat.revenue.toFixed(2)},${cat.percentage.toFixed(1)}%\n`;
    });

    csv += '\n';

    // Summary
    csv += 'RESUMO ANUAL\n';
    csv += `Total de Pedidos,${report.totalOrders}\n`;
    csv += `Receita Total,R$ ${report.totalRevenue.toFixed(2)}\n`;
    csv += `Ticket Médio,R$ ${report.averageTicket.toFixed(2)}\n`;

    return csv;
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Get statistics for a specific period
   */
  private async getPeriodStats(startDate: Date, endDate: Date): Promise<{
    revenue: number;
    orders: number;
    averageTicket: number;
  }> {
    const stats = await prisma.order.aggregate({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        status: {
          in: ['DELIVERED', 'CONFIRMED', 'IN_PRODUCTION', 'SHIPPED']
        }
      },
      _sum: {
        total: true
      },
      _count: true
    });

    const revenue = Number(stats._sum?.total || 0);
    const orders = Number(stats._count || 0);
    const averageTicket = orders > 0 ? revenue / orders : 0;

    return { revenue, orders, averageTicket };
  }

  /**
   * Calculate growth percentage
   */
  private calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }
}

export const reportsService = new ReportsService();
