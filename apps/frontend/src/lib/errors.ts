export interface ApiErrorDetails {
  message?: string;
  code?: string;
  details?: Array<{ path?: Array<string | number>; message?: string }>;
  response?: {
    status?: number;
    data?: {
      message?: string;
      error?: string;
      code?: string;
    };
  };
}

export function getApiError(error: unknown): ApiErrorDetails {
  if (error instanceof Error) {
    return Object.assign({ message: error.message }, error) as ApiErrorDetails;
  }

  if (typeof error === "object" && error !== null) {
    return error as ApiErrorDetails;
  }

  return { message: typeof error === "string" ? error : undefined };
}

export function getErrorMessage(error: unknown, fallback = "Ocorreu um erro inesperado"): string {
  const details = getApiError(error);
  return details.response?.data?.message
    || details.response?.data?.error
    || details.message
    || fallback;
}
