export const normalizePlate = (plate: string | null | undefined): string =>
  (plate || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

const LETTER_TO_DIGIT_MAP: Record<string, string> = {
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

const DIGIT_TO_LETTER_MAP: Record<string, string> = {
  '0': 'O',
  '1': 'I',
  '2': 'Z',
  '5': 'S',
  '6': 'G',
  '7': 'T',
  '8': 'B',
};

export const formatPlate = (plate: string | null | undefined): string => {
  const normalized = normalizePlate(plate);

  if (normalized.length <= 3) {
    return normalized;
  }

  return `${normalized.slice(0, 3)}-${normalized.slice(3, 7)}`;
};

export const isValidBrazilianPlate = (plate: string | null | undefined): boolean => {
  const normalized = normalizePlate(plate);

  return /^[A-Z]{3}\d{4}$/.test(normalized) || /^[A-Z]{3}\d[A-Z]\d{2}$/.test(normalized);
};

const normalizeLetter = (char: string): string => {
  if (/^[A-Z]$/.test(char)) {
    return char;
  }

  return DIGIT_TO_LETTER_MAP[char] || '';
};

const normalizeDigit = (char: string): string => {
  if (/^\d$/.test(char)) {
    return char;
  }

  return LETTER_TO_DIGIT_MAP[char] || '';
};

const normalizeToLegacyPattern = (plate: string): string | null => {
  const normalized = normalizePlate(plate);
  if (normalized.length !== 7) {
    return null;
  }

  const chars = normalized.split('');

  for (let index = 0; index < chars.length; index += 1) {
    chars[index] = index < 3 ? normalizeLetter(chars[index]) : normalizeDigit(chars[index]);
    if (!chars[index]) {
      return null;
    }
  }

  return chars.join('');
};

const normalizeToMercosulPattern = (plate: string): string | null => {
  const normalized = normalizePlate(plate);
  if (normalized.length !== 7) {
    return null;
  }

  const chars = normalized.split('');

  for (let index = 0; index < chars.length; index += 1) {
    const expectsLetter = index < 3 || index === 4;
    chars[index] = expectsLetter ? normalizeLetter(chars[index]) : normalizeDigit(chars[index]);
    if (!chars[index]) {
      return null;
    }
  }

  return chars.join('');
};

export const getPossibleBrazilianPlates = (plate: string | null | undefined): string[] => {
  const normalized = normalizePlate(plate);
  if (normalized.length !== 7) {
    return [];
  }

  const candidates: string[] = [];
  const append = (value: string | null) => {
    if (!value || !isValidBrazilianPlate(value) || candidates.includes(value)) {
      return;
    }

    candidates.push(value);
  };

  if (isValidBrazilianPlate(normalized)) {
    append(normalized);
  }

  append(normalizeToLegacyPattern(normalized));
  append(normalizeToMercosulPattern(normalized));

  return candidates;
};

export const extractPlateCandidates = (rawText: string | null | undefined): string[] => {
  if (!rawText) {
    return [];
  }

  const sanitized = rawText
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9\s-]/g, ' ');

  const matches = sanitized.match(/\b[A-Z]{3}[-\s]?\d[A-Z0-9][-\s]?\d{2}\b|\b[A-Z]{3}[-\s]?\d{4}\b/g) || [];
  const normalized = matches.flatMap((match) => getPossibleBrazilianPlates(match));

  return Array.from(new Set(normalized));
};

export const extractPlateFromNfcPayload = (rawText: string | null | undefined): string | null => {
  if (!rawText) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawText) as { plate?: string; placa?: string };
    const plateFromJson = parsed.plate || parsed.placa;

    const normalizedJsonPlates = getPossibleBrazilianPlates(plateFromJson);
    if (normalizedJsonPlates.length > 0) {
      return normalizedJsonPlates[0];
    }
  } catch {
    // Fallback to regex extraction below.
  }

  return extractPlateCandidates(rawText)[0] || null;
};
