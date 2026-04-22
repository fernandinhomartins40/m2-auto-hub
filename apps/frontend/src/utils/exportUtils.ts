// Utility functions for exporting data to various formats

export interface ExportData {
  headers: string[];
  rows: any[][];
  filename: string;
}

/**
 * Export data to CSV format
 */
export function exportToCSV(data: ExportData): void {
  const { headers, rows, filename } = data;

  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => {
      // Escape commas and quotes
      const cellStr = String(cell || '');
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(','))
  ].join('\n');

  // Add BOM for Excel UTF-8 compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

/**
 * Export data to Excel format (XLSX)
 * Note: This creates a simple XML-based Excel file
 */
export function exportToExcel(data: ExportData): void {
  const { headers, rows, filename } = data;

  // Create HTML table
  const tableHTML = `
    <table>
      <thead>
        <tr>
          ${headers.map(h => `<th>${escapeHTML(h)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${rows.map(row => `
          <tr>
            ${row.map(cell => `<td>${escapeHTML(String(cell || ''))}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  // Create Excel XML
  const excelContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head>
        <meta charset="UTF-8">
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Dados</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
      </head>
      <body>
        ${tableHTML}
      </body>
    </html>
  `;

  const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' });
  downloadBlob(blob, `${filename}.xls`);
}

/**
 * Export data to JSON format
 */
export function exportToJSON(data: any, filename: string): void {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  downloadBlob(blob, `${filename}.json`);
}

/**
 * Export data to PDF format (simple text-based)
 * For better PDF support, consider using jsPDF library
 */
export function exportToPDF(data: ExportData): void {
  const { headers, rows, filename } = data;

  // Create formatted text content
  const content = [
    `=== ${filename} ===`,
    '',
    headers.join(' | '),
    '='.repeat(headers.join(' | ').length),
    ...rows.map(row => row.join(' | ')),
    '',
    `Gerado em: ${new Date().toLocaleString('pt-BR')}`
  ].join('\n');

  const blob = new Blob([content], { type: 'text/plain' });
  downloadBlob(blob, `${filename}.txt`);
}

/**
 * Download blob as file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Escape HTML special characters
 */
function escapeHTML(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Helper function to format currency for export
 */
export function formatCurrencyForExport(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Helper function to format date for export
 */
export function formatDateForExport(date: string | Date): string {
  return new Date(date).toLocaleString('pt-BR');
}
