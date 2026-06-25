import { MarketplaceProvider, MarketplaceConnectionStatus } from '@prisma/client';
import { environment } from '@config/environment.js';
import { ApiError } from '@shared/utils/error.util.js';
import { CryptoUtil } from '@shared/utils/crypto.util.js';
import { logger } from '@shared/utils/logger.util.js';
import { getAdapter, shopee } from '../adapters/index.js';
import { connectionService } from './connection.service.js';

interface PendingState {
  provider: MarketplaceProvider;
  createdAt: number;
}

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutos

/**
 * Orquestra o fluxo OAuth: gera URL de autorizacao, valida `state` (anti-CSRF)
 * e troca o `code` do callback por tokens.
 */
export class OAuthService {
  /** Armazena os states pendentes em memoria (curta duracao). */
  private states = new Map<string, PendingState>();

  /** URL de redirect (callback OAuth) montada a partir da base publica. */
  redirectUri(provider: MarketplaceProvider): string {
    const slug = provider === MarketplaceProvider.MERCADO_LIVRE ? 'mercadolivre' : 'shopee';
    return `${environment.app.baseUrl}/api/marketplace/${slug}/callback`;
  }

  /** URL para notificacoes/webhooks. */
  webhookUrl(provider: MarketplaceProvider): string {
    const slug = provider === MarketplaceProvider.MERCADO_LIVRE ? 'mercadolivre' : 'shopee';
    return `${environment.app.baseUrl}/api/webhooks/${slug}`;
  }

  private cleanupStates(): void {
    const now = Date.now();
    for (const [key, value] of this.states.entries()) {
      if (now - value.createdAt > STATE_TTL_MS) {
        this.states.delete(key);
      }
    }
  }

  /** Gera a URL de autorizacao para o provider, criando um `state` valido. */
  async buildAuthorizationUrl(provider: MarketplaceProvider): Promise<string> {
    this.cleanupStates();

    const conn = await connectionService.getRawOrThrow(provider);
    if (!conn.appId || !conn.appSecret) {
      throw ApiError.badRequest('Configure o App ID e o Secret antes de conectar a conta.');
    }

    const state = CryptoUtil.randomToken();
    this.states.set(state, { provider, createdAt: Date.now() });

    const redirectUri = this.redirectUri(provider);
    const account = connectionService.toAccount(conn);

    // A Shopee assina a URL de auth com o partner_key; o ML usa client_id puro.
    if (provider === MarketplaceProvider.SHOPEE) {
      return shopee.buildAuthUrl(account.appId, account.appSecret, redirectUri);
    }

    const adapter = getAdapter(provider);
    return adapter.getAuthorizationUrl({ appId: account.appId }, state, redirectUri);
  }

  /**
   * Processa o callback OAuth: valida `state` (quando presente), troca o `code`
   * por tokens, salva e testa a conexao.
   */
  async handleCallback(
    provider: MarketplaceProvider,
    code: string,
    state: string | undefined,
    extra: Record<string, string> = {}
  ): Promise<void> {
    // O ML devolve o `state`; a Shopee nao garante. Validamos quando presente.
    if (state) {
      const pending = this.states.get(state);
      if (!pending || pending.provider !== provider) {
        throw ApiError.badRequest('State de OAuth invalido ou expirado. Tente conectar novamente.');
      }
      this.states.delete(state);
    }

    const adapter = getAdapter(provider);
    const conn = await connectionService.getRawOrThrow(provider);
    const account = connectionService.toAccount(conn);
    const redirectUri = this.redirectUri(provider);

    try {
      const tokens = await adapter.exchangeCodeForToken(
        { appId: account.appId, appSecret: account.appSecret },
        code,
        redirectUri,
        extra
      );

      await connectionService.saveTokens(provider, tokens);

      // Sanity check + captura do nickname/loja
      try {
        const fresh = await connectionService.getAccount(provider);
        const test = await adapter.testConnection(fresh);
        if (test.sellerNickname) {
          await connectionService.saveTokens(provider, tokens, test.sellerNickname);
        }
      } catch (err) {
        logger.warn('[OAuth] testConnection apos callback falhou', { provider, err: String(err) });
      }

      logger.info('[OAuth] conexao estabelecida', { provider });
    } catch (err) {
      await connectionService.setStatus(provider, MarketplaceConnectionStatus.ERROR, String(err));
      throw err;
    }
  }

  /** Testa a conexao atual e atualiza o status. */
  async testConnection(provider: MarketplaceProvider): Promise<{ ok: boolean; sellerNickname?: string | null }> {
    const adapter = getAdapter(provider);
    const account = await connectionService.getAccount(provider);
    if (!account.accessToken) {
      throw ApiError.badRequest('Conta ainda nao autorizada. Conclua a etapa de autorizacao.');
    }
    try {
      const result = await adapter.testConnection(account);
      await connectionService.setStatus(provider, MarketplaceConnectionStatus.CONNECTED, null);
      return result;
    } catch (err) {
      await connectionService.setStatus(provider, MarketplaceConnectionStatus.ERROR, String(err));
      throw err;
    }
  }
}

export const oauthService = new OAuthService();
