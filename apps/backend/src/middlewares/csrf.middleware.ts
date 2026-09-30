import type { NextFunction, Request, Response } from 'express';
import { environment } from '@config/environment.js';
import { ApiError } from '@shared/utils/error.util.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Protege sessoes por cookie contra requisicoes mutaveis de outras origens. */
export function enforceTrustedOrigin(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method) || (!req.cookies?.authToken && !req.cookies?.adminToken)) {
    next();
    return;
  }

  const origin = req.get('origin');
  if (!origin || !environment.cors.origins.includes(origin)) {
    next(ApiError.forbidden('Origem da requisicao nao autorizada'));
    return;
  }

  next();
}
