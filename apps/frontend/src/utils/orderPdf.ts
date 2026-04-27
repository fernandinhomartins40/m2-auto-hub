import type { StoreOrder } from "@/api/adminService";

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  IN_PRODUCTION: "Em produção",
  PREPARING: "Preparando",
  SHIPPED: "Enviado",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
};

const ORDER_STATUS_CLASSES: Record<string, string> = {
  PENDING: "status-pending",
  CONFIRMED: "status-info",
  IN_PRODUCTION: "status-quoted",
  PREPARING: "status-warning",
  SHIPPED: "status-info",
  DELIVERED: "status-approved",
  CANCELLED: "status-rejected",
};

const ORDER_SOURCE_LABELS: Record<string, string> = {
  website: "Site",
  whatsapp: "WhatsApp",
  phone: "Telefone",
};

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

const formatDate = (value?: string | null) => {
  if (!value) {
    return "Não informado";
  }

  return new Date(value).toLocaleString("pt-BR");
};

const getOrderStatusLabel = (status: string) => ORDER_STATUS_LABELS[status] || status;
const getOrderStatusClass = (status: string) => ORDER_STATUS_CLASSES[status] || "status-info";
const getOrderSourceLabel = (source?: string) => ORDER_SOURCE_LABELS[source || "website"] || "Site";

const buildSummaryCard = (label: string, value: string, tone: "default" | "accent" = "default") => `
  <article class="pdf-stat-card ${tone === "accent" ? "pdf-stat-card--accent" : ""}">
    <span class="pdf-stat-label">${escapeHtml(label)}</span>
    <strong class="pdf-stat-value">${escapeHtml(value)}</strong>
  </article>
`;

export const getOrderPdfFilename = (order: StoreOrder) => `pedido-${order.id.slice(0, 8)}.pdf`;

export const getOrderListPdfFilename = () =>
  `pedidos-${new Date().toISOString().slice(0, 10)}.pdf`;

export const buildOrderPdfHtml = (order: StoreOrder) => {
  const productsCount = order.items.filter((item) => item.type !== "service").length;
  const servicesCount = order.items.filter((item) => item.type === "service").length;
  const itemsRows = order.items
    .map(
      (item, index) => `
        <tr>
          <td>
            <div class="pdf-table-primary">
              <span class="pdf-table-index">${String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>${escapeHtml(item.name)}</strong>
                <div class="pdf-table-secondary">${item.type === "service" ? "Serviço" : "Produto"}</div>
              </div>
            </div>
          </td>
          <td>${item.quantity}</td>
          <td>${formatCurrency(item.price)}</td>
          <td>${formatCurrency(item.price * item.quantity)}</td>
        </tr>
      `
    )
    .join("");

  return `
    <section class="pdf-document pdf-document--order">
      <header class="pdf-hero">
        <div class="pdf-hero-content">
          <span class="pdf-eyebrow">Gestão de pedidos</span>
          <h1 class="pdf-title">Pedido #${escapeHtml(order.id.slice(0, 8))}</h1>
          <p class="pdf-subtitle">
            Documento consolidado para acompanhamento interno do pedido, com status,
            cliente, composição de itens e valor total.
          </p>
        </div>
        <div class="pdf-hero-aside">
          <span class="pdf-chip ${getOrderStatusClass(order.status)}">${escapeHtml(getOrderStatusLabel(order.status))}</span>
          <div class="pdf-hero-code">Origem ${escapeHtml(getOrderSourceLabel(order.source))}</div>
        </div>
      </header>

      <section class="pdf-stat-grid pdf-stat-grid--triple">
        ${buildSummaryCard("Cliente", order.customerName)}
        ${buildSummaryCard("Criado em", new Date(order.createdAt).toLocaleDateString("pt-BR"))}
        ${buildSummaryCard("Valor total", formatCurrency(order.total), "accent")}
      </section>

      <section class="pdf-grid">
        <article class="pdf-card">
          <div class="pdf-section-heading">
            <span class="pdf-section-kicker">Contato</span>
            <h2 class="pdf-card-title">Dados do cliente</h2>
          </div>
          <div class="pdf-meta-list">
            <div class="pdf-meta-row">
              <span class="pdf-label">Nome</span>
              <span class="pdf-value">${escapeHtml(order.customerName)}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">WhatsApp</span>
              <span class="pdf-value">${escapeHtml(order.customerWhatsApp)}</span>
            </div>
          </div>
        </article>

        <article class="pdf-card">
          <div class="pdf-section-heading">
            <span class="pdf-section-kicker">Operação</span>
            <h2 class="pdf-card-title">Resumo de execução</h2>
          </div>
          <div class="pdf-meta-list">
            <div class="pdf-meta-row">
              <span class="pdf-label">Status atual</span>
              <span class="pdf-value">${escapeHtml(getOrderStatusLabel(order.status))}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Produtos</span>
              <span class="pdf-value">${productsCount}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Serviços</span>
              <span class="pdf-value">${servicesCount}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Última atualização</span>
              <span class="pdf-value">${escapeHtml(formatDate(order.updatedAt))}</span>
            </div>
          </div>
        </article>
      </section>

      <section class="pdf-panel">
        <div class="pdf-section-heading">
          <span class="pdf-section-kicker">Composição</span>
          <h2 class="pdf-card-title">Itens do pedido</h2>
        </div>
        <table class="pdf-items">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qtd.</th>
              <th>Valor unitário</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>${itemsRows}</tbody>
        </table>
        <div class="pdf-total">
          <div class="pdf-total-box">
            <span class="pdf-total-label">Valor consolidado do pedido</span>
            <span class="pdf-total-value">${formatCurrency(order.total)}</span>
          </div>
        </div>
      </section>
    </section>
  `;
};

export const buildOrderListPdfHtml = (orders: StoreOrder[]) => {
  const totalOrders = orders.length;
  const totalValue = orders.reduce((sum, order) => sum + order.total, 0);
  const deliveredCount = orders.filter((order) => order.status === "DELIVERED").length;
  const pendingCount = orders.filter((order) => order.status === "PENDING").length;

  const rows = orders
    .map(
      (order) => `
        <tr>
          <td>#${escapeHtml(order.id.slice(0, 8))}</td>
          <td>${escapeHtml(order.customerName)}</td>
          <td>${escapeHtml(order.customerWhatsApp)}</td>
          <td>${escapeHtml(getOrderSourceLabel(order.source))}</td>
          <td>${escapeHtml(getOrderStatusLabel(order.status))}</td>
          <td>${formatDate(order.createdAt)}</td>
          <td>${formatCurrency(order.total)}</td>
        </tr>
      `
    )
    .join("");

  return `
    <section class="pdf-document pdf-document--orders-list">
      <header class="pdf-hero">
        <div class="pdf-hero-content">
          <span class="pdf-eyebrow">Gestão comercial</span>
          <h1 class="pdf-title">Listagem de pedidos</h1>
          <p class="pdf-subtitle">
            Exportação da visão filtrada da página de pedidos, com dados resumidos para
            acompanhamento operacional e conferência administrativa.
          </p>
        </div>
        <div class="pdf-hero-aside">
          <span class="pdf-chip status-info">Emitido em ${new Date().toLocaleDateString("pt-BR")}</span>
          <div class="pdf-hero-code">${totalOrders} pedido(s)</div>
        </div>
      </header>

      <section class="pdf-stat-grid pdf-stat-grid--quad">
        ${buildSummaryCard("Pedidos na listagem", String(totalOrders))}
        ${buildSummaryCard("Total consolidado", formatCurrency(totalValue), "accent")}
        ${buildSummaryCard("Entregues", String(deliveredCount))}
        ${buildSummaryCard("Pendentes", String(pendingCount))}
      </section>

      <section class="pdf-panel">
        <div class="pdf-section-heading">
          <span class="pdf-section-kicker">Visão consolidada</span>
          <h2 class="pdf-card-title">Pedidos exportados</h2>
        </div>
        <table class="pdf-items">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>WhatsApp</th>
              <th>Origem</th>
              <th>Status</th>
              <th>Criado em</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </section>
    </section>
  `;
};
