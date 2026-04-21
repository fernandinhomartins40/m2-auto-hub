export class PhoneUtil {
  /**
   * Normalize a Brazilian phone number for storage and matching.
   * Keeps only digits and strips a leading country code 55 when present.
   */
  static normalize(phone: string | null | undefined): string {
    if (!phone) {
      return '';
    }

    const digits = phone.replace(/\D/g, '');

    if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
      return digits.slice(2);
    }

    return digits;
  }
}
