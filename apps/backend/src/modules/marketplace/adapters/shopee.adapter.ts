import { Request } from 'express';
import { MarketplaceProvider } from '@prisma/client';
import { logger } from '@shared/utils/logger.util.js';
import { ApiError } from '@shared/utils/error.util.js';
import { CryptoUtil } from '@shared/utils/crypto.util.js';
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
  NormalizedWebhookEvent,
} from '../marketplace.types.js';

const API_BASE = 'https://partner.shopeemobile.com';

/**
 * Adapter da Shopee Open Platform (BR).
 * Cada request e assinada com HMAC-SHA256.
 * Docs: https://open.shopee.com/developer-guide/12
 */
export class ShopeeAdapter implements MarketplaceAdapter {
  readonly provider = MarketplaceProvider.SHOPEE;
  readonly recommendedScopes = ['product', 'order', 'logistics', 'shop'];

  private now(): number {
    return Math.floor(Date.now() / 1000);
  }

  /**
   * Assinatura base (endpoints publicos: token/auth).
   * base_string = partner_id + path + timestamp
   */
  private signPublic(partnerId: string, partnerKey: string, path: string, timestamp: number): string {
    return CryptoUtil.hmacSha256Hex(partnerKey, `${partnerId}${path}${timestamp}`);
  }

  /**
   * Assinatura de endpoints da loja (shop).
   * base_string = partner_id + path + timestamp + access_token + shop_id
   */
  private signShop(
    partnerId: string,
    partnerKey: string,
    path: string,
    timestamp: number,
    accessToken: string,
    shopId: string
  ): string {
    return CryptoUtil.hmacSha256Hex(partnerKey, `${partnerId}${path}${timestamp}${accessToken}${shopId}`);
  }

  // ---------------------------------------------------------------------------
  // OAuth
  // ---------------------------------------------------------------------------

  getAuthorizationUrl(account: { appId: string }, _state: string, redirectUri: string): string {
    // appId aqui e o partner_id; appSecret e o partner_key (necessario para assinar a URL de auth)
    // A assinatura da URL de auth e feita no service (precisa do secret); aqui montamos o esqueleto.
    // Para manter o adapter sem segredo, o service usa buildAuthUrl().
    const path = '/api/v2/shop/auth_partner';
    const params = new URLSearchParams({
      partner_id: account.appId,
      redirect: redirectUri,
    });
    return `${API_BASE}${path}?${params.toString()}`;
  }

  /** Monta a URL de autorizacao assinada (chamada pelo service que tem o secret). */
  buildAuthUrl(partnerId: string, partnerKey: string, redirectUri: string): string {
    const path = '/api/v2/shop/auth_partner';
    const timestamp = this.now();
    const sign = this.signPublic(partnerId, partnerKey, path, timestamp);
    const params = new URLSearchParams({
      partner_id: partnerId,
      timestamp: String(timestamp),
      sign,
      redirect: redirectUri,
    });
    return `${API_BASE}${path}?${params.toString()}`;
  }

  async exchangeCodeForToken(
    account: { appId: string; appSecret: string },
    code: string,
    _redirectUri: string,
    extra?: Record<string, string>
  ): Promise<TokenSet> {
    const path = '/api/v2/auth/token/get';
    const timestamp = this.now();
    const sign = this.signPublic(account.appId, account.appSecret, path, timestamp);
    const shopId = extra?.shop_id;

    const res = await fetch(`${API_BASE}${path}?partner_id=${account.appId}&timestamp=${timestamp}&sign=${sign}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        code,
        partner_id: Number(account.appId),
        shop_id: shopId ? Number(shopId) : undefined,
      }),
    });

    const data = (await res.json()) as Record<string, unknown>;
    if (!res.ok || data.error) {
      logger.warn('[Shopee] token request failed', { status: res.status, data });
      throw ApiError.badRequest(`Shopee OAuth falhou: ${(data.message as string) || (data.error as string) || res.status}`);
    }

    return {
      accessToken: String(data.access_token),
      refreshToken: data.refresh_token ? String(data.refresh_token) : null,
      expiresIn: Number(data.expire_in ?? 14400),
      sellerId: shopId ?? null,
    };
  }

  async refreshToken(account: { appId: string; appSecret: string }, refreshToken: string): Promise<TokenSet> {
    const path = '/api/v2/auth/access_token/get';
    const timestamp = this.now();
    const sign = this.signPublic(account.appId, account.appSecret, path, timestamp);

    const res = await fetch(`${API_BASE}${path}?partner_id=${account.appId}&timestamp=${timestamp}&sign=${sign}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken, partner_id: Number(account.appId) }),
    });

    const data = (await res.json()) as Record<string, unknown>;
    if (!res.ok || data.error) {
      logger.warn('[Shopee] refresh failed', { status: res.status, data });
      throw ApiError.badRequest(`Shopee refresh falhou: ${(data.message as string) || (data.error as string) || res.status}`);
    }

    return {
      accessToken: String(data.access_token),
      refreshToken: data.refresh_token ? String(data.refresh_token) : refreshToken,
      expiresIn: Number(data.expire_in ?? 14400),
    };
  }

  async testConnection(account: ProviderAccount): Promise<{ ok: boolean; sellerNickname?: string | null }> {
    const data = await this.apiSend<Record<string, unknown>>(account, 'GET', '/api/v2/shop/get_shop_info');
    return { ok: true, sellerNickname: (data.shop_name as string) ?? null };
  }

  // ---------------------------------------------------------------------------
  // Catalogo
  // ---------------------------------------------------------------------------

  async suggestCategories(account: ProviderAccount, query: string): Promise<CategorySuggestion[]> {
    const data = await this.apiSend<Record<string, unknown>>(account, 'GET', '/api/v2/product/get_category', {
      language: 'pt-br',
    });
    const list = (data.category_list as Array<Record<string, unknown>>) ?? [];
    const q = query.toLowerCase();
    return list
      .filter(c => String(c.display_category_name ?? '').toLowerCase().includes(q))
      .slice(0, 8)
      .map(c => ({
        id: String(c.category_id),
        name: String(c.display_category_name ?? c.category_id),
        path: c.parent_category_id ? `parent:${c.parent_category_id}` : undefined,
      }));
  }

  async getCategoryAttributes(account: ProviderAccount, categoryId: string): Promise<CategoryAttribute[]> {
    const data = await this.apiSend<Record<string, unknown>>(account, 'GET', '/api/v2/product/get_attributes', {
      category_id: categoryId,
      language: 'pt-br',
    });
    const list = (data.attribute_list as Array<Record<string, unknown>>) ?? [];
    return list.map(a => ({
      id: String(a.attribute_id),
      name: String(a.original_attribute_name ?? a.display_attribute_name ?? a.attribute_id),
      required: Boolean(a.is_mandatory),
      type: a.input_type ? String(a.input_type) : undefined,
      values: Array.isArray(a.attribute_value_list)
        ? (a.attribute_value_list as Array<Record<string, unknown>>).map(v => ({
            id: String(v.value_id),
            name: String(v.original_value_name ?? v.display_value_name),
          }))
        : undefined,
    }));
  }

  // ---------------------------------------------------------------------------
  // Publicacao
  // ---------------------------------------------------------------------------

  async publishProduct(account: ProviderAccount, product: NormalizedProduct): Promise<ExternalListing> {
    const mapping = (product as NormalizedProduct & { categoryMapping?: Record<string, unknown> }).categoryMapping;
    const categoryId = mapping?.categoryId as string | undefined;
    if (!categoryId) {
      throw ApiError.badRequest('Selecione uma categoria da Shopee para este produto antes de publicar.');
    }

    // Upload das imagens (Shopee exige image_id). Para simplicidade enviamos por URL via media space.
    const imageIds = await this.uploadImages(account, product.images);

    const payload: Record<string, unknown> = {
      original_price: product.price,
      description: product.description,
      item_name: product.name.slice(0, 120),
      category_id: Number(categoryId),
      item_status: 'NORMAL',
      dimension: mapping?.dimension ?? { package_length: 10, package_width: 10, package_height: 10 },
      weight: (mapping?.weight as number) ?? 0.5,
      logistic_info: mapping?.logisticInfo ?? [],
      attribute_list: mapping?.attributes ?? [],
      image: { image_id_list: imageIds },
      seller_stock: [{ stock: Math.max(product.stock, 0) }],
    };

    const data = await this.apiSend<Record<string, unknown>>(account, 'POST', '/api/v2/product/add_item', payload);
    const response = (data.response as Record<string, unknown>) ?? data;
    const itemId = String(response.item_id ?? '');

    return {
      externalId: itemId,
      externalUrl: account.sellerId ? `https://shopee.com.br/product/${account.sellerId}/${itemId}` : null,
      raw: data,
    };
  }

  private async uploadImages(account: ProviderAccount, urls: string[]): Promise<string[]> {
    const ids: string[] = [];
    for (const url of urls.slice(0, 9)) {
      try {
        const data = await this.apiSend<Record<string, unknown>>(account, 'POST', '/api/v2/media_space/upload_image', {
          image_url: url,
        });
        const response = (data.response as Record<string, unknown>) ?? {};
        const info = (response.image_info as Record<string, unknown>) ?? {};
        if (info.image_id) ids.push(String(info.image_id));
      } catch (err) {
        logger.warn('[Shopee] image upload failed', { url, err: String(err) });
      }
    }
    return ids;
  }

  async updateListing(account: ProviderAccount, externalId: string, patch: ListingPatch): Promise<void> {
    if (patch.price !== undefined) {
      await this.apiSend(account, 'POST', '/api/v2/product/update_price', {
        item_id: Number(externalId),
        price_list: [{ original_price: patch.price }],
      });
    }
    if (patch.stock !== undefined) {
      await this.apiSend(account, 'POST', '/api/v2/product/update_stock', {
        item_id: Number(externalId),
        stock_list: [{ seller_stock: [{ stock: Math.max(patch.stock, 0) }] }],
      });
    }
  }

  async pauseListing(account: ProviderAccount, externalId: string): Promise<void> {
    await this.apiSend(account, 'POST', '/api/v2/product/unlist_item', {
      item_list: [{ item_id: Number(externalId), unlist: true }],
    });
  }

  async closeListing(account: ProviderAccount, externalId: string): Promise<void> {
    await this.apiSend(account, 'POST', '/api/v2/product/delete_item', { item_id: Number(externalId) });
  }

  // ---------------------------------------------------------------------------
  // Pedidos
  // ---------------------------------------------------------------------------

  async fetchOrder(account: ProviderAccount, externalOrderId: string): Promise<NormalizedOrder> {
    const data = await this.apiSend<Record<string, unknown>>(account, 'GET', '/api/v2/order/get_order_detail', {
      order_sn_list: externalOrderId,
      response_optional_fields: 'item_list,total_amount,buyer_username,recipient_address,pay_time',
    });

    const response = (data.response as Record<string, unknown>) ?? {};
    const orders = (response.order_list as Array<Record<string, unknown>>) ?? [];
    const order = orders[0] ?? {};

    const itemList = (order.item_list as Array<Record<string, unknown>>) ?? [];
    const items: NormalizedOrderItem[] = itemList.map(it => ({
      externalItemId: String(it.item_id ?? ''),
      sku: (it.item_sku as string) ?? null,
      title: String(it.item_name ?? 'Item'),
      quantity: Number(it.model_quantity_purchased ?? 1),
      unitPrice: Number(it.model_discounted_price ?? it.model_original_price ?? 0),
    }));

    const addr = (order.recipient_address as Record<string, unknown>) ?? {};

    return {
      externalOrderId: String(order.order_sn ?? externalOrderId),
      status: String(order.order_status ?? 'unknown'),
      buyerName: (order.buyer_username as string) ?? null,
      buyerEmail: null,
      buyerPhone: (addr.phone as string) ?? null,
      total: Number(order.total_amount ?? 0),
      items,
      shippingAddress: {
        street: (addr.full_address as string) ?? null,
        city: (addr.city as string) ?? null,
        state: (addr.state as string) ?? null,
        zipCode: (addr.zipcode as string) ?? null,
      },
      paymentMethod: 'shopee',
      createdAt: order.create_time ? new Date(Number(order.create_time) * 1000) : null,
    };
  }

  // ---------------------------------------------------------------------------
  // Webhooks
  // ---------------------------------------------------------------------------

  verifyWebhook(req: Request, account: ProviderAccount | null): boolean {
    if (!account?.appSecret) return false;
    const signature = req.header('authorization') ?? '';
    const url = `${account ? '' : ''}${req.originalUrl}`;
    const rawBody = (req as Request & { rawBody?: string }).rawBody ?? JSON.stringify(req.body);
    // base_string = url + "|" + body   (assinado com partner_key)
    const expected = CryptoUtil.hmacSha256Hex(account.appSecret, `${url}|${rawBody}`);
    return signature === expected || signature.endsWith(expected);
  }

  parseWebhook(req: Request): NormalizedWebhookEvent | null {
    const body = req.body as Record<string, unknown>;
    if (!body) return null;

    const data = (body.data as Record<string, unknown>) ?? {};
    const ordersn = (data.ordersn as string) ?? (data.order_sn as string);
    if (!ordersn) return null;

    return {
      provider: this.provider,
      topic: body.code === 3 ? 'order_status_push' : String(body.code ?? 'shop_order'),
      externalId: String(ordersn),
      raw: body,
    };
  }

  // ---------------------------------------------------------------------------
  // HTTP helper (com assinatura)
  // ---------------------------------------------------------------------------

  private async apiSend<T>(
    account: ProviderAccount,
    method: 'GET' | 'POST',
    path: string,
    params?: Record<string, unknown>
  ): Promise<T> {
    if (!account.accessToken || !account.sellerId) {
      throw ApiError.unauthorized('Shopee nao conectada (sem access token/shop_id).');
    }

    const timestamp = this.now();
    const sign = this.signShop(
      account.appId,
      account.appSecret,
      path,
      timestamp,
      account.accessToken,
      account.sellerId
    );

    const common = new URLSearchParams({
      partner_id: account.appId,
      timestamp: String(timestamp),
      access_token: account.accessToken,
      shop_id: account.sellerId,
      sign,
    });

    let url = `${API_BASE}${path}?${common.toString()}`;
    let body: string | undefined;

    if (method === 'GET' && params) {
      for (const [k, v] of Object.entries(params)) {
        url += `&${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`;
      }
    } else if (params) {
      body = JSON.stringify(params);
    }

    const res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body,
    });

    const data = (await res.json()) as Record<string, unknown>;
    if (!res.ok || data.error) {
      logger.warn('[Shopee] API error', { method, path, status: res.status, data });
      throw new ApiError(res.status >= 500 ? 502 : 400, `Shopee: ${(data.message as string) || (data.error as string) || res.status}`);
    }

    return data as T;
  }
}
