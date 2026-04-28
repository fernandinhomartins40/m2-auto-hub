export class LicensePlateUtil {
  private static readonly LETTER_TO_DIGIT_MAP: Record<string, string> = {
    B: '8',
    D: '0',
    G: '6',
    I: '1',
    L: '1',
    O: '0',
    Q: '0',
    S: '5',
    T: '7',
    U: '0',
    Z: '2',
  };

  private static readonly DIGIT_TO_LETTER_MAP: Record<string, string> = {
    '0': 'O',
    '1': 'I',
    '2': 'Z',
    '5': 'S',
    '6': 'G',
    '7': 'T',
    '8': 'B',
  };

  static normalize(plate: string | null | undefined): string {
    if (!plate) {
      return '';
    }

    return plate
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
  }

  static isLegacy(plate: string | null | undefined): boolean {
    return /^[A-Z]{3}\d{4}$/.test(this.normalize(plate));
  }

  static isMercosul(plate: string | null | undefined): boolean {
    return /^[A-Z]{3}\d[A-Z]\d{2}$/.test(this.normalize(plate));
  }

  static isValid(plate: string | null | undefined): boolean {
    return this.isLegacy(plate) || this.isMercosul(plate);
  }

  static toPossibleValidPlates(plate: string | null | undefined): string[] {
    const normalized = this.normalize(plate);
    if (normalized.length !== 7) {
      return [];
    }

    const candidates: string[] = [];
    const append = (value: string | null) => {
      if (!value || !this.isValid(value) || candidates.includes(value)) {
        return;
      }

      candidates.push(value);
    };

    if (this.isValid(normalized)) {
      append(normalized);
    }

    append(this.normalizeToLegacyPattern(normalized));
    append(this.normalizeToMercosulPattern(normalized));

    return candidates;
  }

  private static normalizeToLegacyPattern(plate: string): string | null {
    const normalized = this.normalize(plate);
    if (normalized.length !== 7) {
      return null;
    }

    const chars = normalized.split('');

    for (let index = 0; index < chars.length; index += 1) {
      chars[index] =
        index < 3
          ? this.normalizeLetter(chars[index])
          : this.normalizeDigit(chars[index]);

      if (!chars[index]) {
        return null;
      }
    }

    return chars.join('');
  }

  private static normalizeToMercosulPattern(plate: string): string | null {
    const normalized = this.normalize(plate);
    if (normalized.length !== 7) {
      return null;
    }

    const chars = normalized.split('');

    for (let index = 0; index < chars.length; index += 1) {
      const expectsLetter = index < 3 || index === 4;
      chars[index] = expectsLetter
        ? this.normalizeLetter(chars[index])
        : this.normalizeDigit(chars[index]);

      if (!chars[index]) {
        return null;
      }
    }

    return chars.join('');
  }

  private static normalizeLetter(char: string): string {
    if (/^[A-Z]$/.test(char)) {
      return char;
    }

    return this.DIGIT_TO_LETTER_MAP[char] || '';
  }

  private static normalizeDigit(char: string): string {
    if (/^\d$/.test(char)) {
      return char;
    }

    return this.LETTER_TO_DIGIT_MAP[char] || '';
  }
}
