import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { ApiError } from './error.util.js';

export async function validateDto<T>(dtoClass: new () => T, plain: any): Promise<T> {
  const dtoObject = plainToClass(dtoClass, plain);
  const errors = await validate(dtoObject as any);

  if (errors.length > 0) {
    const messages = errors.map((error: any) =>
      Object.values(error.constraints || {}).join(', ')
    ).join('; ');
    throw ApiError.badRequest(`Validation failed: ${messages}`);
  }

  return dtoObject;
}
