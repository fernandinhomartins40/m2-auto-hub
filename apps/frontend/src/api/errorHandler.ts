// src/api/errorHandler.ts
import { AxiosError } from 'axios';
import { translateApiMessage } from '@/lib/apiError';

interface ApiErrorResponse {
  message?: string;
  error?: string;
  code?: string;
  // O middleware de erro devolve os erros de validação do Zod como array.
  details?: Array<{ field?: string; message?: string }> | Record<string, unknown>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number,
    public details?: ApiErrorResponse['details']
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
      // Erro de resposta do servidor.
      // Nos erros de validação do Zod a mensagem útil fica em details[], já que
      // `error` traz apenas "Validation failed".
      const { status, data } = error.response;
      const detail = Array.isArray(data?.details)
        ? (data.details[0] as { message?: string } | undefined)?.message
        : undefined;
      const rawMessage = detail || data?.message || data?.error;

      return new ApiError(
        rawMessage
          ? translateApiMessage(rawMessage)
          : `Erro ${status}: Ocorreu um erro inesperado`,
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