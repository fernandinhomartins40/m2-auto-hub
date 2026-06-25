import { z } from 'zod';
import { MarketplaceProvider } from '@prisma/client';

/** Mapeia o slug da rota (mercadolivre/shopee) para o enum do Prisma. */
export const providerSlugSchema = z.enum(['mercadolivre', 'shopee']).transform(slug =>
  slug === 'mercadolivre' ? MarketplaceProvider.MERCADO_LIVRE : MarketplaceProvider.SHOPEE
);

export function parseProviderSlug(slug: string): MarketplaceProvider {
  return providerSlugSchema.parse(slug);
}

export const setCredentialsSchema = z.object({
  appId: z.string().trim().min(1, 'App ID é obrigatório'),
  appSecret: z.string().trim().min(1, 'Secret é obrigatório'),
});
export type SetCredentialsDto = z.infer<typeof setCredentialsSchema>;

export const publishProductSchema = z.object({
  providers: z
    .array(z.enum(['mercadolivre', 'shopee']))
    .min(1, 'Selecione ao menos um marketplace'),
  categoryMapping: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Categoria/atributos resolvidos no frontend'),
});
export type PublishProductDto = z.infer<typeof publishProductSchema>;

export const suggestCategoriesSchema = z.object({
  q: z.string().trim().min(2, 'Informe ao menos 2 caracteres'),
});
