import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { ApiError } from '@shared/utils/error.util.js';
import { logger } from '@shared/utils/logger.util.js';
import { environment } from '@config/environment.js';

export class ErrorMiddleware {
  private static getSafeRequestContext(req: Request) {
    return {
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      params: req.params,
      query: req.query,
      bodyKeys: req.body && typeof req.body === 'object' ? Object.keys(req.body) : [],
    };
  }

  static handle(
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    logger.error('Error occurred:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      request: ErrorMiddleware.getSafeRequestContext(req),
    });

    // Handle ApiError
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
        ...(environment.isDevelopment && { stack: error.stack }),
      });
      return;
    }

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
      return;
    }

    // Handle Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const prismaError = ErrorMiddleware.handlePrismaError(error);
      res.status(prismaError.statusCode).json({
        success: false,
        error: prismaError.message,
      });
      return;
    }

    // Handle Prisma validation errors
    if (error instanceof Prisma.PrismaClientValidationError) {
      res.status(400).json({
        success: false,
        error: 'Invalid data provided',
      });
      return;
    }

    // Handle generic errors
    res.status(500).json({
      success: false,
      error: environment.isDevelopment
        ? error.message
        : 'Internal server error',
      // Include error name in production for better debugging
      errorType: error.name,
      ...(environment.isDevelopment && {
        stack: error.stack,
        fullError: error
      }),
    });
  }

  private static handlePrismaError(error: Prisma.PrismaClientKnownRequestError): {
    statusCode: number;
    message: string;
  } {
    switch (error.code) {
      case 'P2002':
        return {
          statusCode: 409,
          message: `Duplicate value for field: ${(error.meta?.target as string[])?.join(', ')}`,
        };
      case 'P2025':
        return {
          statusCode: 404,
          message: 'Record not found',
        };
      case 'P2003':
        return {
          statusCode: 400,
          message: 'Invalid reference to related record',
        };
      case 'P2014':
        return {
          statusCode: 400,
          message: 'Invalid relationship constraint',
        };
      default:
        return {
          statusCode: 500,
          message: 'Database error occurred',
        };
    }
  }
}
