import { prisma } from '@config/database.js';
import { CryptoUtil } from '@shared/utils/crypto.util.js';
import { LicensePlateUtil } from '@shared/utils/license-plate.util.js';
import { logger } from '@shared/utils/logger.util.js';
import { parsePlacaFipeText } from '@shared/utils/placa-fipe-parser.util.js';

/**
 * Dados tecnicos de um veiculo obtidos por placa.
 *
 * Deliberadamente sem dados do proprietario: a oficina precisa saber qual e o
 * carro, nao de quem ele e. O cliente ja e cadastrado no atendimento.
 */
export interface PlateTechnicalData {
  plate: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  chassisNumber: string | null;
  fuel: string | null;
  city: string | null;
  state: string | null;
}

export interface PlateLookupResult extends PlateTechnicalData {
  /** De onde vieram os dados: cache proprio ou consulta externa. */
  source: 'cache' | 'external';
  provider: string;
  /** Como o dado foi obtido originalmente. */
  origin?: string;
}

/**
 * Contrato de um provedor externo de consulta de placa.
 *
 * Existe para que trocar de fornecedor seja trocar uma implementacao, sem
 * mexer no cache nem em quem chama.
 */
export interface PlateLookupProvider {
  readonly name: string;
  isConfigured(): boolean;
  lookup(plate: string): Promise<{ data: PlateTechnicalData; raw: unknown } | null>;
}

function parseYear(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string') {
    // Campos como "2019/2020" aparecem em algumas respostas; fica o primeiro ano.
    const match = value.match(/\d{4}/);
    if (match) {
      return Number(match[0]);
    }
  }

  return null;
}

function parseText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/**
 * Provedor API Brasil / APIGratis.
 *
 * Autentica com dois tokens (Bearer + DeviceToken). Sem eles configurados, o
 * provedor se declara indisponivel e o fluxo cai no cadastro manual.
 */
export class ApiBrasilPlateProvider implements PlateLookupProvider {
  readonly name = 'apibrasil';

  private readonly baseUrl: string;
  private readonly bearerToken: string;
  private readonly deviceToken: string;
  private readonly timeoutMs = Number(process.env.PLATE_LOOKUP_TIMEOUT_MS || 8000);

  /**
   * As credenciais vem das configuracoes do painel. O `.env` continua aceito
   * como fallback para quem ja configurou por la.
   */
  constructor(credentials?: { bearerToken?: string | null; deviceToken?: string | null }) {
    this.baseUrl = (
      process.env.PLATE_LOOKUP_API_URL || 'https://gateway.apibrasil.io/api/v2/vehicles'
    ).replace(/\/+$/, '');

    this.bearerToken =
      credentials?.bearerToken || process.env.PLATE_LOOKUP_BEARER_TOKEN || '';
    this.deviceToken =
      credentials?.deviceToken || process.env.PLATE_LOOKUP_DEVICE_TOKEN || '';
  }

  isConfigured(): boolean {
    return Boolean(this.bearerToken && this.deviceToken);
  }

  async lookup(plate: string): Promise<{ data: PlateTechnicalData; raw: unknown } | null> {
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}/dados`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.bearerToken}`,
          DeviceToken: this.deviceToken,
        },
        body: JSON.stringify({ placa: plate }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      // Timeout ou rede fora: nao e erro fatal, o chamador cai no manual.
      logger.warn(`Plate lookup request failed for ${plate}: ${String(error)}`);
      return null;
    }

    if (!response.ok) {
      logger.warn(`Plate lookup returned HTTP ${response.status} for ${plate}`);
      return null;
    }

    const payload = (await response.json().catch(() => null)) as Record<string, any> | null;

    if (!payload) {
      return null;
    }

    // O provedor aninha os dados de formas diferentes conforme o plano.
    const vehicle =
      payload.response?.veiculo ||
      payload.response?.dados ||
      payload.response ||
      payload.data ||
      payload;

    if (!vehicle || typeof vehicle !== 'object') {
      return null;
    }

    const brand = parseText(vehicle.marca ?? vehicle.brand ?? vehicle.MARCA);
    const model = parseText(vehicle.modelo ?? vehicle.model ?? vehicle.MODELO);

    // Sem marca nem modelo a resposta nao serve para pre-preencher nada.
    if (!brand && !model) {
      return null;
    }

    return {
      raw: payload,
      data: {
        plate,
        brand,
        model,
        year: parseYear(
          vehicle.ano ?? vehicle.anoModelo ?? vehicle.ano_modelo ?? vehicle.year
        ),
        color: parseText(vehicle.cor ?? vehicle.color ?? vehicle.COR),
        chassisNumber: parseText(vehicle.chassi ?? vehicle.chassis),
        fuel: parseText(vehicle.combustivel ?? vehicle.fuel),
        city: parseText(vehicle.municipio ?? vehicle.cidade ?? vehicle.city),
        state: parseText(vehicle.uf ?? vehicle.estado ?? vehicle.state),
      },
    };
  }
}

/**
 * Consulta em navegador real rodando no servidor (servico plate-scraper).
 *
 * A pagina de origem recusa navegador headless (403 do Cloudflare), mas
 * responde normalmente a um Chrome de verdade - o servico roda headful sobre
 * Xvfb. E automatica e nao exige token nem plano pago.
 */
export class PlacaFipeServerProvider implements PlateLookupProvider {
  readonly name = 'placafipe';

  private readonly serviceUrl =
    process.env.PLATE_SCRAPER_URL?.replace(/\/+$/, '') || 'http://plate-scraper:8100';

  private readonly timeoutMs = Number(process.env.PLATE_SCRAPER_TIMEOUT_MS || 60000);

  isConfigured(): boolean {
    return process.env.PLATE_SCRAPER_ENABLED !== 'false';
  }

  async lookup(plate: string): Promise<{ data: PlateTechnicalData; raw: unknown } | null> {
    let response: Response;

    try {
      response = await fetch(`${this.serviceUrl}/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plate }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      logger.warn(`Plate scraper indisponivel para ${plate}: ${String(error)}`);
      return null;
    }

    if (!response.ok) {
      logger.warn(`Plate scraper retornou HTTP ${response.status} para ${plate}`);
      return null;
    }

    const payload = (await response.json().catch(() => null)) as { text?: string } | null;

    if (!payload?.text) {
      return null;
    }

    const parsed = parsePlacaFipeText(payload.text, plate);

    if (!parsed) {
      return null;
    }

    return { data: parsed, raw: { source: 'plate-scraper' } };
  }
}

export class PlateLookupService {
  /**
   * Quando um provedor e injetado (testes), ele e usado como esta. Caso
   * contrario o provedor e montado por consulta, com as credenciais salvas
   * no painel - assim trocar o token nao exige reiniciar o servidor.
   */
  constructor(private readonly provider?: PlateLookupProvider) {}

  /**
   * Monta a cadeia de provedores externos, na ordem em que devem ser tentados.
   *
   * O scraper em navegador real vem primeiro por ser gratuito; a API paga so
   * entra se houver token configurado, como ultimo recurso.
   */
  private async resolveProviders(): Promise<PlateLookupProvider[]> {
    if (this.provider) {
      return [this.provider];
    }

    const settings = await prisma.settings
      .findFirst({
        select: {
          plateLookupEnabled: true,
          plateLookupBearerToken: true,
          plateLookupDeviceToken: true,
        },
      })
      .catch(() => null);

    // Desligado no painel: nenhuma consulta externa, so o cache proprio.
    if (settings && !settings.plateLookupEnabled) {
      return [];
    }

    const chain: PlateLookupProvider[] = [];

    const scraper = new PlacaFipeServerProvider();
    if (scraper.isConfigured()) {
      chain.push(scraper);
    }

    const apiBrasil = new ApiBrasilPlateProvider({
      bearerToken: CryptoUtil.decrypt(settings?.plateLookupBearerToken ?? null),
      deviceToken: CryptoUtil.decrypt(settings?.plateLookupDeviceToken ?? null),
    });
    if (apiBrasil.isConfigured()) {
      chain.push(apiBrasil);
    }

    return chain;
  }

  async isEnabled(): Promise<boolean> {
    const providers = await this.resolveProviders();
    return providers.length > 0;
  }

  /** Grava (ou atualiza) uma placa no cache proprio. */
  private async persist(
    data: PlateTechnicalData & { displacement?: string | null; power?: string | null },
    provider: string,
    origin: string,
    raw: unknown
  ): Promise<void> {
    const payload = {
      brand: data.brand,
      model: data.model,
      year: data.year,
      color: data.color,
      chassisNumber: data.chassisNumber,
      fuel: data.fuel,
      city: data.city,
      state: data.state,
      displacement: data.displacement ?? null,
      power: data.power ?? null,
      provider,
      origin,
      rawResponse: raw as never,
    };

    try {
      await prisma.vehiclePlateLookup.upsert({
        where: { plate: data.plate },
        create: { plate: data.plate, ...payload },
        update: payload,
      });
    } catch (error) {
      // Falhar ao cachear nao pode derrubar a consulta em si.
      logger.warn(`Failed to cache plate lookup for ${data.plate}: ${String(error)}`);
    }
  }

  /**
   * Testa credenciais informadas no painel contra o provedor, sem salvar nada
   * e sem gravar no cache. Serve para o usuario conferir os tokens na hora.
   */
  async testCredentials(credentials: {
    bearerToken: string;
    deviceToken: string;
    plate?: string;
  }): Promise<{ success: boolean; message: string; sample?: PlateTechnicalData }> {
    const provider = new ApiBrasilPlateProvider({
      bearerToken: credentials.bearerToken,
      deviceToken: credentials.deviceToken,
    });

    if (!provider.isConfigured()) {
      return { success: false, message: 'Informe os dois tokens para testar.' };
    }

    const plate = LicensePlateUtil.normalize(credentials.plate || 'ABC1D23');

    if (!LicensePlateUtil.isValid(plate)) {
      return { success: false, message: 'Placa de teste invalida.' };
    }

    try {
      const result = await provider.lookup(plate);

      if (!result) {
        return {
          success: false,
          message:
            'Os tokens foram aceitos, mas nenhum dado voltou para esta placa. Tente outra placa real.',
        };
      }

      return {
        success: true,
        message: 'Conexao bem-sucedida.',
        sample: result.data,
      };
    } catch (error) {
      logger.warn(`Plate lookup credential test failed: ${String(error)}`);
      return { success: false, message: 'Nao foi possivel conectar ao provedor.' };
    }
  }

  /**
   * Busca dados tecnicos de uma placa: primeiro no cache proprio, e so entao
   * na API externa. Toda placa consultada externamente e gravada, de modo que
   * a base propria cresce a cada atendimento e a cota da API deixa de ser gasta
   * com placas ja conhecidas.
   *
   * Devolve `null` quando nada foi encontrado - o chamador entao segue para o
   * cadastro manual, sem erro.
   */
  async lookup(plate: string): Promise<PlateLookupResult | null> {
    const normalizedPlate = LicensePlateUtil.normalize(plate);

    if (!LicensePlateUtil.isValid(normalizedPlate)) {
      return null;
    }

    const cached = await prisma.vehiclePlateLookup.findUnique({
      where: { plate: normalizedPlate },
    });

    if (cached) {
      // Contabiliza o acerto sem bloquear a resposta.
      void prisma.vehiclePlateLookup
        .update({
          where: { id: cached.id },
          data: { hitCount: { increment: 1 }, lastAccessAt: new Date() },
        })
        .catch((error) => logger.warn(`Failed to update plate cache stats: ${String(error)}`));

      return {
        source: 'cache',
        provider: cached.provider,
        plate: cached.plate,
        brand: cached.brand,
        model: cached.model,
        year: cached.year,
        color: cached.color,
        chassisNumber: cached.chassisNumber,
        fuel: cached.fuel,
        city: cached.city,
        state: cached.state,
        origin: cached.origin,
      };
    }

    // Percorre a cadeia de provedores: o primeiro que responder vence. Uma
    // falha nunca derruba o atendimento - o chamador segue para o manual.
    for (const provider of await this.resolveProviders()) {
      let result: { data: PlateTechnicalData; raw: unknown } | null = null;

      try {
        result = await provider.lookup(normalizedPlate);
      } catch (error) {
        logger.warn(
          `Plate lookup provider ${provider.name} failed for ${normalizedPlate}: ${String(error)}`
        );
        continue;
      }

      if (!result) {
        continue;
      }

      const origin = provider.name === 'placafipe' ? 'server' : 'api';
      await this.persist(result.data, provider.name, origin, result.raw);

      logger.info(`Plate ${normalizedPlate} resolved via ${provider.name}`);

      return { ...result.data, source: 'external', provider: provider.name, origin };
    }

    return null;
  }
}

export default new PlateLookupService();
