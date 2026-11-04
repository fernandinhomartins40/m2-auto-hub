import { ApiError } from '@shared/utils/error.util.js';
import { logger } from '@shared/utils/logger.util.js';

const BASE_URL = 'https://api.fusai.com.br/v1';
const TIMEOUT_MS = 120_000;

/** Modelos da fusai liberados no painel. O custo vem em reais em cada resposta. */
export const MODELS = ['fuse/deepseek-chat', 'fuse/auto', 'fuse/deepseek-v4-pro'];
export const DEFAULT_MODEL = 'fuse/deepseek-chat';

/** Modelos que aceitam imagem na mensagem. */
export const VISION_MODELS = new Set(['fuse/deepseek-chat', 'fuse/auto']);

export interface Usage {
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  costBrl: number;
}

export type ContentPart = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } };
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

export interface ChatResult {
  content: string;
  model: string;
  usage: Usage;
  finishReason: string | null;
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid_api_key: 'Chave da fusai inválida ou revogada.',
  insufficient_funds: 'Sem saldo na fusai. Adicione créditos (Pix) em fusai.com.br/app → Carteira.',
  spend_limit_reached: 'A chave da fusai atingiu o limite de gasto mensal.',
  model_not_allowed: 'Modelo não liberado no projeto da fusai.',
};

/** Le o uso da resposta; `cost_brl` e o valor que saiu do saldo. */
export function readUsage(raw: Record<string, unknown> | undefined): Usage {
  const usage = raw ?? {};
  const details = (usage.prompt_tokens_details as Record<string, unknown>) ?? {};
  return {
    inputTokens: Number(usage.prompt_tokens ?? 0),
    cachedTokens: Number(details.cached_tokens ?? usage.prompt_cache_hit_tokens ?? 0),
    outputTokens: Number(usage.completion_tokens ?? 0),
    costBrl: Number(usage.cost_brl ?? 0) || 0,
  };
}

/** Chamada de chat da fusai (formato OpenAI) com resposta em JSON. */
export async function fusaiChat(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<ChatResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        response_format: { type: 'json_object' },
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 6000,
      }),
    });
    const data = await res.json().catch(() => null) as Record<string, unknown> | null;
    if (!res.ok) {
      const error = (data?.error as Record<string, unknown>) ?? {};
      const code = String(error.code ?? '');
      const message = String(error.message ?? `HTTP ${res.status}`);
      logger.warn('[fusai] erro', { status: res.status, code, message });
      if (ERROR_MESSAGES[code]) throw ApiError.badRequest(ERROR_MESSAGES[code]);
      throw new ApiError(res.status >= 500 || res.status === 429 ? 502 : 400, `fusai: ${message}`);
    }
    const choice = (data?.choices as Array<Record<string, unknown>>)?.[0] ?? {};
    const message = (choice.message as Record<string, unknown>) ?? {};
    return {
      content: String(message.content ?? ''),
      model: String(data?.model ?? model),
      finishReason: choice.finish_reason ? String(choice.finish_reason) : null,
      usage: readUsage(data?.usage as Record<string, unknown> | undefined),
    };
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw new ApiError(504, 'A IA demorou demais para responder. Tente de novo.');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Le o JSON da resposta; alguns modelos cercam o JSON com ```json. */
export function parseJson<T>(result: ChatResult): T {
  if (result.finishReason === 'length') throw ApiError.badRequest('A resposta da IA ficou grande demais e foi cortada. Tente de novo.');
  const text = result.content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(text) as T;
  } catch {
    throw ApiError.badRequest('A IA não devolveu uma resposta válida. Tente de novo.');
  }
}
