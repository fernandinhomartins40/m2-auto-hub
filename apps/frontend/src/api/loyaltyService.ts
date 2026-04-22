import axios from 'axios';
import {
  LoyaltyStats,
  PointTransaction,
  LoyaltyReward,
  RedeemedReward,
  LoyaltySettings,
  AdminLoyaltyStats,
  PaginatedResponse,
  ApiResponse,
} from '@moria/types';

const API_URL = (import.meta.env.VITE_API_BASE_URL?.trim() || '/api').replace(/\/$/, '');

// Configure axios to send cookies with requests
const axiosConfig = {
  withCredentials: true, // Enable sending cookies
};

// ===== CUSTOMER ENDPOINTS =====

/**
 * Get customer loyalty stats
 */
export const getLoyaltyStats = async (): Promise<LoyaltyStats> => {
  const response = await axios.get<ApiResponse<LoyaltyStats>>(
    `${API_URL}/loyalty/stats`,
    axiosConfig
  );
  return response.data;
};

/**
 * Get customer point transactions
 */
export const getPointTransactions = async (
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResponse<PointTransaction>> => {
  const response = await axios.get<ApiResponse<PaginatedResponse<PointTransaction>>>(
    `${API_URL}/loyalty/transactions`,
    {
      ...axiosConfig,
      params: { page, limit },
    }
  );
  return response.data;
};

/**
 * Get available rewards for customer
 */
export const getAvailableRewards = async (
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResponse<LoyaltyReward>> => {
  const response = await axios.get<ApiResponse<PaginatedResponse<LoyaltyReward>>>(
    `${API_URL}/loyalty/rewards`,
    {
      ...axiosConfig,
      params: { page, limit },
    }
  );
  return response.data;
};

/**
 * Redeem a reward
 */
export const redeemReward = async (rewardId: string): Promise<RedeemedReward> => {
  const response = await axios.post<ApiResponse<RedeemedReward>>(
    `${API_URL}/loyalty/redeem`,
    { rewardId },
    axiosConfig
  );
  return response.data;
};

/**
 * Get customer redeemed rewards
 */
export const getRedeemedRewards = async (
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResponse<RedeemedReward>> => {
  const response = await axios.get<ApiResponse<PaginatedResponse<RedeemedReward>>>(
    `${API_URL}/loyalty/redeemed`,
    {
      ...axiosConfig,
      params: { page, limit },
    }
  );
  return response.data;
};

/**
 * Get loyalty program settings (public)
 */
export const getLoyaltySettings = async (): Promise<LoyaltySettings> => {
  const response = await axios.get<ApiResponse<LoyaltySettings>>(
    `${API_URL}/loyalty/settings`
  );
  return response.data;
};

// ===== ADMIN ENDPOINTS =====

/**
 * Get admin loyalty stats
 */
export const getAdminLoyaltyStats = async (): Promise<AdminLoyaltyStats> => {
  const response = await axios.get<ApiResponse<AdminLoyaltyStats>>(
    `${API_URL}/admin/loyalty/stats`,
    axiosConfig
  );
  return response.data;
};

/**
 * Get loyalty settings (admin)
 */
export const getAdminLoyaltySettings = async (): Promise<LoyaltySettings> => {
  const response = await axios.get<ApiResponse<LoyaltySettings>>(
    `${API_URL}/admin/loyalty/settings`,
    axiosConfig
  );
  return response.data;
};

/**
 * Update loyalty settings (admin)
 */
export const updateLoyaltySettings = async (
  settings: Partial<LoyaltySettings>
): Promise<LoyaltySettings> => {
  const response = await axios.put<ApiResponse<LoyaltySettings>>(
    `${API_URL}/admin/loyalty/settings`,
    settings,
    axiosConfig
  );
  return response.data;
};

/**
 * Get all rewards (admin)
 */
export const getAdminRewards = async (
  page: number = 1,
  limit: number = 20,
  filters?: {
    status?: string;
    type?: string;
    minLevel?: string;
  }
): Promise<PaginatedResponse<LoyaltyReward>> => {
  const response = await axios.get<ApiResponse<PaginatedResponse<LoyaltyReward>>>(
    `${API_URL}/admin/loyalty/rewards`,
    {
      ...axiosConfig,
      params: { page, limit, ...filters },
    }
  );
  return response.data;
};

/**
 * Create a reward (admin)
 */
export const createReward = async (
  reward: Partial<LoyaltyReward>
): Promise<LoyaltyReward> => {
  const response = await axios.post<ApiResponse<LoyaltyReward>>(
    `${API_URL}/admin/loyalty/rewards`,
    reward,
    axiosConfig
  );
  return response.data;
};

/**
 * Update a reward (admin)
 */
export const updateReward = async (
  rewardId: string,
  reward: Partial<LoyaltyReward>
): Promise<LoyaltyReward> => {
  const response = await axios.put<ApiResponse<LoyaltyReward>>(
    `${API_URL}/admin/loyalty/rewards/${rewardId}`,
    reward,
    axiosConfig
  );
  return response.data;
};

/**
 * Delete a reward (admin)
 */
export const deleteReward = async (rewardId: string): Promise<void> => {
  await axios.delete(`${API_URL}/admin/loyalty/rewards/${rewardId}`, axiosConfig);
};

/**
 * Get customers with points (admin)
 */
export const getCustomersWithPoints = async (
  page: number = 1,
  limit: number = 20,
  filters?: {
    minPoints?: number;
    level?: string;
  }
): Promise<
  PaginatedResponse<{
    id: string;
    name: string;
    email: string;
    loyaltyPoints: number;
    totalPointsEarned: number;
    totalPointsRedeemed: number;
    level: string;
  }>
> => {
  const response = await axios.get(
    `${API_URL}/admin/loyalty/customers`,
    {
      ...axiosConfig,
      params: { page, limit, ...filters },
    }
  );
  return response.data;
};

/**
 * Get customer loyalty stats (admin)
 */
export const getAdminCustomerStats = async (
  customerId: string
): Promise<LoyaltyStats> => {
  const response = await axios.get<ApiResponse<LoyaltyStats>>(
    `${API_URL}/admin/loyalty/customers/${customerId}/stats`,
    axiosConfig
  );
  return response.data;
};

/**
 * Get customer point transactions (admin)
 */
export const getAdminCustomerTransactions = async (
  customerId: string,
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResponse<PointTransaction>> => {
  const response = await axios.get<ApiResponse<PaginatedResponse<PointTransaction>>>(
    `${API_URL}/admin/loyalty/customers/${customerId}/transactions`,
    {
      ...axiosConfig,
      params: { page, limit },
    }
  );
  return response.data;
};

/**
 * Manual points adjustment (admin)
 */
export const adjustPoints = async (data: {
  customerId: string;
  points: number;
  description: string;
  type?: 'EARN_MANUAL' | 'ADJUST_MANUAL';
}): Promise<PointTransaction> => {
  const response = await axios.post<ApiResponse<PointTransaction>>(
    `${API_URL}/admin/loyalty/points/adjust`,
    data,
    axiosConfig
  );
  return response.data;
};

/**
 * Mark redeemed reward as used (admin)
 */
export const markRewardAsUsed = async (
  redemptionCode: string
): Promise<RedeemedReward> => {
  const response = await axios.post<ApiResponse<RedeemedReward>>(
    `${API_URL}/admin/loyalty/redemptions/${redemptionCode}/use`,
    {},
    axiosConfig
  );
  return response.data;
};
