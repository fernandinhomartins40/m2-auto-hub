import crypto from 'node:crypto';
import { environment } from '@config/environment.js';

/**
 * Criptografia simetrica AES-256-GCM para segredos de marketplace
 * (app secret, access token, refresh token) em repouso no banco.
 *
 * Formato do ciphertext armazenado: `v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>`.
 * O prefixo `v1` permite rotacao de algoritmo no futuro.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits (recomendado para GCM)
const PREFIX = 'v1';

/**
 * Deriva uma chave de 32 bytes a partir do segredo configurado.
 * Aceita tanto uma chave hex de 64 chars quanto qualquer string (derivada via SHA-256).
 */
function getKey(): Buffer {
  const raw = environment.marketplace.encryptionKey;

  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex');
  }

  // Deriva deterministicamente 32 bytes de qualquer string
  return crypto.createHash('sha256').update(raw, 'utf8').digest();
}

export class CryptoUtil {
  /**
   * Criptografa um texto. Retorna null se a entrada for null/undefined.
   */
  static encrypt(plain: string | null | undefined): string | null {
    if (plain === null || plain === undefined) {
      return null;
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return [PREFIX, iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':');
  }

  /**
   * Descriptografa um valor previamente gerado por encrypt().
   * Retorna null se a entrada for null/undefined.
   * Lanca se o formato for invalido ou a verificacao de integridade falhar.
   */
  static decrypt(payload: string | null | undefined): string | null {
    if (payload === null || payload === undefined) {
      return null;
    }

    const parts = payload.split(':');
    if (parts.length !== 4 || parts[0] !== PREFIX) {
      throw new Error('Invalid encrypted payload format');
    }

    const [, ivHex, authTagHex, dataHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const data = Buffer.from(dataHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return decrypted.toString('utf8');
  }

  /**
   * Mascara um segredo para exibicao (ex.: "AB****YZ").
   */
  static mask(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }
    if (value.length <= 6) {
      return '****';
    }
    return `${value.slice(0, 2)}****${value.slice(-2)}`;
  }

  /**
   * Gera um token aleatorio url-safe (usado como `state` de OAuth).
   */
  static randomToken(bytes = 24): string {
    return crypto.randomBytes(bytes).toString('base64url');
  }

  /**
   * HMAC-SHA256 em hex (usado pela assinatura de requests da Shopee).
   */
  static hmacSha256Hex(key: string, message: string): string {
    return crypto.createHmac('sha256', key).update(message).digest('hex');
  }

  /**
   * Hash SHA-256 em hex (usado para detectar drift de payload publicado).
   */
  static sha256Hex(message: string): string {
    return crypto.createHash('sha256').update(message).digest('hex');
  }
}
