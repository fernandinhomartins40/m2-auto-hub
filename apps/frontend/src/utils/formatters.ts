/**
 * Utilitários de formatação e validação para campos de formulário
 */

/**
 * Formata CNPJ para o padrão 00.000.000/0000-00
 */
export const formatCNPJ = (value: string): string => {
  const numbers = value.replace(/\D/g, '');

  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
  if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
  if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;

  return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
};

/**
 * Formata CEP para o padrão 00000-000
 */
export const formatCEP = (value: string): string => {
  const numbers = value.replace(/\D/g, '');

  if (numbers.length <= 5) return numbers;

  return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
};

/**
 * Formata telefone para o padrão (00) 00000-0000 ou (00) 0000-0000
 */
export const formatPhone = (value: string): string => {
  const numbers = value.replace(/\D/g, '');

  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;

  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
};

/**
 * Remove formatação e retorna apenas números
 */
export const unformatValue = (value: string): string => {
  return value.replace(/\D/g, '');
};

/**
 * Converte telefone formatado para formato WhatsApp (5511999999999)
 */
export const toWhatsAppFormat = (phone: string): string => {
  const numbers = unformatValue(phone);

  // Se já começa com 55, retorna
  if (numbers.startsWith('55')) {
    return numbers;
  }

  // Adiciona código do país
  return `55${numbers}`;
};

/**
 * Converte formato WhatsApp para formato brasileiro (00) 00000-0000
 */
export const fromWhatsAppFormat = (whatsapp: string): string => {
  const numbers = unformatValue(whatsapp);

  // Remove código do país se existir
  const localNumber = numbers.startsWith('55') ? numbers.slice(2) : numbers;

  return formatPhone(localNumber);
};

/**
 * Valida CNPJ (apenas formato)
 */
export const isValidCNPJFormat = (cnpj: string): boolean => {
  const numbers = unformatValue(cnpj);
  return numbers.length === 14;
};

/**
 * Valida CEP (apenas formato)
 */
export const isValidCEPFormat = (cep: string): boolean => {
  const numbers = unformatValue(cep);
  return numbers.length === 8;
};

/**
 * Valida telefone brasileiro (apenas formato)
 */
export const isValidPhoneFormat = (phone: string): boolean => {
  const numbers = unformatValue(phone);
  return numbers.length === 10 || numbers.length === 11;
};

/**
 * Valida formato WhatsApp (5511999999999)
 */
export const isValidWhatsAppFormat = (whatsapp: string): boolean => {
  const numbers = unformatValue(whatsapp);
  return numbers.startsWith('55') && (numbers.length === 12 || numbers.length === 13);
};

/**
 * Valida email
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Valida UF (Estado)
 */
export const isValidUF = (uf: string): boolean => {
  const validUFs = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];
  return validUFs.includes(uf.toUpperCase());
};

/**
 * Mensagens de erro de validação
 */
export const validationMessages = {
  cnpj: 'CNPJ inválido. Use o formato: 00.000.000/0000-00',
  cep: 'CEP inválido. Use o formato: 00000-000',
  phone: 'Telefone inválido. Use o formato: (00) 00000-0000',
  whatsapp: 'WhatsApp inválido. Use o formato: 5511999999999',
  email: 'E-mail inválido',
  uf: 'UF inválida',
  required: 'Campo obrigatório',
  minValue: (min: number) => `Valor mínimo: ${min}`,
  maxValue: (max: number) => `Valor máximo: ${max}`,
  range: (min: number, max: number) => `Valor deve estar entre ${min} e ${max}`,
};
