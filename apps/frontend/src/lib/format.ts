/**
 * Formatação pt-BR compartilhada.
 *
 * Estas funções estavam reimplementadas dezenas de vezes pela base — 34 cópias
 * do formatador de moeda e 36 do de data. Além do custo de manutenção, cada
 * cópia era uma chance de divergir (uma com centavos, outra sem; uma aceitando
 * `null`, outra quebrando).
 *
 * Os formatadores de `Intl` são criados uma vez e reaproveitados: instanciá-los
 * a cada chamada é caro e aparece em listas longas.
 */

const MOEDA = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const DATA = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const DATA_HORA = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** Aceita o que a API devolve: string ISO, Date, número ou nada. */
type EntradaData = string | number | Date | null | undefined;

function paraData(valor: EntradaData): Date | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const data = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

/**
 * Valor em reais. `formatCurrency(1234.5)` → `R$ 1.234,50`.
 *
 * Aceita string porque o backend serializa `Decimal` como texto; entrada
 * inválida vira R$ 0,00 em vez de `NaN` na tela.
 */
export function formatCurrency(valor: number | string | null | undefined): string {
  const numero = typeof valor === 'string' ? Number(valor) : valor;
  return MOEDA.format(Number.isFinite(numero as number) ? (numero as number) : 0);
}

/** Data curta. `formatDate('2026-08-14T12:00:00Z')` → `14/08/2026`. */
export function formatDate(valor: EntradaData, seVazio = '—'): string {
  const data = paraData(valor);
  return data ? DATA.format(data) : seVazio;
}

/** Data com hora. → `14/08/2026 09:30`. */
export function formatDateTime(valor: EntradaData, seVazio = '—'): string {
  const data = paraData(valor);
  return data ? DATA_HORA.format(data) : seVazio;
}

/**
 * Telefone brasileiro legível: `11987654321` → `(11) 98765-4321`.
 * Devolve a entrada original quando não reconhece o formato, para não
 * esconder um dado cadastrado de forma diferente.
 */
export function formatPhone(valor: string | null | undefined): string {
  if (!valor) return '';
  const digitos = valor.replace(/\D/g, '');
  const nacional = digitos.startsWith('55') && digitos.length > 11
    ? digitos.slice(2)
    : digitos;

  if (nacional.length === 11) {
    return `(${nacional.slice(0, 2)}) ${nacional.slice(2, 7)}-${nacional.slice(7)}`;
  }
  if (nacional.length === 10) {
    return `(${nacional.slice(0, 2)}) ${nacional.slice(2, 6)}-${nacional.slice(6)}`;
  }
  return valor;
}

/** Percentual com uma casa. `formatPercent(12.345)` → `12,3%`. */
export function formatPercent(valor: number | null | undefined, casas = 1): string {
  const numero = Number.isFinite(valor as number) ? (valor as number) : 0;
  return `${numero.toFixed(casas).replace('.', ',')}%`;
}
