import { EllonConnection, EllonConnectionStatus, Prisma } from '@prisma/client';
import { prisma } from '@config/database.js';
import { CryptoUtil } from '@shared/utils/crypto.util.js';
import { ApiError } from '@shared/utils/error.util.js';
import { UpdateEllonConfigDto } from './dto/ellon.dto.js';

const CONNECTION_ID = 'default';
const DEFAULT_URL = 'http://fvendas.ellon.inf.br:9047';

export interface EllonCredentials {
  baseUrl: string;
  companyCode: number;
  username: string;
  integrationCode: string;
  password: string;
  accessHash: string;
  bearerToken: string | null;
  bearerTokenExpiresAt: Date | null;
}

function validateBaseUrl(value: string): string {
  const url = new URL(value);
  if (url.hostname.toLowerCase() !== 'fvendas.ellon.inf.br' || url.port !== '9047') {
    throw ApiError.badRequest('A URL da Ellon deve apontar para fvendas.ellon.inf.br:9047.');
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw ApiError.badRequest('Protocolo da URL Ellon inválido.');
  }
  return url.toString().replace(/\/$/, '');
}

export class EllonConnectionService {
  async ensure(): Promise<EllonConnection> {
    return prisma.ellonConnection.upsert({
      where: { id: CONNECTION_ID },
      update: {},
      create: { id: CONNECTION_ID, baseUrl: DEFAULT_URL },
    });
  }

  async getRaw(): Promise<EllonConnection> {
    return this.ensure();
  }

  async getSafe() {
    const connection = await this.ensure();
    return {
      id: connection.id,
      status: connection.status,
      enabled: connection.enabled,
      baseUrl: connection.baseUrl,
      companyCode: connection.companyCode,
      transactionCode: connection.transactionCode,
      costCenterCode: connection.costCenterCode,
      sellerCode: connection.sellerCode,
      warehouseCode: connection.warehouseCode,
      paymentMethodCode: connection.paymentMethodCode,
      carrierCode: connection.carrierCode,
      usernameMasked: connection.usernameEncrypted
        ? CryptoUtil.mask(CryptoUtil.decrypt(connection.usernameEncrypted))
        : null,
      integrationCodeMasked: connection.integrationCodeEncrypted
        ? CryptoUtil.mask(CryptoUtil.decrypt(connection.integrationCodeEncrypted))
        : null,
      hasPassword: Boolean(connection.passwordEncrypted),
      accessHashMasked: connection.accessHashEncrypted
        ? CryptoUtil.mask(CryptoUtil.decrypt(connection.accessHashEncrypted))
        : null,
      hasBearerToken: Boolean(connection.bearerTokenEncrypted),
      bearerTokenExpiresAt: connection.bearerTokenExpiresAt,
      syncProducts: connection.syncProducts,
      syncCustomers: connection.syncCustomers,
      syncOrders: connection.syncOrders,
      lastConnectionAt: connection.lastConnectionAt,
      lastProductSyncAt: connection.lastProductSyncAt,
      lastOrderSyncAt: connection.lastOrderSyncAt,
      lastError: connection.lastError,
      updatedAt: connection.updatedAt,
    };
  }

  async update(dto: UpdateEllonConfigDto) {
    const current = await this.ensure();
    if (dto.enabled === true) {
      const missing = [
        !(dto.companyCode ?? current.companyCode) && 'empresa',
        !(dto.transactionCode ?? current.transactionCode) && 'transação',
        !(dto.costCenterCode ?? current.costCenterCode) && 'centro de custo',
        !(dto.sellerCode ?? current.sellerCode) && 'vendedor',
        !(dto.warehouseCode ?? current.warehouseCode) && 'depósito',
        !(dto.paymentMethodCode ?? current.paymentMethodCode) && 'forma de pagamento',
        !(dto.username || current.usernameEncrypted) && 'usuário Ellon/API',
        !(dto.integrationCode || current.integrationCodeEncrypted) && 'código de integração',
        !(dto.password || current.passwordEncrypted) && 'senha',
        !(dto.accessHash || current.accessHashEncrypted) && 'HASH de acesso',
      ].filter(Boolean);
      if (missing.length) throw ApiError.badRequest(`Complete a configuração Ellon: ${missing.join(', ')}.`);
    }
    const data: Prisma.EllonConnectionUpdateInput = {
      ...(dto.enabled !== undefined && { enabled: dto.enabled }),
      ...(dto.baseUrl !== undefined && { baseUrl: validateBaseUrl(dto.baseUrl) }),
      ...(dto.companyCode !== undefined && { companyCode: dto.companyCode }),
      ...(dto.transactionCode !== undefined && { transactionCode: dto.transactionCode }),
      ...(dto.costCenterCode !== undefined && { costCenterCode: dto.costCenterCode }),
      ...(dto.sellerCode !== undefined && { sellerCode: dto.sellerCode }),
      ...(dto.warehouseCode !== undefined && { warehouseCode: dto.warehouseCode }),
      ...(dto.paymentMethodCode !== undefined && { paymentMethodCode: dto.paymentMethodCode }),
      ...(dto.carrierCode !== undefined && { carrierCode: dto.carrierCode }),
      ...(dto.username !== undefined && { usernameEncrypted: CryptoUtil.encrypt(dto.username) }),
      ...(dto.integrationCode !== undefined && { integrationCodeEncrypted: CryptoUtil.encrypt(dto.integrationCode) }),
      ...(dto.password !== undefined && { passwordEncrypted: CryptoUtil.encrypt(dto.password) }),
      ...(dto.accessHash !== undefined && { accessHashEncrypted: CryptoUtil.encrypt(dto.accessHash) }),
      ...(dto.syncProducts !== undefined && { syncProducts: dto.syncProducts }),
      ...(dto.syncCustomers !== undefined && { syncCustomers: dto.syncCustomers }),
      ...(dto.syncOrders !== undefined && { syncOrders: dto.syncOrders }),
      status: dto.enabled === false ? EllonConnectionStatus.DISABLED : EllonConnectionStatus.PENDING,
      bearerTokenEncrypted: null,
      bearerTokenExpiresAt: null,
      lastError: null,
    };
    await prisma.ellonConnection.update({ where: { id: current.id }, data });
    return this.getSafe();
  }

  async credentials(): Promise<EllonCredentials> {
    const connection = await this.ensure();
    if (!connection.enabled) throw ApiError.badRequest('Integração Ellon está desabilitada.');
    if (!connection.companyCode || !connection.usernameEncrypted || !connection.integrationCodeEncrypted || !connection.passwordEncrypted || !connection.accessHashEncrypted) {
      throw ApiError.badRequest('Configuração Ellon incompleta.');
    }
    return {
      baseUrl: validateBaseUrl(connection.baseUrl),
      companyCode: connection.companyCode,
      username: CryptoUtil.decrypt(connection.usernameEncrypted) as string,
      integrationCode: CryptoUtil.decrypt(connection.integrationCodeEncrypted) as string,
      password: CryptoUtil.decrypt(connection.passwordEncrypted) as string,
      accessHash: CryptoUtil.decrypt(connection.accessHashEncrypted) as string,
      bearerToken: CryptoUtil.decrypt(connection.bearerTokenEncrypted),
      bearerTokenExpiresAt: connection.bearerTokenExpiresAt,
    };
  }

  async saveToken(token: string, expiresAt: Date | null): Promise<void> {
    await prisma.ellonConnection.update({
      where: { id: CONNECTION_ID },
      data: {
        bearerTokenEncrypted: CryptoUtil.encrypt(token),
        bearerTokenExpiresAt: expiresAt,
        status: EllonConnectionStatus.CONNECTED,
        lastConnectionAt: new Date(),
        lastError: null,
      },
    });
  }

  async markError(message: string): Promise<void> {
    await prisma.ellonConnection.update({
      where: { id: CONNECTION_ID },
      data: { status: EllonConnectionStatus.ERROR, lastError: message.slice(0, 2000) },
    });
  }
}

export const ellonConnectionService = new EllonConnectionService();
