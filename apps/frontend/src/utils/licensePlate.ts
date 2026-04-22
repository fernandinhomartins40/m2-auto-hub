export const normalizePlate = (plate: string | null | undefined): string =>
  (plate || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

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
  const normalized = matches
    .map((match) => normalizePlate(match))
    .filter(isValidBrazilianPlate);

  return Array.from(new Set(normalized));
};

export const extractPlateFromNfcPayload = (rawText: string | null | undefined): string | null => {
  if (!rawText) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawText) as { plate?: string; placa?: string };
    const plateFromJson = parsed.plate || parsed.placa;

    if (plateFromJson && isValidBrazilianPlate(plateFromJson)) {
      return normalizePlate(plateFromJson);
    }
  } catch {
    // Fallback to regex extraction below.
  }

  return extractPlateCandidates(rawText)[0] || null;
};
