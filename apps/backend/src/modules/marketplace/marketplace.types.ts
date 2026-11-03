import { MarketplaceProvider } from '@prisma/client';

/** Conjunto de tokens devolvido por um fluxo OAuth (troca de code ou refresh). */
export interface TokenSet {
  accessToken: string;
  refreshToken: string | null;
  /** Validade do access token em segundos a partir de agora. */
  expiresIn: number;
  sellerId?: string | null;
  sellerNickname?: string | null;
  scopes?: string[] | null;
}

/** Credenciais do app (descriptografadas) + conta autorizada de um provider. */
export interface ProviderAccount {
  provider: MarketplaceProvider;
  appId: string;
  appSecret: string;
  accessToken: string | null;
  refreshToken: string | null;
  sellerId: string | null;
}

/** Compatibilidade veicular normalizada para envio ao marketplace. */
export interface VehicleCompat {
  make?: string | null;
  model?: string | null;
  variant?: string | null;
  yearStart?: number | null;
  yearEnd?: number | null;
}

/** Produto M2 normalizado para os mappers de cada marketplace. */
export interface NormalizedProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string | null;
  sku: string;
  price: number;
  stock: number;
  images: string[];
  specifications?: Record<string, unknown> | null;
  brand?: string | null;
  compatibilities: VehicleCompat[];
  /** Dados resolvidos pelo perfil do marketplace (painel). Presente quando o produto tem perfil. */
  publication?: MarketplacePublication;
}

/** Atributo pronto para envio (id do marketplace + valor). */
export interface PublicationAttribute {
  id: string;
  valueId?: string | null;
  valueName?: string | null;
}

/** Campos do anuncio ja resolvidos (perfil do painel + regras da loja). */
export interface MarketplacePublication {
  title: string;
  categoryId: string | null;
  listingTypeId: string;
  attributes: PublicationAttribute[];
  /** Termos de venda (ML: garantia e disponibilidade de estoque). */
  saleTerms: PublicationAttribute[];
}

/** Resultado de uma publicacao no marketplace. */
export interface ExternalListing {
  externalId: string;
  externalUrl: string | null;
  raw?: unknown;
}

/** Patch parcial aplicado a um anuncio existente. */
export interface ListingPatch {
  price?: number;
  stock?: number;
  saleTerms?: PublicationAttribute[];
}

/** Item de um pedido normalizado vindo do marketplace. */
export interface NormalizedOrderItem {
  externalItemId: string; // id do anuncio no marketplace (para casar com MarketplaceListing.externalId)
  sku?: string | null;
  title: string;
  quantity: number;
  unitPrice: number;
}

/** Pedido normalizado vindo de um marketplace. */
export interface NormalizedOrder {
  externalOrderId: string;
  status: string;
  buyerName?: string | null;
  buyerEmail?: string | null;
  buyerPhone?: string | null;
  total: number;
  items: NormalizedOrderItem[];
  shippingAddress?: {
    street?: string | null;
    number?: string | null;
    complement?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
  } | null;
  paymentMethod?: string | null;
  createdAt?: Date | null;
  shipmentId?: string | null;
  packId?: string | null;
  buyerNickname?: string | null;
}

/** Situacao do envio de uma venda, normalizada. */
export interface NormalizedShipment {
  id: string;
  orderId: string | null;
  status: string;
  substatus: string | null;
  logisticType: string | null;
  trackingNumber: string | null;
  /** Prazo limite de despacho, quando o marketplace informa. */
  dispatchBy: Date | null;
}

/** Item de checklist devolvido pelo endpoint de prontidao. */
export interface ReadinessItem {
  key: string;
  label: string;
  status: 'ok' | 'pending' | 'manual';
  hint?: string;
}

/** Sugestao de categoria devolvida pelo predictor. */
export interface CategorySuggestion {
  id: string;
  name: string;
  path?: string;
}

/** Atributo de categoria (campo do formulario de publicacao). */
export interface CategoryAttribute {
  id: string;
  name: string;
  required: boolean;
  type?: string;
  values?: Array<{ id: string; name: string }>;
}

/** Evento de webhook normalizado para gravacao em MarketplaceEvent. */
export interface NormalizedWebhookEvent {
  provider: MarketplaceProvider;
  topic: string;
  externalId: string;
  raw: unknown;
}
