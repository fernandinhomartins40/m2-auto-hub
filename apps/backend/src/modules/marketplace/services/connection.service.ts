import { MarketplaceConnection, MarketplaceProvider, MarketplaceConnectionStatus } from '@prisma/client';
import { prisma } from '@config/database.js';
import { ApiError } from '@shared/utils/error.util.js';
import { CryptoUtil } from '@shared/utils/crypto.util.js';
import { ProviderAccount, TokenSet } from '../marketplace.types.js';

/** Visao segura (sem segredos crus) de uma conexao, para a API. */
export interface SafeConnection {
  id: string;
  provider: MarketplaceProvider;
  status: MarketplaceConnectionStatus;
  appId: string | null;
  appSecretMasked: string | null;
  hasCredentials: boolean;
  sellerId: string | null;
  sellerNickname: string | null;
  tokenExpiresAt: Date | null;
  lastSyncAt: Date | null;
  lastError: string | null;
  scopes: unknown;
  connectedAt: Date | null;
}

const ALL_PROVIDERS: MarketplaceProvider[] = [MarketplaceProvider.MERCADO_LIVRE, MarketplaceProvider.SHOPEE];

/**
 * Gerencia o ciclo de vida das conexoes de marketplace e a (des)criptografia
 * dos segredos em repouso.
 */
export class ConnectionService {
  /** Garante que existe uma linha para cada provider (idempotente). */
  async ensureAll(): Promise<void> {
    for (const provider of ALL_PROVIDERS) {
      await prisma.marketplaceConnection.upsert({
        where: { provider },
        update: {},
        create: { provider, status: MarketplaceConnectionStatus.DISCONNECTED },
      });
    }
  }

  async getRaw(provider: MarketplaceProvider): Promise<MarketplaceConnection | null> {
    return prisma.marketplaceConnection.findUnique({ where: { provider } });
  }

  async getRawOrThrow(provider: MarketplaceProvider): Promise<MarketplaceConnection> {
    const conn = await this.getRaw(provider);
    if (!conn) {
      throw ApiError.notFound(`Conexao ${provider} nao encontrada.`);
    }
    return conn;
  }

  /** Descriptografa os segredos e devolve a conta operacional para os adapters. */
  toAccount(conn: MarketplaceConnection): ProviderAccount {
    if (!conn.appId || !conn.appSecret) {
      throw ApiError.badRequest(`Credenciais do app ${conn.provider} ainda nao foram configuradas.`);
    }
    return {
      provider: conn.provider,
      appId: conn.appId,
      appSecret: CryptoUtil.decrypt(conn.appSecret) as string,
      accessToken: CryptoUtil.decrypt(conn.accessToken),
      refreshToken: CryptoUtil.decrypt(conn.refreshToken),
      sellerId: conn.sellerId,
    };
  }

  async getAccount(provider: MarketplaceProvider): Promise<ProviderAccount> {
    const conn = await this.getRawOrThrow(provider);
    return this.toAccount(conn);
  }

  /** Salva (criptografando) as credenciais do app. */
  async setCredentials(provider: MarketplaceProvider, appId: string, appSecret: string): Promise<SafeConnection> {
    const conn = await prisma.marketplaceConnection.upsert({
      where: { provider },
      update: {
        appId,
        appSecret: CryptoUtil.encrypt(appSecret),
        status: MarketplaceConnectionStatus.PENDING,
        lastError: null,
      },
      create: {
        provider,
        appId,
        appSecret: CryptoUtil.encrypt(appSecret),
        status: MarketplaceConnectionStatus.PENDING,
      },
    });
    return this.toSafe(conn);
  }

  /** Persiste um conjunto de tokens recem-obtido e marca a conexao como CONNECTED. */
  async saveTokens(
    provider: MarketplaceProvider,
    tokens: TokenSet,
    sellerNickname?: string | null
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
    await prisma.marketplaceConnection.update({
      where: { provider },
      data: {
        accessToken: CryptoUtil.encrypt(tokens.accessToken),
        refreshToken: tokens.refreshToken ? CryptoUtil.encrypt(tokens.refreshToken) : undefined,
        tokenExpiresAt: expiresAt,
        sellerId: tokens.sellerId ?? undefined,
        sellerNickname: sellerNickname ?? tokens.sellerNickname ?? undefined,
        scopes: tokens.scopes ?? undefined,
        status: MarketplaceConnectionStatus.CONNECTED,
        lastError: null,
      },
    });
  }

  async setStatus(
    provider: MarketplaceProvider,
    status: MarketplaceConnectionStatus,
    lastError?: string | null
  ): Promise<void> {
    await prisma.marketplaceConnection.update({
      where: { provider },
      data: { status, lastError: lastError ?? null },
    });
  }

  async markSynced(provider: MarketplaceProvider): Promise<void> {
    await prisma.marketplaceConnection.update({
      where: { provider },
      data: { lastSyncAt: new Date() },
    });
  }

  async disconnect(provider: MarketplaceProvider): Promise<void> {
    await prisma.marketplaceConnection.update({
      where: { provider },
      data: {
        accessToken: null,
        refreshToken: null,
        tokenExpiresAt: null,
        sellerId: null,
        sellerNickname: null,
        scopes: undefined,
        status: MarketplaceConnectionStatus.DISCONNECTED,
        lastError: null,
      },
    });
  }

  async listSafe(): Promise<SafeConnection[]> {
    await this.ensureAll();
    const conns = await prisma.marketplaceConnection.findMany({ orderBy: { provider: 'asc' } });
    return conns.map(c => this.toSafe(c));
  }

  toSafe(conn: MarketplaceConnection): SafeConnection {
    return {
      id: conn.id,
      provider: conn.provider,
      status: conn.status,
      appId: conn.appId,
      appSecretMasked: conn.appSecret ? CryptoUtil.mask(CryptoUtil.decrypt(conn.appSecret)) : null,
      hasCredentials: Boolean(conn.appId && conn.appSecret),
      sellerId: conn.sellerId,
      sellerNickname: conn.sellerNickname,
      tokenExpiresAt: conn.tokenExpiresAt,
      lastSyncAt: conn.lastSyncAt,
      lastError: conn.lastError,
      scopes: conn.scopes,
      connectedAt: conn.status === MarketplaceConnectionStatus.CONNECTED ? conn.updatedAt : null,
    };
  }
}

export const connectionService = new ConnectionService();
