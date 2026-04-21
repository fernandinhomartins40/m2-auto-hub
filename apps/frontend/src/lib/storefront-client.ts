import type {
  LandingPageConfig,
  PaginatedResult,
  PaginationMeta,
  PublicSettings,
  StorefrontProduct,
  StorefrontPromotion,
  StorefrontService,
} from "@/types/storefront";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  details?: unknown;
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL?.trim() || "/api").replace(/\/$/, "");
const REQUEST_TIMEOUT_MS = 10000;

const defaultMeta: PaginationMeta = {
  page: 1,
  limit: 0,
  totalCount: 0,
  totalPages: 0,
};

function withQuery(path: string, params?: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    search.set(key, String(value));
  });

  return search.size > 0 ? `${path}?${search.toString()}` : path;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => null)) as
      | (ApiEnvelope<unknown> & { meta?: PaginationMeta })
      | null;

    if (!response.ok) {
      const message =
        payload?.error || payload?.message || `Falha ao carregar ${path} (${response.status})`;
      throw new Error(message);
    }

    return payload as T;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function getLandingPageConfig() {
  try {
    const response = await request<ApiEnvelope<LandingPageConfig>>("/landing-page/config");
    return response.data;
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("404")) {
      return null;
    }

    throw error;
  }
}

export async function getPublicSettings() {
  const response = await request<ApiEnvelope<PublicSettings>>("/settings/public");
  return response.data;
}

export async function getStorefrontServices(limit = 6): Promise<PaginatedResult<StorefrontService>> {
  const response = await request<ApiEnvelope<StorefrontService[]> & { meta?: PaginationMeta }>(
    withQuery("/services", {
      limit,
      status: "ACTIVE",
      sortBy: "createdAt",
      sortOrder: "desc",
    })
  );

  return {
    data: response.data ?? [],
    meta: response.meta ?? { ...defaultMeta, limit },
  };
}

export async function getStorefrontProducts(limit = 8): Promise<PaginatedResult<StorefrontProduct>> {
  const response = await request<ApiEnvelope<StorefrontProduct[]> & { meta?: PaginationMeta }>(
    withQuery("/products", {
      limit,
      status: "ACTIVE",
      inStock: true,
      sortBy: "createdAt",
      sortOrder: "desc",
    })
  );

  return {
    data: response.data ?? [],
    meta: response.meta ?? { ...defaultMeta, limit },
  };
}

export async function getActivePromotions() {
  const response = await request<ApiEnvelope<StorefrontPromotion[]>>("/promotions/active");
  return response.data ?? [];
}
