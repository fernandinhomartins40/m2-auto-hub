import { CatalogProduct, CategoryAttribute } from '../marketplace.types.js';
import { AUTO_ATTRIBUTES } from './publication.js';

/**
 * Assistente de anuncio: monta o pedido para a IA e valida a resposta contra a
 * categoria do Mercado Livre. Nada aqui acessa banco ou rede.
 */

const TITLE_MAX = 60;
const DESCRIPTION_MAX = 5000;
const VALUES_PER_ATTRIBUTE = 30;

export interface ListingContext {
  product: {
    name: string;
    sku: string;
    brand: string | null;
    partNumber: string | null;
    gtin: string | null;
    application: string | null;
    category: string;
    description: string;
    currentTitle: string;
  };
  category: { id: string; name: string | null } | null;
  attributes: CategoryAttribute[];
  trends: string[];
  catalog: CatalogProduct[];
}

export interface SuggestedAttribute {
  id: string;
  name: string;
  valueId: string | null;
  valueName: string;
  source: string;
  confidence: 'alta' | 'media';
}

export interface ListingSuggestion {
  categoryId: string | null;
  categoryName: string | null;
  title: string;
  attributes: SuggestedAttribute[];
  description: string;
  keywords: string[];
  regionalNames: string[];
  clipScript: string;
  photoChecklist: string[];
  notes: string;
  discarded: string[];
}

export interface PackageSuggestion {
  heightCm: number;
  widthCm: number;
  lengthCm: number;
  weightG: number;
  source: string;
}

/** Converte "10 cm", "0,5 m", "500 g", "1.4 kg" para cm ou g. */
function measure(value: string | null, kind: 'length' | 'weight'): number | null {
  const match = value?.trim().replace(',', '.').match(/^([\d.]+)\s*([a-zA-Z]*)$/);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  const unit = match[2].toLowerCase();
  const factor = kind === 'length'
    ? ({ '': 1, cm: 1, mm: 0.1, m: 100 } as Record<string, number>)[unit]
    : ({ '': 1, g: 1, kg: 1000 } as Record<string, number>)[unit];
  return factor ? Math.round(n * factor * 10) / 10 : null;
}

/**
 * Medidas da embalagem: as do catalogo oficial quando vierem completas; senao
 * as de referencia que o ML usa para a categoria.
 */
export function packageSuggestion(
  catalog: CatalogProduct[],
  reference: { heightCm: number; widthCm: number; lengthCm: number; weightG: number } | null,
  categoryName: string | null
): PackageSuggestion | null {
  for (const item of catalog) {
    const value = (id: string) => item.attributes.find(attr => attr.id === id)?.valueName ?? null;
    const dims = {
      heightCm: measure(value('PACKAGE_HEIGHT'), 'length'),
      widthCm: measure(value('PACKAGE_WIDTH'), 'length'),
      lengthCm: measure(value('PACKAGE_LENGTH'), 'length'),
      weightG: measure(value('PACKAGE_WEIGHT'), 'weight'),
    };
    if (dims.heightCm && dims.widthCm && dims.lengthCm && dims.weightG) {
      return { heightCm: dims.heightCm, widthCm: dims.widthCm, lengthCm: dims.lengthCm, weightG: Math.round(dims.weightG), source: `Catálogo do Mercado Livre (${item.name})` };
    }
  }
  if (!reference) return null;
  return { ...reference, source: `Referência do Mercado Livre para ${categoryName ?? 'a categoria'}` };
}

export type ApplyField = 'title' | 'category' | 'attributes' | 'description' | 'package';

export type StoredSuggestion = ListingSuggestion & { package?: PackageSuggestion | null };

/**
 * Tira da sugestao o que acabou de ser aplicado. `done` = nao sobrou nada
 * para aplicar (roteiro e lista de fotos sao so referencia).
 */
export function withoutApplied(suggestion: StoredSuggestion, fields: ApplyField[], attributeIds?: string[]): { suggestion: StoredSuggestion; done: boolean } {
  const next: StoredSuggestion = { ...suggestion };
  if (fields.includes('title')) next.title = '';
  if (fields.includes('category')) {
    next.categoryId = null;
    next.categoryName = null;
  }
  if (fields.includes('description')) next.description = '';
  if (fields.includes('package')) next.package = null;
  if (fields.includes('attributes')) {
    next.attributes = attributeIds?.length ? suggestion.attributes.filter(attr => !attributeIds.includes(attr.id)) : [];
  }
  const done = !next.title && !next.categoryId && !next.description && !next.package && next.attributes.length === 0;
  return { suggestion: next, done };
}

/** Atributos que a IA pode preencher (o sistema cuida dos automaticos). */
export function fillableAttributes(attributes: CategoryAttribute[]): CategoryAttribute[] {
  return attributes.filter(attr => !AUTO_ATTRIBUTES.has(attr.id) && !attr.readOnly && attr.id !== 'ITEM_CONDITION');
}

const SYSTEM_PROMPT = `Você é especialista em anúncios de autopeças no Mercado Livre Brasil.
Monte o anúncio de UM produto a partir dos dados fornecidos e responda SOMENTE com JSON válido.

Regras obrigatórias:
1. Nunca invente dados técnicos. Só preencha uma característica se a informação estiver nos dados do ERP, na aplicação, no nome ou em um produto do catálogo que seja claramente o MESMO produto (mesma marca e número de peça). Na dúvida, deixe de fora.
2. Título: até 60 caracteres, no formato "tipo de produto + marca + modelo/aplicação + especificação principal". Comece pelo termo que o comprador mais busca (use as buscas em alta da categoria quando servirem ao produto). Sem tudo em maiúsculas, sem "oferta", "promoção", "frete grátis", emojis ou sinais repetidos.
3. Características: use exatamente os "id" da lista fornecida. Quando a característica tem lista de valores, use o "valor_id" de um desses valores. Medidas com unidade no formato "10 mm" usando uma unidade aceita.
4. Descrição em texto puro, português do Brasil, para o comprador: o que é a peça, para quais veículos serve (só o que estiver na aplicação), especificações principais, o que vem na embalagem (só se souber) e um parágrafo "Também conhecido como" com os nomes regionais e sinônimos que brasileiros de diferentes regiões usam para a peça. Sem HTML, sem links, sem telefone, e-mail ou redes sociais, sem preço e sem repetir palavras-chave em excesso.
5. Nomes regionais: como a peça é chamada em diferentes regiões do Brasil e no linguajar de oficina (ex.: "pivô" e "terminal", "coxim" e "calço"). Só nomes reais.
6. Roteiro de clip: vídeo vertical de 30 a 59 segundos para a equipe gravar com a peça real, cena a cena, sem preço nem promoção.
7. Fotos sugeridas: lista curta do que fotografar (peça inteira em fundo branco, detalhes, código gravado, embalagem, instalada no veículo).

Formato da resposta:
{"titulo": "...", "atributos": [{"id": "...", "valor_id": "... ou null", "valor": "...", "fonte": "erp|aplicacao|nome|catalogo", "confianca": "alta|media"}],
 "descricao": "...", "palavras_chave": ["..."], "nomes_regionais": ["..."], "roteiro_clip": "...", "fotos_sugeridas": ["..."], "observacoes": "o que o lojista precisa conferir"}`;

/** Mensagens para a IA. Valores longos de lista sao cortados para caber no contexto. */
export function buildListingMessages(context: ListingContext): Array<{ role: 'system' | 'user'; content: string }> {
  const attributes = fillableAttributes(context.attributes).map(attr => ({
    id: attr.id,
    nome: attr.name,
    obrigatoria: attr.required,
    tipo: attr.type,
    ...(attr.units?.length && { unidades: attr.units }),
    ...(attr.values?.length && {
      valores: attr.values.slice(0, VALUES_PER_ATTRIBUTE).map(value => ({ valor_id: value.id, valor: value.name })),
      ...(attr.values.length > VALUES_PER_ATTRIBUTE && { mais_valores: 'existem outros; se o certo não estiver na lista, escreva o valor sem valor_id' }),
    }),
  }));
  const data = {
    produto_erp: {
      nome: context.product.name,
      codigo: context.product.sku,
      marca: context.product.brand,
      numero_de_peca: context.product.partNumber,
      codigo_de_barras: context.product.gtin,
      aplicacao: context.product.application,
      grupo: context.product.category,
      descricao_atual: context.product.description.slice(0, 1500),
      titulo_atual: context.product.currentTitle,
    },
    categoria_mercado_livre: context.category,
    buscas_em_alta_na_categoria: context.trends.slice(0, 20),
    produtos_do_catalogo: context.catalog.map(item => ({
      nome: item.name,
      caracteristicas: item.attributes.filter(attr => attr.valueName).slice(0, 40).map(attr => `${attr.name}: ${attr.valueName}`),
    })),
    caracteristicas_da_categoria: attributes,
  };
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Dados do produto (JSON):\n${JSON.stringify(data)}` },
  ];
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : '';
}

function list(value: unknown, max: number): string[] {
  return Array.isArray(value) ? value.map(text).filter(Boolean).slice(0, max) : [];
}

/** Titulo em ate 60 caracteres, cortado em palavra inteira. */
export function fitTitle(value: string): string {
  const title = value.replace(/\s+/g, ' ').trim();
  if (title.length <= TITLE_MAX) return title;
  const cut = title.slice(0, TITLE_MAX + 1);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), 1)).trim();
}

/** Tira o que o ML proibe na descricao: links, e-mail, telefone e HTML. */
export function cleanDescription(value: string): string {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/https?:\/\/\S+|www\.\S+/gi, '')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '')
    // Telefone so com DDD entre parenteses ou +55: numeros de peca (0986-4521) ficam.
    .replace(/(\+55\s?)?\(\d{2}\)\s?9?\d{4}[-\s]?\d{4}|\+55\s?\d{2}\s?9?\d{4}[-\s]?\d{4}/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, DESCRIPTION_MAX);
}

const NUMBER_UNIT = /^(\d+(?:[.,]\d+)?)\s*([^\d\s].*)$/;

/**
 * Confere cada caracteristica sugerida com a categoria: id valido, valor da
 * lista quando a caracteristica tem lista fechada, unidade aceita em medidas.
 * O que nao passa vai para `discarded`, para o lojista saber.
 */
export function sanitizeSuggestion(
  raw: Record<string, unknown>,
  context: Pick<ListingContext, 'attributes' | 'category'>
): ListingSuggestion {
  const byId = new Map(fillableAttributes(context.attributes).map(attr => [attr.id, attr]));
  const discarded: string[] = [];
  const attributes: SuggestedAttribute[] = [];
  const seen = new Set<string>();

  for (const item of Array.isArray(raw.atributos) ? raw.atributos as Array<Record<string, unknown>> : []) {
    const id = text(item.id).toUpperCase();
    const attr = byId.get(id);
    const valueName = text(item.valor);
    const confidence = text(item.confianca) === 'alta' ? 'alta' : text(item.confianca) === 'media' ? 'media' : null;
    if (!attr || seen.has(id) || !confidence || (!valueName && !text(item.valor_id))) {
      if (id && !seen.has(id)) discarded.push(attr ? `${attr.name}: sem valor ou confiança` : `${id}: não existe nesta categoria`);
      continue;
    }
    let valueId: string | null = null;
    let finalName = valueName;
    if (attr.values?.length) {
      const wantedId = text(item.valor_id);
      const match = attr.values.find(value => value.id === wantedId)
        ?? attr.values.find(value => value.name.toLowerCase() === valueName.toLowerCase());
      const closed = attr.type === 'list' || attr.type === 'boolean';
      if (match) {
        valueId = match.id;
        finalName = match.name;
      } else if (closed) {
        discarded.push(`${attr.name}: "${valueName}" não está entre os valores aceitos`);
        continue;
      }
    }
    if (attr.type === 'number_unit') {
      const m = NUMBER_UNIT.exec(finalName);
      const unit = m?.[2].trim();
      if (!m || (attr.units?.length && !attr.units.includes(unit ?? ''))) {
        discarded.push(`${attr.name}: "${finalName}" sem unidade aceita`);
        continue;
      }
      finalName = `${m[1].replace(',', '.')} ${unit}`;
    }
    if (attr.type === 'number' && !/^\d+(?:[.,]\d+)?$/.test(finalName)) {
      discarded.push(`${attr.name}: "${finalName}" não é número`);
      continue;
    }
    seen.add(id);
    attributes.push({ id, name: attr.name, valueId, valueName: finalName, source: text(item.fonte) || 'ia', confidence });
  }

  return {
    categoryId: context.category?.id ?? null,
    categoryName: context.category?.name ?? null,
    title: fitTitle(text(raw.titulo)),
    attributes,
    description: cleanDescription(text(raw.descricao)),
    keywords: list(raw.palavras_chave, 20),
    regionalNames: list(raw.nomes_regionais, 15),
    clipScript: text(raw.roteiro_clip).slice(0, 3000),
    photoChecklist: list(raw.fotos_sugeridas, 12),
    notes: text(raw.observacoes).slice(0, 1500),
    discarded,
  };
}

export interface PhotoVerdict {
  index: number;
  sameProduct: boolean;
  watermark: boolean;
  whiteBackground: boolean;
  reason: string;
}

export function buildPhotoMessages(product: ListingContext['product'], urls: string[]) {
  return [
    {
      role: 'system' as const,
      content: 'Você confere fotos para anúncios de autopeças. Responda SOMENTE com JSON: {"fotos": [{"indice": 0, "mesma_peca": true, "marca_dagua": false, "fundo_branco": true, "motivo": "..."}]}. "mesma_peca" só é true se a foto mostra o mesmo tipo de peça e, quando der para ver, a mesma marca. "marca_dagua" é true para logotipos de lojas, textos promocionais, telefones ou marcas d\'água sobre a imagem.',
    },
    {
      role: 'user' as const,
      content: [
        { type: 'text' as const, text: `Produto: ${product.name}. Marca: ${product.brand ?? 'não informada'}. Número de peça: ${product.partNumber ?? 'não informado'}. Fotos na ordem (índice começando em 0):` },
        ...urls.map(url => ({ type: 'image_url' as const, image_url: { url, detail: 'low' as const } })),
      ],
    },
  ];
}

export function parsePhotoVerdicts(raw: Record<string, unknown>, count: number): PhotoVerdict[] {
  const items = Array.isArray(raw.fotos) ? raw.fotos as Array<Record<string, unknown>> : [];
  return items
    .map(item => ({
      index: Number(item.indice),
      sameProduct: item.mesma_peca === true,
      watermark: item.marca_dagua === true,
      whiteBackground: item.fundo_branco === true,
      reason: text(item.motivo).slice(0, 300),
    }))
    .filter(item => Number.isInteger(item.index) && item.index >= 0 && item.index < count);
}
