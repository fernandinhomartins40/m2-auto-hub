import { z } from 'zod';

/**
 * Schema de validação para atualização de configurações
 */
export const updateSettingsSchema = z.object({
  // Informações da Empresa
  storeName: z.string().min(1, 'Nome da loja é obrigatório').optional(),
  cnpj: z.string().regex(/^\d{14}$/, 'CNPJ inválido (deve conter 14 dígitos)').optional(),
  phone: z.string().regex(/^55\d{10,11}$/, 'Telefone inválido (formato: 5511999999999)').optional(),
  whatsapp: z.string().regex(/^55\d{10,11}$/, 'WhatsApp inválido (formato: 5511999999999)').optional(),
  email: z.string().email('Email inválido').optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().length(2, 'Estado deve ter 2 caracteres').optional(),
  zipCode: z.string().regex(/^\d{8}$/, 'CEP inválido (deve conter 8 dígitos)').optional(),

  // Configurações de Vendas
  defaultMargin: z.number().min(0).max(100, 'Margem deve estar entre 0 e 100%').optional(),
  freeShippingMin: z.number().min(0, 'Valor mínimo não pode ser negativo').optional(),
  deliveryFee: z.number().min(0, 'Taxa de entrega não pode ser negativa').optional(),
  deliveryDays: z.number().int().min(1, 'Prazo mínimo é 1 dia').optional(),

  // Horários de Funcionamento
  businessHours: z.record(z.string()).optional(),

  // Notificações
  notifyNewOrders: z.boolean().optional(),
  notifyLowStock: z.boolean().optional(),
  notifyWeeklyReports: z.boolean().optional(),

  // Integrações
  whatsappApiKey: z.string().nullable().optional(),
  correiosApiKey: z.string().nullable().optional(),
  paymentGatewayKey: z.string().nullable().optional(),
  googleAnalyticsId: z.string().nullable().optional(),

  // Branding de PDFs
  pdfHeaderLogoUrl: z.string().max(1000).nullable().optional(),
  pdfHeaderHtml: z.string().max(20000).optional(),
  pdfFooterLogoUrl: z.string().max(1000).nullable().optional(),
  pdfFooterHtml: z.string().max(20000).optional(),

  // PWA
  pwaName: z.string().max(120).optional(),
  pwaShortName: z.string().max(40).optional(),
  pwaDescription: z.string().max(240).optional(),
  pwaThemeColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Cor de tema inválida').optional(),
  pwaBackgroundColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Cor de fundo inválida').optional(),
  pwaDisplay: z.enum(['standalone', 'fullscreen', 'minimal-ui', 'browser']).optional(),
  pwaIcon192Url: z.string().max(1000).nullable().optional(),
  pwaIcon512Url: z.string().max(1000).nullable().optional(),
  pwaAppleTouchIconUrl: z.string().max(1000).nullable().optional(),
  pwaMaskableIconUrl: z.string().max(1000).nullable().optional(),

  // Flags de Conexão
  whatsappConnected: z.boolean().optional(),
  correiosConnected: z.boolean().optional(),
  paymentConnected: z.boolean().optional(),
  analyticsConnected: z.boolean().optional(),
});

export type UpdateSettingsDTO = z.infer<typeof updateSettingsSchema>;
