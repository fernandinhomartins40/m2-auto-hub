export class LicensePlateUtil {
  static normalize(plate: string | null | undefined): string {
    if (!plate) {
      return '';
    }

    return plate
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
  }

  static isValid(plate: string | null | undefined): boolean {
    const normalized = this.normalize(plate);

    return /^[A-Z]{3}\d{4}$/.test(normalized) || /^[A-Z]{3}\d[A-Z]\d{2}$/.test(normalized);
  }
}
