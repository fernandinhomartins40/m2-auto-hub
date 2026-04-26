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

const escapeHtml = (value?: string | null) =>
  (value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

const formatNumber = (value: number) => new Intl.NumberFormat("pt-BR").format(value);
const formatPercent = (value: number) => `${value.toFixed(1)}%`;
const formatDateTime = (value: Date) => value.toLocaleString("pt-BR");

const getGrowthClass = (value: number) => {
  if (value > 0) return "status-approved";
  if (value < 0) return "status-rejected";
  return "status-info";
};

export const getReportPdfFilename = (year: number) => `relatorio-vendas-${year}.pdf`;

export const buildReportPdfHtml = (
  report: CompleteReportData,
  stats: ReportPdfStats,
  year: number
) => {
  const generatedAt = formatDateTime(new Date());
  const bestMonth = [...report.salesByMonth].sort((a, b) => b.revenue - a.revenue)[0];

  const salesRows =
    report.salesByMonth.length > 0
      ? report.salesByMonth
          .map(
            (month, index) => `
      <tr>
        <td>
          <div class="pdf-table-primary">
            <span class="pdf-table-index">${String(index + 1).padStart(2, "0")}</span>
            <div>
              <strong>${escapeHtml(month.month)}/${month.year}</strong>
              <div class="pdf-table-secondary">Mês de referência</div>
            </div>
          </div>
        </td>
        <td>${formatNumber(month.orders)}</td>
        <td>${formatCurrency(month.revenue)}</td>
      </tr>
    `
          )
          .join("")
      : `
      <tr>
        <td colspan="3">Nenhum dado de vendas disponível para este período.</td>
      </tr>
    `;

  const categoriesRows =
    report.topCategories.length > 0
      ? report.topCategories
          .map(
            (category, index) => `
      <tr>
        <td><strong>#${index + 1} ${escapeHtml(category.name)}</strong></td>
        <td>${formatNumber(category.salesCount)}</td>
        <td>${formatCurrency(category.revenue)}</td>
        <td>${formatPercent(category.percentage)}</td>
      </tr>
    `
          )
          .join("")
      : `
      <tr>
        <td colspan="4">Nenhuma categoria com vendas registradas.</td>
      </tr>
    `;

  return `
    <section class="pdf-document pdf-document--report">
      <header class="pdf-hero pdf-hero--report">
        <div class="pdf-hero-content">
          <span class="pdf-eyebrow">Inteligência operacional</span>
          <h1 class="pdf-title">Relatório gerencial ${year}</h1>
          <p class="pdf-subtitle">
            Consolidação executiva de vendas, estoque, conversão e desempenho comercial do período.
          </p>
        </div>
        <div class="pdf-hero-aside">
          <div class="pdf-hero-code">Ano-base ${year}</div>
          <span class="pdf-chip status-info">Gerado em ${escapeHtml(generatedAt)}</span>
        </div>
      </header>

      <section class="pdf-stat-grid pdf-stat-grid--quad">
        <article class="pdf-stat-card pdf-stat-card--accent">
          <span class="pdf-stat-label">Receita total</span>
          <strong class="pdf-stat-value">${formatCurrency(report.totalRevenue)}</strong>
        </article>
        <article class="pdf-stat-card">
          <span class="pdf-stat-label">Pedidos</span>
          <strong class="pdf-stat-value">${formatNumber(report.totalOrders)}</strong>
        </article>
        <article class="pdf-stat-card">
          <span class="pdf-stat-label">Ticket médio</span>
          <strong class="pdf-stat-value">${formatCurrency(report.averageTicket)}</strong>
        </article>
        <article class="pdf-stat-card">
          <span class="pdf-stat-label">Melhor mês</span>
          <strong class="pdf-stat-value">${
            bestMonth
              ? `${escapeHtml(bestMonth.month)} · ${formatCurrency(bestMonth.revenue)}`
              : "Não disponível"
          }</strong>
        </article>
      </section>

      <section class="pdf-grid">
        <article class="pdf-card">
          <div class="pdf-section-heading">
            <span class="pdf-section-kicker">Comparativo</span>
            <h2 class="pdf-card-title">Janela atual</h2>
          </div>
          <div class="pdf-meta-list">
            <div class="pdf-meta-row">
              <span class="pdf-label">Período</span>
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
              <span class="pdf-label">Ticket médio</span>
              <span class="pdf-value">${formatCurrency(report.growthComparison.current.averageTicket)}</span>
            </div>
          </div>
        </article>

        <article class="pdf-card">
          <div class="pdf-section-heading">
            <span class="pdf-section-kicker">Variação</span>
            <h2 class="pdf-card-title">Indicadores de crescimento</h2>
          </div>
          <div class="pdf-chip-row">
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
          <div class="pdf-note-inline">
            Comparativo calculado sobre o período anterior configurado pelo relatório.
          </div>
        </article>
      </section>

      <section class="pdf-grid">
        <article class="pdf-card">
          <div class="pdf-section-heading">
            <span class="pdf-section-kicker">Estoque</span>
            <h2 class="pdf-card-title">Saúde do catálogo</h2>
          </div>
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
              <span class="pdf-label">Valor do inventário</span>
              <span class="pdf-value">${formatCurrency(stats.totalInventoryValue)}</span>
            </div>
          </div>
        </article>

        <article class="pdf-card">
          <div class="pdf-section-heading">
            <span class="pdf-section-kicker">Operação</span>
            <h2 class="pdf-card-title">Atendimento e marketing</h2>
          </div>
          <div class="pdf-meta-list">
            <div class="pdf-meta-row">
              <span class="pdf-label">Total de serviços</span>
              <span class="pdf-value">${formatNumber(stats.totalServices)}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Serviços ativos</span>
              <span class="pdf-value">${formatNumber(stats.activeServices)}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Orçamentos pendentes</span>
              <span class="pdf-value">${formatNumber(stats.pendingQuotes)}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Cupons válidos</span>
              <span class="pdf-value">${formatNumber(stats.activeCoupons)} / ${formatNumber(stats.totalCoupons)}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Clientes cadastrados</span>
              <span class="pdf-value">${formatNumber(stats.totalCustomers)}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Taxa de conversão</span>
              <span class="pdf-value">${formatPercent(stats.conversionRate)}</span>
            </div>
          </div>
        </article>
      </section>

      <section class="pdf-panel">
        <div class="pdf-section-heading">
          <span class="pdf-section-kicker">Receita</span>
          <h2 class="pdf-card-title">Vendas por mês</h2>
        </div>
        <table class="pdf-items">
          <thead>
            <tr>
              <th>Mês</th>
              <th>Pedidos</th>
              <th>Receita</th>
            </tr>
          </thead>
          <tbody>
            ${salesRows}
          </tbody>
        </table>
      </section>

      <section class="pdf-panel">
        <div class="pdf-section-heading">
          <span class="pdf-section-kicker">Mix comercial</span>
          <h2 class="pdf-card-title">Top categorias</h2>
        </div>
        <table class="pdf-items">
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Vendas</th>
              <th>Receita</th>
              <th>Participação</th>
            </tr>
          </thead>
          <tbody>
            ${categoriesRows}
          </tbody>
        </table>
      </section>

      <section class="pdf-notes pdf-notes--soft">
        <div class="pdf-section-heading">
          <span class="pdf-section-kicker">Contexto</span>
          <h2 class="pdf-card-title">Leitura do documento</h2>
        </div>
        <p>
          Este PDF replica os indicadores da aba de relatórios no momento da exportação e foi
          pensado para leitura executiva, acompanhamento mensal e compartilhamento interno.
        </p>
      </section>
    </section>
  `;
};
