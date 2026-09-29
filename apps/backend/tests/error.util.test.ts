import { ApiError } from '../src/shared/utils/error.util.js';

describe('ApiError', () => {
  it.each([
    ['badRequest', 400],
    ['unauthorized', 401],
    ['forbidden', 403],
    ['notFound', 404],
    ['conflict', 409],
    ['unprocessableEntity', 422],
  ] as const)('cria %s como erro operacional HTTP %i', (factory, statusCode) => {
    const error = ApiError[factory]('mensagem segura');

    expect(error).toBeInstanceOf(Error);
    expect(error.statusCode).toBe(statusCode);
    expect(error.message).toBe('mensagem segura');
    expect(error.isOperational).toBe(true);
  });

  it('marca falhas internas como não operacionais', () => {
    const error = ApiError.internal();

    expect(error.statusCode).toBe(500);
    expect(error.message).toBe('Internal server error');
    expect(error.isOperational).toBe(false);
  });
});
