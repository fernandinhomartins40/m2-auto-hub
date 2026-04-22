// src/utils/validation.ts - Utilitário para validação de dados

import { z } from 'zod';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

/**
 * Valida dados usando um schema Zod
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  options?: {
    stripUnknown?: boolean;
    abortEarly?: boolean;
  }
): ValidationResult<T> {
  try {
    const result = schema.safeParse(data);

    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    } else {
      return {
        success: false,
        errors: result.error.errors.map(error => ({
          field: error.path.join('.') || 'root',
          message: error.message,
          code: error.code,
          value: error.received,
        })),
      };
    }
  } catch (error) {
    return {
      success: false,
      errors: [{
        field: 'validation',
        message: error instanceof Error ? error.message : 'Erro de validação desconhecido',
        code: 'VALIDATION_ERROR',
      }],
    };
  }
}

/**
 * Valida dados de forma assíncrona
 */
export async function validateDataAsync<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<ValidationResult<T>> {
  try {
    const result = await schema.safeParseAsync(data);

    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    } else {
      return {
        success: false,
        errors: result.error.errors.map(error => ({
          field: error.path.join('.') || 'root',
          message: error.message,
          code: error.code,
          value: error.received,
        })),
      };
    }
  } catch (error) {
    return {
      success: false,
      errors: [{
        field: 'validation',
        message: error instanceof Error ? error.message : 'Erro de validação desconhecido',
        code: 'VALIDATION_ERROR',
      }],
    };
  }
}

/**
 * Valida parcialmente um objeto (útil para updates)
 */
export function validatePartial<T>(
  schema: z.ZodSchema<T>,
  data: Partial<unknown>
): ValidationResult<Partial<T>> {
  // Para validação parcial, criamos um schema onde todos os campos são opcionais
  const partialSchema = schema.deepPartial();
  return validateData(partialSchema, data);
}

/**
 * Valida array de dados
 */
export function validateArray<T>(
  schema: z.ZodSchema<T>,
  dataArray: unknown[]
): ValidationResult<T[]> {
  const arraySchema = z.array(schema);
  return validateData(arraySchema, dataArray);
}

/**
 * Express-like request/response types for middleware
 */
export interface ValidationRequest {
  body?: unknown;
  query?: unknown;
  params?: unknown;
  [key: string]: unknown;
}

export interface ValidationResponse {
  status(code: number): ValidationResponse;
  json(data: unknown): ValidationResponse;
}

export type NextFunction = () => void;

/**
 * Middleware para validação de requisições
 */
export function createValidationMiddleware<T>(
  schema: z.ZodSchema<T>,
  target: 'body' | 'query' | 'params' = 'body'
) {
  return (req: ValidationRequest, res: ValidationResponse, next: NextFunction) => {
    const dataToValidate = req[target];
    const result = validateData(schema, dataToValidate);

    if (!result.success) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: result.errors,
      });
    }

    // Substituir os dados originais pelos dados validados
    req[target] = result.data;
    next();
  };
}

/**
 * Decorator para validação de métodos de classe
 */
export function ValidateInput<T>(schema: z.ZodSchema<T>) {
  return function (target: object, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value as (...args: unknown[]) => unknown;

    descriptor.value = function (this: unknown, ...args: unknown[]) {
      if (args.length > 0) {
        const result = validateData(schema, args[0]);

        if (!result.success) {
          throw new Error(`Validação falhou: ${result.errors?.map(e => e.message).join(', ')}`);
        }

        args[0] = result.data;
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Utilitário para formatar erros de validação para exibição
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  return errors
    .map(error => `${error.field}: ${error.message}`)
    .join('; ');
}

/**
 * Utilitário para agrupar erros por campo
 */
export function groupErrorsByField(errors: ValidationError[]): Record<string, string[]> {
  return errors.reduce((acc, error) => {
    if (!acc[error.field]) {
      acc[error.field] = [];
    }
    acc[error.field].push(error.message);
    return acc;
  }, {} as Record<string, string[]>);
}

/**
 * Validator class para uso mais avançado
 */
export class DataValidator<T> {
  constructor(private schema: z.ZodSchema<T>) {}

  validate(data: unknown): ValidationResult<T> {
    return validateData(this.schema, data);
  }

  async validateAsync(data: unknown): Promise<ValidationResult<T>> {
    return validateDataAsync(this.schema, data);
  }

  validatePartial(data: Partial<unknown>): ValidationResult<Partial<T>> {
    return validatePartial(this.schema, data);
  }

  /**
   * Transforma dados aplicando o schema (sem validação rigorosa)
   */
  transform(data: unknown): T | null {
    try {
      return this.schema.parse(data);
    } catch {
      return null;
    }
  }

  /**
   * Verifica se os dados são válidos (boolean simples)
   */
  isValid(data: unknown): data is T {
    return this.schema.safeParse(data).success;
  }

  /**
   * Cria um middleware express para este validator
   */
  createMiddleware(target: 'body' | 'query' | 'params' = 'body') {
    return createValidationMiddleware(this.schema, target);
  }
}

/**
 * Schema personalizado para validação de IDs CUID
 */
export const cuidSchema = z.string().regex(
  /^c[a-z0-9]{24}$/,
  'ID deve ser um CUID válido'
);

/**
 * Schema para validação de emails
 */
export const emailSchema = z.string()
  .email('Email inválido')
  .max(254, 'Email muito longo');

/**
 * Schema para validação de telefones brasileiros
 */
export const phoneSchema = z.string()
  .regex(
    /^\(\d{2}\)\s?\d{4,5}-?\d{4}$/,
    'Telefone deve estar no formato (11) 99999-9999'
  );

/**
 * Schema para validação de CPF
 */
export const cpfSchema = z.string()
  .regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, 'CPF inválido')
  .refine((cpf) => {
    // Algoritmo de validação de CPF
    const digits = cpf.replace(/\D/g, '');

    if (digits.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(digits)) return false; // Sequências repetidas

    // Validação do primeiro dígito
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(digits[i]) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10) remainder = 0;
    if (remainder !== parseInt(digits[9])) return false;

    // Validação do segundo dígito
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(digits[i]) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10) remainder = 0;
    if (remainder !== parseInt(digits[10])) return false;

    return true;
  }, 'CPF inválido');

/**
 * Schema para validação de CEP
 */
export const cepSchema = z.string()
  .regex(/^\d{5}-?\d{3}$/, 'CEP deve estar no formato 00000-000');

/**
 * Schema para paginação
 */
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

// Sistema de validação automática avançado
class AutoValidationSystem {
  private static instance: AutoValidationSystem;
  private validationStats: Map<string, {
    totalValidations: number;
    successfulValidations: number;
    averageTime: number;
    lastValidation: Date;
  }> = new Map();
  private realtimeValidators: Map<string, DataValidator<unknown>> = new Map();

  static getInstance(): AutoValidationSystem {
    if (!AutoValidationSystem.instance) {
      AutoValidationSystem.instance = new AutoValidationSystem();
    }
    return AutoValidationSystem.instance;
  }

  /**
   * Registra validator para monitoramento em tempo real
   */
  registerValidator<T>(name: string, validator: DataValidator<T>) {
    this.realtimeValidators.set(name, validator as DataValidator<unknown>);
  }

  /**
   * Executa validação com métricas
   */
  async validateWithMetrics<T>(
    validatorName: string,
    data: unknown
  ): Promise<ValidationResult<T> & { metrics: { duration: number; timestamp: Date } }> {
    const startTime = performance.now();
    const validator = this.realtimeValidators.get(validatorName);

    if (!validator) {
      throw new Error(`Validator '${validatorName}' não encontrado`);
    }

    const result = validator.validate(data);
    const duration = performance.now() - startTime;
    const timestamp = new Date();

    // Atualizar estatísticas
    this.updateStats(validatorName, result.success, duration);

    return {
      ...result,
      metrics: {
        duration,
        timestamp
      }
    };
  }

  /**
   * Obtém estatísticas de validação
   */
  getStats(): Record<string, {
    totalValidations: number;
    successRate: number;
    averageTime: number;
    lastValidation: string;
  }> {
    const stats: Record<string, {
      totalValidations: number;
      successRate: number;
      averageTime: number;
      lastValidation: string;
    }> = {};

    for (const [name, stat] of this.validationStats.entries()) {
      const successRate = (stat.successfulValidations / stat.totalValidations) * 100;

      stats[name] = {
        totalValidations: stat.totalValidations,
        successRate: Math.round(successRate * 100) / 100,
        averageTime: Math.round(stat.averageTime * 100) / 100,
        lastValidation: stat.lastValidation.toISOString()
      };
    }

    return stats;
  }

  /**
   * Monitora health do sistema de validação
   */
  getSystemHealth(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    metrics: {
      totalValidators: number;
      activeValidators: number;
      avgSuccessRate: number;
      avgResponseTime: number;
    };
  } {
    const issues: string[] = [];
    let totalSuccessRate = 0;
    let totalResponseTime = 0;
    let validatorCount = 0;

    for (const [name, stat] of this.validationStats.entries()) {
      const successRate = (stat.successfulValidations / stat.totalValidations) * 100;
      totalSuccessRate += successRate;
      totalResponseTime += stat.averageTime;
      validatorCount++;

      // Verificar issues
      if (successRate < 90) {
        issues.push(`Taxa de sucesso baixa para ${name}: ${successRate.toFixed(1)}%`);
      }

      if (stat.averageTime > 100) {
        issues.push(`Tempo de resposta alto para ${name}: ${stat.averageTime.toFixed(1)}ms`);
      }

      const timeSinceLastValidation = Date.now() - stat.lastValidation.getTime();
      if (timeSinceLastValidation > 24 * 60 * 60 * 1000) {
        issues.push(`${name} não utilizado há mais de 24 horas`);
      }
    }

    const avgSuccessRate = validatorCount > 0 ? totalSuccessRate / validatorCount : 100;
    const avgResponseTime = validatorCount > 0 ? totalResponseTime / validatorCount : 0;

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (issues.length > 0) {
      status = issues.some(issue => issue.includes('crítico')) ? 'critical' : 'warning';
    }

    return {
      status,
      issues,
      metrics: {
        totalValidators: this.realtimeValidators.size,
        activeValidators: validatorCount,
        avgSuccessRate,
        avgResponseTime
      }
    };
  }

  /**
   * Reset estatísticas
   */
  resetStats() {
    this.validationStats.clear();
  }

  private updateStats(validatorName: string, success: boolean, duration: number) {
    const current = this.validationStats.get(validatorName) || {
      totalValidations: 0,
      successfulValidations: 0,
      averageTime: 0,
      lastValidation: new Date()
    };

    current.totalValidations++;
    if (success) current.successfulValidations++;
    current.averageTime = ((current.averageTime * (current.totalValidations - 1)) + duration) / current.totalValidations;
    current.lastValidation = new Date();

    this.validationStats.set(validatorName, current);
  }
}

// Instância singleton do sistema de validação automática
export const autoValidationSystem = AutoValidationSystem.getInstance();

/**
 * Hook para monitoramento de validação em React
 */
export function useValidationMonitor(validatorName?: string) {
  const getStats = () => {
    const stats = autoValidationSystem.getStats();
    return validatorName ? stats[validatorName] : stats;
  };

  const getHealth = () => autoValidationSystem.getSystemHealth();

  return {
    stats: getStats(),
    health: getHealth(),
    validateWithMetrics: (data: unknown) =>
      autoValidationSystem.validateWithMetrics(validatorName || 'default', data)
  };
}

/**
 * Decorator para auto-registro de validators
 */
export function AutoRegisterValidator(name: string) {
  return function<T extends new(...args: unknown[]) => DataValidator<unknown>>(constructor: T) {
    return class extends constructor {
      constructor(...args: unknown[]) {
        super(...args);
        autoValidationSystem.registerValidator(name, this);
      }
    };
  };
}

/**
 * Middleware para logging automático de validações
 */
export function createValidationLogger<T>(
  validator: DataValidator<T>,
  name: string
) {
  autoValidationSystem.registerValidator(name, validator);

  return {
    validate: (data: unknown) => {
      console.log(`[Validation] Starting validation for ${name}`);
      const result = autoValidationSystem.validateWithMetrics(name, data);

      if (result instanceof Promise) {
        return result.then(r => {
          console.log(`[Validation] ${name} completed in ${r.metrics.duration}ms - ${r.success ? 'SUCCESS' : 'FAILED'}`);
          if (!r.success) {
            console.log(`[Validation] Errors:`, r.errors);
          }
          return r;
        });
      } else {
        console.log(`[Validation] ${name} completed in ${result.metrics.duration}ms - ${result.success ? 'SUCCESS' : 'FAILED'}`);
        if (!result.success) {
          console.log(`[Validation] Errors:`, result.errors);
        }
        return result;
      }
    },
    getStats: () => autoValidationSystem.getStats()[name]
  };
}

/**
 * Interface para dados de consistência
 */
export interface ConsistencyData {
  id?: string;
  customerId?: string;
  orderId?: string;
  [key: string]: unknown;
}

/**
 * Utilitário para validação de consistency entre dados relacionados
 */
export async function validateConsistency(
  primaryData: { type: string; data: ConsistencyData },
  relatedData: Array<{ type: string; data: ConsistencyData; relation: string }>
): Promise<ValidationResult<ConsistencyData> & { consistencyScore: number }> {
  const errors: ValidationError[] = [];
  let consistencyScore = 1.0;

  // Validar cada item relacionado
  for (const related of relatedData) {
    switch (related.relation) {
      case 'customer-order':
        if (primaryData.data.id !== related.data.customerId) {
          errors.push({
            field: 'customerId',
            message: 'ID do cliente não corresponde',
            code: 'CONSISTENCY_ERROR'
          });
          consistencyScore -= 0.1;
        }
        break;

      case 'order-item':
        if (primaryData.data.id !== related.data.orderId) {
          errors.push({
            field: 'orderId',
            message: 'ID do pedido não corresponde',
            code: 'CONSISTENCY_ERROR'
          });
          consistencyScore -= 0.1;
        }
        break;
    }
  }

  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    consistencyScore: Math.max(0, consistencyScore)
  };
}

/**
 * Sistema de cache para validações frequentes
 */
class ValidationCache {
  private cache = new Map<string, { result: ValidationResult<unknown>; timestamp: number; ttl: number }>();
  private hitCount = 0;
  private missCount = 0;

  set<T>(key: string, result: ValidationResult<T>, ttlMs: number = 5 * 60 * 1000) {
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  get<T>(key: string): ValidationResult<T> | null {
    const cached = this.cache.get(key);

    if (!cached) {
      this.missCount++;
      return null;
    }

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }

    this.hitCount++;
    return cached.result;
  }

  clear() {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  getStats() {
    const total = this.hitCount + this.missCount;
    return {
      hitRate: total > 0 ? (this.hitCount / total) * 100 : 0,
      size: this.cache.size,
      hits: this.hitCount,
      misses: this.missCount
    };
  }
}

export const validationCache = new ValidationCache();

/**
 * Validator com cache automático
 */
export function createCachedValidator<T>(
  validator: DataValidator<T>,
  cacheTtlMs: number = 5 * 60 * 1000
) {
  return {
    validate: (data: unknown): ValidationResult<T> => {
      const key = JSON.stringify(data);
      const cached = validationCache.get<T>(key);

      if (cached) {
        return cached;
      }

      const result = validator.validate(data);
      validationCache.set(key, result, cacheTtlMs);

      return result;
    },
    validateAsync: async (data: unknown): Promise<ValidationResult<T>> => {
      const key = JSON.stringify(data);
      const cached = validationCache.get<T>(key);

      if (cached) {
        return cached;
      }

      const result = await validator.validateAsync(data);
      validationCache.set(key, result, cacheTtlMs);

      return result;
    },
    clearCache: () => validationCache.clear(),
    getCacheStats: () => validationCache.getStats()
  };
}