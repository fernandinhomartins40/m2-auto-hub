import { Request, Response, NextFunction } from 'express';
import { prisma } from '@config/database.js';
import { logger } from '@shared/utils/logger.util.js';

/**
 * Middleware de Audit Log
 * Registra automaticamente ações sensíveis no banco de dados
 * ✅ SECURITY ENHANCEMENT: Rastreabilidade completa
 */
export class AuditLogMiddleware {
  /**
   * Log de ações sensíveis
   * @param action - Tipo de ação (CREATE, UPDATE, DELETE, ASSIGN, etc)
   * @param resource - Recurso afetado (Revision, Order, Product, Admin, etc)
   */
  static log(action: string, resource: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Guardar método original de json
      const originalJson = res.json.bind(res);

      // Interceptar resposta
      res.json = function (body: any) {
        // Só logar se a requisição foi bem-sucedida (2xx)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Executar log assíncrono (não bloquear resposta)
          setImmediate(async () => {
            try {
              if (!req.admin) {
                return; // Apenas logar ações autenticadas
              }

              // Extrair ID do recurso
              const resourceId = req.params.id || body?.data?.id || body?.id;

              // Preparar dados de mudança
              const changes: any = {
                method: req.method,
                path: req.path,
                query: req.query,
                body: sanitizeBody(req.body),
              };

              // Adicionar resposta se disponível
              changes.responseStatus = res.statusCode;

              // Criar registro de audit log
              await prisma.auditLog.create({
                data: {
                  adminId: req.admin.adminId,
                  action,
                  resource,
                  resourceId: resourceId || null,
                  changes: changes,
                  ipAddress: getClientIp(req),
                  userAgent: req.headers['user-agent'] || null,
                },
              });

              logger.info(
                `[AUDIT] ${action} ${resource} by admin ${req.admin.email} (${req.admin.role})`
              );
            } catch (error) {
              // Não falhar a requisição por erro de log
              logger.error('[AUDIT LOG ERROR]', error);
            }
          });
        }

        // Continuar com resposta normal
        return originalJson(body);
      };

      next();
    };
  }

  /**
   * Log condicional - só loga se condição for verdadeira
   */
  static logIf(
    condition: (req: Request) => boolean,
    action: string,
    resource: string
  ) {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (condition(req)) {
        return AuditLogMiddleware.log(action, resource)(req, res, next);
      }
      next();
    };
  }
}

/**
 * Remove dados sensíveis antes de logar
 */
function sanitizeBody(body: unknown, depth = 0): unknown {
  if (!body) return null;

  if (depth > 6) return null;
  if (Array.isArray(body)) return body.slice(0, 50).map(item => sanitizeBody(item, depth + 1));
  if (typeof body !== 'object') return body;

  const sanitized: Record<string, unknown> = { ...body };

  // Remover campos sensíveis
  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'apiKey',
    'authorization',
    'cookie',
    'cpf',
    'creditCard',
    'cvv',
    'accessHash',
    'integrationCode',
  ];

  for (const [field, value] of Object.entries(sanitized)) {
    if (sensitiveFields.some(sensitive => field.toLowerCase().includes(sensitive.toLowerCase()))) {
      sanitized[field] = '[REDACTED]';
    } else {
      sanitized[field] = sanitizeBody(value, depth + 1);
    }
  }

  return sanitized;
}

/**
 * Extrai IP real do cliente considerando proxies
 */
function getClientIp(req: Request): string {
  // Express calcula req.ip respeitando apenas a cadeia de proxies configurada.
  return req.ip || req.socket.remoteAddress || 'unknown';
}
