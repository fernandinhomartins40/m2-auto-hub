import jwt from 'jsonwebtoken';
import { loginSchema } from '../src/modules/auth/dto/login.dto.js';
import { registerSchema } from '../src/modules/auth/dto/register.dto.js';
import { JwtUtil } from '../src/shared/utils/jwt.util.js';

const payload = { customerId: 'customer-1', email: 'cliente@example.com', level: 'BRONZE', status: 'ACTIVE' };
const lifetimeInDays = (token: string) => {
  const { iat, exp } = jwt.decode(token) as { iat: number; exp: number };
  return (exp - iat) / 86400;
};

it('keeps the default session for the website', () => {
  expect(lifetimeInDays(JwtUtil.generateToken(payload))).toBe(7);
});

it('extends the session when the native app asks for it', () => {
  expect(lifetimeInDays(JwtUtil.generateToken(payload, '30d'))).toBe(30);
});

it('accepts rememberMe on login and registration', () => {
  expect(loginSchema.parse({ identifier: 'a@b.co', password: 'x', rememberMe: true }).rememberMe).toBe(true);
  expect(loginSchema.parse({ identifier: 'a@b.co', password: 'x' }).rememberMe).toBeUndefined();
  expect(
    registerSchema.parse({
      email: 'a@b.co',
      password: 'Abc@1234',
      name: 'Cliente Teste',
      phone: '43999999999',
      rememberMe: true,
    }).rememberMe
  ).toBe(true);
});
