import type { CookieOptions } from 'express';
import { environment } from '@config/environment.js';

const AUTH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

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

export function createSessionCookieOptions(): CookieOptions {
  return {
    ...createBaseCookieOptions(),
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
  };
}

export function createClearCookieOptions(): CookieOptions {
  return createBaseCookieOptions();
}
