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
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
};

const REVISION_STATUS_CLASSES: Record<string, string> = {
  DRAFT: "status-info",
  IN_PROGRESS: "status-info",
  COMPLETED: "status-approved",
  CANCELLED: "status-rejected",
};

const CHECKLIST_STATUS_LABELS: Record<string, string> = {
  NOT_CHECKED: "Não verificado",
  OK: "OK",
  ATTENTION: "Atenção",
  CRITICAL: "Crítico",
  NOT_APPLICABLE: "Não aplicável",
};

const CHECKLIST_STATUS_CLASSES: Record<string, string> = {
  NOT_CHECKED: "status-info",
  OK: "status-approved",
  ATTENTION: "status-pending",
  CRITICAL: "status-rejected",
  NOT_APPLICABLE: "status-info",
};

const escapeHtml = (value?: string | null) =>
  (value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatDate = (value?: string | null) => {
  if (!value) {
    return "Não informado";
  }

  return new Date(value).toLocaleString("pt-BR");
};

const formatMileage = (value?: number | null) => {
  if (typeof value !== "number") {
    return "Não informada";
  }

  return `${value.toLocaleString("pt-BR")} km`;
};

const getRevisionStatusLabel = (status?: string | null) =>
  REVISION_STATUS_LABELS[status || ""] || "Em andamento";

const getRevisionStatusClass = (status?: string | null) =>
  REVISION_STATUS_CLASSES[status || ""] || "status-info";

const getChecklistStatusLabel = (status?: string | null) =>
  CHECKLIST_STATUS_LABELS[status || ""] || "Não verificado";

const getChecklistStatusClass = (status?: string | null) =>
  CHECKLIST_STATUS_CLASSES[status || ""] || "status-info";

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

export const getRevisionPdfFilename = (revision: AdminRevision) =>
  `revisao-${revision.id.slice(0, 8)}.pdf`;

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
              <td>
                <div class="pdf-table-primary">
                  <div>
                    <strong>${escapeHtml(item.itemName)}</strong>
                  </div>
                </div>
              </td>
              <td><span class="pdf-chip ${statusClass}">${escapeHtml(statusLabel)}</span></td>
              <td>${escapeHtml(item.notes || "-")}</td>
            </tr>
          `;
        })
        .join("");

      return `
        <section class="pdf-panel">
          <div class="pdf-section-heading">
            <span class="pdf-section-kicker">Checklist</span>
            <h2 class="pdf-card-title">${escapeHtml(categoryName)}</h2>
          </div>
          <table class="pdf-items">
            <thead>
              <tr>
                <th>Item verificado</th>
                <th>Status</th>
                <th>Observações</th>
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
        .map(
          (transfer) => `
            <tr>
              <td>${escapeHtml(transfer.fromName || "-")}</td>
              <td>${escapeHtml(transfer.toName || "-")}</td>
              <td>${escapeHtml(formatDate(transfer.transferredAt))}</td>
              <td>${escapeHtml(transfer.reason || "-")}</td>
            </tr>
          `
        )
        .join("")
    : `
      <tr>
        <td colspan="4">Nenhuma transferência registrada.</td>
      </tr>
    `;

  const vehicleName =
    `${revision.vehicle?.brand || ""} ${revision.vehicle?.model || ""}`.trim() || "Não informado";
  const mechanicName = revision.assignedMechanic?.name || revision.mechanicName || "Não atribuído";

  return `
    <section class="pdf-document pdf-document--revision">
      <header class="pdf-hero pdf-hero--revision">
        <div class="pdf-hero-content">
          <span class="pdf-eyebrow">Relatório técnico</span>
          <h1 class="pdf-title">Revisão #${escapeHtml(revision.id.slice(0, 8))}</h1>
          <p class="pdf-subtitle">
            Visão consolidada da inspeção, histórico operacional e recomendações do veículo.
          </p>
        </div>
        <div class="pdf-hero-aside">
          <span class="pdf-chip ${getRevisionStatusClass(revision.status)}">${escapeHtml(
            getRevisionStatusLabel(revision.status)
          )}</span>
          <div class="pdf-hero-code">Veículo em análise</div>
        </div>
      </header>

      <section class="pdf-stat-grid pdf-stat-grid--quad">
        <article class="pdf-stat-card">
          <span class="pdf-stat-label">Cliente</span>
          <strong class="pdf-stat-value">${escapeHtml(revision.customer?.name || "Não informado")}</strong>
        </article>
        <article class="pdf-stat-card">
          <span class="pdf-stat-label">Veículo</span>
          <strong class="pdf-stat-value">${escapeHtml(vehicleName)}</strong>
        </article>
        <article class="pdf-stat-card">
          <span class="pdf-stat-label">Quilometragem</span>
          <strong class="pdf-stat-value">${escapeHtml(formatMileage(revision.mileage))}</strong>
        </article>
        <article class="pdf-stat-card pdf-stat-card--accent">
          <span class="pdf-stat-label">Responsável</span>
          <strong class="pdf-stat-value">${escapeHtml(mechanicName)}</strong>
        </article>
      </section>

      <section class="pdf-grid">
        <article class="pdf-card">
          <div class="pdf-section-heading">
            <span class="pdf-section-kicker">Cliente</span>
            <h2 class="pdf-card-title">Contato cadastrado</h2>
          </div>
          <div class="pdf-meta-list">
            <div class="pdf-meta-row">
              <span class="pdf-label">Nome</span>
              <span class="pdf-value">${escapeHtml(revision.customer?.name || "Não informado")}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Email</span>
              <span class="pdf-value">${escapeHtml(revision.customer?.email || "Não informado")}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Telefone</span>
              <span class="pdf-value">${escapeHtml(revision.customer?.phone || "Não informado")}</span>
            </div>
          </div>
        </article>

        <article class="pdf-card">
          <div class="pdf-section-heading">
            <span class="pdf-section-kicker">Veículo</span>
            <h2 class="pdf-card-title">Ficha do atendimento</h2>
          </div>
          <div class="pdf-meta-list">
            <div class="pdf-meta-row">
              <span class="pdf-label">Modelo</span>
              <span class="pdf-value">${escapeHtml(vehicleName)}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Placa</span>
              <span class="pdf-value">${escapeHtml(revision.vehicle?.plate || "Não informada")}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Ano / Cor</span>
              <span class="pdf-value">${escapeHtml(
                [revision.vehicle?.year, revision.vehicle?.color].filter(Boolean).join(" / ") || "Não informado"
              )}</span>
            </div>
          </div>
        </article>
      </section>

      <section class="pdf-grid">
        <article class="pdf-card">
          <div class="pdf-section-heading">
            <span class="pdf-section-kicker">Cronologia</span>
            <h2 class="pdf-card-title">Datas do processo</h2>
          </div>
          <div class="pdf-meta-list">
            <div class="pdf-meta-row">
              <span class="pdf-label">Data da revisão</span>
              <span class="pdf-value">${escapeHtml(formatDate(revision.date))}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Criada em</span>
              <span class="pdf-value">${escapeHtml(formatDate(revision.createdAt))}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Atribuída em</span>
              <span class="pdf-value">${escapeHtml(formatDate(revision.assignedAt))}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Concluída em</span>
              <span class="pdf-value">${escapeHtml(formatDate(revision.completedAt))}</span>
            </div>
          </div>
        </article>

        <article class="pdf-card">
          <div class="pdf-section-heading">
            <span class="pdf-section-kicker">Execução</span>
            <h2 class="pdf-card-title">Responsável técnico</h2>
          </div>
          <div class="pdf-meta-list">
            <div class="pdf-meta-row">
              <span class="pdf-label">Nome</span>
              <span class="pdf-value">${escapeHtml(mechanicName)}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Email</span>
              <span class="pdf-value">${escapeHtml(revision.assignedMechanic?.email || "Não informado")}</span>
            </div>
            <div class="pdf-meta-row">
              <span class="pdf-label">Status</span>
              <span class="pdf-value">${escapeHtml(getRevisionStatusLabel(revision.status))}</span>
            </div>
          </div>
        </article>
      </section>

      <section class="pdf-grid">
        <article class="pdf-notes">
          <div class="pdf-section-heading">
            <span class="pdf-section-kicker">Diagnóstico</span>
            <h2 class="pdf-card-title">Observações gerais</h2>
          </div>
          <p>${escapeHtml(revision.generalNotes || "Nenhuma observação geral registrada.")}</p>
        </article>

        <article class="pdf-notes pdf-notes--soft">
          <div class="pdf-section-heading">
            <span class="pdf-section-kicker">Próximos passos</span>
            <h2 class="pdf-card-title">Recomendações</h2>
          </div>
          <p>${escapeHtml(revision.recommendations || "Nenhuma recomendação registrada.")}</p>
        </article>
      </section>

      <section class="pdf-notes">
        <div class="pdf-section-heading">
          <span class="pdf-section-kicker">Oficina</span>
          <h2 class="pdf-card-title">Observações do mecânico</h2>
        </div>
        <p>${escapeHtml(revision.mechanicNotes || "Nenhuma observação do mecânico registrada.")}</p>
      </section>

      ${
        checklistSections ||
        '<section class="pdf-notes"><p>Esta revisão ainda não possui checklist preenchido.</p></section>'
      }

      <section class="pdf-panel">
        <div class="pdf-section-heading">
          <span class="pdf-section-kicker">Fluxo interno</span>
          <h2 class="pdf-card-title">Histórico de transferências</h2>
        </div>
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
