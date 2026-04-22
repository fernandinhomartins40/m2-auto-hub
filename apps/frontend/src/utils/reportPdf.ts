import type { CompleteReportData } from "@/api/reportsService";

export interface ReportPdfStats {
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalInventoryValue: number;
  totalServices: number;
  activeServices: number;
  pendingQuotes: number;
  totalCoupons: number;
  activeCoupons: number;
  totalCustomers: number;
  conversionRate: number;
}

const escapeHtml = (value?: string | null) => {
  return (value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat("pt-BR").format(value);
};

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

const formatDateTime = (value: Date) => {
  return value.toLocaleString("pt-BR");
};

const getGrowthClass = (value: number) => {
  if (value > 0) return "status-approved";
  if (value < 0) return "status-rejected";
  return "status-info";
};

export const getReportPdfFilename = (year: number) => {
  return `relatorio-vendas-${year}.pdf`;
};

export const buildReportPdfHtml = (
  report: CompleteReportData,
  stats: ReportPdfStats,
  year: number
) => {
  const generatedAt = formatDateTime(new Date());
  const bestMonth = [...report.salesByMonth].sort((a, b) => b.revenue - a.revenue)[0];

  const salesRows = report.salesByMonth.length > 0
    ? report.salesByMonth.map((month) => `
      <tr>
        <td><strong>${escapeHtml(month.month)}/${month.year}</strong></td>
        <td>${formatNumber(month.orders)}</td>
        <td>${formatCurrency(month.revenue)}</td>
      </tr>
    `).join("")
    : `
      <tr>
        <td colspan="3">Nenhum dado de vendas disponivel para este periodo.</td>
      </tr>
    `;

  const categoriesRows = report.topCategories.length > 0
    ? report.topCategories.map((category, index) => `
      <tr>
        <td><strong>#${index + 1} ${escapeHtml(category.name)}</strong></td>
        <td>${formatNumber(category.salesCount)}</td>
        <td>${formatCurrency(category.revenue)}</td>
        <td>${formatPercent(category.percentage)}</td>
      </tr>
    `).join("")
    : `
      <tr>
        <td colspan="4">Nenhuma categoria com vendas registradas.</td>
      </tr>
    `;

  return `
    <section class="pdf-document pdf-document--report">
      <header class="pdf-header">
        <div class="pdf-brand">
          <span class="pdf-chip">Moria Pecas</span>
          <div class="pdf-title">Relatorio gerencial ${year}</div>
          <p class="pdf-subtitle">Resumo de vendas, crescimento e operacao exportado pelo painel administrativo.</p>
        </div>
        <div class="pdf-meta-list" style="min-width: 220px;">
          <div class="pdf-meta-row">
            <span class="pdf-label">Ano base</span>
            <span class="pdf-value">${year}</span>
          </div>
          <div class="pdf-meta-row">
            <span class="pdf-label">Gerado em</span>
            <span class="pdf-value">${escapeHtml(generatedAt)}</span>
          </div>
        </div>
      </header>

      <section class="pdf-grid">
        <article class="pdf-card">
          <h2 class="pdf-card-title">Resumo anual</h2>
          <div class="pdf-meta-list">
            <div class="pdf-meta-row">
              <span class="pdf-label">Receita total</span>
              <span class="pdf-value">${formatCurrency(report.totalRevenue)}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Pedidos</span>
              <span class="pdf-value">${formatNumber(report.totalOrders)}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Ticket medio</span>
              <span class="pdf-value">${formatCurrency(report.averageTicket)}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Melhor mes</span>
              <span class="pdf-value">${bestMonth ? `${escapeHtml(bestMonth.month)} (${formatCurrency(bestMonth.revenue)})` : "Nao disponivel"}</span>
            </div>
          </div>
        </article>

        <article class="pdf-card">
          <h2 class="pdf-card-title">Comparativo mensal</h2>
          <div class="pdf-meta-list">
            <div class="pdf-meta-row">
              <span class="pdf-label">Periodo atual</span>
              <span class="pdf-value">${escapeHtml(report.growthComparison.current.period)}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Receita</span>
              <span class="pdf-value">${formatCurrency(report.growthComparison.current.revenue)}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Pedidos</span>
              <span class="pdf-value">${formatNumber(report.growthComparison.current.orders)}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Ticket medio</span>
              <span class="pdf-value">${formatCurrency(report.growthComparison.current.averageTicket)}</span>
            </div>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px;">
            <span class="pdf-chip ${getGrowthClass(report.growthComparison.growth.revenuePercentage)}">
              Receita ${formatPercent(report.growthComparison.growth.revenuePercentage)}
            </span>
            <span class="pdf-chip ${getGrowthClass(report.growthComparison.growth.ordersPercentage)}">
              Pedidos ${formatPercent(report.growthComparison.growth.ordersPercentage)}
            </span>
            <span class="pdf-chip ${getGrowthClass(report.growthComparison.growth.averageTicketPercentage)}">
              Ticket ${formatPercent(report.growthComparison.growth.averageTicketPercentage)}
            </span>
          </div>
        </article>
      </section>

      <section class="pdf-grid">
        <article class="pdf-card">
          <h2 class="pdf-card-title">Estoque</h2>
          <div class="pdf-meta-list">
            <div class="pdf-meta-row">
              <span class="pdf-label">Total de produtos</span>
              <span class="pdf-value">${formatNumber(stats.totalProducts)}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Produtos ativos</span>
              <span class="pdf-value">${formatNumber(stats.activeProducts)}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Estoque baixo</span>
              <span class="pdf-value">${formatNumber(stats.lowStockProducts)}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Sem estoque</span>
              <span class="pdf-value">${formatNumber(stats.outOfStockProducts)}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Valor do inventario</span>
              <span class="pdf-value">${formatCurrency(stats.totalInventoryValue)}</span>
            </div>
          </div>
        </article>

        <article class="pdf-card">
          <h2 class="pdf-card-title">Operacao e marketing</h2>
          <div class="pdf-meta-list">
            <div class="pdf-meta-row">
              <span class="pdf-label">Total de servicos</span>
              <span class="pdf-value">${formatNumber(stats.totalServices)}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Servicos ativos</span>
              <span class="pdf-value">${formatNumber(stats.activeServices)}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Orcamentos pendentes</span>
              <span class="pdf-value">${formatNumber(stats.pendingQuotes)}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Cupons validos</span>
              <span class="pdf-value">${formatNumber(stats.activeCoupons)} / ${formatNumber(stats.totalCoupons)}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Clientes cadastrados</span>
              <span class="pdf-value">${formatNumber(stats.totalCustomers)}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Taxa de conversao</span>
              <span class="pdf-value">${formatPercent(stats.conversionRate)}</span>
            </div>
          </div>
        </article>
      </section>

      <section>
        <h2 class="pdf-card-title">Vendas por mes</h2>
        <table class="pdf-items">
          <thead>
            <tr>
              <th>Mes</th>
              <th>Pedidos</th>
              <th>Receita</th>
            </tr>
          </thead>
          <tbody>
            ${salesRows}
          </tbody>
        </table>
      </section>

      <section>
        <h2 class="pdf-card-title">Top categorias</h2>
        <table class="pdf-items">
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Vendas</th>
              <th>Receita</th>
              <th>Participacao</th>
            </tr>
          </thead>
          <tbody>
            ${categoriesRows}
          </tbody>
        </table>
      </section>

      <section class="pdf-notes">
        <h2 class="pdf-card-title">Observacoes</h2>
        <p>Este documento consolida os indicadores exibidos na aba de relatorios do painel administrativo no momento da exportacao.</p>
      </section>
    </section>
  `;
};
