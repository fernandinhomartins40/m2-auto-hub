import { prisma } from '@config/database.js';
import { LicensePlateUtil } from '@shared/utils/license-plate.util.js';
import { logger } from '@shared/utils/logger.util.js';

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

  private readonly baseUrl =
    process.env.PLATE_LOOKUP_API_URL?.replace(/\/+$/, '') ||
    'https://gateway.apibrasil.io/api/v2/vehicles';

  private readonly bearerToken = process.env.PLATE_LOOKUP_BEARER_TOKEN || '';
  private readonly deviceToken = process.env.PLATE_LOOKUP_DEVICE_TOKEN || '';
  private readonly timeoutMs = Number(process.env.PLATE_LOOKUP_TIMEOUT_MS || 8000);

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

export class PlateLookupService {
  constructor(private readonly provider: PlateLookupProvider = new ApiBrasilPlateProvider()) {}

  isEnabled(): boolean {
    return this.provider.isConfigured();
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
      };
    }

    if (!this.provider.isConfigured()) {
      return null;
    }

    // Uma falha do provedor externo nunca deve derrubar o atendimento: o
    // chamador segue para o cadastro manual como se nada tivesse sido achado.
    let result: { data: PlateTechnicalData; raw: unknown } | null = null;

    try {
      result = await this.provider.lookup(normalizedPlate);
    } catch (error) {
      logger.warn(`Plate lookup provider failed for ${normalizedPlate}: ${String(error)}`);
      return null;
    }

    if (!result) {
      return null;
    }

    const { data, raw } = result;

    try {
      await prisma.vehiclePlateLookup.create({
        data: {
          plate: normalizedPlate,
          brand: data.brand,
          model: data.model,
          year: data.year,
          color: data.color,
          chassisNumber: data.chassisNumber,
          fuel: data.fuel,
          city: data.city,
          state: data.state,
          provider: this.provider.name,
          rawResponse: raw as never,
        },
      });
    } catch (error) {
      // Corrida entre dois atendimentos da mesma placa nao deve quebrar a consulta.
      logger.warn(`Failed to cache plate lookup for ${normalizedPlate}: ${String(error)}`);
    }

    logger.info(`Plate ${normalizedPlate} resolved via ${this.provider.name}`);

    return { ...data, source: 'external', provider: this.provider.name };
  }
}

export default new PlateLookupService();
