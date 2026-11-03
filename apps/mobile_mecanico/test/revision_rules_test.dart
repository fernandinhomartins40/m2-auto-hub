import 'package:flutter_test/flutter_test.dart';
import 'package:m2_mecanico/data/models.dart';
import 'package:m2_mecanico/data/revision_rules.dart';

const _catalog = [
  CatalogCategory(
    id: 'c1',
    name: 'Freios',
    items: [
      CatalogItem(id: 'i1', name: 'Pastilhas'),
      CatalogItem(id: 'i2', name: 'Discos'),
    ],
  ),
];

CheckEntry _entry(String id, CheckStatus status, {String notes = ''}) {
  return CheckEntry(
    itemId: id,
    itemName: 'Item $id',
    categoryId: 'c1',
    categoryName: 'Freios',
    status: status,
    notes: notes,
  );
}

void main() {
  group('mergeCatalog', () {
    test('completa o catálogo sem mexer no que já foi avaliado', () {
      final merged = mergeCatalog(
        [_entry('i1', CheckStatus.critical, notes: 'Gasta')],
        _catalog,
      );
      expect(merged, hasLength(2));
      expect(merged.first.status, CheckStatus.critical);
      expect(merged.first.notes, 'Gasta');
      expect(merged.last.itemId, 'i2');
      expect(merged.last.status, CheckStatus.notChecked);
    });

    test('preserva item que saiu do catálogo', () {
      final merged = mergeCatalog([_entry('antigo', CheckStatus.ok)], _catalog);
      expect(merged.map((e) => e.itemId), contains('antigo'));
      expect(merged, hasLength(3));
    });
  });

  test('progresso conta o que não é NOT_CHECKED', () {
    final progress = ChecklistProgress.of([
      _entry('1', CheckStatus.ok),
      _entry('2', CheckStatus.notApplicable),
      _entry('3', CheckStatus.notChecked),
      _entry('4', CheckStatus.notChecked),
    ]);
    expect(progress.checked, 2);
    expect(progress.notChecked, 2);
    expect(progress.ratio, 0.5);
    expect(ChecklistProgress.of(const []).ratio, 0);
  });

  test('status desconhecido não vira avaliação', () {
    expect(CheckStatus.parse('NOVO'), CheckStatus.notChecked);
    expect(CheckStatus.parse('ATTENTION').isProblem, isTrue);
    expect(CheckStatus.parse('OK').isProblem, isFalse);
  });

  test('checklist serializa como o painel web e omite nota vazia', () {
    final json = _entry('i1', CheckStatus.ok).toJson();
    expect(json['status'], 'OK');
    expect(json['photos'], isEmpty);
    expect(json.containsKey('notes'), isFalse);
  });

  group('buildRevisionOrder', () {
    final revision = Revision.fromJson({
      'id': 'r1',
      'customerId': 'cust',
      'vehicleId': 'veh',
      'status': 'IN_PROGRESS',
      'assignedMechanicId': 'mec',
      'customer': {'id': 'cust', 'name': 'João', 'phone': '11999999999'},
      'vehicle': {'id': 'veh', 'brand': 'VW', 'model': 'Gol', 'plate': 'ABC1D23'},
    });

    test('liga a linha da OS ao item avaliado e descreve o checklist', () {
      final body = buildRevisionOrder(
        revision: revision,
        entries: [
          _entry('i1', CheckStatus.critical, notes: 'Gasta'),
          _entry('i2', CheckStatus.notChecked),
        ],
        lines: const [
          BudgetLine(
            originItemId: 'i1',
            item: OrderItem(
              type: 'SERVICE',
              name: 'Troca',
              unitPrice: 120.5,
              quantity: 2,
            ),
          ),
        ],
        checkIds: const {'i1': 'check-1'},
        mileage: 45100,
      );
      final items = body['items'] as List;
      expect(items.single['revisionCheckId'], 'check-1');
      expect(items.single['unitPrice'], 120.5);
      expect(body['revisionId'], 'r1');
      expect(body['assignedMechanicId'], 'mec');
      expect(body['vehicleLabel'], 'VW Gol');
      expect(body['description'], contains('Item i1 — CRITICAL: Gasta'));
      expect(body['description'], contains('1 item(ns) não avaliado(s)'));
    });

    test('quilometragem zero vai como ausente, sem itens é aceito', () {
      final body = buildRevisionOrder(
        revision: revision,
        entries: [_entry('i1', CheckStatus.ok)],
        lines: const [],
        checkIds: const {},
        mileage: 0,
      );
      expect(body['mileage'], isNull);
      expect(body['items'], isEmpty);
    });
  });

  test('checks salvos mapeiam por itemId, com nome como reserva', () {
    final ids = revisionCheckIds({
      'checks': [
        {'id': 'a', 'itemId': 'i1', 'itemName': 'X'},
        {'id': 'b', 'itemId': null, 'itemName': 'Livre'},
      ],
    });
    expect(ids, {'i1': 'a', 'Livre': 'b'});
  });

  group('ordem de serviço', () {
    final order = ServiceOrder.fromJson({
      'id': 'o1',
      'number': 12,
      'status': 'OPEN',
      'customerName': 'João da Silva',
      'vehicleLabel': 'Volkswagen Gol',
      'vehiclePlate': 'ABC1D23',
      'laborTotal': '120.5',
      'partsTotal': '0',
      'discount': '0',
      'total': '120.5',
      'items': [
        {'type': 'SERVICE', 'name': 'Troca', 'unitPrice': '120.5', 'quantity': 1},
      ],
    });

    test('lê Decimal como string', () {
      expect(order.total, 120.5);
      expect(order.items.single.subtotal, 120.5);
      expect(order.isOpen, isTrue);
    });

    test('busca por número, cliente sem acento e placa', () {
      expect(order.matches('12'), isTrue);
      expect(order.matches('joao'), isTrue);
      expect(order.matches('abc1'), isTrue);
      expect(order.matches('fiat'), isFalse);
    });
  });

  test('item além do estoque é sinalizado', () {
    const product = CatalogProduct(
      id: 'p1',
      name: 'Óleo',
      category: 'Lubrificantes',
      price: 50,
      stock: 2,
    );
    expect(product.toItem().copyWith(quantity: 3).exceedsStock, isTrue);
    expect(product.toItem().copyWith(quantity: 2).exceedsStock, isFalse);
  });

  test('produto usa preço promocional quando existe', () {
    expect(
      CatalogProduct.fromJson({
        'id': 'p',
        'salePrice': '659.9',
        'promoPrice': '599.9',
      }).price,
      599.9,
    );
    expect(
      CatalogProduct.fromJson({'id': 'p', 'salePrice': '10'}).price,
      10,
    );
  });

  test('consulta de placa aceita whatsapp como telefone', () {
    final lookup = PlateLookup.fromJson({
      'found': true,
      'plate': 'ABC1D23',
      'customer': {'id': 'c', 'name': 'João', 'whatsapp': '11987654321'},
      'vehicle': {'id': 'v', 'brand': 'VW', 'model': 'Gol', 'plate': 'ABC1D23'},
    });
    expect(lookup.customer?.phone, '11987654321');
    expect(lookup.vehicle?.label, 'VW Gol');
  });

  test('preferências preservam o que o app não exibe', () {
    final saved = const Preferences({
      'notifications': {'emailNotifications': false, 'newRevisionAssigned': true},
      'display': {'theme': 'dark'},
    }).withFlag('emailNotifications', true);
    expect(saved.flag('emailNotifications'), isTrue);
    expect(saved.flag('newRevisionAssigned'), isTrue);
    expect(saved.raw['display'], {'theme': 'dark'});
  });

  test('só STAFF abre o app', () {
    Mechanic build(String role) =>
        Mechanic.fromJson({'id': '1', 'role': role});
    expect(build('STAFF').isMechanic, isTrue);
    expect(build('MANAGER').isMechanic, isFalse);
  });
}
