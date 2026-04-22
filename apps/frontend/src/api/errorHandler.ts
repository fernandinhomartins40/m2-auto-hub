// src/api/errorHandler.ts
import { AxiosError } from 'axios';

interface ApiErrorResponse {
  message?: string;
  error?: string;
  code?: string;
  details?: Record<string, unknown>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const isAxiosError = (error: unknown): error is AxiosError<ApiErrorResponse> => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as AxiosError).isAxiosError === true
  );
};

export const handleApiError = (error: unknown): ApiError => {
  if (isAxiosError(error)) {
    if (error.response) {
      // Erro de resposta do servidor
      const { status, data } = error.response;
      return new ApiError(
        data.message || `Erro ${status}: ${data.error || 'Ocorreu um erro inesperado'}`,
        data.code || 'API_ERROR',
        status,
        data.details
      );
    } else if (error.request) {
      // Erro de requisição (sem resposta)
      return new ApiError(
        'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
        'NETWORK_ERROR',
        0
      );
    }
  }

  // Erro ao configurar a requisição ou outro tipo de erro
  const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro ao processar a requisição';
  return new ApiError(
    errorMessage,
    'REQUEST_ERROR'
  );
};

export const isApiError = (error: unknown): error is ApiError => {
  return error instanceof ApiError;
};