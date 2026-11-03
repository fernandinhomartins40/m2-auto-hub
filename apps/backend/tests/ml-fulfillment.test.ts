import { MarketplaceFulfillmentStage as Stage } from '@prisma/client';
import { allocate, isOpen, needsSupplier, nextStage } from '../src/modules/marketplace/mappers/fulfillment.js';

describe('divisão entre loja e fornecedor', () => {
  it('usa a prateleira primeiro e o resto vem do fornecedor', () => {
    const items = allocate(
      [{ productId: 'p1', title: 'Filtro', quantity: 3 }],
      new Map([['p1', 1]]),
      new Map([['p1', 'Distribuidora X']])
    );
    expect(items[0]).toMatchObject({ fromStore: 1, fromSupplier: 2, supplier: 'Distribuidora X' });
    expect(needsSupplier(items)).toBe(true);
  });

  it('itens repetidos do mesmo produto dividem o mesmo estoque', () => {
    const items = allocate(
      [{ productId: 'p1', title: 'A', quantity: 2 }, { productId: 'p1', title: 'A', quantity: 2 }],
      new Map([['p1', 3]])
    );
    expect(items.map(item => [item.fromStore, item.fromSupplier])).toEqual([[2, 0], [1, 1]]);
  });

  it('estoque negativo conta como zero', () => {
    const [item] = allocate([{ productId: 'p1', title: 'A', quantity: 1 }], new Map([['p1', -2]]));
    expect(item.fromSupplier).toBe(1);
  });

  it('item sem produto no M2 fica para a loja conferir', () => {
    const [item] = allocate([{ productId: null, title: 'A', quantity: 2 }], new Map());
    expect(item).toMatchObject({ fromStore: 2, fromSupplier: 0 });
  });
});

describe('etapa da venda', () => {
  it('venda paga entra para separar ou aguardar fornecedor', () => {
    expect(nextStage(null, 'paid', 'ready_to_ship', false)).toBe(Stage.TO_PICK);
    expect(nextStage(null, 'paid', 'ready_to_ship', true)).toBe(Stage.AWAITING_SUPPLIER);
  });

  it('pagamento pendente aguarda', () => {
    expect(nextStage(null, 'payment_in_process', null, false)).toBe(Stage.AWAITING_PAYMENT);
  });

  it('mantém a etapa marcada na loja enquanto o envio não sai', () => {
    expect(nextStage(Stage.READY_TO_SHIP, 'paid', 'ready_to_ship', false)).toBe(Stage.READY_TO_SHIP);
  });

  it('envio despachado e entregue avançam sozinhos', () => {
    expect(nextStage(Stage.READY_TO_SHIP, 'paid', 'shipped', false)).toBe(Stage.SHIPPED);
    expect(nextStage(Stage.SHIPPED, 'paid', 'delivered', false)).toBe(Stage.DELIVERED);
    expect(nextStage(Stage.SHIPPED, 'paid', 'ready_to_ship', false)).toBe(Stage.SHIPPED);
  });

  it('cancelamento prevalece e etapas finais não voltam', () => {
    expect(nextStage(Stage.TO_PICK, 'cancelled', 'ready_to_ship', false)).toBe(Stage.CANCELLED);
    expect(nextStage(Stage.CANCELLED, 'paid', 'ready_to_ship', false)).toBe(Stage.CANCELLED);
    expect(nextStage(Stage.DELIVERED, 'cancelled', null, false)).toBe(Stage.DELIVERED);
  });

  it('só etapas de separação contam como abertas', () => {
    expect(isOpen(Stage.AWAITING_SUPPLIER)).toBe(true);
    expect(isOpen(Stage.SHIPPED)).toBe(false);
  });
});
