import { MarketplaceStockMode } from '@prisma/client';
import { PublicationAttribute } from '../marketplace.types.js';

/**
 * Regras de publicacao no Mercado Livre, sem acesso a banco: o painel e a
 * sincronizacao chegam aos mesmos numeros (titulo, preco, quantidade, prazo).
 */

export const LISTING_TYPES = { gold_special: 'Clássico', gold_pro: 'Premium' } as const;
export type ListingTypeId = keyof typeof LISTING_TYPES;

export const WARRANTY_TYPES = ['Garantia do vendedor', 'Garantia de fábrica', 'Sem garantia'] as const;

/** Regras padrao da loja, guardadas em MarketplaceConnection.settings. */
export interface StoreSettings {
  markupPercent: number;
  listingTypeId: ListingTypeId;
  warrantyType: (typeof WARRANTY_TYPES)[number];
  warrantyDays: number;
  /** Ate que horas uma venda ainda sai no mesmo dia (HH:MM). */
  dispatchCutoff: string;
  /** Ate que horas o fornecedor entrega na loja (HH:MM). */
  supplierDeadline: string;
}

export const DEFAULT_SETTINGS: StoreSettings = {
  markupPercent: 0,
  listingTypeId: 'gold_special',
  warrantyType: 'Garantia do vendedor',
  warrantyDays: 90,
  dispatchCutoff: '15:00',
  supplierDeadline: '15:00',
};

export function parseSettings(value: unknown): StoreSettings {
  const raw = value && typeof value === 'object' && !Array.isArray(value) ? value as Partial<StoreSettings> : {};
  return { ...DEFAULT_SETTINGS, ...raw };
}

/** Subconjunto do MarketplaceProductProfile usado nas regras. */
export interface ProfileInput {
  title?: string | null;
  brand?: string | null;
  partNumber?: string | null;
  categoryId?: string | null;
  attributes?: unknown;
  packageWeightG?: number | null;
  packageHeightCm?: number | null;
  packageWidthCm?: number | null;
  packageLengthCm?: number | null;
  stockMode?: MarketplaceStockMode;
  supplierQuantity?: number;
  manufacturingDays?: number;
  markupPercent?: unknown;
  fixedPrice?: unknown;
  listingTypeId?: string | null;
}

export interface ProductInput {
  name: string;
  sku: string;
  supplier: string;
  /** INACTIVE/DISCONTINUED nao vendem, mesmo com estoque registrado. */
  status?: string;
  salePrice: unknown;
  promoPrice: unknown;
  stock: number;
  specifications: unknown;
}

export interface EffectiveFields {
  title: string;
  brand: string | null;
  partNumber: string | null;
  gtin: string | null;
  packageWeightG: number | null;
  packageHeightCm: number | null;
  packageWidthCm: number | null;
  packageLengthCm: number | null;
  basePrice: number;
  price: number;
  quantity: number;
  stockMode: MarketplaceStockMode;
  supplierQuantity: number;
  manufacturingDays: number;
  listingTypeId: string;
}

export interface ReadinessCheck {
  key: string;
  label: string;
  ok: boolean;
  hint?: string;
}

const TITLE_MAX = 60;
const LOWER_WORDS = new Set(['de', 'do', 'da', 'dos', 'das', 'e', 'para', 'com', 'em', 'sem', 'p/', 'c/']);

function specs(product: ProductInput): Record<string, unknown> {
  const value = product.specifications;
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown): string | null {
  const result = typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : '';
  return result || null;
}

function positive(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function money(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function capitalize(word: string, first: boolean): string {
  // Codigos (PEL310, 1.6, 12V) ficam como estao.
  if (/\d/.test(word)) return word.toUpperCase();
  const lower = word.toLowerCase();
  if (!first && LOWER_WORDS.has(lower)) return lower;
  return lower.replace(/(^|[/-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

/** Nome do ERP em maiusculas vira titulo legivel, com a marca no fim quando falta. */
export function suggestTitle(name: string, brand?: string | null): string {
  const words = name.trim().split(/\s+/).filter(Boolean).map((word, i) => capitalize(word, i === 0));
  let title = words.join(' ');
  if (brand && !title.toLowerCase().includes(brand.toLowerCase())) {
    title += ` ${brand.trim().split(/\s+/).map(word => capitalize(word, true)).join(' ')}`;
  }
  if (title.length <= TITLE_MAX) return title;
  const cut = title.slice(0, TITLE_MAX + 1);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), 1)).trim();
}

/** GTIN valido (8, 12, 13 ou 14 digitos); codigos internos do ERP ficam de fora. */
export function validGtin(value: unknown): string | null {
  const digits = text(value)?.replace(/\D/g, '') ?? '';
  return [8, 12, 13, 14].includes(digits.length) ? digits : null;
}

/** Peso do Ellon vem como texto sem unidade: ate 50 tratamos como kg, acima como g. */
function ellonWeightGrams(value: unknown): number | null {
  const n = positive(value);
  if (!n) return null;
  return Math.round(n <= 50 ? n * 1000 : n);
}

export function resolvedPrice(base: number, profile: ProfileInput | null, settings: StoreSettings): number {
  const fixed = positive(profile?.fixedPrice);
  if (fixed) return Math.round(fixed * 100) / 100;
  const markup = profile?.markupPercent !== null && profile?.markupPercent !== undefined
    ? money(profile.markupPercent)
    : settings.markupPercent;
  return Math.round(base * (1 + markup / 100) * 100) / 100;
}

export function resolvedQuantity(stock: number, profile: ProfileInput | null): number {
  const own = Math.max(0, stock);
  const mode = profile?.stockMode ?? MarketplaceStockMode.STORE_ONLY;
  if (mode === MarketplaceStockMode.STORE_ONLY) return own;
  return own + Math.max(0, profile?.supplierQuantity ?? 0);
}

/** Prazo de disponibilidade em dias. So o modo sob encomenda tem prazo. */
export function resolvedManufacturingDays(profile: ProfileInput | null): number {
  if (profile?.stockMode !== MarketplaceStockMode.MADE_TO_ORDER) return 0;
  return Math.max(1, profile.manufacturingDays ?? 1);
}

export function effectiveFields(product: ProductInput, profile: ProfileInput | null, settings: StoreSettings): EffectiveFields {
  const s = specs(product);
  const supplier = text(product.supplier);
  const brand = text(profile?.brand) ?? text(s.brand) ?? (supplier && supplier !== 'Ellon' ? supplier : null);
  const basePrice = money(product.promoPrice) > 0 ? money(product.promoPrice) : money(product.salePrice);
  // Alguns cadastros do Ellon trazem o nome vazio ("'") e a descricao no codigo.
  const baseName = /\p{L}{3}/u.test(product.name) ? product.name : product.sku;
  return {
    title: text(profile?.title) ?? suggestTitle(baseName, brand),
    brand,
    partNumber: text(profile?.partNumber) ?? text(s.factoryReference),
    gtin: validGtin(s.barcode),
    packageWeightG: positive(profile?.packageWeightG) ?? ellonWeightGrams(s.weight),
    packageHeightCm: positive(profile?.packageHeightCm) ?? positive(s.height),
    packageWidthCm: positive(profile?.packageWidthCm) ?? positive(s.width),
    packageLengthCm: positive(profile?.packageLengthCm) ?? positive(s.length),
    basePrice,
    price: resolvedPrice(basePrice, profile, settings),
    // Produto desativado no M2 ou retirado do Ellon sai do ar, inclusive o estoque do fornecedor.
    quantity: product.status === 'INACTIVE' || product.status === 'DISCONTINUED' ? 0 : resolvedQuantity(product.stock, profile),
    stockMode: profile?.stockMode ?? MarketplaceStockMode.STORE_ONLY,
    supplierQuantity: Math.max(0, profile?.supplierQuantity ?? 0),
    manufacturingDays: resolvedManufacturingDays(profile),
    listingTypeId: text(profile?.listingTypeId) ?? settings.listingTypeId,
  };
}

/** Atributos que o perfil preencheu a mao (formulario da categoria). */
export function profileAttributes(profile: ProfileInput | null): PublicationAttribute[] {
  const list = Array.isArray(profile?.attributes) ? profile.attributes as Array<Record<string, unknown>> : [];
  return list
    .map(item => ({ id: String(item.id ?? ''), valueId: text(item.valueId), valueName: text(item.valueName) }))
    .filter(item => item.id && (item.valueId || item.valueName));
}

/** Atributos que o sistema preenche sozinho: nao aparecem no formulario da categoria. */
export const AUTO_ATTRIBUTES = new Set([
  'BRAND', 'PART_NUMBER', 'SELLER_SKU', 'GTIN',
  'SELLER_PACKAGE_HEIGHT', 'SELLER_PACKAGE_WIDTH', 'SELLER_PACKAGE_LENGTH', 'SELLER_PACKAGE_WEIGHT',
]);

export function publicationAttributes(eff: EffectiveFields, sku: string, profile: ProfileInput | null): PublicationAttribute[] {
  const auto: PublicationAttribute[] = [];
  const add = (id: string, valueName: string | null) => { if (valueName) auto.push({ id, valueName }); };
  add('BRAND', eff.brand);
  add('PART_NUMBER', eff.partNumber);
  add('SELLER_SKU', sku);
  add('GTIN', eff.gtin);
  add('SELLER_PACKAGE_HEIGHT', eff.packageHeightCm ? `${eff.packageHeightCm} cm` : null);
  add('SELLER_PACKAGE_WIDTH', eff.packageWidthCm ? `${eff.packageWidthCm} cm` : null);
  add('SELLER_PACKAGE_LENGTH', eff.packageLengthCm ? `${eff.packageLengthCm} cm` : null);
  add('SELLER_PACKAGE_WEIGHT', eff.packageWeightG ? `${eff.packageWeightG} g` : null);
  const manual = profileAttributes(profile).filter(item => !AUTO_ATTRIBUTES.has(item.id));
  return [...auto, ...manual];
}

/**
 * Garantia e disponibilidade. `clearManufacturing` manda o prazo vazio, para
 * remover um prazo antigo quando o produto sai do modo sob encomenda.
 */
export function saleTerms(eff: EffectiveFields, settings: StoreSettings, clearManufacturing = false): PublicationAttribute[] {
  const terms: PublicationAttribute[] = [{ id: 'WARRANTY_TYPE', valueName: settings.warrantyType }];
  if (settings.warrantyType !== 'Sem garantia' && settings.warrantyDays > 0) {
    terms.push({ id: 'WARRANTY_TIME', valueName: `${settings.warrantyDays} dias` });
  }
  if (eff.manufacturingDays > 0) terms.push({ id: 'MANUFACTURING_TIME', valueName: `${eff.manufacturingDays} dias` });
  else if (clearManufacturing) terms.push({ id: 'MANUFACTURING_TIME', valueName: null });
  return terms;
}

/**
 * O que falta para o produto poder ser aprovado. `missingAttributes` sao os
 * nomes dos atributos obrigatorios da categoria ainda vazios; null quando a
 * categoria nao foi consultada (sem categoria ou sem conexao).
 */
export function readiness(
  eff: EffectiveFields,
  images: string[],
  categoryId: string | null | undefined,
  missingAttributes: string[] | null
): ReadinessCheck[] {
  const pkg = eff.packageWeightG && eff.packageHeightCm && eff.packageWidthCm && eff.packageLengthCm;
  return [
    { key: 'photo', label: 'Foto', ok: images.length > 0, hint: 'Adicione pelo menos uma foto do produto.' },
    { key: 'title', label: 'Título', ok: eff.title.length > 0 && eff.title.length <= TITLE_MAX, hint: `Até ${TITLE_MAX} caracteres.` },
    { key: 'brand', label: 'Marca', ok: Boolean(eff.brand), hint: 'Informe a marca da peça.' },
    { key: 'partNumber', label: 'Número de peça', ok: Boolean(eff.partNumber), hint: 'Código do fabricante da peça.' },
    { key: 'category', label: 'Categoria', ok: Boolean(categoryId), hint: 'Escolha a categoria do Mercado Livre.' },
    {
      key: 'attributes',
      label: 'Características obrigatórias',
      ok: Boolean(categoryId) && missingAttributes !== null && missingAttributes.length === 0,
      hint: missingAttributes?.length ? `Faltam: ${missingAttributes.join(', ')}.` : 'Escolha a categoria primeiro.',
    },
    { key: 'package', label: 'Peso e medidas da embalagem', ok: Boolean(pkg), hint: 'Peso (g) e altura, largura e comprimento (cm).' },
    { key: 'price', label: 'Preço', ok: eff.price > 0, hint: 'O produto está sem preço.' },
    {
      key: 'quantity',
      label: 'Quantidade à venda',
      ok: eff.quantity > 0,
      hint: eff.stockMode === MarketplaceStockMode.STORE_ONLY
        ? 'Sem estoque na loja. Para vender assim, use o estoque do fornecedor ou sob encomenda.'
        : 'Informe quantas unidades o fornecedor consegue entregar.',
    },
  ];
}
