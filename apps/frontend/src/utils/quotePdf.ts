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

const formatDate = (value?: string | null) => {
  if (!value) {
    return "Não informado";
  }

  return new Date(value).toLocaleString("pt-BR");
};

const getDisplayQuotedPrice = (price?: number | null) => {
  return typeof price === "number" && price > 0 ? price : null;
};

const getQuoteStatusLabel = (status: string) => {
  return QUOTE_STATUS_LABELS[status] || "Em análise";
};

const getQuoteStatusClass = (status: string) => {
  return QUOTE_STATUS_CLASSES[status] || "status-info";
};

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

export const getQuotePdfFilename = (quote: Quote) => {
  return `orcamento-${quote.id.slice(0, 8)}.pdf`;
};

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

  const itemsRows = quote.items.map((item) => {
    const quotedPrice = getDisplayQuotedPrice(item.quotedPrice ?? item.price ?? null);
    const subtotal = quotedPrice ? quotedPrice * item.quantity : null;

    return `
      <tr>
        <td>
          <strong>${escapeHtml(item.name)}</strong>
        </td>
        <td>${item.quantity}</td>
        <td>${quotedPrice ? formatCurrency(quotedPrice) : "A definir"}</td>
        <td>${subtotal ? formatCurrency(subtotal) : "A definir"}</td>
      </tr>
    `;
  }).join("");

  return `
    <section class="pdf-document pdf-document--quote">
      <header class="pdf-header">
        <div class="pdf-brand">
          <span class="pdf-chip">Moria Peças</span>
          <div class="pdf-title">Orçamento #${escapeHtml(quote.id.slice(0, 8))}</div>
          <p class="pdf-subtitle">Documento gerado pelo painel administrativo para acompanhamento do orçamento.</p>
        </div>
        <div class="pdf-chip ${statusClass}">
          ${escapeHtml(statusLabel)}
        </div>
      </header>

      <section class="pdf-grid">
        <article class="pdf-card">
          <h2 class="pdf-card-title">Cliente</h2>
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
          <h2 class="pdf-card-title">Resumo</h2>
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

      <section>
        <h2 class="pdf-card-title">Itens do orçamento</h2>
        <table class="pdf-items">
          <thead>
            <tr>
              <th>Serviço</th>
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
            <span class="pdf-total-label">${isPricedQuote ? "Total do orçamento" : "Total estimado"}</span>
            <span class="pdf-total-value">${total > 0 ? formatCurrency(total) : "Sob análise"}</span>
          </div>
        </div>
      </section>

      <section class="pdf-notes">
        <h2 class="pdf-card-title">Observações</h2>
        <p>${
          notes
            ? escapeHtml(notes)
            : isPricedQuote
              ? "Orçamento pronto para envio e aprovação do cliente."
              : "Os valores ainda estão em análise e podem ser ajustados antes do envio final."
        }</p>
      </section>
    </section>
  `;
};
