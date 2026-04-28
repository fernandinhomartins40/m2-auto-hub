import type { CompleteReportData } from "@/api/reportsService";
import type { ExportData } from "@/utils/exportUtils";

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

export type ReportExportSection =
  | "complete"
  | "overview"
  | "sales"
  | "categories"
  | "inventory"
  | "services"
  | "marketing";

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
const formatInteger = (value: number) => Math.round(value).toString();

const getGrowthClass = (value: number) => {
  if (value > 0) return "status-approved";
  if (value < 0) return "status-rejected";
  return "status-info";
};

export const getReportPdfFilename = (year: number) => `relatorio-vendas-${year}.pdf`;

export const getReportSectionTitle = (section: ReportExportSection) => {
  switch (section) {
    case "complete":
      return "Relatório gerencial completo";
    case "overview":
      return "Resumo executivo";
    case "sales":
      return "Vendas por mês";
    case "categories":
      return "Top categorias";
    case "inventory":
      return "Relatório de estoque";
    case "services":
      return "Relatório de serviços";
    case "marketing":
      return "Relatório de marketing";
    default:
      return "Relatório";
  }
};

export const getReportSectionFilename = (section: ReportExportSection, year: number) => {
  const suffix = {
    complete: "relatorio-gerencial",
    overview: "resumo-executivo",
    sales: "vendas-por-mes",
    categories: "top-categorias",
    inventory: "estoque",
    services: "servicos",
    marketing: "marketing",
  }[section];

  return `${suffix}-${year}`;
};

const getOverviewRows = (report: CompleteReportData, stats: ReportPdfStats) => [
  ["Indicador", "Valor"],
  ["Receita total do ano", formatCurrency(report.totalRevenue)],
  ["Pedidos consolidados", formatNumber(report.totalOrders)],
  ["Ticket médio", formatCurrency(report.averageTicket)],
  ["Receita do período atual", formatCurrency(report.growthComparison.current.revenue)],
  ["Pedidos do período atual", formatNumber(report.growthComparison.current.orders)],
  ["Ticket do período atual", formatCurrency(report.growthComparison.current.averageTicket)],
  ["Período analisado", report.growthComparison.current.period],
  ["Crescimento de receita", formatPercent(report.growthComparison.growth.revenuePercentage)],
  ["Crescimento de pedidos", formatPercent(report.growthComparison.growth.ordersPercentage)],
  ["Crescimento de ticket", formatPercent(report.growthComparison.growth.averageTicketPercentage)],
  ["Taxa de conversão", formatPercent(stats.conversionRate)],
];

const getInventoryRows = (stats: ReportPdfStats) => [
  ["Indicador", "Valor"],
  ["Total de produtos", formatNumber(stats.totalProducts)],
  ["Produtos ativos", formatNumber(stats.activeProducts)],
  ["Estoque baixo", formatNumber(stats.lowStockProducts)],
  ["Sem estoque", formatNumber(stats.outOfStockProducts)],
  ["Valor do inventário", formatCurrency(stats.totalInventoryValue)],
];

const getServicesRows = (stats: ReportPdfStats) => [
  ["Indicador", "Valor"],
  ["Total de serviços", formatNumber(stats.totalServices)],
  ["Serviços ativos", formatNumber(stats.activeServices)],
  ["Orçamentos pendentes", formatNumber(stats.pendingQuotes)],
  ["Taxa de conversão", formatPercent(stats.conversionRate)],
];

const getMarketingRows = (stats: ReportPdfStats) => [
  ["Indicador", "Valor"],
  ["Total de cupons", formatNumber(stats.totalCoupons)],
  ["Cupons válidos", formatNumber(stats.activeCoupons)],
  ["Base de clientes", formatNumber(stats.totalCustomers)],
  ["Orçamentos pendentes", formatNumber(stats.pendingQuotes)],
];

export const buildReportExportData = (
  section: ReportExportSection,
  report: CompleteReportData,
  stats: ReportPdfStats,
  year: number
): ExportData => {
  switch (section) {
    case "complete":
      return {
        headers: ["Seção", "Indicador", "Valor", "Observação"],
        rows: [
          ["Resumo", "Receita total", formatCurrency(report.totalRevenue), `Ano-base ${year}`],
          ["Resumo", "Pedidos", formatNumber(report.totalOrders), ""],
          ["Resumo", "Ticket médio", formatCurrency(report.averageTicket), ""],
          ["Resumo", "Período atual", report.growthComparison.current.period, ""],
          ["Resumo", "Crescimento da receita", formatPercent(report.growthComparison.growth.revenuePercentage), ""],
          ["Resumo", "Crescimento dos pedidos", formatPercent(report.growthComparison.growth.ordersPercentage), ""],
          ...report.salesByMonth.map((month) => [
            "Vendas por mês",
            `${month.month}/${month.year}`,
            formatCurrency(month.revenue),
            `${formatInteger(month.orders)} pedidos`,
          ]),
          ...report.topCategories.map((category) => [
            "Top categorias",
            category.name,
            formatCurrency(category.revenue),
            `${formatInteger(category.salesCount)} vendas · ${formatPercent(category.percentage)}`,
          ]),
          ...getInventoryRows(stats).slice(1).map(([indicator, value]) => ["Estoque", indicator, value, ""]),
          ...getServicesRows(stats).slice(1).map(([indicator, value]) => ["Serviços", indicator, value, ""]),
          ...getMarketingRows(stats).slice(1).map(([indicator, value]) => ["Marketing", indicator, value, ""]),
        ],
        filename: getReportSectionFilename(section, year),
      };
    case "overview":
      return {
        headers: getOverviewRows(report, stats)[0],
        rows: getOverviewRows(report, stats).slice(1),
        filename: getReportSectionFilename(section, year),
      };
    case "sales":
      return {
        headers: ["Mês", "Pedidos", "Receita"],
        rows: report.salesByMonth.map((month) => [
          `${month.month}/${month.year}`,
          formatInteger(month.orders),
          formatCurrency(month.revenue),
        ]),
        filename: getReportSectionFilename(section, year),
      };
    case "categories":
      return {
        headers: ["Categoria", "Vendas", "Receita", "Participação"],
        rows: report.topCategories.map((category) => [
          category.name,
          formatInteger(category.salesCount),
          formatCurrency(category.revenue),
          formatPercent(category.percentage),
        ]),
        filename: getReportSectionFilename(section, year),
      };
    case "inventory":
      return {
        headers: getInventoryRows(stats)[0],
        rows: getInventoryRows(stats).slice(1),
        filename: getReportSectionFilename(section, year),
      };
    case "services":
      return {
        headers: getServicesRows(stats)[0],
        rows: getServicesRows(stats).slice(1),
        filename: getReportSectionFilename(section, year),
      };
    case "marketing":
      return {
        headers: getMarketingRows(stats)[0],
        rows: getMarketingRows(stats).slice(1),
        filename: getReportSectionFilename(section, year),
      };
    default:
      return {
        headers: ["Indicador", "Valor"],
        rows: [],
        filename: getReportSectionFilename(section, year),
      };
  }
};

const buildSimpleTablePdfHtml = (
  title: string,
  subtitle: string,
  headers: string[],
  rows: string[][],
  note?: string
) => {
  const generatedAt = formatDateTime(new Date());
  const tableRows =
    rows.length > 0
      ? rows
          .map(
            (row) => `
      <tr>
        ${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}
      </tr>
    `
          )
          .join("")
      : `
      <tr>
        <td colspan="${headers.length}">Nenhum dado disponível para exportação.</td>
      </tr>
    `;

  return `
    <section class="pdf-document pdf-document--report">
      <header class="pdf-hero pdf-hero--report">
        <div class="pdf-hero-content">
          <span class="pdf-eyebrow">Relatórios do painel</span>
          <h1 class="pdf-title">${escapeHtml(title)}</h1>
          <p class="pdf-subtitle">${escapeHtml(subtitle)}</p>
        </div>
        <div class="pdf-hero-aside">
          <span class="pdf-chip status-info">Gerado em ${escapeHtml(generatedAt)}</span>
        </div>
      </header>

      <section class="pdf-panel">
        <table class="pdf-items">
          <thead>
            <tr>
              ${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </section>

      ${
        note
          ? `
      <section class="pdf-notes pdf-notes--soft">
        <div class="pdf-section-heading">
          <span class="pdf-section-kicker">Contexto</span>
          <h2 class="pdf-card-title">Observações</h2>
        </div>
        <p>${escapeHtml(note)}</p>
      </section>
      `
          : ""
      }
    </section>
  `;
};

export const buildReportSectionPdfHtml = (
  section: ReportExportSection,
  report: CompleteReportData,
  stats: ReportPdfStats,
  year: number
) => {
  const exportData = buildReportExportData(section, report, stats, year);
  const subtitleBySection: Record<ReportExportSection, string> = {
    complete: `Consolidação completa dos indicadores comerciais e operacionais de ${year}.`,
    overview: "Leitura rápida dos principais indicadores da operação.",
    sales: `Evolução mensal de pedidos e receita em ${year}.`,
    categories: "Participação das categorias mais relevantes em vendas.",
    inventory: "Situação atual do catálogo e do capital imobilizado em estoque.",
    services: "Indicadores da operação de serviços e funil de orçamento.",
    marketing: "Base de clientes, cupons e tração comercial do painel.",
  };

  return buildSimpleTablePdfHtml(
    getReportSectionTitle(section),
    subtitleBySection[section],
    exportData.headers,
    exportData.rows.map((row) => row.map((cell) => String(cell ?? ""))),
    section === "complete"
      ? "Documento consolidado para análise gerencial e compartilhamento interno."
      : "Documento exportado a partir da seção correspondente da aba de relatórios."
  );
};

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
