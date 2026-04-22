import type { AdminRevision } from "@/api/adminService";

type ChecklistItemLike = {
  categoryName?: string;
  itemName?: string;
  status?: string;
  notes?: string | null;
};

type TransferHistoryItemLike = {
  fromName?: string | null;
  toName?: string | null;
  transferredAt?: string | null;
  reason?: string | null;
};

const REVISION_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluida",
  CANCELLED: "Cancelada",
};

const REVISION_STATUS_CLASSES: Record<string, string> = {
  DRAFT: "status-info",
  IN_PROGRESS: "status-info",
  COMPLETED: "status-approved",
  CANCELLED: "status-rejected",
};

const CHECKLIST_STATUS_LABELS: Record<string, string> = {
  NOT_CHECKED: "Nao verificado",
  OK: "OK",
  ATTENTION: "Atencao",
  CRITICAL: "Critico",
  NOT_APPLICABLE: "Nao aplicavel",
};

const CHECKLIST_STATUS_CLASSES: Record<string, string> = {
  NOT_CHECKED: "status-info",
  OK: "status-approved",
  ATTENTION: "status-pending",
  CRITICAL: "status-rejected",
  NOT_APPLICABLE: "status-info",
};

const escapeHtml = (value?: string | null) => {
  return (value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return "Nao informado";
  }

  return new Date(value).toLocaleString("pt-BR");
};

const formatMileage = (value?: number | null) => {
  if (typeof value !== "number") {
    return "Nao informada";
  }

  return `${value.toLocaleString("pt-BR")} km`;
};

const getRevisionStatusLabel = (status?: string | null) => {
  return REVISION_STATUS_LABELS[status || ""] || "Em andamento";
};

const getRevisionStatusClass = (status?: string | null) => {
  return REVISION_STATUS_CLASSES[status || ""] || "status-info";
};

const getChecklistStatusLabel = (status?: string | null) => {
  return CHECKLIST_STATUS_LABELS[status || ""] || "Nao verificado";
};

const getChecklistStatusClass = (status?: string | null) => {
  return CHECKLIST_STATUS_CLASSES[status || ""] || "status-info";
};

const getGroupedChecklistItems = (checklistItems: AdminRevision["checklistItems"]) => {
  const normalizedItems = Array.isArray(checklistItems)
    ? checklistItems.filter((item): item is ChecklistItemLike => {
        return Boolean(
          item &&
            typeof item === "object" &&
            typeof item.categoryName === "string" &&
            typeof item.itemName === "string"
        );
      })
    : [];

  return normalizedItems.reduce<Record<string, ChecklistItemLike[]>>((acc, item) => {
    const categoryName = item.categoryName || "Checklist";
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(item);
    return acc;
  }, {});
};

export const getRevisionPdfFilename = (revision: AdminRevision) => {
  return `revisao-${revision.id.slice(0, 8)}.pdf`;
};

export const buildRevisionPdfHtml = (revision: AdminRevision) => {
  const groupedChecklist = getGroupedChecklistItems(revision.checklistItems);
  const checklistSections = Object.entries(groupedChecklist)
    .map(([categoryName, items]) => {
      const rows = items
        .map((item) => {
          const statusLabel = getChecklistStatusLabel(item.status);
          const statusClass = getChecklistStatusClass(item.status);

          return `
            <tr>
              <td><strong>${escapeHtml(item.itemName)}</strong></td>
              <td><span class="pdf-chip ${statusClass}">${escapeHtml(statusLabel)}</span></td>
              <td>${escapeHtml(item.notes || "-")}</td>
            </tr>
          `;
        })
        .join("");

      return `
        <section class="pdf-document">
          <h2 class="pdf-card-title">${escapeHtml(categoryName)}</h2>
          <table class="pdf-items">
            <thead>
              <tr>
                <th>Item</th>
                <th>Status</th>
                <th>Observacoes</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </section>
      `;
    })
    .join("");

  const transferHistory = Array.isArray(revision.transferHistory)
    ? (revision.transferHistory as TransferHistoryItemLike[])
    : [];

  const transferRows = transferHistory.length
    ? transferHistory
        .map((transfer) => {
          return `
            <tr>
              <td>${escapeHtml(transfer.fromName || "-")}</td>
              <td>${escapeHtml(transfer.toName || "-")}</td>
              <td>${escapeHtml(formatDate(transfer.transferredAt))}</td>
              <td>${escapeHtml(transfer.reason || "-")}</td>
            </tr>
          `;
        })
        .join("")
    : `
      <tr>
        <td colspan="4">Nenhuma transferencia registrada.</td>
      </tr>
    `;

  return `
    <section class="pdf-document pdf-document--revision">
      <header class="pdf-header">
        <div class="pdf-brand">
          <span class="pdf-chip">Moria Pecas</span>
          <div class="pdf-title">Revisao #${escapeHtml(revision.id.slice(0, 8))}</div>
          <p class="pdf-subtitle">Resumo completo da revisao veicular gerado pelo painel administrativo.</p>
        </div>
        <div class="pdf-chip ${getRevisionStatusClass(revision.status)}">
          ${escapeHtml(getRevisionStatusLabel(revision.status))}
        </div>
      </header>

      <section class="pdf-grid">
        <article class="pdf-card">
          <h2 class="pdf-card-title">Cliente</h2>
          <div class="pdf-meta-list">
            <div class="pdf-meta-row">
              <span class="pdf-label">Nome</span>
              <span class="pdf-value">${escapeHtml(revision.customer?.name || "Nao informado")}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Email</span>
              <span class="pdf-value">${escapeHtml(revision.customer?.email || "Nao informado")}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Telefone</span>
              <span class="pdf-value">${escapeHtml(revision.customer?.phone || "Nao informado")}</span>
            </div>
          </div>
        </article>

        <article class="pdf-card">
          <h2 class="pdf-card-title">Veiculo</h2>
          <div class="pdf-meta-list">
            <div class="pdf-meta-row">
              <span class="pdf-label">Modelo</span>
              <span class="pdf-value">${escapeHtml(
                `${revision.vehicle?.brand || ""} ${revision.vehicle?.model || ""}`.trim() || "Nao informado"
              )}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Placa</span>
              <span class="pdf-value">${escapeHtml(revision.vehicle?.plate || "Nao informada")}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Ano / Cor</span>
              <span class="pdf-value">${escapeHtml(
                [revision.vehicle?.year, revision.vehicle?.color].filter(Boolean).join(" / ") || "Nao informado"
              )}</span>
            </div>
          </div>
        </article>
      </section>

      <section class="pdf-grid">
        <article class="pdf-card">
          <h2 class="pdf-card-title">Resumo da revisao</h2>
          <div class="pdf-meta-list">
            <div class="pdf-meta-row">
              <span class="pdf-label">Data da revisao</span>
              <span class="pdf-value">${escapeHtml(formatDate(revision.date))}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Quilometragem</span>
              <span class="pdf-value">${escapeHtml(formatMileage(revision.mileage))}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Criada em</span>
              <span class="pdf-value">${escapeHtml(formatDate(revision.createdAt))}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Concluida em</span>
              <span class="pdf-value">${escapeHtml(formatDate(revision.completedAt))}</span>
            </div>
          </div>
        </article>

        <article class="pdf-card">
          <h2 class="pdf-card-title">Mecanico responsavel</h2>
          <div class="pdf-meta-list">
            <div class="pdf-meta-row">
              <span class="pdf-label">Nome</span>
              <span class="pdf-value">${escapeHtml(
                revision.assignedMechanic?.name || revision.mechanicName || "Nao atribuido"
              )}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Email</span>
              <span class="pdf-value">${escapeHtml(revision.assignedMechanic?.email || "Nao informado")}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Atribuido em</span>
              <span class="pdf-value">${escapeHtml(formatDate(revision.assignedAt))}</span>
            </div>
          </div>
        </article>
      </section>

      <section class="pdf-notes">
        <h2 class="pdf-card-title">Observacoes gerais</h2>
        <p>${escapeHtml(revision.generalNotes || "Nenhuma observacao geral registrada.")}</p>
      </section>

      <section class="pdf-notes">
        <h2 class="pdf-card-title">Recomendacoes</h2>
        <p>${escapeHtml(revision.recommendations || "Nenhuma recomendacao registrada.")}</p>
      </section>

      <section class="pdf-notes">
        <h2 class="pdf-card-title">Observacoes do mecanico</h2>
        <p>${escapeHtml(revision.mechanicNotes || "Nenhuma observacao do mecanico registrada.")}</p>
      </section>

      <section class="pdf-document">
        <h2 class="pdf-card-title">Checklist da revisao</h2>
        ${
          checklistSections ||
          '<section class="pdf-notes"><p>Esta revisao ainda nao possui checklist preenchido.</p></section>'
        }
      </section>

      <section class="pdf-document">
        <h2 class="pdf-card-title">Historico de transferencias</h2>
        <table class="pdf-items">
          <thead>
            <tr>
              <th>De</th>
              <th>Para</th>
              <th>Data</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            ${transferRows}
          </tbody>
        </table>
      </section>
    </section>
  `;
};
