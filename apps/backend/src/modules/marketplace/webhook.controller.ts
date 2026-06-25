import { Request, Response } from 'express';
import { MarketplaceProvider, Prisma } from '@prisma/client';
import { prisma } from '@config/database.js';
import { logger } from '@shared/utils/logger.util.js';
import { getAdapter } from './adapters/index.js';
import { connectionService } from './services/connection.service.js';
import { eventProcessorService } from './services/event-processor.service.js';

/**
 * Recebe webhooks dos marketplaces.
 * Responde 200 rapido e processa de forma assincrona (grava em MarketplaceEvent).
 * Rotas publicas: a autenticidade e validada por assinatura/origem no adapter.
 */
export class WebhookController {
  private handle(provider: MarketplaceProvider) {
    return async (req: Request, res: Response): Promise<void> => {
      try {
        const adapter = getAdapter(provider);

        // Conta (para validar origem/assinatura). Pode ser null se ainda nao conectado.
        const conn = await connectionService.getRaw(provider);
        const account = conn && conn.appId && conn.appSecret ? connectionService.toAccount(conn) : null;

        if (!adapter.verifyWebhook(req, account)) {
          logger.warn('[Webhook] assinatura/origem invalida', { provider });
          res.status(401).json({ success: false });
          return;
        }

        const event = adapter.parseWebhook(req);

        // Sempre responde 200 rapido para o marketplace nao reenviar em loop
        res.status(200).json({ success: true });

        if (!event) {
          logger.info('[Webhook] payload sem evento acionavel', { provider });
          return;
        }

        // Grava idempotente (unique provider+topic+externalId)
        await prisma.marketplaceEvent
          .upsert({
            where: {
              provider_topic_externalId: {
                provider: event.provider,
                topic: event.topic,
                externalId: event.externalId,
              },
            },
            update: {}, // ja existe -> ignora (idempotencia)
            create: {
              provider: event.provider,
              topic: event.topic,
              externalId: event.externalId,
              rawPayload: event.raw as Prisma.InputJsonValue,
            },
          })
          .catch(err => logger.warn('[Webhook] falha ao gravar evento', { err: String(err) }));

        // Dispara processamento assincrono (nao bloqueia a resposta)
        void eventProcessorService.processPending();
      } catch (err) {
        logger.error('[Webhook] erro inesperado', { provider, err: String(err) });
        if (!res.headersSent) {
          res.status(200).json({ success: true }); // evita reenvio agressivo
        }
      }
    };
  }

  mercadoLivre = this.handle(MarketplaceProvider.MERCADO_LIVRE);
  shopee = this.handle(MarketplaceProvider.SHOPEE);
}

export const webhookController = new WebhookController();
