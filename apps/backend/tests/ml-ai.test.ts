jest.mock('../src/shared/utils/logger.util.js', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));

import {
  buildListingMessages,
  cleanDescription,
  fillableAttributes,
  fitTitle,
  packageSuggestion,
  parsePhotoVerdicts,
  sanitizeSuggestion,
  withoutApplied,
  type StoredSuggestion,
} from '../src/modules/marketplace/mappers/ai-listing.js';
import { qualityScore } from '../src/modules/marketplace/mappers/publication.js';
import { parseJson, readUsage } from '../src/modules/ai/fusai.client.js';
import type { CategoryAttribute } from '../src/modules/marketplace/marketplace.types.js';

const attributes: CategoryAttribute[] = [
  { id: 'BRAND', name: 'Marca', required: true, type: 'string' },
  { id: 'VEHICLE_TYPE', name: 'Tipo de veículo', required: true, type: 'list', values: [{ id: '1', name: 'Carro/Caminhonete' }, { id: '2', name: 'Moto' }] },
  { id: 'POSITION', name: 'Posição', required: false, type: 'string', values: [{ id: '10', name: 'Traseira' }] },
  { id: 'LENGTH', name: 'Comprimento', required: false, type: 'number_unit', units: ['mm', 'cm'] },
  { id: 'UNITS_PER_PACK', name: 'Unidades por pacote', required: false, type: 'number' },
  { id: 'IS_KIT', name: 'É kit', required: false, type: 'boolean', values: [{ id: '242085', name: 'Sim' }, { id: '242084', name: 'Não' }], readOnly: true },
];
const category = { id: 'MLB22709', name: 'Amortecedores' };

describe('validação da sugestão da IA', () => {
  it('aceita valores válidos e normaliza lista e medida', () => {
    const result = sanitizeSuggestion({
      titulo: 'Amortecedor Traseiro Cofap Palio',
      atributos: [
        { id: 'vehicle_type', valor: 'carro/caminhonete', fonte: 'aplicacao', confianca: 'alta' },
        { id: 'POSITION', valor_id: '10', valor: 'Traseira', fonte: 'nome', confianca: 'alta' },
        { id: 'LENGTH', valor: '350,5 mm', fonte: 'catalogo', confianca: 'media' },
        { id: 'UNITS_PER_PACK', valor: '2', fonte: 'nome', confianca: 'alta' },
      ],
      descricao: 'Amortecedor traseiro.',
    }, { attributes, category });
    expect(result.attributes).toEqual([
      { id: 'VEHICLE_TYPE', name: 'Tipo de veículo', valueId: '1', valueName: 'Carro/Caminhonete', source: 'aplicacao', confidence: 'alta' },
      { id: 'POSITION', name: 'Posição', valueId: '10', valueName: 'Traseira', source: 'nome', confidence: 'alta' },
      { id: 'LENGTH', name: 'Comprimento', valueId: null, valueName: '350.5 mm', source: 'catalogo', confidence: 'media' },
      { id: 'UNITS_PER_PACK', name: 'Unidades por pacote', valueId: null, valueName: '2', source: 'nome', confidence: 'alta' },
    ]);
    expect(result.categoryId).toBe('MLB22709');
  });

  it('descarta o que a categoria não aceita e explica o motivo', () => {
    const result = sanitizeSuggestion({
      atributos: [
        { id: 'COLOR', valor: 'Preto', confianca: 'alta' },
        { id: 'VEHICLE_TYPE', valor: 'Barco', confianca: 'alta' },
        { id: 'LENGTH', valor: '35 polegadas', confianca: 'alta' },
        { id: 'UNITS_PER_PACK', valor: 'dois', confianca: 'alta' },
        { id: 'BRAND', valor: 'Cofap', confianca: 'alta' },
        { id: 'POSITION', valor: 'Traseira', confianca: 'baixa' },
      ],
    }, { attributes, category });
    expect(result.attributes).toEqual([]);
    expect(result.discarded).toHaveLength(6);
    expect(result.discarded.join(' ')).toContain('Barco');
  });

  it('não pede à IA o que o sistema preenche sozinho nem o que é somente leitura', () => {
    expect(fillableAttributes(attributes).map(attr => attr.id)).toEqual(['VEHICLE_TYPE', 'POSITION', 'LENGTH', 'UNITS_PER_PACK']);
    const [, user] = buildListingMessages({
      product: { name: 'AMORTECEDOR', sku: 'X', brand: 'COFAP', partNumber: 'GB1', gtin: null, application: 'PALIO 98>', category: 'AMORTECEDORES', description: '', currentTitle: 'Amortecedor' },
      category, attributes, trends: ['amortecedor traseiro'], catalog: [],
    });
    expect(user.content).toContain('amortecedor traseiro');
    expect(user.content).not.toContain('"BRAND"');
  });
});

describe('texto do anúncio', () => {
  it('título em até 60 caracteres, cortado em palavra inteira', () => {
    const title = fitTitle('Amortecedor Traseiro Cofap Fiat Palio Weekend Siena Strada 1998 a 2012 Par');
    expect(title.length).toBeLessThanOrEqual(60);
    expect(title).toBe('Amortecedor Traseiro Cofap Fiat Palio Weekend Siena Strada');
  });

  it('descrição sem link, e-mail, telefone e HTML, mas com número de peça', () => {
    const text = cleanDescription('<p>Peça 0986-4521 original.</p> Fale: (42) 99999-1234, loja@ex.com, https://loja.com.br');
    expect(text).toContain('0986-4521');
    expect(text).not.toMatch(/99999|@|https|<p>/);
  });
});

describe('nota de qualidade', () => {
  it('anúncio completo chega a 100', () => {
    const result = qualityScore({ photos: 8, titleLength: 55, filledAttributes: 40, totalAttributes: 40, descriptionLength: 800, ready: true });
    expect(result.score).toBe(100);
  });

  it('aponta o que melhorar', () => {
    const result = qualityScore({ photos: 1, titleLength: 20, filledAttributes: 3, totalAttributes: 40, descriptionLength: 50, ready: false });
    expect(result.score).toBeLessThan(20);
    expect(result.tips.join(' ')).toMatch(/fotos|características|título|descrição/);
  });
});

describe('resposta da fusai', () => {
  it('usa o custo em reais que a fusai devolve', () => {
    const usage = readUsage({ prompt_tokens: 1200, completion_tokens: 300, prompt_tokens_details: { cached_tokens: 800 }, cost_brl: '0.002812' });
    expect(usage).toEqual({ inputTokens: 1200, cachedTokens: 800, outputTokens: 300, costBrl: 0.002812 });
    expect(readUsage(undefined).costBrl).toBe(0);
  });

  it('aceita JSON cercado por ```json', () => {
    const result = { content: '```json\n{"ok": true}\n```', model: 'fuse/deepseek-chat', finishReason: 'stop', usage: readUsage({}) };
    expect(parseJson<{ ok: boolean }>(result).ok).toBe(true);
  });
});

describe('medidas da embalagem', () => {
  const reference = { heightCm: 20, widthCm: 15, lengthCm: 10, weightG: 1400 };

  it('prefere as medidas completas do catálogo, convertendo unidades', () => {
    const catalog = [{ id: 'MLB1', name: 'Pastilha X', pictures: [], attributes: [
      { id: 'PACKAGE_HEIGHT', name: 'Altura', valueId: null, valueName: '5 cm' },
      { id: 'PACKAGE_WIDTH', name: 'Largura', valueId: null, valueName: '120 mm' },
      { id: 'PACKAGE_LENGTH', name: 'Comprimento', valueId: null, valueName: '0,2 m' },
      { id: 'PACKAGE_WEIGHT', name: 'Peso', valueId: null, valueName: '1.2 kg' },
    ] }];
    expect(packageSuggestion(catalog, reference, 'Pastilhas')).toMatchObject({ heightCm: 5, widthCm: 12, lengthCm: 20, weightG: 1200 });
  });

  it('sem catálogo completo, usa a referência da categoria', () => {
    const catalog = [{ id: 'MLB1', name: 'X', pictures: [], attributes: [{ id: 'PACKAGE_HEIGHT', name: 'Altura', valueId: null, valueName: '5 cm' }] }];
    expect(packageSuggestion(catalog, reference, 'Pastilhas de Freios')).toEqual({ ...reference, source: 'Referência do Mercado Livre para Pastilhas de Freios' });
    expect(packageSuggestion([], null, null)).toBeNull();
  });
});

describe('sugestão depois de aplicar', () => {
  const base: StoredSuggestion = {
    categoryId: 'MLB1', categoryName: 'Cat', title: 'Título', description: 'Desc', keywords: [], regionalNames: [], clipScript: 'roteiro',
    photoChecklist: [], notes: '', discarded: [], package: { heightCm: 1, widthCm: 1, lengthCm: 1, weightG: 1, source: 's' },
    attributes: [
      { id: 'A', name: 'A', valueId: null, valueName: '1', source: 'erp', confidence: 'alta' },
      { id: 'B', name: 'B', valueId: null, valueName: '2', source: 'erp', confidence: 'media' },
    ],
  };

  it('tira só o que foi aplicado e mantém o resto', () => {
    const { suggestion, done } = withoutApplied(base, ['title', 'attributes'], ['A']);
    expect(done).toBe(false);
    expect(suggestion.title).toBe('');
    expect(suggestion.attributes.map(attr => attr.id)).toEqual(['B']);
    expect(suggestion.description).toBe('Desc');
  });

  it('sem nada para aplicar, a sugestão termina', () => {
    expect(withoutApplied(base, ['title', 'category', 'attributes', 'description', 'package']).done).toBe(true);
  });
});

describe('conferência de fotos', () => {
  it('ignora índices fora da lista', () => {
    const verdicts = parsePhotoVerdicts({ fotos: [
      { indice: 0, mesma_peca: true, marca_dagua: false, fundo_branco: true, motivo: 'ok' },
      { indice: 5, mesma_peca: true },
    ] }, 2);
    expect(verdicts).toEqual([{ index: 0, sameProduct: true, watermark: false, whiteBackground: true, reason: 'ok' }]);
  });
});
