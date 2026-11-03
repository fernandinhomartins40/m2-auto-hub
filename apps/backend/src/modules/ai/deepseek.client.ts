import { ApiError } from '@shared/utils/error.util.js';
import { logger } from '@shared/utils/logger.util.js';

const BASE_URL = 'https://api.deepseek.com';
const TIMEOUT_MS = 120_000;

/** Precos em USD por milhao de tokens (pagina oficial, nov/2026). Pico custa o dobro. */
export const MODEL_PRICES: Record<string, { cacheHit: number; input: number; output: number }> = {
  'deepseek-flash': { cacheHit: 0.003, input: 0.15, output: 0.6 },
  'deepseek-v4-pro': { cacheHit: 0.022, input: 0.66, output: 1.98 },
};

/** Modelos que aceitam imagem na mensagem. */
export const VISION_MODELS = new Set(['deepseek-flash']);

/** Pico: 01-04h e 06-10h UTC, de segunda a sexta. */
export function isPeak(date = new Date()): boolean {
  const day = date.getUTCDay();
  const hour = date.getUTCHours();
  if (day === 0 || day === 6) return false;
  return (hour >= 1 && hour < 4) || (hour >= 6 && hour < 10);
}

export interface Usage {
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
}

export function costUsd(model: string, usage: Usage, at = new Date()): number {
  const price = MODEL_PRICES[model] ?? MODEL_PRICES['deepseek-flash'];
  const factor = isPeak(at) ? 2 : 1;
  const miss = Math.max(0, usage.inputTokens - usage.cachedTokens);
  return factor * (usage.cachedTokens * price.cacheHit + miss * price.input + usage.outputTokens * price.output) / 1_000_000;
}

export type ContentPart = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } };
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

export interface ChatResult {
  content: string;
  usage: Usage;
  finishReason: string | null;
}

/** Chamada de chat da DeepSeek com resposta em JSON e sem modo de raciocinio (mais barato). */
export async function deepseekChat(
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
        thinking: { type: 'disabled' },
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 6000,
      }),
    });
    const data = await res.json().catch(() => null) as Record<string, unknown> | null;
    if (!res.ok) {
      const error = (data?.error as Record<string, unknown>) ?? {};
      const message = String(error.message ?? `HTTP ${res.status}`);
      logger.warn('[DeepSeek] erro', { status: res.status, message });
      if (res.status === 401) throw ApiError.badRequest('Chave da DeepSeek inválida.');
      if (res.status === 402) throw ApiError.badRequest('Sem saldo na conta da DeepSeek. Coloque crédito em platform.deepseek.com.');
      throw new ApiError(res.status >= 500 || res.status === 429 ? 502 : 400, `DeepSeek: ${message}`);
    }
    const choice = (data?.choices as Array<Record<string, unknown>>)?.[0] ?? {};
    const message = (choice.message as Record<string, unknown>) ?? {};
    const usage = (data?.usage as Record<string, number>) ?? {};
    return {
      content: String(message.content ?? ''),
      finishReason: choice.finish_reason ? String(choice.finish_reason) : null,
      usage: {
        inputTokens: usage.prompt_tokens ?? 0,
        cachedTokens: usage.prompt_cache_hit_tokens ?? 0,
        outputTokens: usage.completion_tokens ?? 0,
      },
    };
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw new ApiError(504, 'A DeepSeek demorou demais para responder. Tente de novo.');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Le o JSON da resposta; a DeepSeek devolve espacos quando nao consegue gerar JSON valido. */
export function parseJson<T>(result: ChatResult): T {
  if (result.finishReason === 'length') throw ApiError.badRequest('A resposta da IA ficou grande demais e foi cortada. Tente de novo.');
  try {
    return JSON.parse(result.content) as T;
  } catch {
    throw ApiError.badRequest('A IA não devolveu uma resposta válida. Tente de novo.');
  }
}
