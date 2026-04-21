import fs from 'fs/promises';
import path from 'path';
import { ApiError } from '@shared/utils/error.util.js';
import { settingsService } from '@modules/settings/settings.service.js';

interface PdfPage {
  setContent: (
    html: string,
    options: { waitUntil: 'networkidle'; timeout: number }
  ) => Promise<void>;
  pdf: (options: {
    format: 'A4';
    printBackground: boolean;
    margin: {
      top: string;
      right: string;
      bottom: string;
      left: string;
    };
  }) => Promise<Buffer>;
}

interface PdfBrowser {
  newPage: () => Promise<PdfPage>;
  close: () => Promise<void>;
}

interface PlaywrightChromiumModule {
  chromium: {
    launch: (options: { headless: boolean; args: string[] }) => Promise<PdfBrowser>;
  };
}

interface GeneratePdfInput {
  title: string;
  bodyHtml: string;
}

interface PdfBrandingConfig {
  headerLogoSrc: string | null;
  headerHtml: string;
  footerLogoSrc: string | null;
  footerHtml: string;
}

const PDF_MARGIN = {
  top: '15mm',
  right: '20mm',
  bottom: '15mm',
  left: '20mm',
} as const;

export class PdfGeneratorService {
  async generatePdfBuffer({ title, bodyHtml }: GeneratePdfInput): Promise<Buffer> {
    const branding = await this.getBrandingConfig();
    const playwrightModule = await import('playwright') as unknown as PlaywrightChromiumModule;
    const browser = await playwrightModule.chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none',
      ],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(this.wrapHtmlDocument(title, bodyHtml, branding), {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      return await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: PDF_MARGIN,
      });
    } catch (error) {
      throw ApiError.internal(
        error instanceof Error ? error.message : 'Nao foi possivel gerar o PDF'
      );
    } finally {
      await browser.close();
    }
  }

  sanitizeFilename(filename: string): string {
    const baseName = filename.replace(/\.pdf$/i, '');
    const sanitized = baseName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();

    return `${sanitized || 'documento'}.pdf`;
  }

  private wrapHtmlDocument(title: string, bodyHtml: string, branding: PdfBrandingConfig) {
    const companyHeader = this.renderBrandingBlock({
      html: branding.headerHtml,
      logoSrc: branding.headerLogoSrc,
      variant: 'header',
    });
    const companyFooter = this.renderBrandingBlock({
      html: branding.footerHtml,
      logoSrc: branding.footerLogoSrc,
      variant: 'footer',
    });

    return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(title)}</title>
    <style>
      @page {
        size: A4;
        margin: ${PDF_MARGIN.top} ${PDF_MARGIN.right} ${PDF_MARGIN.bottom} ${PDF_MARGIN.left};
      }

      :root {
        color-scheme: light;
        font-family: "Inter", "Segoe UI", Arial, sans-serif;
        --text: #111827;
        --muted: #6b7280;
        --border: #e5e7eb;
        --surface: #ffffff;
        --surface-alt: #f8fafc;
        --accent: #f97316;
        --accent-soft: #fff7ed;
        --success: #166534;
        --success-soft: #dcfce7;
        --warning: #92400e;
        --warning-soft: #fef3c7;
        --danger: #b91c1c;
        --danger-soft: #fee2e2;
        --info: #3730a3;
        --info-soft: #e0e7ff;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        color: var(--text);
        background: var(--surface);
        font-size: 12px;
        line-height: 1.5;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      img {
        max-width: 100%;
        height: auto;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      .pdf-root {
        width: 100%;
      }

      .pdf-company-block {
        display: flex;
        align-items: flex-start;
        gap: 18px;
        border: 1px solid var(--border);
        background: var(--surface-alt);
        border-radius: 18px;
        padding: 18px;
      }

      .pdf-company-block--header {
        margin-bottom: 24px;
      }

      .pdf-company-block--footer {
        margin-top: 24px;
      }

      .pdf-company-logo {
        width: 84px;
        max-width: 84px;
        flex: 0 0 84px;
        border-radius: 14px;
        overflow: hidden;
        background: #ffffff;
        border: 1px solid var(--border);
        padding: 10px;
      }

      .pdf-company-logo img {
        width: 100%;
        max-height: 64px;
        object-fit: contain;
        display: block;
      }

      .pdf-company-content {
        flex: 1;
        min-width: 0;
      }

      .pdf-company-content > *:first-child {
        margin-top: 0;
      }

      .pdf-company-content > *:last-child {
        margin-bottom: 0;
      }

      .pdf-company-content h1,
      .pdf-company-content h2,
      .pdf-company-content h3,
      .pdf-company-content h4,
      .pdf-company-content h5,
      .pdf-company-content h6 {
        margin: 0 0 8px 0;
        line-height: 1.2;
      }

      .pdf-company-content p,
      .pdf-company-content ul,
      .pdf-company-content ol,
      .pdf-company-content blockquote {
        margin: 0 0 8px 0;
      }

      .pdf-company-content ul,
      .pdf-company-content ol {
        padding-left: 20px;
      }

      .pdf-company-content a {
        color: var(--accent);
        text-decoration: underline;
      }

      .pdf-document-slot {
        width: 100%;
      }

      .pdf-document {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      .pdf-header {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: flex-start;
        border-bottom: 2px solid var(--border);
        padding-bottom: 18px;
      }

      .pdf-brand h1,
      .pdf-brand h2,
      .pdf-brand h3,
      .pdf-brand p,
      .pdf-brand span {
        margin: 0;
      }

      .pdf-title {
        font-size: 28px;
        font-weight: 800;
        line-height: 1.1;
        margin-bottom: 6px;
      }

      .pdf-subtitle {
        color: var(--muted);
        font-size: 13px;
      }

      .pdf-chip {
        display: inline-flex;
        align-items: center;
        padding: 6px 10px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 700;
        background: var(--accent-soft);
        color: var(--accent);
      }

      .pdf-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
      }

      .pdf-card {
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 16px;
        background: var(--surface-alt);
      }

      .pdf-card-title {
        margin: 0 0 10px 0;
        font-size: 14px;
        font-weight: 700;
      }

      .pdf-meta-list {
        display: grid;
        gap: 10px;
      }

      .pdf-meta-row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
      }

      .pdf-label {
        color: var(--muted);
        font-size: 11px;
      }

      .pdf-value {
        font-size: 12px;
        font-weight: 600;
        text-align: right;
      }

      .pdf-items {
        border: 1px solid var(--border);
        border-radius: 16px;
        overflow: hidden;
      }

      .pdf-items thead th {
        text-align: left;
        padding: 12px 14px;
        background: #111827;
        color: #ffffff;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .pdf-items tbody td {
        padding: 12px 14px;
        border-bottom: 1px solid var(--border);
        vertical-align: top;
      }

      .pdf-items tbody tr:last-child td {
        border-bottom: none;
      }

      .pdf-total {
        display: flex;
        justify-content: flex-end;
        margin-top: 12px;
      }

      .pdf-total-box {
        min-width: 240px;
        border-radius: 16px;
        padding: 16px;
        background: var(--accent-soft);
        border: 1px solid rgba(249, 115, 22, 0.2);
      }

      .pdf-total-label {
        display: block;
        color: var(--muted);
        font-size: 11px;
        margin-bottom: 4px;
      }

      .pdf-total-value {
        display: block;
        font-size: 24px;
        font-weight: 800;
        color: var(--accent);
      }

      .pdf-notes {
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 16px;
      }

      .pdf-notes p {
        margin: 0;
        white-space: pre-wrap;
      }

      .status-pending,
      .status-analyzing {
        background: var(--warning-soft);
        color: var(--warning);
      }

      .status-quoted,
      .status-approved {
        background: var(--success-soft);
        color: var(--success);
      }

      .status-rejected {
        background: var(--danger-soft);
        color: var(--danger);
      }

      .status-info {
        background: var(--info-soft);
        color: var(--info);
      }

      @media print {
        body {
          background: #ffffff;
        }
      }
    </style>
  </head>
  <body>
    <div class="pdf-root">
      ${companyHeader}
      <div class="pdf-document-slot">
      ${bodyHtml}
      </div>
      ${companyFooter}
    </div>
  </body>
</html>`;
  }

  private async getBrandingConfig(): Promise<PdfBrandingConfig> {
    const settings = await settingsService.getSettings() as unknown as {
      storeName: string;
      email: string | null;
      phone: string | null;
      whatsapp: string | null;
      address: string | null;
      city: string | null;
      state: string | null;
      pdfHeaderLogoUrl: string | null;
      pdfHeaderHtml: string;
      pdfFooterLogoUrl: string | null;
      pdfFooterHtml: string;
    };
    const headerHtml =
      typeof settings.pdfHeaderHtml === 'string'
        ? settings.pdfHeaderHtml
        : this.buildDefaultHeaderHtml(settings);
    const footerHtml = typeof settings.pdfFooterHtml === 'string' ? settings.pdfFooterHtml : '';

    return {
      headerLogoSrc: await this.resolveImageSource(settings.pdfHeaderLogoUrl),
      headerHtml: this.sanitizeRichHtml(headerHtml),
      footerLogoSrc: await this.resolveImageSource(settings.pdfFooterLogoUrl),
      footerHtml: this.sanitizeRichHtml(footerHtml),
    };
  }

  private buildDefaultHeaderHtml(settings: {
    storeName: string;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
  }): string {
    const contactLine = [settings.email, settings.phone, settings.whatsapp]
      .filter(Boolean)
      .join(' • ');
    const addressLine = [settings.address, settings.city, settings.state]
      .filter(Boolean)
      .join(' • ');

    return `
      <p><strong>${this.escapeHtml(settings.storeName)}</strong></p>
      ${contactLine ? `<p>${this.escapeHtml(contactLine)}</p>` : ''}
      ${addressLine ? `<p>${this.escapeHtml(addressLine)}</p>` : ''}
    `;
  }

  private renderBrandingBlock({
    logoSrc,
    html,
    variant,
  }: {
    logoSrc: string | null;
    html: string;
    variant: 'header' | 'footer';
  }): string {
    if (!logoSrc && !html.trim()) {
      return '';
    }

    return `
      <section class="pdf-company-block pdf-company-block--${variant}">
        ${
          logoSrc
            ? `<div class="pdf-company-logo"><img src="${logoSrc}" alt="Logo da empresa"></div>`
            : ''
        }
        <div class="pdf-company-content">
          ${html}
        </div>
      </section>
    `;
  }

  private sanitizeRichHtml(value: string): string {
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/\son\w+="[^"]*"/gi, '')
      .replace(/\son\w+='[^']*'/gi, '')
      .replace(/javascript:/gi, '');
  }

  private async resolveImageSource(url: string | null | undefined): Promise<string | null> {
    if (!url) {
      return null;
    }

    if (!url.startsWith('/uploads/')) {
      return url;
    }

    try {
      const filePath = path.join(process.cwd(), url.replace(/^\//, ''));
      const fileBuffer = await fs.readFile(filePath);
      const mimeType = this.getMimeTypeFromPath(filePath);

      return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
    } catch {
      return null;
    }
  }

  private getMimeTypeFromPath(filePath: string): string {
    const extension = path.extname(filePath).toLowerCase();

    if (extension === '.png') {
      return 'image/png';
    }

    if (extension === '.webp') {
      return 'image/webp';
    }

    if (extension === '.svg') {
      return 'image/svg+xml';
    }

    return 'image/jpeg';
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

export default new PdfGeneratorService();
