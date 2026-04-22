/**
 * Utility functions for input masking and formatting
 */

/**
 * Format phone number: (XX) XXXXX-XXXX or (XX) XXXX-XXXX
 */
export const formatPhone = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');

  if (cleaned.length <= 10) {
    // (XX) XXXX-XXXX
    return cleaned
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 14);
  } else {
    // (XX) XXXXX-XXXX
    return cleaned
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15);
  }
};

/**
 * Format CPF: XXX.XXX.XXX-XX
 */
export const formatCPF = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');

  return cleaned
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .slice(0, 14);
};

/**
 * Format CEP: XXXXX-XXX
 */
export const formatCEP = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');

  return cleaned
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 9);
};

/**
 * Format date to YYYY-MM-DD for input type="date"
 */
export const formatDateForInput = (value: string | Date | null | undefined): string => {
  if (!value) return '';

  const date = typeof value === 'string' ? new Date(value) : value;

  if (isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

/**
 * Format date to Brazilian format: DD/MM/YYYY
 */
export const formatDateBR = (value: string | Date | null | undefined): string => {
  if (!value) return '';

  const date = typeof value === 'string' ? new Date(value) : value;

  if (isNaN(date.getTime())) return '';

  return date.toLocaleDateString('pt-BR');
};

/**
 * Remove all non-numeric characters
 */
export const removeNonNumeric = (value: string): string => {
  return value.replace(/\D/g, '');
};

/**
 * Validate CPF
 */
export const isValidCPF = (cpf: string): boolean => {
  const cleaned = cpf.replace(/\D/g, '');

  if (cleaned.length !== 11) return false;

  // Check if all digits are the same
  if (/^(\d)\1+$/.test(cleaned)) return false;

  // Validate first digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleaned.charAt(9))) return false;

  // Validate second digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleaned.charAt(10))) return false;

  return true;
};

/**
 * Validate phone number (must have 10 or 11 digits)
 */
export const isValidPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 || cleaned.length === 11;
};

/**
 * Validate CEP (must have 8 digits)
 */
export const isValidCEP = (cep: string): boolean => {
  const cleaned = cep.replace(/\D/g, '');
  return cleaned.length === 8;
};
