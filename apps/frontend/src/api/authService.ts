// src/api/authService.ts
import apiClient from './apiClient';
import type { Customer, RegisterRequest } from '@moria/types';

export type RegisterData = RegisterRequest;
export type { LoginRequest, LoginResponse, RegisterResponse } from '@moria/types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

class AuthService {
  async login(data: LoginRequest): Promise<ApiResponse<{ customer: Customer }>> {
    const response = await apiClient.post<ApiResponse<{ customer: Customer }>>('/auth/login', data);
    return response.data;
  }

  async register(data: RegisterData): Promise<ApiResponse<{ customer: Customer }>> {
    const response = await apiClient.post<ApiResponse<{ customer: Customer }>>('/auth/register', data);
    return response.data;
  }

  async logout(): Promise<void> {
    // Chamar endpoint de logout para limpar o cookie httpOnly
    await apiClient.post('/auth/logout');
  }

  async getProfile(): Promise<Customer> {
    const response = await apiClient.get<ApiResponse<Customer>>('/auth/profile');
    return response.data.data;
  }

  async updateProfile(data: Partial<Customer>): Promise<Customer> {
    const response = await apiClient.put<ApiResponse<Customer>>('/auth/profile', data);
    return response.data.data;
  }
}

export default new AuthService();