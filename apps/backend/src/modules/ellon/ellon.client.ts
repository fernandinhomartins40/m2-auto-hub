import { logger } from '@shared/utils/logger.util.js';
import { ellonConnectionService } from './ellon-connection.service.js';

interface EllonErrorBody { erro?: string; message?: string }
interface AuthResponse { Token?: string }

export class AmbiguousEllonError extends Error {}

function tokenExpiry(token: string): Date | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')) as { exp?: number };
    return payload.exp ? new Date(payload.exp * 1000) : null;
  } catch {
    return null;
  }
}

export class EllonClient {
  private async authenticate(): Promise<string> {
    const credentials = await ellonConnectionService.credentials();
    const url = new URL('/publico/integracoes/autenticacao', credentials.baseUrl);
    url.searchParams.set('access_token', credentials.accessHash);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ usuario: credentials.integrationCode, senha: credentials.password }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = await response.json().catch(() => ({})) as AuthResponse & EllonErrorBody;
    if (!response.ok || !body.Token) {
      const message = body.erro || body.message || `Autenticação Ellon falhou (${response.status})`;
      await ellonConnectionService.markError(message);
      throw new Error(message);
    }
    await ellonConnectionService.saveToken(body.Token, tokenExpiry(body.Token));
    return body.Token;
  }

  private async token(): Promise<string> {
    const credentials = await ellonConnectionService.credentials();
    const validUntil = credentials.bearerTokenExpiresAt?.getTime() ?? 0;
    if (credentials.bearerToken && validUntil > Date.now() + 60_000) return credentials.bearerToken;
    return this.authenticate();
  }

  async request<T>(method: 'GET' | 'POST', path: string, options?: { query?: Record<string, string | number>; body?: unknown }): Promise<T> {
    const credentials = await ellonConnectionService.credentials();
    const execute = async (token: string) => {
      const url = new URL(path, credentials.baseUrl);
      url.searchParams.set('access_token', credentials.accessHash);
      for (const [key, value] of Object.entries(options?.query ?? {})) url.searchParams.set(key, String(value));
      return fetch(url, {
        method,
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${token}`,
          empresa: String(credentials.companyCode),
          ...(options?.body !== undefined && { 'content-type': 'application/json' }),
        },
        ...(options?.body !== undefined && { body: JSON.stringify(options.body) }),
        signal: AbortSignal.timeout(20_000),
      });
    };

    let response: Response;
    try {
      response = await execute(await this.token());
      if (response.status === 401) response = await execute(await this.authenticate());
    } catch (error) {
      logger.warn('[Ellon] falha de transporte; resultado remoto é desconhecido', { path, error: String(error) });
      throw new AmbiguousEllonError('Falha de comunicação com a Ellon; reconciliação manual necessária antes de reenviar.');
    }

    const body = await response.json().catch(() => ({})) as T & EllonErrorBody;
    if (!response.ok) throw new Error(body.erro || body.message || `Ellon respondeu ${response.status}`);
    return body;
  }

  async testConnection(): Promise<void> {
    await this.authenticate();
  }
}

export const ellonClient = new EllonClient();
