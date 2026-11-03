import { MarketplaceProvider, Prisma } from '@prisma/client';
import { prisma } from '@config/database.js';
import { environment } from '@config/environment.js';
import { NormalizedProduct, VehicleCompat } from '../marketplace.types.js';
import { effectiveFields, parseSettings, publicationAttributes, saleTerms } from './publication.js';

type ProductWithCompat = Prisma.ProductGetPayload<{
  include: { vehicleCompatibility: true };
}>;

function toStringArray(value: Prisma.JsonValue | null | undefined): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string');
  }
  return [];
}

function toRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

/**
 * Resolve nomes legiveis (marca/modelo/variante) das compatibilidades veiculares,
 * fazendo lookup nas tabelas de veiculos. Usado para preencher a compatibilidade
 * exigida pelo Mercado Livre em autopecas.
 */
async function resolveCompatibilities(product: ProductWithCompat): Promise<VehicleCompat[]> {
  const compat = product.vehicleCompatibility ?? [];
  if (compat.length === 0) return [];

  const makeIds = [...new Set(compat.map(c => c.makeId).filter((v): v is string => Boolean(v)))];
  const modelIds = [...new Set(compat.map(c => c.modelId).filter((v): v is string => Boolean(v)))];
  const variantIds = [...new Set(compat.map(c => c.variantId).filter((v): v is string => Boolean(v)))];

  const [makes, models, variants] = await Promise.all([
    makeIds.length ? prisma.vehicleMake.findMany({ where: { id: { in: makeIds } } }) : Promise.resolve([]),
    modelIds.length ? prisma.vehicleModel.findMany({ where: { id: { in: modelIds } } }) : Promise.resolve([]),
    variantIds.length ? prisma.vehicleVariant.findMany({ where: { id: { in: variantIds } } }) : Promise.resolve([]),
  ]);

  const makeName = new Map(makes.map(m => [m.id, m.name]));
  const modelName = new Map(models.map(m => [m.id, m.name]));
  const variantName = new Map(variants.map(v => [v.id, v.name]));

  return compat.map(c => {
    const data = toRecord(c.compatibilityData);
    return {
      make: c.makeId ? makeName.get(c.makeId) ?? null : (data?.make as string) ?? null,
      model: c.modelId ? modelName.get(c.modelId) ?? null : (data?.model as string) ?? null,
      variant: c.variantId ? variantName.get(c.variantId) ?? null : (data?.variant as string) ?? null,
      yearStart: c.yearStart ?? null,
      yearEnd: c.yearEnd ?? null,
    };
  });
}

/**
 * Converte um Product do Prisma (com compatibilidades) para o formato neutro
 * consumido pelos adapters de marketplace.
 */
export async function normalizeProduct(product: ProductWithCompat): Promise<NormalizedProduct> {
  const specifications = toRecord(product.specifications);
  const brand =
    (specifications?.brand as string) ??
    (specifications?.marca as string) ??
    product.supplier ??
    null;

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    category: product.category,
    subcategory: product.subcategory ?? null,
    sku: product.sku,
    price: Number(product.promoPrice ?? product.salePrice),
    stock: product.stock,
    images: toStringArray(product.images),
    specifications,
    brand,
    compatibilities: await resolveCompatibilities(product),
  };
}

/** O marketplace baixa as fotos pela URL: caminhos locais (/uploads/...) viram absolutos. */
export function absoluteImageUrl(url: string): string {
  return url.startsWith('/') ? `${environment.app.baseUrl.replace(/\/$/, '')}${url}` : url;
}

/**
 * Carrega o produto com compatibilidades e normaliza. Com `provider`, aplica o
 * perfil do painel e as regras da loja: preco e quantidade passam a ser os do
 * anuncio, e `publication` traz titulo, categoria, atributos e termos de venda.
 */
export async function loadAndNormalizeProduct(
  productId: string,
  provider?: MarketplaceProvider
): Promise<NormalizedProduct | null> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { vehicleCompatibility: true },
  });
  if (!product) return null;
  const normalized = await normalizeProduct(product);
  normalized.images = normalized.images.map(absoluteImageUrl);
  if (!provider) return normalized;

  const [profile, connection] = await Promise.all([
    prisma.marketplaceProductProfile.findUnique({ where: { productId_provider: { productId, provider } } }),
    prisma.marketplaceConnection.findUnique({ where: { provider }, select: { settings: true } }),
  ]);
  const settings = parseSettings(connection?.settings);
  const eff = effectiveFields(product, profile, settings);
  return {
    ...normalized,
    price: eff.price,
    stock: eff.quantity,
    brand: eff.brand,
    description: profile?.description?.trim() || normalized.description,
    publication: {
      title: eff.title,
      categoryId: profile?.categoryId ?? null,
      listingTypeId: eff.listingTypeId,
      attributes: publicationAttributes(eff, product.sku, profile),
      saleTerms: saleTerms(eff, settings, true),
    },
  };
}
