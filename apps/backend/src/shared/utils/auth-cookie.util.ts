import type { CookieOptions } from 'express';
import { environment } from '@config/environment.js';

const AUTH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const REMEMBER_ME_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function createBaseCookieOptions(): CookieOptions {
  const cookieOptions: CookieOptions = {
    httpOnly: true,
    path: '/',
    secure: environment.cookies.secure,
    sameSite: environment.cookies.sameSite,
  };

  if (environment.cookies.domain) {
    cookieOptions.domain = environment.cookies.domain;
  }

  return cookieOptions;
}

/**
 * rememberMe: true  -> cookie persistente de 30 dias;
 * rememberMe: false -> cookie de sessão (sem maxAge), some ao fechar o navegador;
 * ausente           -> padrão de 7 dias.
 */
export function createSessionCookieOptions(rememberMe?: boolean): CookieOptions {
  if (rememberMe === false) {
    return createBaseCookieOptions();
  }

  return {
    ...createBaseCookieOptions(),
    maxAge: rememberMe ? REMEMBER_ME_MAX_AGE_MS : AUTH_COOKIE_MAX_AGE_MS,
  };
}

export function createClearCookieOptions(): CookieOptions {
  return createBaseCookieOptions();
}
