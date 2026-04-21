import { Address, AddressType } from '@prisma/client';
import { prisma } from '@config/database.js';
import { ApiError } from '@shared/utils/error.util.js';

export interface CreateAddressDto {
  customerId: string;
  type: AddressType;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault?: boolean;
}

export interface UpdateAddressDto {
  type?: AddressType;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  isDefault?: boolean;
}

export class AddressesService {
  /**
   * Get all addresses for a customer
   */
  async getAddresses(customerId: string): Promise<Address[]> {
    return prisma.address.findMany({
      where: { customerId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Get address by ID
   */
  async getAddressById(id: string, customerId: string): Promise<Address> {
    const address = await prisma.address.findFirst({
      where: { id, customerId },
    });

    if (!address) {
      throw ApiError.notFound('Address not found');
    }

    return address;
  }

  /**
   * Create new address
   */
  async createAddress(dto: CreateAddressDto): Promise<Address> {
    // If this is set as default, unset other default addresses
    if (dto.isDefault) {
      await prisma.address.updateMany({
        where: { customerId: dto.customerId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        customerId: dto.customerId,
        type: dto.type,
        street: dto.street,
        number: dto.number,
        complement: dto.complement,
        neighborhood: dto.neighborhood,
        city: dto.city,
        state: dto.state.toUpperCase(),
        zipCode: dto.zipCode.replace(/\D/g, ''),
        isDefault: dto.isDefault ?? false,
      },
    });

    return address;
  }

  /**
   * Update address
   */
  async updateAddress(
    id: string,
    customerId: string,
    dto: UpdateAddressDto
  ): Promise<Address> {
    // Verify address exists and belongs to customer
    await this.getAddressById(id, customerId);

    // If setting as default, unset other default addresses
    if (dto.isDefault) {
      await prisma.address.updateMany({
        where: { customerId, isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.state && { state: dto.state.toUpperCase() }),
        ...(dto.zipCode && { zipCode: dto.zipCode.replace(/\D/g, '') }),
      },
    });

    return address;
  }

  /**
   * Delete address
   */
  async deleteAddress(id: string, customerId: string): Promise<void> {
    // Verify address exists and belongs to customer
    await this.getAddressById(id, customerId);

    await prisma.address.delete({
      where: { id },
    });
  }

  /**
   * Set address as default
   */
  async setDefaultAddress(id: string, customerId: string): Promise<Address> {
    // Verify address exists and belongs to customer
    await this.getAddressById(id, customerId);

    // Unset other default addresses
    await prisma.address.updateMany({
      where: { customerId, isDefault: true, NOT: { id } },
      data: { isDefault: false },
    });

    // Set this address as default
    const address = await prisma.address.update({
      where: { id },
      data: { isDefault: true },
    });

    return address;
  }
}
