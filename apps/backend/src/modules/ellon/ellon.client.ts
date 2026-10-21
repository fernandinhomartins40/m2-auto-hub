import { logger } from '@shared/utils/logger.util.js';
import { ApiError } from '@shared/utils/error.util.js';
import { createHash } from 'node:crypto';
import { ellonConnectionService } from './ellon-connection.service.js';

interface EllonErrorBody { erro?: string; message?: string }
interface AuthResponse { Token?: string }

/** A Ellon respondeu com erro (resposta determinística: repetir não muda o resultado). */
export class EllonResponseError extends ApiError {
  constructor(public upstreamStatus: number, message: string) {
    super(502, message);
  }
}

/** Consulta sem resultados que a Ellon devolve como erro em vez de lista vazia. */
export function isEmptyResult(error: unknown): boolean {
  return error instanceof EllonResponseError
    && (error.upstreamStatus === 404 || /nenhum|n[aã]o (foi |foram )?encontrad|not found|sem (registro|dado|resultado)|vazi/i.test(error.message));
}

export class AmbiguousEllonError extends ApiError {
  constructor() {
    super(503, 'Falha de comunicação com a Ellon; reconciliação manual necessária antes de reenviar.');
  }
}

function tokenExpiry(token: string): Date | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')) as { exp?: number };
    return payload.exp ? new Date(payload.exp * 1000) : null;
  } catch {
    return null;
  }
}

function accessToken(credentials: { integrationCode: string; accessHash: string }): string {
  return createHash('md5')
    .update(`${credentials.integrationCode}:${credentials.accessHash}`, 'utf8')
    .digest('hex');
}

const READ_ATTEMPTS = 4;
const wait = (attempt: number) => new Promise(resolve => setTimeout(resolve, 1_000 * 3 ** (attempt - 1)));

export class EllonClient {
  private async authenticate(): Promise<string> {
    const credentials = await ellonConnectionService.credentials();
    const url = new URL('/publico/integracoes/autenticacao', credentials.baseUrl);
    url.searchParams.set('access_token', accessToken(credentials));

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ usuario: credentials.username, senha: credentials.password }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = await response.json().catch(() => ({})) as AuthResponse & EllonErrorBody;
    if (response.ok && body.Token) {
      await ellonConnectionService.saveToken(body.Token, tokenExpiry(body.Token));
      return body.Token;
    }
    const lastMessage = body.erro || body.message || `Autenticação Ellon falhou (${response.status})`;
    await ellonConnectionService.markError(lastMessage);
    throw new ApiError(502, `Ellon recusou a autenticação: ${lastMessage}`);
  }

  private async token(): Promise<string> {
    const credentials = await ellonConnectionService.credentials();
    const validUntil = credentials.bearerTokenExpiresAt?.getTime() ?? 0;
    if (credentials.bearerToken && validUntil > Date.now() + 60_000) return credentials.bearerToken;
    return this.authenticate();
  }

  /**
   * `read` marca chamadas sem efeito colateral (inclusive consultas feitas via POST,
   * como produtos e resumo de vendas). Leituras são repetidas em falhas de rede,
   * 429 e 5xx; só escritas viram resultado ambíguo, pois a Ellon pode tê-las aplicado.
   */
  async request<T>(method: 'GET' | 'POST', path: string, options?: { query?: Record<string, string | number>; body?: unknown; read?: boolean; fast?: boolean }): Promise<T> {
    const credentials = await ellonConnectionService.credentials();
    const read = options?.read ?? method === 'GET';
    const execute = async (token: string) => {
      const url = new URL(path, credentials.baseUrl);
      url.searchParams.set('access_token', accessToken(credentials));
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
        signal: AbortSignal.timeout(options?.fast ? 6_000 : read ? 45_000 : 20_000),
      });
    };

    // Modo rápido (checkout): uma tentativa curta; quem chama decide o que fazer se falhar.
    const attempts = read && !options?.fast ? READ_ATTEMPTS : 1;
    for (let attempt = 1; ; attempt += 1) {
      let response: Response;
      try {
        response = await execute(await this.token());
        if (response.status === 401) response = await execute(await this.authenticate());
      } catch (error) {
        if (error instanceof ApiError) throw error;
        if (read) {
          if (attempt < attempts) { await wait(attempt); continue; }
          throw new ApiError(503, `Ellon indisponível ao consultar ${path}: ${String(error)}`);
        }
        logger.warn('[Ellon] falha de transporte; resultado remoto é desconhecido', { path, error: String(error) });
        throw new AmbiguousEllonError();
      }

      if (read && (response.status === 429 || response.status >= 500) && attempt < attempts) {
        await wait(attempt);
        continue;
      }
      const body = await response.json().catch(() => ({})) as T & EllonErrorBody;
      if (!response.ok) throw new EllonResponseError(response.status, body.erro || body.message || `Ellon respondeu ${response.status}`);
      return body;
    }
  }

  async testConnection(): Promise<void> {
    await this.authenticate();
  }
}

export const ellonClient = new EllonClient();
