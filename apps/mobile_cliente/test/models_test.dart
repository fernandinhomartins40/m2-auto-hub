import 'package:flutter_test/flutter_test.dart';
import 'package:m2_cliente/data/models.dart';
import 'package:m2_core/m2_core.dart';

/// Amostras copiadas das respostas reais da API.
void main() {
  test('cliente: Decimal como string e endereços', () {
    final customer = Customer.fromJson({
      'id': 'c1',
      'name': 'João Silva',
      'email': 'joao@email.com',
      'phone': '11987654321',
      'level': 'GOLD',
      'totalSpent': '4500',
      'addresses': [
        {
          'id': 'a1',
          'type': 'HOME',
          'street': 'Rua da Paz',
          'number': '794',
          'complement': null,
          'neighborhood': 'Centro',
          'city': 'São Paulo',
          'state': 'SP',
          'zipCode': '18297598',
          'isDefault': true,
        },
      ],
    });
    expect(customer.firstName, 'João');
    expect(customer.levelLabel, 'Ouro');
    expect(customer.addresses.single.line, contains('São Paulo/SP'));
  });

  test('revisão conta itens por status sem tratar não avaliado como problema', () {
    final revision = Revision.fromJson({
      'id': 'r1',
      'date': '2026-11-02T12:00:00.000Z',
      'mileage': 45100,
      'status': 'COMPLETED',
      'checklistItems': [
        {
          'itemName': 'Pastilhas',
          'categoryName': 'Freios',
          'status': 'CRITICAL',
          'notes': 'Pastilha gasta',
        },
        {'itemName': 'Discos', 'categoryName': 'Freios', 'status': 'OK'},
        {'itemName': 'Molas', 'categoryName': 'Suspensão', 'status': 'NOT_CHECKED'},
      ],
    });
    expect(revision.countOf('CRITICAL'), 1);
    expect(revision.checks.where((check) => check.evaluated), hasLength(2));
    expect(revision.statusView.$1, 'Concluída');
  });

  test('orçamento só pede decisão quando foi orçado e usa o preço orçado', () {
    final quote = Quote.fromJson({
      'id': 'abcdef123456',
      'status': 'QUOTED',
      'total': 300,
      'items': [
        {'name': 'Troca de óleo', 'quantity': 2, 'price': 100, 'quotedPrice': 150},
      ],
    });
    expect(quote.awaitsApproval, isTrue);
    expect(quote.items.single.unitPrice, 150);
    expect(quote.shortId, 'ABCDEF12');
    expect(Quote.fromJson({'id': 'x', 'status': 'APPROVED'}).awaitsApproval, isFalse);
  });

  test('pedido sem status conhecido cai em pendente', () {
    expect(Order.fromJson({'id': '1', 'status': 'PREPARING'}).statusView.$1, 'Preparando');
    expect(Order.fromJson({'id': '1', 'status': 'NOVO'}).statusView.$1, 'Pendente');
  });

  test('agendamento só cancela antes do atendimento', () {
    Appointment build(String status) =>
        Appointment.fromJson({'id': '1', 'status': status});
    expect(build('REQUESTED').canCancel, isTrue);
    expect(build('SCHEDULED').canCancel, isTrue);
    expect(build('IN_SERVICE').canCancel, isFalse);
  });

  test('favorito sem produto não quebra a lista e resolve imagem relativa', () {
    expect(
      FavoriteProduct.fromJson({'productId': 'p1'}).name,
      'Produto indisponível',
    );
    expect(imageUrlFrom('https://a.com/x.jpg'), 'https://a.com/x.jpg');
    expect(imageUrlFrom('/uploads/x.jpg'), '${Env.apiOrigin}/uploads/x.jpg');
  });

  test('cupom percentual e fixo', () {
    expect(
      Coupon.fromJson({
        'id': '1',
        'discountType': 'PERCENTAGE',
        'discountValue': '10',
      }).discountLabel,
      '10% de desconto',
    );
  });

  test('contatos do suporte', () {
    final contacts = SupportContacts.fromJson({
      'contacts': {
        'whatsapp': {'number': '5511999999999', 'message': 'Olá'},
        'email': 'contato@m2centerauto.com.br',
        'phone': '(11) 99999-9999',
      },
      'businessHours': {
        'weekdays': {'label': 'Segunda a Sexta', 'hours': '8h às 18h'},
      },
    });
    expect(contacts.whatsapp, '5511999999999');
    expect(contacts.hours, ['Segunda a Sexta: 8h às 18h']);
  });

  test('mensagem do atendimento identifica o autor', () {
    expect(
      TicketMessage.fromJson({'id': '1', 'senderType': 'CUSTOMER'}).fromCustomer,
      isTrue,
    );
    expect(
      TicketMessage.fromJson({'id': '1', 'senderType': 'admin'}).fromCustomer,
      isFalse,
    );
  });
}
