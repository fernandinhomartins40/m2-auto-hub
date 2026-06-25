import { MarketplaceProvider, MarketplaceConnectionStatus } from '@prisma/client';
import { prisma } from '@config/database.js';
import { logger } from '@shared/utils/logger.util.js';
import { getAdapter } from '../adapters/index.js';
import { connectionService } from './connection.service.js';

/** Renova access tokens que estao proximos de expirar. */
const REFRESH_MARGIN_MS = 10 * 60 * 1000; // renova 10 min antes de expirar

export class TokenRefreshService {
  /**
   * Garante um access token valido para o provider (renova se necessario).
   * Devolve a conta operacional pronta para uso.
   */
  async ensureFreshToken(provider: MarketplaceProvider) {
    const conn = await connectionService.getRawOrThrow(provider);

    const needsRefresh =
      conn.status === MarketplaceConnectionStatus.CONNECTED &&
      conn.tokenExpiresAt !== null &&
      conn.tokenExpiresAt.getTime() - Date.now() < REFRESH_MARGIN_MS;

    if (needsRefresh) {
      await this.refresh(provider);
    }

    return connectionService.getAccount(provider);
  }

  /** Executa o refresh de um provider especifico. */
  async refresh(provider: MarketplaceProvider): Promise<void> {
    const adapter = getAdapter(provider);
    const account = await connectionService.getAccount(provider);

    if (!account.refreshToken) {
      await connectionService.setStatus(provider, MarketplaceConnectionStatus.TOKEN_EXPIRED, 'Sem refresh token.');
      return;
    }

    try {
      const tokens = await adapter.refreshToken(
        { appId: account.appId, appSecret: account.appSecret },
        account.refreshToken
      );
      await connectionService.saveTokens(provider, tokens);
      logger.info('[TokenRefresh] token renovado', { provider });
    } catch (err) {
      logger.warn('[TokenRefresh] falha ao renovar', { provider, err: String(err) });
      await connectionService.setStatus(provider, MarketplaceConnectionStatus.TOKEN_EXPIRED, String(err));
    }
  }

  /** Varre todas as conexoes conectadas e renova as que estao perto de expirar. */
  async refreshExpiring(): Promise<void> {
    const soon = new Date(Date.now() + REFRESH_MARGIN_MS);
    const conns = await prisma.marketplaceConnection.findMany({
      where: {
        status: MarketplaceConnectionStatus.CONNECTED,
        tokenExpiresAt: { lte: soon },
      },
    });

    for (const conn of conns) {
      await this.refresh(conn.provider);
    }
  }
}

export const tokenRefreshService = new TokenRefreshService();
