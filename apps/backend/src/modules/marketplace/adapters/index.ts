import { MarketplaceProvider } from '@prisma/client';
import { MarketplaceAdapter } from './marketplace-adapter.js';
import { MercadoLivreAdapter } from './mercado-livre.adapter.js';
import { ShopeeAdapter } from './shopee.adapter.js';

const mercadoLivre = new MercadoLivreAdapter();
const shopee = new ShopeeAdapter();

const registry: Record<MarketplaceProvider, MarketplaceAdapter> = {
  [MarketplaceProvider.MERCADO_LIVRE]: mercadoLivre,
  [MarketplaceProvider.SHOPEE]: shopee,
};

export function getAdapter(provider: MarketplaceProvider): MarketplaceAdapter {
  return registry[provider];
}

export { mercadoLivre, shopee };
export { MercadoLivreAdapter, ShopeeAdapter };
export type { MarketplaceAdapter };
