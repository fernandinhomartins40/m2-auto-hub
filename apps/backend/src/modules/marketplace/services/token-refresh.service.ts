import { MarketplaceProvider, MarketplaceConnectionStatus } from '@prisma/client';
import { prisma } from '@config/database.js';
import { logger } from '@shared/utils/logger.util.js';
import { ApiError } from '@shared/utils/error.util.js';
import { getAdapter } from '../adapters/index.js';
import { connectionService } from './connection.service.js';
import { notifyStore } from './marketplace-notifier.js';

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
      const previous = await connectionService.getRaw(provider);
      await connectionService.saveTokens(provider, tokens);
      logger.info('[TokenRefresh] token renovado', { provider });
      if (previous?.status === MarketplaceConnectionStatus.TOKEN_EXPIRED) {
        await notifyStore('MARKETPLACE_LISTING_REACTIVATED', 'Conexão com o marketplace restabelecida', 'A automação de estoque, anúncios e vendas voltou a funcionar.', { provider });
      }
    } catch (err) {
      // Falha de rede ou do marketplace fora do ar: mantem conectado e tenta no proximo ciclo.
      const transient = !(err instanceof ApiError) || err.statusCode >= 500;
      logger.warn('[TokenRefresh] falha ao renovar', { provider, transient, err: String(err) });
      if (transient) {
        await connectionService.setStatus(provider, MarketplaceConnectionStatus.CONNECTED, `Renovação adiada: ${String(err)}`);
        return;
      }
      const previous = await connectionService.getRaw(provider);
      await connectionService.setStatus(provider, MarketplaceConnectionStatus.TOKEN_EXPIRED, String(err));
      if (previous?.status !== MarketplaceConnectionStatus.TOKEN_EXPIRED) {
        await notifyStore(
          'MARKETPLACE_LISTING_ERROR',
          'Mercado Livre desconectado',
          'A autorização da conta expirou ou foi revogada. Estoque, anúncios e vendas param de sincronizar até reconectar em Catálogo → Marketplaces.',
          { provider }
        );
      }
    }
  }

  /**
   * Renova as conexoes perto de expirar. Inclui as marcadas como expiradas:
   * se o refresh token ainda valer, a conexao volta sozinha.
   */
  async refreshExpiring(): Promise<void> {
    const soon = new Date(Date.now() + REFRESH_MARGIN_MS);
    const conns = await prisma.marketplaceConnection.findMany({
      where: {
        OR: [
          { status: MarketplaceConnectionStatus.CONNECTED, tokenExpiresAt: { lte: soon } },
          { status: MarketplaceConnectionStatus.TOKEN_EXPIRED, refreshToken: { not: null } },
        ],
      },
    });

    for (const conn of conns) {
      await this.refresh(conn.provider);
    }
  }
}

export const tokenRefreshService = new TokenRefreshService();
