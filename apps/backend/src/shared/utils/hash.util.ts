import bcrypt from 'bcryptjs';
import { environment } from '@config/environment.js';

export class HashUtil {
  /**
   * Hash a plain text password
   */
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(environment.bcrypt.rounds);
    return bcrypt.hash(password, salt);
  }

  /**
   * Compare a plain text password with a hashed password
   */
  static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Validate password strength
   * - At least 8 characters
   * - At least one uppercase letter
   * - At least one lowercase letter
   * - At least one number
   */
  static validatePasswordStrength(password: string): boolean {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);

    return (
      password.length >= minLength &&
      hasUpperCase &&
      hasLowerCase &&
      hasNumber
    );
  }
}
