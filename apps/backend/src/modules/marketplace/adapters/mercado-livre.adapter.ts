import { Request } from 'express';
import { MarketplaceProvider } from '@prisma/client';
import { logger } from '@shared/utils/logger.util.js';
import { ApiError } from '@shared/utils/error.util.js';
import { MarketplaceAdapter } from './marketplace-adapter.js';
import {
  TokenSet,
  ProviderAccount,
  NormalizedProduct,
  ExternalListing,
  ListingPatch,
  NormalizedOrder,
  NormalizedOrderItem,
  CategorySuggestion,
  CategoryAttribute,
  CatalogProduct,
  NormalizedWebhookEvent,
  NormalizedShipment,
  PublicationAttribute,
} from '../marketplace.types.js';

const API_BASE = 'https://api.mercadolibre.com';
const AUTH_BASE = 'https://auth.mercadolivre.com.br';
const SITE_ID = 'MLB'; // Brasil

/** O ML recusa HTML na descricao: a do site pode vir do editor rico. */
export function plainText(value: string): string {
  return value
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|li|h\d)\s*>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function toMlValue(attr: PublicationAttribute): Record<string, unknown> {
  return attr.valueId ? { id: attr.id, value_id: attr.valueId } : { id: attr.id, value_name: attr.valueName };
}

/**
 * Adapter do Mercado Livre.
 * Docs: https://developers.mercadolivre.com.br/
 */
export class MercadoLivreAdapter implements MarketplaceAdapter {
  readonly provider = MarketplaceProvider.MERCADO_LIVRE;
  readonly recommendedScopes = ['offline_access', 'read', 'write'];

  // ---------------------------------------------------------------------------
  // OAuth
  // ---------------------------------------------------------------------------

  getAuthorizationUrl(account: { appId: string }, state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: account.appId,
      redirect_uri: redirectUri,
      state,
    });
    return `${AUTH_BASE}/authorization?${params.toString()}`;
  }

  async exchangeCodeForToken(
    account: { appId: string; appSecret: string },
    code: string,
    redirectUri: string
  ): Promise<TokenSet> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: account.appId,
      client_secret: account.appSecret,
      code,
      redirect_uri: redirectUri,
    });
    return this.requestToken(body);
  }

  async refreshToken(account: { appId: string; appSecret: string }, refreshToken: string): Promise<TokenSet> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: account.appId,
      client_secret: account.appSecret,
      refresh_token: refreshToken,
    });
    return this.requestToken(body);
  }

  private async requestToken(body: URLSearchParams): Promise<TokenSet> {
    const res = await fetch(`${API_BASE}/oauth/token`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const data = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      logger.warn('[ML] token request failed', { status: res.status, data });
      // 5xx/429 e instabilidade do ML (tenta de novo); 4xx e autorizacao revogada ou invalida.
      const transient = res.status >= 500 || res.status === 429;
      throw new ApiError(
        transient ? 502 : 400,
        `Mercado Livre OAuth falhou: ${(data.message as string) || (data.error as string) || res.status}`
      );
    }

    return {
      accessToken: String(data.access_token),
      refreshToken: data.refresh_token ? String(data.refresh_token) : null,
      expiresIn: Number(data.expires_in ?? 21600),
      sellerId: data.user_id ? String(data.user_id) : null,
      scopes: typeof data.scope === 'string' ? data.scope.split(' ') : null,
    };
  }

  async testConnection(account: ProviderAccount): Promise<{ ok: boolean; sellerNickname?: string | null }> {
    const data = await this.apiGet<Record<string, unknown>>(account, '/users/me');
    return { ok: true, sellerNickname: (data.nickname as string) ?? null };
  }

  // ---------------------------------------------------------------------------
  // Catalogo
  // ---------------------------------------------------------------------------

  async suggestCategories(account: ProviderAccount, query: string): Promise<CategorySuggestion[]> {
    const params = new URLSearchParams({ q: query, limit: '8' });
    const data = await this.apiGet<Array<Record<string, unknown>>>(
      account,
      `/sites/${SITE_ID}/domain_discovery/search?${params.toString()}`
    );
    return (data ?? []).map(item => ({
      id: String(item.category_id),
      name: String(item.category_name ?? item.domain_name ?? item.category_id),
      path: item.domain_name ? String(item.domain_name) : undefined,
    }));
  }

  async getCategoryAttributes(account: ProviderAccount, categoryId: string): Promise<CategoryAttribute[]> {
    const data = await this.apiGet<Array<Record<string, unknown>>>(account, `/categories/${categoryId}/attributes`);
    return (data ?? []).map(attr => {
      const tags = (attr.tags as Record<string, unknown>) ?? {};
      return {
        id: String(attr.id),
        name: String(attr.name),
        required: Boolean(tags.required || tags.catalog_required),
        type: attr.value_type ? String(attr.value_type) : undefined,
        values: Array.isArray(attr.values)
          ? (attr.values as Array<Record<string, unknown>>).map(v => ({ id: String(v.id), name: String(v.name) }))
          : undefined,
        units: Array.isArray(attr.allowed_units)
          ? (attr.allowed_units as Array<Record<string, unknown>>).map(u => String(u.id))
          : undefined,
        readOnly: Boolean(tags.read_only || tags.hidden || tags.fixed || tags.inferred),
      };
    });
  }

  /** Termos mais buscados na categoria (ou no site, sem categoria). */
  async getTrends(account: ProviderAccount, categoryId?: string | null): Promise<string[]> {
    const data = await this.apiGet<Array<Record<string, unknown>>>(account, `/trends/${SITE_ID}${categoryId ? `/${categoryId}` : ''}`);
    return (data ?? []).map(item => String(item.keyword ?? '')).filter(Boolean);
  }

  /** Medidas de referencia da embalagem que o ML usa para a categoria (cm e g). */
  async getCategoryPackage(account: ProviderAccount, categoryId: string): Promise<{ heightCm: number; widthCm: number; lengthCm: number; weightG: number } | null> {
    const data = await this.apiGet<Record<string, unknown>>(account, `/categories/${categoryId}/shipping_preferences`);
    const dims = (data?.dimensions as Record<string, unknown>) ?? {};
    const [heightCm, widthCm, lengthCm, weightG] = [dims.height, dims.width, dims.length, dims.weight].map(Number);
    if (![heightCm, widthCm, lengthCm, weightG].every(n => Number.isFinite(n) && n > 0)) return null;
    return { heightCm, widthCm, lengthCm, weightG };
  }

  /** Produtos do catalogo oficial parecidos com a busca, com atributos e fotos. */
  async searchCatalog(account: ProviderAccount, query: string, limit = 3): Promise<CatalogProduct[]> {
    const params = new URLSearchParams({ status: 'active', site_id: SITE_ID, q: query, limit: String(limit) });
    const data = await this.apiGet<Record<string, unknown>>(account, `/products/search?${params.toString()}`);
    const results = (data.results as Array<Record<string, unknown>>) ?? [];
    return results.slice(0, limit).map(item => ({
      id: String(item.id),
      name: String(item.name ?? ''),
      attributes: ((item.attributes as Array<Record<string, unknown>>) ?? []).map(attr => ({
        id: String(attr.id),
        name: String(attr.name ?? attr.id),
        valueId: attr.value_id ? String(attr.value_id) : null,
        valueName: attr.value_name ? String(attr.value_name) : null,
      })),
      pictures: ((item.pictures as Array<Record<string, unknown>>) ?? [])
        .map(pic => String(pic.url ?? pic.secure_url ?? ''))
        .filter(url => url.startsWith('http')),
    }));
  }

  /** Troca a descricao de um anuncio ja publicado (o ML so aceita texto puro). */
  async updateDescription(account: ProviderAccount, externalId: string, text: string): Promise<void> {
    await this.apiSend(account, 'PUT', `/items/${externalId}/description`, { plain_text: plainText(text) });
  }

  // ---------------------------------------------------------------------------
  // Publicacao
  // ---------------------------------------------------------------------------

  async publishProduct(account: ProviderAccount, product: NormalizedProduct): Promise<ExternalListing> {
    const mapping = (product as NormalizedProduct & { categoryMapping?: Record<string, unknown> }).categoryMapping;
    const publication = product.publication;
    let categoryId = publication?.categoryId ?? (mapping?.categoryId as string | undefined);

    // Se nao houver categoria mapeada, tenta prever pela descricao do produto
    if (!categoryId) {
      const suggestions = await this.suggestCategories(account, product.name);
      categoryId = suggestions[0]?.id;
    }
    if (!categoryId) {
      throw ApiError.badRequest('Nao foi possivel determinar a categoria do Mercado Livre para este produto.');
    }

    const attributes: Array<Record<string, unknown>> = publication
      ? publication.attributes.map(toMlValue)
      : [];
    if (!publication) {
      if (product.brand) attributes.push({ id: 'BRAND', value_name: product.brand });
      if (product.sku) attributes.push({ id: 'SELLER_SKU', value_name: product.sku });
    }
    // Atributos manuais resolvidos no frontend (id -> value_name), sem repetir os do perfil
    const known = new Set(attributes.map(attr => attr.id));
    attributes.push(...((mapping?.attributes as Array<Record<string, unknown>>) ?? []).filter(attr => !known.has(attr.id)));

    const title = (publication?.title ?? product.name).slice(0, 60);
    const payload: Record<string, unknown> = {
      category_id: categoryId,
      price: product.price,
      currency_id: 'BRL',
      available_quantity: Math.max(product.stock, 0),
      buying_mode: 'buy_it_now',
      listing_type_id: publication?.listingTypeId ?? (mapping?.listingTypeId as string) ?? 'gold_special',
      condition: 'new',
      pictures: product.images.map(url => ({ source: url })),
      attributes,
      shipping: { mode: 'me2', local_pick_up: false },
    };
    const terms = publication?.saleTerms.filter(term => term.valueId || term.valueName) ?? [];
    if (terms.length) payload.sale_terms = terms.map(toMlValue);
    // Vendedores no modelo "User Products" mandam family_name; o ML gera o titulo.
    if (await this.isUserProductSeller(account)) payload.family_name = title;
    else payload.title = title;

    const created = await this.apiSend<Record<string, unknown>>(account, 'POST', '/items', payload);
    const externalId = String(created.id);

    // Descricao (endpoint separado no ML)
    if (product.description) {
      await this.apiSend(account, 'POST', `/items/${externalId}/description`, {
        plain_text: plainText(product.description),
      }).catch(err => logger.warn('[ML] failed to set description', { externalId, err: String(err) }));
    }

    // Compatibilidade veicular (autopecas)
    if (product.compatibilities.length > 0) {
      await this.publishCompatibilities(account, externalId, product).catch(err =>
        logger.warn('[ML] failed to set compatibilities', { externalId, err: String(err) })
      );
    }

    return {
      externalId,
      externalUrl: (created.permalink as string) ?? null,
      raw: created,
    };
  }

  private async publishCompatibilities(
    account: ProviderAccount,
    itemId: string,
    product: NormalizedProduct
  ): Promise<void> {
    const products = product.compatibilities.map(c => {
      const attrs: Array<Record<string, unknown>> = [];
      if (c.make) attrs.push({ id: 'BRAND', value_name: c.make });
      if (c.model) attrs.push({ id: 'MODEL', value_name: c.model });
      if (c.variant) attrs.push({ id: 'TRIM', value_name: c.variant });
      if (c.yearStart) attrs.push({ id: 'VEHICLE_YEAR', value_name: String(c.yearStart) });
      return { attributes: attrs };
    });
    await this.apiSend(account, 'POST', `/items/${itemId}/compatibilities`, { products });
  }

  async updateListing(account: ProviderAccount, externalId: string, patch: ListingPatch): Promise<void> {
    const body: Record<string, unknown> = {};
    if (patch.price !== undefined) body.price = patch.price;
    if (patch.stock !== undefined) body.available_quantity = Math.max(patch.stock, 0);
    if (patch.saleTerms?.length) body.sale_terms = patch.saleTerms.map(toMlValue);
    if (Object.keys(body).length === 0) return;
    await this.apiSend(account, 'PUT', `/items/${externalId}`, body);
  }

  async pauseListing(account: ProviderAccount, externalId: string): Promise<void> {
    await this.apiSend(account, 'PUT', `/items/${externalId}`, { status: 'paused' });
  }

  async activateListing(account: ProviderAccount, externalId: string): Promise<void> {
    await this.apiSend(account, 'PUT', `/items/${externalId}`, { status: 'active' });
  }

  async fetchListingStatus(account: ProviderAccount, externalId: string): Promise<{ status: string; subStatus: string[] }> {
    const data = await this.apiGet<Record<string, unknown>>(account, `/items/${externalId}?attributes=status,sub_status`);
    return {
      status: String(data.status ?? 'unknown'),
      subStatus: Array.isArray(data.sub_status) ? data.sub_status.map(String) : [],
    };
  }

  /** Tarifa de venda estimada pelo ML para o preco, categoria e tipo de anuncio. */
  async estimateSaleFee(
    account: ProviderAccount,
    price: number,
    categoryId: string,
    listingTypeId: string
  ): Promise<number | null> {
    const params = new URLSearchParams({ price: String(price), category_id: categoryId, listing_type_id: listingTypeId });
    const data = await this.apiGet<unknown>(account, `/sites/${SITE_ID}/listing_prices?${params.toString()}`);
    const entry = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined;
    return typeof entry?.sale_fee_amount === 'number' ? entry.sale_fee_amount : null;
  }

  private userProductSeller = new Map<string, boolean>();

  private async isUserProductSeller(account: ProviderAccount): Promise<boolean> {
    const key = account.sellerId ?? '';
    const cached = this.userProductSeller.get(key);
    if (cached !== undefined) return cached;
    const me = await this.apiGet<Record<string, unknown>>(account, '/users/me');
    const value = Array.isArray(me.tags) && me.tags.includes('user_product_seller');
    this.userProductSeller.set(key, value);
    return value;
  }

  async closeListing(account: ProviderAccount, externalId: string): Promise<void> {
    await this.apiSend(account, 'PUT', `/items/${externalId}`, { status: 'closed' });
  }

  // ---------------------------------------------------------------------------
  // Pedidos
  // ---------------------------------------------------------------------------

  async fetchOrder(account: ProviderAccount, externalOrderId: string): Promise<NormalizedOrder> {
    const data = await this.apiGet<Record<string, unknown>>(account, `/orders/${externalOrderId}`);

    const orderItems = (data.order_items as Array<Record<string, unknown>>) ?? [];
    const items: NormalizedOrderItem[] = orderItems.map(oi => {
      const item = (oi.item as Record<string, unknown>) ?? {};
      return {
        externalItemId: String(item.id ?? ''),
        sku: (item.seller_sku as string) ?? null,
        title: String(item.title ?? 'Item'),
        quantity: Number(oi.quantity ?? 1),
        unitPrice: Number(oi.unit_price ?? 0),
      };
    });

    const buyer = (data.buyer as Record<string, unknown>) ?? {};
    const payments = (data.payments as Array<Record<string, unknown>>) ?? [];
    const shipping = (data.shipping as Record<string, unknown>) ?? {};

    return {
      externalOrderId: String(data.id),
      status: String(data.status ?? 'unknown'),
      buyerName: [buyer.first_name, buyer.last_name].filter(Boolean).join(' ') || (buyer.nickname as string) || null,
      buyerEmail: (buyer.email as string) ?? null,
      buyerPhone: null,
      total: Number(data.total_amount ?? 0),
      items,
      paymentMethod: payments[0] ? String(payments[0].payment_type ?? 'mercado_pago') : 'mercado_pago',
      createdAt: data.date_created ? new Date(String(data.date_created)) : null,
      shipmentId: shipping.id ? String(shipping.id) : null,
      packId: data.pack_id ? String(data.pack_id) : null,
      buyerNickname: (buyer.nickname as string) ?? null,
    };
  }

  /** Ids dos pedidos criados desde `since` (rede de seguranca para webhooks perdidos). */
  async searchRecentOrders(account: ProviderAccount, since: Date): Promise<string[]> {
    const params = new URLSearchParams({
      seller: account.sellerId ?? '',
      'order.date_created.from': since.toISOString(),
      sort: 'date_desc',
      limit: '50',
    });
    const data = await this.apiGet<Record<string, unknown>>(account, `/orders/search?${params.toString()}`);
    const results = (data.results as Array<Record<string, unknown>>) ?? [];
    return results.map(order => String(order.id));
  }

  async fetchShipment(account: ProviderAccount, shipmentId: string): Promise<NormalizedShipment> {
    const data = await this.apiSend<Record<string, unknown>>(account, 'GET', `/shipments/${shipmentId}`, undefined, {
      'x-format-new': 'true',
    });
    const logistic = (data.logistic as Record<string, unknown>) ?? {};
    // O SLA so existe enquanto o envio nao saiu; fora disso a chamada falha e seguimos sem prazo.
    const sla = await this.apiGet<Record<string, unknown>>(account, `/shipments/${shipmentId}/sla`).catch(() => null);
    return {
      id: String(data.id ?? shipmentId),
      orderId: data.order_id ? String(data.order_id) : null,
      status: String(data.status ?? 'unknown'),
      substatus: data.substatus ? String(data.substatus) : null,
      logisticType: logistic.type ? String(logistic.type) : (data.logistic_type as string) ?? null,
      trackingNumber: data.tracking_number ? String(data.tracking_number) : null,
      dispatchBy: sla?.expected_date ? new Date(String(sla.expected_date)) : null,
    };
  }

  /** Etiqueta de envio em PDF (so existe com o envio pronto para despacho). */
  async downloadLabel(account: ProviderAccount, shipmentId: string): Promise<Buffer> {
    if (!account.accessToken) throw ApiError.unauthorized('Mercado Livre nao conectado (sem access token).');
    const params = new URLSearchParams({ shipment_ids: shipmentId, response_type: 'pdf' });
    const res = await fetch(`${API_BASE}/shipment_labels?${params.toString()}`, {
      headers: { authorization: `Bearer ${account.accessToken}` },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null) as Record<string, unknown> | null;
      const message = (data?.message as string) || `HTTP ${res.status}`;
      throw ApiError.badRequest(`Etiqueta indisponível no Mercado Livre: ${message}`);
    }
    return Buffer.from(await res.arrayBuffer());
  }

  // ---------------------------------------------------------------------------
  // Webhooks
  // ---------------------------------------------------------------------------

  verifyWebhook(req: Request, account: ProviderAccount | null): boolean {
    // O ML valida por user_id no payload; confirmamos que bate com o vendedor conectado.
    const body = req.body as Record<string, unknown>;
    if (!body || typeof body !== 'object') return false;
    if (account?.sellerId && body.user_id && String(body.user_id) !== account.sellerId) {
      return false;
    }
    return true;
  }

  parseWebhook(req: Request): NormalizedWebhookEvent | null {
    const body = req.body as Record<string, unknown>;
    if (!body?.topic || !body?.resource) return null;

    const topic = String(body.topic);
    const resource = String(body.resource); // ex.: "/orders/2000003508419013"
    const externalId = resource.split('/').filter(Boolean).pop() ?? resource;

    return {
      provider: this.provider,
      topic,
      externalId,
      raw: body,
    };
  }

  // ---------------------------------------------------------------------------
  // HTTP helpers
  // ---------------------------------------------------------------------------

  private async apiGet<T>(account: ProviderAccount, path: string): Promise<T> {
    return this.apiSend<T>(account, 'GET', path);
  }

  private async apiSend<T>(
    account: ProviderAccount,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
    extraHeaders: Record<string, string> = {}
  ): Promise<T> {
    if (!account.accessToken) {
      throw ApiError.unauthorized('Mercado Livre nao conectado (sem access token).');
    }

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${account.accessToken}`,
        'content-type': 'application/json',
        accept: 'application/json',
        ...extraHeaders,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : null;

    if (!res.ok) {
      logger.warn('[ML] API error', { method, path, status: res.status, data });
      const message = (data?.message as string) || (data?.error as string) || `HTTP ${res.status}`;
      // O ML lista os motivos da recusa em `cause`; sao eles que dizem o que corrigir.
      const causes = Array.isArray(data?.cause)
        ? (data.cause as Array<Record<string, unknown>>)
          .filter(c => c.type !== 'warning')
          .map(c => String(c.message ?? c.code ?? ''))
          .filter(Boolean)
        : [];
      const detail = causes.length ? ` (${causes.join('; ')})` : '';
      throw new ApiError(res.status >= 500 ? 502 : 400, `Mercado Livre: ${message}${detail}`);
    }

    return data as T;
  }
}
