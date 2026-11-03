import { AiSettings, Prisma } from '@prisma/client';
import { prisma } from '@config/database.js';
import { ApiError } from '@shared/utils/error.util.js';
import { CryptoUtil } from '@shared/utils/crypto.util.js';
import { ChatMessage, MODEL_PRICES, VISION_MODELS, costUsd, deepseekChat, parseJson } from './deepseek.client.js';

export interface AiSettingsDto {
  enabled?: boolean;
  apiKey?: string;
  model?: string;
  monthlyBudgetBrl?: number;
  usdToBrl?: number;
}

function monthStart(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/**
 * IA do sistema (DeepSeek). Toda chamada passa por aqui: confere se esta ligada,
 * se o limite do mes permite e registra tokens e custo.
 */
export class AiService {
  private async raw(): Promise<AiSettings> {
    return prisma.aiSettings.upsert({ where: { id: 'default' }, update: {}, create: { id: 'default' } });
  }

  async monthCostUsd(): Promise<number> {
    const sum = await prisma.aiUsage.aggregate({ where: { createdAt: { gte: monthStart() } }, _sum: { costUsd: true } });
    return Number(sum._sum.costUsd ?? 0);
  }

  /** Visao segura: a chave aparece mascarada. */
  async getSettings() {
    const settings = await this.raw();
    const spentUsd = await this.monthCostUsd();
    const rate = Number(settings.usdToBrl);
    const [calls, products] = await Promise.all([
      prisma.aiUsage.count({ where: { createdAt: { gte: monthStart() } } }),
      prisma.aiUsage.findMany({ where: { createdAt: { gte: monthStart() }, productId: { not: null } }, distinct: ['productId'], select: { productId: true } }),
    ]);
    return {
      enabled: settings.enabled,
      hasApiKey: Boolean(settings.apiKey),
      apiKeyMasked: settings.apiKey ? CryptoUtil.mask(CryptoUtil.decrypt(settings.apiKey)) : null,
      model: settings.model,
      models: Object.keys(MODEL_PRICES),
      monthlyBudgetBrl: Number(settings.monthlyBudgetBrl),
      usdToBrl: rate,
      month: { spentBrl: Math.round(spentUsd * rate * 100) / 100, calls, products: products.length },
    };
  }

  async updateSettings(dto: AiSettingsDto) {
    if (dto.model && !MODEL_PRICES[dto.model]) throw ApiError.badRequest('Modelo desconhecido.');
    const data: Prisma.AiSettingsUpdateInput = {
      enabled: dto.enabled,
      model: dto.model,
      monthlyBudgetBrl: dto.monthlyBudgetBrl,
      usdToBrl: dto.usdToBrl,
      ...(dto.apiKey !== undefined && { apiKey: dto.apiKey.trim() ? CryptoUtil.encrypt(dto.apiKey.trim()) : null }),
    };
    await prisma.aiSettings.upsert({ where: { id: 'default' }, update: data, create: { id: 'default', ...(data as Prisma.AiSettingsCreateInput) } });
    return this.getSettings();
  }

  /** Pergunta curta para validar chave e saldo. */
  async test() {
    const result = await this.chat('test', [
      { role: 'system', content: 'Responda em JSON.' },
      { role: 'user', content: 'Devolva {"ok": true}.' },
    ], { maxTokens: 20, allowDisabled: true });
    return { ok: (result as { ok?: boolean }).ok === true };
  }

  /**
   * Chamada com resposta JSON. `vision` exige um modelo que leia imagens.
   * Recusa quando a IA esta desligada ou o limite do mes acabou.
   */
  async chat<T>(
    feature: string,
    messages: ChatMessage[],
    options: { productId?: string; maxTokens?: number; vision?: boolean; allowDisabled?: boolean } = {}
  ): Promise<T> {
    const settings = await this.raw();
    if (!settings.enabled && !options.allowDisabled) throw ApiError.badRequest('A inteligência artificial está desligada. Ative em Mercado Livre → Regras da loja.');
    const apiKey = CryptoUtil.decrypt(settings.apiKey);
    if (!apiKey) throw ApiError.badRequest('Cadastre a chave da DeepSeek em Mercado Livre → Regras da loja.');
    const spentBrl = (await this.monthCostUsd()) * Number(settings.usdToBrl);
    if (spentBrl >= Number(settings.monthlyBudgetBrl)) {
      throw ApiError.badRequest(`Limite mensal da IA atingido (R$ ${Number(settings.monthlyBudgetBrl).toFixed(2)}). Aumente o limite ou aguarde o próximo mês.`);
    }
    const model = options.vision && !VISION_MODELS.has(settings.model) ? 'deepseek-flash' : settings.model;

    const result = await deepseekChat(apiKey, model, messages, { maxTokens: options.maxTokens });
    const cost = costUsd(model, result.usage);
    await prisma.aiUsage.create({
      data: {
        feature,
        model,
        inputTokens: result.usage.inputTokens,
        cachedTokens: result.usage.cachedTokens,
        outputTokens: result.usage.outputTokens,
        costUsd: new Prisma.Decimal(cost.toFixed(6)),
        productId: options.productId ?? null,
      },
    });
    return parseJson<T>(result);
  }
}

export const aiService = new AiService();
