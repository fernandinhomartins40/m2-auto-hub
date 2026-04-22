// src/hooks/useCustomerLevel.ts
import { useMemo } from 'react';
import type { Customer } from '@/contexts/AuthContext';

type CustomerLevel = Customer['level'];

interface LevelBenefits {
  freeShippingThreshold: number | null; // null means always free
  discountPercentage: number;
  hasVipSupport: boolean;
  hasEarlyAccess: boolean;
  hasExclusiveCoupons: boolean;
  hasCashback: boolean;
  cashbackPercentage: number;
  prioritySupport: boolean;
}

interface LevelThresholds {
  bronze: { min: number; max: number };
  silver: { min: number; max: number };
  gold: { min: number; max: number };
  platinum: { min: number; max?: number };
}

const LEVEL_THRESHOLDS: LevelThresholds = {
  bronze: { min: 0, max: 499.99 },
  silver: { min: 500, max: 1499.99 },
  gold: { min: 1500, max: 4999.99 },
  platinum: { min: 5000 }
};

const LEVEL_BENEFITS: Record<CustomerLevel, LevelBenefits> = {
  BRONZE: {
    freeShippingThreshold: 150,
    discountPercentage: 0,
    hasVipSupport: false,
    hasEarlyAccess: false,
    hasExclusiveCoupons: false,
    hasCashback: false,
    cashbackPercentage: 0,
    prioritySupport: true
  },
  SILVER: {
    freeShippingThreshold: 100,
    discountPercentage: 5,
    hasVipSupport: false,
    hasEarlyAccess: true,
    hasExclusiveCoupons: false,
    hasCashback: false,
    cashbackPercentage: 0,
    prioritySupport: true
  },
  GOLD: {
    freeShippingThreshold: null, // Always free
    discountPercentage: 10,
    hasVipSupport: true,
    hasEarlyAccess: true,
    hasExclusiveCoupons: true,
    hasCashback: false,
    cashbackPercentage: 0,
    prioritySupport: true
  },
  PLATINUM: {
    freeShippingThreshold: null, // Always free premium
    discountPercentage: 15,
    hasVipSupport: true,
    hasEarlyAccess: true,
    hasExclusiveCoupons: true,
    hasCashback: true,
    cashbackPercentage: 2,
    prioritySupport: true
  }
};

interface UseCustomerLevelReturn {
  currentLevel: CustomerLevel;
  benefits: LevelBenefits;
  nextLevel: CustomerLevel | null;
  progressToNext: number;
  amountToNextLevel: number;
  shouldGetFreeShipping: (orderTotal: number) => boolean;
  getDiscountAmount: (orderTotal: number) => number;
  getLevelFromSpent: (totalSpent: number) => CustomerLevel;
  canAccessFeature: (feature: keyof LevelBenefits) => boolean;
  getCashbackAmount: (orderTotal: number) => number;
}

export function useCustomerLevel(customer: Customer | null): UseCustomerLevelReturn {
  return useMemo(() => {
    const currentLevel = customer?.level || 'BRONZE';
    const totalSpent = customer?.totalSpent || 0;

    const benefits = LEVEL_BENEFITS[currentLevel];

    // Calculate next level and progress
    const levelOrder: CustomerLevel[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];
    const currentIndex = levelOrder.indexOf(currentLevel);
    const nextLevel = currentIndex < levelOrder.length - 1 ? levelOrder[currentIndex + 1] : null;

    let progressToNext = 100;
    let amountToNextLevel = 0;

    if (nextLevel) {
      const currentThreshold = Object.values(LEVEL_THRESHOLDS)[currentIndex];
      const nextThreshold = Object.values(LEVEL_THRESHOLDS)[currentIndex + 1];

      const progressRange = nextThreshold.min - currentThreshold.min;
      const currentProgress = totalSpent - currentThreshold.min;

      progressToNext = Math.min(100, Math.max(0, (currentProgress / progressRange) * 100));
      amountToNextLevel = Math.max(0, nextThreshold.min - totalSpent);
    }

    // Helper functions
    const shouldGetFreeShipping = (orderTotal: number): boolean => {
      if (benefits.freeShippingThreshold === null) return true;
      return orderTotal >= benefits.freeShippingThreshold;
    };

    const getDiscountAmount = (orderTotal: number): number => {
      return (orderTotal * benefits.discountPercentage) / 100;
    };

    const getLevelFromSpent = (totalSpent: number): CustomerLevel => {
      if (totalSpent >= LEVEL_THRESHOLDS.platinum.min) return 'PLATINUM';
      if (totalSpent >= LEVEL_THRESHOLDS.gold.min) return 'GOLD';
      if (totalSpent >= LEVEL_THRESHOLDS.silver.min) return 'SILVER';
      return 'BRONZE';
    };

    const canAccessFeature = (feature: keyof LevelBenefits): boolean => {
      return !!benefits[feature];
    };

    const getCashbackAmount = (orderTotal: number): number => {
      if (!benefits.hasCashback) return 0;
      return (orderTotal * benefits.cashbackPercentage) / 100;
    };

    return {
      currentLevel,
      benefits,
      nextLevel,
      progressToNext,
      amountToNextLevel,
      shouldGetFreeShipping,
      getDiscountAmount,
      getLevelFromSpent,
      canAccessFeature,
      getCashbackAmount
    };
  }, [customer]);
}