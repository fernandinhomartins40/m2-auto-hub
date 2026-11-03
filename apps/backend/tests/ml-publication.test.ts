import { MarketplaceStockMode } from '@prisma/client';
import {
  DEFAULT_SETTINGS,
  effectiveFields,
  publicationAttributes,
  readiness,
  resolvedPrice,
  resolvedQuantity,
  saleTerms,
  suggestTitle,
  validGtin,
} from '../src/modules/marketplace/mappers/publication.js';

const product = {
  name: 'FILTRO AR MEGANE/SCENIC',
  sku: 'PEL310',
  supplier: 'METAL LEVE',
  salePrice: 70,
  promoPrice: null,
  stock: 2,
  specifications: { brand: 'METAL LEVE', factoryReference: 'MA1234', barcode: '7891234567895', weight: '0,4', height: 0, width: 0, length: 0 },
};

describe('título sugerido', () => {
  it('converte o nome do ERP e mantém códigos', () => {
    expect(suggestTitle('FILTRO LUB PEL310 PARA GOL 1.6')).toBe('Filtro Lub PEL310 para Gol 1.6');
  });

  it('usa o código quando o nome do ERP veio vazio', () => {
    const eff = effectiveFields({ ...product, name: "'", sku: 'FILTRO OLEO PEL674' }, null, DEFAULT_SETTINGS);
    expect(eff.title).toBe('Filtro Oleo PEL674 Metal Leve');
  });

  it('acrescenta a marca quando falta e respeita 60 caracteres', () => {
    expect(suggestTitle('FILTRO AR MEGANE/SCENIC', 'METAL LEVE')).toBe('Filtro Ar Megane/Scenic Metal Leve');
    const long = suggestTitle('AMORTECEDOR DIANTEIRO LADO DIREITO ORIGINAL REFORÇADO PARA CAMINHONETE', 'COFAP');
    expect(long.length).toBeLessThanOrEqual(60);
    expect(long.endsWith(' ')).toBe(false);
  });
});

describe('preço', () => {
  it('aplica o acréscimo da loja ou o do produto', () => {
    expect(resolvedPrice(100, null, { ...DEFAULT_SETTINGS, markupPercent: 15 })).toBe(115);
    expect(resolvedPrice(100, { markupPercent: 10 }, { ...DEFAULT_SETTINGS, markupPercent: 15 })).toBe(110);
  });

  it('preço fixo ignora o acréscimo', () => {
    expect(resolvedPrice(100, { fixedPrice: 129.9, markupPercent: 50 }, DEFAULT_SETTINGS)).toBe(129.9);
  });

  it('usa o preço promocional como base', () => {
    expect(effectiveFields({ ...product, promoPrice: 60 }, null, DEFAULT_SETTINGS).price).toBe(60);
  });
});

describe('quantidade por modo de estoque', () => {
  it('só loja ignora o fornecedor', () => {
    expect(resolvedQuantity(2, { stockMode: MarketplaceStockMode.STORE_ONLY, supplierQuantity: 5 })).toBe(2);
  });

  it('loja + fornecedor soma as duas', () => {
    expect(resolvedQuantity(0, { stockMode: MarketplaceStockMode.STORE_PLUS_SUPPLIER, supplierQuantity: 5 })).toBe(5);
  });

  it('sob encomenda tem prazo de pelo menos 1 dia', () => {
    const eff = effectiveFields(product, { stockMode: MarketplaceStockMode.MADE_TO_ORDER, supplierQuantity: 3, manufacturingDays: 0 }, DEFAULT_SETTINGS);
    expect(eff.quantity).toBe(5);
    expect(eff.manufacturingDays).toBe(1);
  });
});

describe('dados vindos do Ellon', () => {
  it('preenche marca, número de peça, GTIN e peso sozinhos', () => {
    const eff = effectiveFields(product, null, DEFAULT_SETTINGS);
    expect(eff.brand).toBe('METAL LEVE');
    expect(eff.partNumber).toBe('MA1234');
    expect(eff.gtin).toBe('7891234567895');
    expect(eff.packageWeightG).toBe(400);
    expect(eff.packageHeightCm).toBeNull();
  });

  it('descarta código interno como GTIN', () => {
    expect(validGtin('12345')).toBeNull();
  });

  it('marca "Ellon" não conta como marca', () => {
    const eff = effectiveFields({ ...product, supplier: 'Ellon', specifications: {} }, null, DEFAULT_SETTINGS);
    expect(eff.brand).toBeNull();
  });
});

describe('envio ao Mercado Livre', () => {
  it('monta atributos automáticos sem repetir os do formulário', () => {
    const profile = {
      packageHeightCm: 10, packageWidthCm: 15, packageLengthCm: 20, packageWeightG: 500,
      attributes: [{ id: 'VEHICLE_TYPE', valueId: '123' }, { id: 'BRAND', valueName: 'Outra' }],
    };
    const attrs = publicationAttributes(effectiveFields(product, profile, DEFAULT_SETTINGS), product.sku, profile);
    expect(attrs.filter(attr => attr.id === 'BRAND')).toEqual([{ id: 'BRAND', valueName: 'METAL LEVE' }]);
    expect(attrs).toContainEqual({ id: 'SELLER_PACKAGE_WEIGHT', valueName: '500 g' });
    expect(attrs).toContainEqual({ id: 'VEHICLE_TYPE', valueId: '123', valueName: null });
  });

  it('inclui garantia e só manda prazo no modo sob encomenda', () => {
    const normal = saleTerms(effectiveFields(product, null, DEFAULT_SETTINGS), DEFAULT_SETTINGS);
    expect(normal.map(term => term.id)).toEqual(['WARRANTY_TYPE', 'WARRANTY_TIME']);
    const cleared = saleTerms(effectiveFields(product, null, DEFAULT_SETTINGS), DEFAULT_SETTINGS, true);
    expect(cleared).toContainEqual({ id: 'MANUFACTURING_TIME', valueName: null });
    const order = saleTerms(effectiveFields(product, { stockMode: MarketplaceStockMode.MADE_TO_ORDER, manufacturingDays: 3 }, DEFAULT_SETTINGS), DEFAULT_SETTINGS);
    expect(order).toContainEqual({ id: 'MANUFACTURING_TIME', valueName: '3 dias' });
  });
});

describe('pendências', () => {
  it('aponta o que falta e libera quando completo', () => {
    const eff = effectiveFields(product, null, DEFAULT_SETTINGS);
    const pending = readiness(eff, [], null, null).filter(check => !check.ok).map(check => check.key);
    expect(pending).toEqual(['photo', 'category', 'attributes', 'package']);

    const full = effectiveFields(product, { packageHeightCm: 10, packageWidthCm: 15, packageLengthCm: 20 }, DEFAULT_SETTINGS);
    expect(readiness(full, ['/uploads/a.jpg'], 'MLB456909', []).every(check => check.ok)).toBe(true);
  });

  it('sem estoque na loja só fica apto com fornecedor', () => {
    const eff = effectiveFields({ ...product, stock: 0 }, null, DEFAULT_SETTINGS);
    expect(readiness(eff, ['x'], 'MLB1', []).find(check => check.key === 'quantity')?.ok).toBe(false);
  });
});
