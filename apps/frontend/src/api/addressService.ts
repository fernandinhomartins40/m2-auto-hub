// src/api/addressService.ts
import apiClient from './apiClient';
import type { Address, ApiResponse } from '@moria/types';

export type AddressPayload = Pick<
  Address,
  'type' | 'street' | 'number' | 'complement' | 'neighborhood' | 'city' | 'state' | 'zipCode' | 'isDefault'
>;

class AddressService {
  async getAddresses(): Promise<Address[]> {
    const response = await apiClient.get<ApiResponse<Address[]>>('/addresses');
    return response.data.data || [];
  }

  async getAddressById(id: string): Promise<Address> {
    const response = await apiClient.get<ApiResponse<Address>>(`/addresses/${id}`);
    return response.data.data as Address;
  }

  async createAddress(data: AddressPayload): Promise<Address> {
    const response = await apiClient.post<ApiResponse<Address>>('/addresses', data);
    return response.data.data as Address;
  }

  async updateAddress(id: string, data: Partial<AddressPayload>): Promise<Address> {
    const response = await apiClient.put<ApiResponse<Address>>(`/addresses/${id}`, data);
    return response.data.data as Address;
  }

  async deleteAddress(id: string): Promise<void> {
    await apiClient.delete(`/addresses/${id}`);
  }

  async setDefaultAddress(addressId: string): Promise<Address> {
    const response = await apiClient.patch<ApiResponse<Address>>(`/addresses/${addressId}/default`);
    return response.data.data as Address;
  }
}

export default new AddressService();
