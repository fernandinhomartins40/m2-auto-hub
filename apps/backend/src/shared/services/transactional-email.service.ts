import { ApiError } from '../utils/error.util.js';

export class TransactionalEmailService {
  static async send(to: string, subject: string, text: string): Promise<void> {
    const key = process.env.VELOMAIL_API_KEY;
    if (!key) throw new ApiError(503, 'O envio de e-mails está temporariamente indisponível.');
    const response = await fetch(`${process.env.VELOMAIL_API_URL || 'https://www.velomail.com.br/api'}/emails/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': key },
      body: JSON.stringify({ from: process.env.EMAIL_FROM || 'nao-responda@m2centerauto.com.br', to, subject, text, tracking_enabled: false }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new ApiError(503, 'Não foi possível enviar o e-mail. Tente novamente.');
    const result = await response.json() as { success?: boolean };
    if (result.success !== true) throw new ApiError(503, 'Não foi possível enviar o e-mail. Tente novamente.');
  }
}
