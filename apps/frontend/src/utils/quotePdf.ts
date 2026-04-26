import type { Quote } from "@/api/adminService";

interface BuildQuotePdfHtmlOptions {
  observations?: string;
  validityDays?: number;
}

const QUOTE_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  pending: "Pendente",
  ANALYZING: "Em análise",
  analyzing: "Em análise",
  QUOTED: "Orçado",
  responded: "Orçado",
  APPROVED: "Aprovado",
  accepted: "Aprovado",
  REJECTED: "Rejeitado",
  rejected: "Rejeitado",
};

const QUOTE_STATUS_CLASSES: Record<string, string> = {
  PENDING: "status-pending",
  pending: "status-pending",
  ANALYZING: "status-info",
  analyzing: "status-info",
  QUOTED: "status-quoted",
  responded: "status-quoted",
  APPROVED: "status-approved",
  accepted: "status-approved",
  REJECTED: "status-rejected",
  rejected: "status-rejected",
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

const getDisplayQuotedPrice = (price?: number | null) =>
  typeof price === "number" && price > 0 ? price : null;

const getQuoteStatusLabel = (status: string) =>
  QUOTE_STATUS_LABELS[status] || "Em análise";

const getQuoteStatusClass = (status: string) =>
  QUOTE_STATUS_CLASSES[status] || "status-info";

const getQuoteTotal = (quote: Quote) => {
  const pricedItemsTotal = quote.items.reduce((sum, item) => {
    const itemPrice = getDisplayQuotedPrice(item.quotedPrice ?? item.price ?? null);
    return sum + ((itemPrice || 0) * item.quantity);
  }, 0);

  if (pricedItemsTotal > 0) {
    return pricedItemsTotal;
  }

  return quote.total || 0;
};

const buildSummaryCard = (label: string, value: string, tone: "default" | "accent" = "default") => `
  <article class="pdf-stat-card ${tone === "accent" ? "pdf-stat-card--accent" : ""}">
    <span class="pdf-stat-label">${escapeHtml(label)}</span>
    <strong class="pdf-stat-value">${escapeHtml(value)}</strong>
  </article>
`;

export const getQuotePdfFilename = (quote: Quote) => `orcamento-${quote.id.slice(0, 8)}.pdf`;

export const buildQuotePdfHtml = (
  quote: Quote,
  options: BuildQuotePdfHtmlOptions = {}
) => {
  const validityDays = options.validityDays || 7;
  const validUntil = new Date(quote.createdAt);
  validUntil.setDate(validUntil.getDate() + validityDays);

  const total = getQuoteTotal(quote);
  const notes = options.observations || quote.quoteNotes || "";
  const statusLabel = getQuoteStatusLabel(quote.status);
  const statusClass = getQuoteStatusClass(quote.status);
  const isPricedQuote = ["QUOTED", "responded", "APPROVED", "accepted"].includes(quote.status);

  const itemsRows = quote.items
    .map((item, index) => {
      const quotedPrice = getDisplayQuotedPrice(item.quotedPrice ?? item.price ?? null);
      const subtotal = quotedPrice ? quotedPrice * item.quantity : null;

      return `
        <tr>
          <td>
            <div class="pdf-table-primary">
              <span class="pdf-table-index">${String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>${escapeHtml(item.name)}</strong>
                <div class="pdf-table-secondary">Item do orçamento</div>
              </div>
            </div>
          </td>
          <td>${item.quantity}</td>
          <td>${quotedPrice ? formatCurrency(quotedPrice) : "A definir"}</td>
          <td>${subtotal ? formatCurrency(subtotal) : "A definir"}</td>
        </tr>
      `;
    })
    .join("");

  const summaryCards = [
    buildSummaryCard("Status atual", statusLabel),
    buildSummaryCard("Validade sugerida", validUntil.toLocaleDateString("pt-BR")),
    buildSummaryCard(
      isPricedQuote ? "Valor apresentado" : "Situação comercial",
      total > 0 ? formatCurrency(total) : "Sob análise",
      "accent"
    ),
  ].join("");

  return `
    <section class="pdf-document pdf-document--quote">
      <header class="pdf-hero pdf-hero--quote">
        <div class="pdf-hero-content">
          <span class="pdf-eyebrow">Proposta comercial</span>
          <h1 class="pdf-title">Orçamento #${escapeHtml(quote.id.slice(0, 8))}</h1>
          <p class="pdf-subtitle">
            Documento preparado para acompanhamento da solicitação do cliente, com itens,
            condições e observações do atendimento.
          </p>
        </div>
        <div class="pdf-hero-aside">
          <span class="pdf-chip ${statusClass}">${escapeHtml(statusLabel)}</span>
          <div class="pdf-hero-code">Ref. ${escapeHtml(quote.id.slice(0, 8).toUpperCase())}</div>
        </div>
      </header>

      <section class="pdf-stat-grid pdf-stat-grid--triple">
        ${summaryCards}
      </section>

      <section class="pdf-grid">
        <article class="pdf-card">
          <div class="pdf-section-heading">
            <span class="pdf-section-kicker">Cliente</span>
            <h2 class="pdf-card-title">Dados para contato</h2>
          </div>
          <div class="pdf-meta-list">
            <div class="pdf-meta-row">
              <span class="pdf-label">Nome</span>
              <span class="pdf-value">${escapeHtml(quote.customerName)}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">WhatsApp</span>
              <span class="pdf-value">${escapeHtml(quote.customerWhatsApp)}</span>
            </div>
          </div>
        </article>

        <article class="pdf-card">
          <div class="pdf-section-heading">
            <span class="pdf-section-kicker">Controle</span>
            <h2 class="pdf-card-title">Linha do orçamento</h2>
          </div>
          <div class="pdf-meta-list">
            <div class="pdf-meta-row">
              <span class="pdf-label">Solicitado em</span>
              <span class="pdf-value">${escapeHtml(formatDate(quote.createdAt))}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Atualizado em</span>
              <span class="pdf-value">${escapeHtml(formatDate(quote.updatedAt))}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Validade sugerida</span>
              <span class="pdf-value">${escapeHtml(validUntil.toLocaleDateString("pt-BR"))}</span>
            </div>
          </div>
        </article>
      </section>

      <section class="pdf-panel">
        <div class="pdf-section-heading">
          <span class="pdf-section-kicker">Escopo</span>
          <h2 class="pdf-card-title">Itens do orçamento</h2>
        </div>
        <table class="pdf-items">
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Qtd.</th>
              <th>Valor unitário</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>
        <div class="pdf-total">
          <div class="pdf-total-box">
            <span class="pdf-total-label">${isPricedQuote ? "Valor total aprovado para envio" : "Estimativa consolidada"}</span>
            <span class="pdf-total-value">${total > 0 ? formatCurrency(total) : "Sob análise"}</span>
          </div>
        </div>
      </section>

      <section class="pdf-grid">
        <article class="pdf-notes">
          <div class="pdf-section-heading">
            <span class="pdf-section-kicker">Observações</span>
            <h2 class="pdf-card-title">Mensagem do atendimento</h2>
          </div>
          <p>${
            notes
              ? escapeHtml(notes)
              : isPricedQuote
                ? "Orçamento pronto para validação e aprovação do cliente."
                : "Os valores ainda estão em análise e podem ser ajustados antes do envio final."
          }</p>
        </article>

        <article class="pdf-notes pdf-notes--soft">
          <div class="pdf-section-heading">
            <span class="pdf-section-kicker">Condições</span>
            <h2 class="pdf-card-title">Leitura rápida</h2>
          </div>
          <ul class="pdf-bullet-list">
            <li>Os valores apresentados consideram os itens listados neste documento.</li>
            <li>A disponibilidade final depende da confirmação de estoque e agenda.</li>
            <li>Alterações de escopo podem gerar revisão do orçamento.</li>
          </ul>
        </article>
      </section>
    </section>
  `;
};
