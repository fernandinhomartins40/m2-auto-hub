import { Customer, CustomerStatus, CustomerLevel, Prisma } from '@prisma/client';
import { prisma } from '@config/database.js';
import { HashUtil } from '@shared/utils/hash.util.js';
import { JwtUtil } from '@shared/utils/jwt.util.js';
import { ApiError } from '@shared/utils/error.util.js';
import { PhoneUtil } from '@shared/utils/phone.util.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { logger } from '@shared/utils/logger.util.js';

export interface AuthResponse {
  token: string;
  customer: Omit<Customer, 'password'>;
}

export class AuthService {
  private async findCustomerByPhone(phoneIdentifier: string): Promise<Customer | null> {
    const normalizedPhone = PhoneUtil.normalize(phoneIdentifier);

    if (!normalizedPhone) {
      return null;
    }

    const exactCustomer = await prisma.customer.findFirst({
      where: {
        OR: [
          { phone: normalizedPhone },
          { phone: `55${normalizedPhone}` },
        ],
      },
    });

    if (exactCustomer) {
      return exactCustomer;
    }

    const normalizedPhoneSql = Prisma.sql`
      CASE
        WHEN LEFT(regexp_replace(phone, '[^0-9]', '', 'g'), 2) = '55'
          AND length(regexp_replace(phone, '[^0-9]', '', 'g')) IN (12, 13)
        THEN substring(regexp_replace(phone, '[^0-9]', '', 'g') from 3)
        ELSE regexp_replace(phone, '[^0-9]', '', 'g')
      END
    `;

    const [customer] = await prisma.$queryRaw<Customer[]>`
      SELECT *
      FROM "customers"
      WHERE ${normalizedPhoneSql} = ${normalizedPhone}
      LIMIT 1
    `;

    return customer || null;
  }

  /**
   * Login customer
   */
  async login(dto: LoginDto): Promise<AuthResponse> {
    const isEmail = dto.identifier.includes('@');
    const searchValue = isEmail
      ? dto.identifier.toLowerCase().trim()
      : PhoneUtil.normalize(dto.identifier);

    logger.info(`Login attempt - isEmail: ${isEmail}, original: ${dto.identifier}, searchValue: ${searchValue}`);

    const customer = isEmail
      ? await prisma.customer.findFirst({
        where: { email: searchValue },
      })
      : await this.findCustomerByPhone(dto.identifier);

    if (!customer) {
      logger.info(`Customer not found with ${isEmail ? 'email' : 'phone'}: ${searchValue}`);
      throw ApiError.unauthorized('Invalid phone/email or password');
    }

    logger.info(`Customer found: ${customer.email}, phone: ${customer.phone}`);

    if (customer.status === CustomerStatus.BLOCKED) {
      throw ApiError.forbidden('Your account has been blocked');
    }

    if (!customer.password) {
      logger.warn(`Customer login failed - no password configured: ${customer.email}`);
      throw ApiError.unauthorized('Invalid phone/email or password');
    }

    const isPasswordValid = await HashUtil.comparePassword(
      dto.password,
      customer.password
    );

    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid phone/email or password');
    }

    await prisma.customer.update({
      where: { id: customer.id },
      data: { lastLoginAt: new Date() },
    });

    const token = JwtUtil.generateToken({
      customerId: customer.id,
      email: customer.email,
      level: customer.level,
      status: customer.status,
    });

    const { password, ...customerWithoutPassword } = customer;

    logger.info(`Customer logged in: ${customer.email}`);

    return {
      token,
      customer: customerWithoutPassword,
    };
  }

  /**
   * Register new customer
   */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const normalizedPhone = PhoneUtil.normalize(dto.phone);
    const normalizedCpf = dto.cpf?.replace(/\D/g, '');

    const existingCustomer = await prisma.customer.findUnique({
      where: { email: dto.email },
    });

    if (existingCustomer) {
      throw ApiError.conflict('Email already registered');
    }

    const existingPhoneCustomer = await this.findCustomerByPhone(normalizedPhone);
    if (existingPhoneCustomer) {
      throw ApiError.conflict('Phone already registered');
    }

    if (normalizedCpf) {
      const existingCpf = await prisma.customer.findUnique({
        where: { cpf: normalizedCpf },
      });

      if (existingCpf) {
        throw ApiError.conflict('CPF already registered');
      }
    }

    const hashedPassword = await HashUtil.hashPassword(dto.password);

    const customer = await prisma.customer.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        phone: normalizedPhone,
        cpf: normalizedCpf,
        status: CustomerStatus.ACTIVE,
        level: CustomerLevel.BRONZE,
        lastLoginAt: new Date(),
      },
    });

    const token = JwtUtil.generateToken({
      customerId: customer.id,
      email: customer.email,
      level: customer.level,
      status: customer.status,
    });

    const { password, ...customerWithoutPassword } = customer;

    logger.info(`New customer registered: ${customer.email}`);

    return {
      token,
      customer: customerWithoutPassword,
    };
  }

  /**
   * Get customer profile
   */
  async getProfile(customerId: string): Promise<Omit<Customer, 'password'>> {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        addresses: {
          orderBy: { isDefault: 'desc' },
        },
      },
    });

    if (!customer) {
      throw ApiError.notFound('Customer not found');
    }

    const { password, ...customerWithoutPassword } = customer;
    return customerWithoutPassword;
  }

  /**
   * Update customer profile
   */
  async updateProfile(
    customerId: string,
    data: {
      name?: string;
      phone?: string;
      cpf?: string;
      birthDate?: Date;
    }
  ): Promise<Omit<Customer, 'password'>> {
    const normalizedCpf = data.cpf ? data.cpf.replace(/\D/g, '') : undefined;
    const normalizedPhone = data.phone ? PhoneUtil.normalize(data.phone) : undefined;

    if (normalizedPhone) {
      const existingPhoneCustomer = await this.findCustomerByPhone(normalizedPhone);

      if (existingPhoneCustomer && existingPhoneCustomer.id !== customerId) {
        throw ApiError.conflict('Phone already in use');
      }
    }

    if (normalizedCpf) {
      const existingCpf = await prisma.customer.findFirst({
        where: {
          cpf: normalizedCpf,
          NOT: { id: customerId },
        },
      });

      if (existingCpf) {
        throw ApiError.conflict('CPF already in use');
      }
    }

    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        ...data,
        ...(normalizedPhone !== undefined ? { phone: normalizedPhone } : {}),
        ...(normalizedCpf !== undefined ? { cpf: normalizedCpf } : {}),
      },
    });

    const { password, ...customerWithoutPassword } = customer;
    return customerWithoutPassword;
  }

  /**
   * Change customer password
   */
  async changePassword(
    customerId: string,
    dto: ChangePasswordDto
  ): Promise<void> {
    try {
      logger.info(`Password change attempt for customer: ${customerId}`);

      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer) {
        throw ApiError.notFound('Customer not found');
      }

      const isCurrentPasswordValid = await HashUtil.comparePassword(
        dto.currentPassword,
        customer.password
      );

      if (!isCurrentPasswordValid) {
        logger.warn(`Password change failed - invalid current password: ${customer.email}`);
        throw ApiError.unauthorized('Current password is incorrect');
      }

      const hashedNewPassword = await HashUtil.hashPassword(dto.newPassword);

      await prisma.customer.update({
        where: { id: customerId },
        data: { password: hashedNewPassword },
      });

      logger.info(`Password changed successfully for customer: ${customer.email}`);
    } catch (error) {
      logger.error('Password change error:', error);
      throw error;
    }
  }
}
