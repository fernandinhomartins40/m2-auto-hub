import type { ProvisionalUser } from "@/api/adminService";

const escapeHtml = (value?: string | null) =>
  (value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString("pt-BR") : "Nao informado";

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("pt-BR") : "Nao informado";

const levelLabel: Record<string, string> = {
  BRONZE: "Bronze",
  SILVER: "Silver",
  GOLD: "Gold",
  PLATINUM: "Platinum",
};

const statusLabel: Record<string, string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
  BLOCKED: "Bloqueado",
};

function renderAddress(address: NonNullable<ProvisionalUser["addresses"]>[number]) {
  const line1 = `${address.street}, ${address.number}`;
  const line2 = [address.neighborhood, address.city, address.state].filter(Boolean).join(" - ");
  const line3 = [`CEP ${address.zipCode}`, address.complement].filter(Boolean).join(" · ");

  return `
    <article class="pdf-card">
      <div class="pdf-section-heading">
        <span class="pdf-section-kicker">${escapeHtml(address.type)}</span>
        <h2 class="pdf-card-title">${escapeHtml(line1)}</h2>
      </div>
      <div class="pdf-meta-list">
        <div class="pdf-meta-row">
          <span class="pdf-label">Localidade</span>
          <span class="pdf-value">${escapeHtml(line2)}</span>
        </div>
        <div class="pdf-meta-row">
          <span class="pdf-label">Complemento</span>
          <span class="pdf-value">${escapeHtml(line3 || "Nao informado")}</span>
        </div>
      </div>
    </article>
  `;
}

export const getCustomerPdfFilename = (customer: ProvisionalUser) =>
  `ficha-cadastral-${customer.name.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}.pdf`;

export const getCustomerListPdfFilename = () =>
  `clientes-${new Date().toISOString().slice(0, 10)}.pdf`;

export const buildCustomerPdfHtml = (customer: ProvisionalUser) => {
  const generatedAt = formatDateTime(new Date().toISOString());
  const addresses = customer.addresses ?? [];

  return `
    <section class="pdf-document pdf-document--report">
      <header class="pdf-hero pdf-hero--report">
        <div class="pdf-hero-content">
          <span class="pdf-eyebrow">Cadastro de clientes</span>
          <h1 class="pdf-title">Ficha cadastral</h1>
          <p class="pdf-subtitle">
            Registro individual do cliente para uso operacional, atendimento e conferencia de dados.
          </p>
        </div>
        <div class="pdf-hero-aside">
          <div class="pdf-hero-code">${escapeHtml(customer.id.slice(0, 8).toUpperCase())}</div>
          <span class="pdf-chip status-info">Gerado em ${escapeHtml(generatedAt)}</span>
        </div>
      </header>

      <section class="pdf-grid">
        <article class="pdf-card">
          <div class="pdf-section-heading">
            <span class="pdf-section-kicker">Cliente</span>
            <h2 class="pdf-card-title">${escapeHtml(customer.name)}</h2>
          </div>
          <div class="pdf-meta-list">
            <div class="pdf-meta-row">
              <span class="pdf-label">E-mail</span>
              <span class="pdf-value">${escapeHtml(customer.email)}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">WhatsApp</span>
              <span class="pdf-value">${escapeHtml(customer.whatsapp)}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">CPF</span>
              <span class="pdf-value">${escapeHtml(customer.cpf || "Nao informado")}</span>
            </div>
          </div>
        </article>

        <article class="pdf-card">
          <div class="pdf-section-heading">
            <span class="pdf-section-kicker">Relacionamento</span>
            <h2 class="pdf-card-title">Status e nivel</h2>
          </div>
          <div class="pdf-meta-list">
            <div class="pdf-meta-row">
              <span class="pdf-label">Status</span>
              <span class="pdf-value">${escapeHtml(statusLabel[customer.status] || customer.status)}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Nivel</span>
              <span class="pdf-value">${escapeHtml(levelLabel[customer.level] || customer.level)}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Cadastro</span>
              <span class="pdf-value">${escapeHtml(formatDate(customer.createdAt))}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Ultima atualizacao</span>
              <span class="pdf-value">${escapeHtml(formatDate(customer.updatedAt))}</span>
            </div>
          </div>
        </article>
      </section>

      <section class="pdf-panel">
        <div class="pdf-section-heading">
          <span class="pdf-section-kicker">Enderecos</span>
          <h2 class="pdf-card-title">Locais cadastrados</h2>
        </div>
        ${
          addresses.length
            ? `<div class="pdf-grid">${addresses.map(renderAddress).join("")}</div>`
            : `<p>Nenhum endereco cadastrado para este cliente.</p>`
        }
      </section>
    </section>
  `;
};

export const buildCustomerListPdfHtml = (customers: ProvisionalUser[]) => {
  const generatedAt = formatDateTime(new Date().toISOString());
  const rows =
    customers.length > 0
      ? customers
          .map(
            (customer, index) => `
      <tr>
        <td>
          <div class="pdf-table-primary">
            <span class="pdf-table-index">${String(index + 1).padStart(2, "0")}</span>
            <div>
              <strong>${escapeHtml(customer.name)}</strong>
              <div class="pdf-table-secondary">${escapeHtml(customer.email)}</div>
            </div>
          </div>
        </td>
        <td>${escapeHtml(customer.whatsapp)}</td>
        <td>${escapeHtml(customer.cpf || "Nao informado")}</td>
        <td>${escapeHtml(levelLabel[customer.level] || customer.level)}</td>
        <td>${escapeHtml(statusLabel[customer.status] || customer.status)}</td>
        <td>${escapeHtml(formatDate(customer.createdAt))}</td>
      </tr>
    `
          )
          .join("")
      : `
      <tr>
        <td colspan="6">Nenhum cliente disponivel para exportacao.</td>
      </tr>
    `;

  return `
    <section class="pdf-document pdf-document--report">
      <header class="pdf-hero pdf-hero--report">
        <div class="pdf-hero-content">
          <span class="pdf-eyebrow">Base de clientes</span>
          <h1 class="pdf-title">Listagem de clientes</h1>
          <p class="pdf-subtitle">
            Relacao consolidada dos clientes cadastrados no painel do lojista.
          </p>
        </div>
        <div class="pdf-hero-aside">
          <div class="pdf-hero-code">${customers.length} registro(s)</div>
          <span class="pdf-chip status-info">Gerado em ${escapeHtml(generatedAt)}</span>
        </div>
      </header>

      <section class="pdf-panel">
        <table class="pdf-items">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>WhatsApp</th>
              <th>CPF</th>
              <th>Nivel</th>
              <th>Status</th>
              <th>Cadastro</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </section>
    </section>
  `;
};
