import { createHash } from 'node:crypto';

export type Raw = Record<string, unknown>;

export const text = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();

export const digits = (value: unknown): string => text(value).replace(/\D/g, '');

/** Primeiro valor não vazio entre as chaves possíveis (o contrato Ellon varia entre endpoints). */
export function pick(item: Raw, keys: string[]): string {
  for (const key of keys) {
    const value = text(item[key]);
    if (value) return value;
  }
  return '';
}

/** Extrai a lista de registros de um array direto ou de um envelope paginado. */
export function rows(value: unknown, keys: string[] = []): Raw[] {
  if (Array.isArray(value)) return value.filter(item => item && typeof item === 'object') as Raw[];
  if (!value || typeof value !== 'object') return [];
  const object = value as Raw;
  for (const key of [...keys, 'data', 'items', 'registros', 'Registros', 'dados']) {
    if (Array.isArray(object[key])) return rows(object[key]);
  }
  return [];
}

export function decimal(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  let normalized = text(value).replace(/\s/g, '');
  if (normalized.includes(',') && normalized.includes('.')) normalized = normalized.replace(/\./g, '').replace(',', '.');
  else normalized = normalized.replace(',', '.');
  const parsed = Number(normalized.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

export const integer = (value: unknown): number => Math.max(0, Math.floor(decimal(value)));

/** Data civil (AAAA-MM-DD) no fuso da loja, usado pelos filtros de data da Ellon. */
export function localDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export const DAY_MS = 24 * 60 * 60_000;

export function parseDate(value: unknown): Date | null {
  const raw = text(value);
  if (!raw) return null;
  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  const parsed = br ? new Date(`${br[3]}-${br[2]}-${br[1]}T12:00:00Z`) : new Date(raw);
  if (Number.isNaN(parsed.getTime()) || parsed.getUTCFullYear() < 1900 || parsed > new Date()) return null;
  return parsed;
}

export function payloadHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function normalizeCategory(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Remove documentos fiscais completos (XML) antes de persistir, mantendo só metadados. */
export function withoutXml(item: Raw): Raw {
  return Object.fromEntries(Object.entries(item).filter(([key, value]) =>
    !/xml/i.test(key) && !(typeof value === 'string' && value.trimStart().startsWith('<?xml'))));
}

const BR_STATES = new Set(['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']);

export function state(value: unknown): string | null {
  const uf = text(value).toUpperCase();
  return BR_STATES.has(uf) ? uf : null;
}

/** CPF ou CNPJ com dígitos verificadores válidos. */
export function validDocument(value: string): boolean {
  const doc = value.replace(/\D/g, '');
  if (!/^(\d{11}|\d{14})$/.test(doc) || new Set(doc).size === 1) return false;
  const check = (base: string, weights: number[]) => {
    const sum = weights.reduce((total, weight, index) => total + Number(base[index]) * weight, 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  if (doc.length === 11) {
    const first = check(doc, [10, 9, 8, 7, 6, 5, 4, 3, 2]);
    return first === Number(doc[9]) && check(doc, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(doc[10]);
  }
  const first = check(doc, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return first === Number(doc[12]) && check(doc, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(doc[13]);
}
