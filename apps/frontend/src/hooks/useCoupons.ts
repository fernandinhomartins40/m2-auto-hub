// src/hooks/useCoupons.ts
import { useState, useCallback } from 'react';
import { couponService, handleApiError } from '@/api';
import type { Coupon, CouponValidationResponse } from '@/api/couponService';

interface UseCouponsReturn {
  coupons: Coupon[];
  isLoading: boolean;
  error: string | null;
  validationResult: CouponValidationResponse | null;

  // Actions
  loadCoupons: (params?: { page?: number; limit?: number; active?: boolean }) => Promise<void>;
  loadActiveCoupons: () => Promise<void>;
  validateCoupon: (code: string, orderTotal: number) => Promise<CouponValidationResponse>;
  applyCoupon: (code: string, orderId: string) => Promise<{ success: boolean; discountAmount: number }>;
  getCouponByCode: (code: string) => Promise<Coupon | null>;
  clearValidation: () => void;
}

export function useCoupons(): UseCouponsReturn {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<CouponValidationResponse | null>(null);

  const loadCoupons = useCallback(async (params?: { page?: number; limit?: number; active?: boolean }) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await couponService.getCoupons(params);
      setCoupons(response.data || []);
    } catch (err) {
      const apiError = handleApiError(err);
      setError(apiError.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadActiveCoupons = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const activeCoupons = await couponService.getActiveCoupons();
      setCoupons(activeCoupons);
    } catch (err) {
      const apiError = handleApiError(err);
      setError(apiError.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const validateCoupon = useCallback(async (code: string, orderTotal: number): Promise<CouponValidationResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await couponService.validateCoupon(code, orderTotal);
      setValidationResult(result);
      return result;
    } catch (err) {
      const apiError = handleApiError(err);
      const errorResult: CouponValidationResponse = {
        valid: false,
        error: apiError.message
      };
      setValidationResult(errorResult);
      setError(apiError.message);
      return errorResult;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const applyCoupon = useCallback(async (code: string, orderId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await couponService.applyCoupon(code, orderId);
      return result;
    } catch (err) {
      const apiError = handleApiError(err);
      setError(apiError.message);
      return { success: false, discountAmount: 0 };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getCouponByCode = useCallback(async (code: string): Promise<Coupon | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const coupon = await couponService.getCouponByCode(code);
      return coupon;
    } catch (err) {
      const apiError = handleApiError(err);
      setError(apiError.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearValidation = useCallback(() => {
    setValidationResult(null);
    setError(null);
  }, []);

  return {
    coupons,
    isLoading,
    error,
    validationResult,
    loadCoupons,
    loadActiveCoupons,
    validateCoupon,
    applyCoupon,
    getCouponByCode,
    clearValidation
  };
}