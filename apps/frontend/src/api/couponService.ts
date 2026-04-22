import apiClient from './apiClient';

export type CouponDiscountType = 'PERCENTAGE' | 'FIXED';

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minValue?: number | null;
  maxDiscount?: number | null;
  maxValue?: number | null;
  expiresAt: string;
  usageLimit?: number | null;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CouponListResponse {
  data: Coupon[];
  meta: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface CouponValidationResponse {
  valid: boolean;
  coupon?: Coupon;
  discountAmount?: number;
  finalValue?: number;
  error?: string;
  message?: string;
}

export interface CouponUpsertInput {
  code: string;
  description: string;
  discountType: CouponDiscountType;
  discountValue: number;
  expiresAt: string;
  minValue?: number;
  maxDiscount?: number;
  usageLimit?: number;
  isActive?: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface CouponValidationApiResult {
  isValid: boolean;
  coupon?: Coupon;
  discount: number;
  finalValue: number;
  message?: string;
}

const normalizeDecimal = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeCoupon = (coupon: Coupon): Coupon => ({
  ...coupon,
  discountValue: normalizeDecimal(coupon.discountValue) ?? 0,
  minValue: normalizeDecimal(coupon.minValue),
  maxDiscount: normalizeDecimal(coupon.maxDiscount ?? coupon.maxValue),
  maxValue: normalizeDecimal(coupon.maxValue ?? coupon.maxDiscount),
});

class CouponService {
  async getCoupons(params?: {
    page?: number;
    limit?: number;
    active?: boolean;
  }): Promise<CouponListResponse> {
    const response = await apiClient.get<CouponListResponse>('/coupons', { params });

    return {
      ...response.data,
      data: (response.data.data || []).map(normalizeCoupon),
    };
  }

  async getCouponById(id: string): Promise<Coupon> {
    const response = await apiClient.get<ApiResponse<Coupon>>(`/coupons/${id}`);
    return normalizeCoupon(response.data.data);
  }

  async getCouponByCode(code: string): Promise<Coupon> {
    const response = await apiClient.get<ApiResponse<Coupon>>(`/coupons/code/${code}`);
    return normalizeCoupon(response.data.data);
  }

  async validateCoupon(code: string, orderTotal: number): Promise<CouponValidationResponse> {
    const response = await apiClient.post<ApiResponse<CouponValidationApiResult>>('/coupons/validate', {
      code,
      cartValue: orderTotal,
    });

    const result = response.data.data;

    return {
      valid: result.isValid,
      coupon: result.coupon ? normalizeCoupon(result.coupon) : undefined,
      discountAmount: result.discount,
      finalValue: result.finalValue,
      error: result.isValid ? undefined : result.message,
      message: result.message,
    };
  }

  async getActiveCoupons(): Promise<Coupon[]> {
    const response = await apiClient.get<ApiResponse<Coupon[]>>('/coupons/active');
    return (response.data.data || []).map(normalizeCoupon);
  }

  async applyCoupon(code: string, orderId: string): Promise<{ success: boolean; discountAmount: number }> {
    const response = await apiClient.post<{ success: boolean; discountAmount: number }>('/coupons/apply', {
      code,
      orderId,
    });
    return response.data;
  }

  async getActiveCouponCount(): Promise<number> {
    const response = await apiClient.get<ApiResponse<{ count: number }>>('/coupons/active/count');
    return response.data.data.count;
  }

  async createCoupon(data: CouponUpsertInput): Promise<{ data: Coupon }> {
    const response = await apiClient.post<ApiResponse<Coupon>>('/coupons', data);
    return { data: normalizeCoupon(response.data.data) };
  }

  async updateCoupon(id: string, data: Partial<CouponUpsertInput>): Promise<{ data: Coupon }> {
    const response = await apiClient.patch<ApiResponse<Coupon>>(`/coupons/${id}`, data);
    return { data: normalizeCoupon(response.data.data) };
  }

  async deleteCoupon(id: string): Promise<void> {
    await apiClient.delete(`/coupons/${id}`);
  }

  async toggleCouponStatus(id: string, isActive: boolean): Promise<{ data: Coupon }> {
    const response = await apiClient.patch<ApiResponse<Coupon>>(`/coupons/${id}`, {
      isActive: !isActive,
    });
    return { data: normalizeCoupon(response.data.data) };
  }
}

export default new CouponService();
