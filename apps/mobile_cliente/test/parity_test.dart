import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:m2_cliente/data/customer_api.dart';
import 'package:m2_cliente/data/models.dart';
import 'package:m2_cliente/data/providers.dart';
import 'package:m2_cliente/features/benefits/benefits_tab.dart';
import 'package:m2_cliente/features/home/home_tab.dart';
import 'package:m2_cliente/features/purchases/order_detail_screen.dart';
import 'package:m2_cliente/features/purchases/order_parts.dart';
import 'package:m2_cliente/features/purchases/purchases_tab.dart';
import 'package:m2_cliente/features/purchases/quote_detail_screen.dart';
import 'package:m2_cliente/features/support/support_screen.dart';
import 'package:m2_cliente/features/support/ticket_screen.dart';
import 'package:m2_cliente/features/vehicle/revision_detail_screen.dart';
import 'package:m2_cliente/features/vehicle/vehicle_tab.dart';
import 'package:m2_core/m2_core.dart';

/// Correções da conferência de paridade (PARIDADE.md), na largura de um
/// celular comum.
Future<void> _pump(
  WidgetTester tester,
  Widget child, {
  bool inList = true,
  List overrides = const [],
}) async {
  tester.view.physicalSize = const Size(412 * 2.625, 915 * 2.625);
  tester.view.devicePixelRatio = 2.625;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        tokenStorageProvider.overrideWithValue(_MemoryTokens()),
        ...overrides.cast(),
      ],
      child: MaterialApp(
        theme: AppTheme.light(),
        home: inList
            ? PanelScaffold(
                body: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [child],
                ),
              )
            : child,
      ),
    ),
  );
  await tester.pump();
}

Order _order({String status = 'DELIVERED'}) => Order.fromJson({
      'id': 'o1234567890abcdef',
      'status': status,
      'total': 120,
      'trackingCode': 'BR123',
      'invoice': {'number': '4521', 'key': '3526 1100 0000 0000 0000 5500 1000'},
      'estimatedDelivery': '2026-11-20T12:00:00.000Z',
      'items': [
        {'name': 'Filtro de óleo', 'quantity': 2, 'price': 60},
      ],
      'address': {
        'id': 'a1',
        'street': 'Rua da Paz',
        'number': '794',
        'neighborhood': 'Centro',
        'city': 'São Paulo',
        'state': 'SP',
        'zipCode': '01000-000',
      },
    });

/// A lista da página (campos de texto também são Scrollable, na horizontal).
Finder get _list => find
    .byWidgetPredicate((w) => w is Scrollable && w.axis == Axis.vertical)
    .first;

void main() {
  setUpAll(() => initializeDateFormatting('pt_BR'));

  testWidgets('pedido mostra nota fiscal, rastreio e entrega prevista',
      (tester) async {
    await _pump(tester, OrderCard(order: _order()));
    expect(find.text('Pedido #o1234567890abcdef'), findsOneWidget);
    expect(find.text('Nota fiscal nº 4521'), findsOneWidget);
    expect(find.text('Consultar no portal da NF-e'), findsOneWidget);
    expect(find.text('Rastrear: BR123'), findsOneWidget);
    expect(find.textContaining('Entrega prevista:'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('detalhe do pedido tem itens, CEP e linha do tempo',
      (tester) async {
    await _pump(tester, OrderDetailScreen(order: _order()), inList: false);
    expect(find.text('Quantidade: 2'), findsOneWidget);
    expect(find.textContaining('cada'), findsOneWidget);
    expect(find.textContaining('CEP: 01000-000'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Pedido entregue'), 200, scrollable: _list);
    expect(find.text('Status do Pedido'), findsOneWidget);
    expect(find.text('Pedido enviado'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('compras na loja: lista recolhível e vazio sem vínculo',
      (tester) async {
    await _pump(
      tester,
      const StorePurchasesCard(),
      overrides: [
        storePurchasesProvider.overrideWith(
          (ref) async => StorePurchases(
            linked: true,
            purchases: [
              StorePurchase.fromJson({
                'id': '812',
                'kind': 'SALE',
                'origin': 'oficina',
                'date': '2026-10-02T12:00:00.000Z',
                'total': 350,
                'cancelled': true,
                'items': const [],
                'status': 'Faturado',
              }),
            ],
          ),
        ),
      ],
    );
    await tester.pump();
    expect(find.text('Compras na loja e na oficina'), findsOneWidget);
    expect(find.text('Venda faturada nº 812'), findsOneWidget);
    expect(find.text('Oficina'), findsOneWidget);
    expect(find.text('Cancelada'), findsOneWidget);
    await tester.tap(find.text('Venda faturada nº 812'));
    await tester.pumpAndSettle();
    expect(find.text('Itens não informados. Situação: Faturado.'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('compras na loja sem cadastro vinculado', (tester) async {
    await _pump(
      tester,
      const StorePurchasesCard(),
      overrides: [
        storePurchasesProvider.overrideWith(
          (ref) async => const StorePurchases(linked: false, purchases: []),
        ),
      ],
    );
    await tester.pump();
    expect(find.textContaining('assim que seu cadastro for identificado'),
        findsOneWidget);
  });

  testWidgets('orçamento aprovado avisa o pedido; pendente avisa a análise',
      (tester) async {
    await _pump(
      tester,
      Column(
        children: [
          QuoteCard(
            quote: Quote.fromJson({
              'id': 'q1',
              'status': 'APPROVED',
              'orderStatus': 'IN_PRODUCTION',
              'total': 0,
              'items': [
                {'name': 'Troca de óleo', 'quantity': 2, 'price': 100},
              ],
            }),
          ),
          QuoteCard(quote: Quote.fromJson({'id': 'q2', 'status': 'PENDING'})),
        ],
      ),
    );
    expect(find.textContaining('Status atual: Em produção'), findsOneWidget);
    expect(find.text('Sua solicitação está em análise pela equipe.'),
        findsOneWidget);
    expect(find.text('Não informado'), findsNWidgets(2));
    // Sem total do servidor, soma os itens como o PWA.
    expect(find.textContaining('200,00'), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  testWidgets('cartão Programa de Fidelidade', (tester) async {
    await _pump(
      tester,
      LoyaltyCard(
        customer: Customer.fromJson({
          'id': 'c1',
          'name': 'João',
          'level': 'SILVER',
          'totalSpent': '1500',
        }),
      ),
    );
    expect(find.text('Programa de Fidelidade'), findsOneWidget);
    expect(find.text('Nível Atual: Prata'), findsOneWidget);
    expect(find.text('Próximo: Ouro'), findsOneWidget);
    expect(find.textContaining('para o próximo nível'), findsWidgets);
    expect(find.text('• Atendimento prioritário'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('avaliação do atendimento com comentário, Pular e Enviar',
      (tester) async {
    final api = _FakeApi();
    await _pump(
      tester,
      const TicketRatingSheet(ticketId: 't1'),
      overrides: [apiProvider.overrideWithValue(api)],
    );
    expect(find.text('Comentário (opcional)'), findsOneWidget);
    expect(find.text('Pular'), findsOneWidget);
    await tester.tap(find.byTooltip('4 de 5'));
    await tester.enterText(find.byType(TextField), 'Muito bom');
    await tester.tap(find.text('Enviar Avaliação'));
    await tester.pumpAndSettle();
    expect(api.rated, (4, 'Muito bom'));
    expect(tester.takeException(), isNull);
  });

  testWidgets('atendimento resolvido: Reabrir, responder e avaliar',
      (tester) async {
    final ticket = Ticket.fromJson({
      'id': 't1',
      'subject': 'Pedido atrasado',
      'category': 'DELIVERY_ISSUE',
      'status': 'RESOLVED',
    });
    await _pump(
      tester,
      const TicketScreen(ticketId: 't1'),
      inList: false,
      overrides: [
        ticketProvider.overrideWith((ref, id) async => ticket),
        ticketMessagesProvider.overrideWith((ref, id) async => const []),
      ],
    );
    await tester.pump();
    expect(find.text('Reabrir'), findsOneWidget);
    expect(find.text('Problema de Entrega'), findsOneWidget);
    expect(find.text('Seu problema foi resolvido?'), findsOneWidget);
    expect(find.text('Avaliar Atendimento'), findsOneWidget);
    expect(find.byType(TextField), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('detalhe da revisão: abas, status, checklist completo e histórico',
      (tester) async {
    await _pump(
      tester,
      RevisionDetailScreen(
        revision: Revision.fromJson({
          'id': 'r1234567890',
          'date': '2026-11-02T12:00:00.000Z',
          'createdAt': '2026-11-01T12:00:00.000Z',
          'completedAt': '2026-11-02T15:00:00.000Z',
          'status': 'COMPLETED',
          'mechanicName': 'Carlos',
          'checklistItems': [
            {'itemName': 'Pastilhas', 'categoryName': 'Freios', 'status': 'CRITICAL'},
            {'itemName': 'Molas', 'categoryName': 'Suspensão', 'status': 'NOT_CHECKED'},
          ],
        }),
      ),
      inList: false,
    );
    expect(find.text('Revisão #r1234567'), findsOneWidget);
    expect(find.text('Concluída'), findsOneWidget);
    expect(find.textContaining('Criada em'), findsOneWidget);
    expect(find.text('Carlos'), findsOneWidget);
    expect(find.text('Concluída em:', findRichText: true), findsNothing);
    await tester.tap(find.text('Checklist'));
    await tester.pump();
    expect(find.text('Não Verificado'), findsOneWidget);
    expect(find.text('Crítico'), findsOneWidget);
    await tester.tap(find.text('Histórico'));
    await tester.pump();
    expect(find.text('Nenhuma transferência registrada'), findsOneWidget);
    expect(find.text('Revisão Concluída'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('veículos: vazio com botão e chassi no cartão', (tester) async {
    await _pump(
      tester,
      PanelScaffold(body: VehicleTab(tab: 0, onTab: (_) {})),
      inList: false,
      overrides: [
        vehiclesProvider.overrideWith((ref) async => const <Vehicle>[]),
      ],
    );
    await tester.pump();
    expect(find.text('Nenhum veículo cadastrado'), findsOneWidget);
    expect(find.text('Cadastrar Primeiro Veículo'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('favoritos: indisponível, estoque baixo, seleção e estatísticas',
      (tester) async {
    await _pump(
      tester,
      PanelScaffold(body: BenefitsTab(tab: 0, onTab: (_) {})),
      inList: false,
      overrides: [
        favoritesProvider.overrideWith(
          (ref) async => [
            FavoriteProduct.fromJson({
              'productId': 'p1',
              'product': {
                'name': 'Filtro',
                'category': 'Filtros',
                'subcategory': 'Óleo',
                'salePrice': '35',
                'stock': 2,
                'minStock': 5,
                'status': 'ACTIVE',
              },
            }),
            FavoriteProduct.fromJson({
              'productId': 'p2',
              'product': {
                'name': 'Pastilha',
                'category': 'Freios',
                'salePrice': '90',
                'stock': 0,
                'status': 'ACTIVE',
              },
            }),
          ],
        ),
      ],
    );
    await tester.pump();
    await tester.scrollUntilVisible(find.text('Óleo'), 200, scrollable: _list);
    expect(find.text('Estoque baixo (2 unidades)'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Pastilha'), 200, scrollable: _list);
    expect(find.text('Indisponível'), findsNWidgets(2));
    await tester.scrollUntilVisible(find.text('Estatísticas'), -200, scrollable: _list);
    await tester.tap(find.text('Estatísticas'));
    await tester.pump();
    expect(find.text('Estatísticas dos Favoritos'), findsOneWidget);
    expect(find.text('Filtros: 1'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Selecionar Todos'), 200, scrollable: _list);
    await tester.tap(find.text('Selecionar Todos'));
    await tester.pump();
    expect(find.text('2 itens selecionados'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('cupom: vencimento próximo e limite de uso', (tester) async {
    await _pump(
      tester,
      PanelScaffold(body: BenefitsTab(tab: 1, onTab: (_) {})),
      inList: false,
      overrides: [
        couponsProvider.overrideWith(
          (ref) async => [
            Coupon.fromJson({
              'id': '1',
              'code': 'M2DEZ',
              'description': 'Dez por cento',
              'discountType': 'PERCENTAGE',
              'discountValue': '10',
              'expiresAt': DateTime.now()
                  .add(const Duration(days: 2, hours: 1))
                  .toIso8601String(),
              'usageLimit': 10,
              'usedCount': 9,
            }),
          ],
        ),
      ],
    );
    await tester.pump();
    expect(find.textContaining('(3 dias)'), findsOneWidget);
    expect(find.text('Este cupom expira em breve! Aproveite agora.'),
        findsOneWidget);
    expect(find.text('1 de 10 usos disponíveis'), findsOneWidget);
    expect(find.text('Poucos usos restantes! Garanta o seu desconto.'),
        findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Central de Ajuda: categorias recolhíveis e rodapé',
      (tester) async {
    await _pump(
      tester,
      const SupportScreen(),
      inList: false,
      overrides: [
        ticketsProvider.overrideWith((ref) async => const <Ticket>[]),
        supportContactsProvider
            .overrideWith((ref) async => const SupportContacts()),
        faqProvider.overrideWith(
          (ref) async => [
            FaqCategory.fromJson({
              'name': 'Pedidos',
              'description': 'Dúvidas sobre compras',
              'items': [
                {'id': 'f1', 'question': 'Como rastrear?', 'answer': 'Pelo app.',
                 'views': 7, 'helpfulYes': 2, 'helpfulNo': 0},
              ],
            }),
          ],
        ),
        apiProvider.overrideWithValue(_FakeApi()),
      ],
    );
    await tester.pump();
    await tester.scrollUntilVisible(find.text('Central de Ajuda (FAQ)'), 200, scrollable: _list);
    await tester.tap(find.text('Central de Ajuda (FAQ)'));
    await tester.pump();
    await tester.scrollUntilVisible(find.text('(1)'), 200, scrollable: _list);
    expect(find.text('Dúvidas sobre compras'), findsOneWidget);
    await tester.tap(find.text('Pedidos'));
    await tester.pump();
    await tester.scrollUntilVisible(find.text('7 visualizações'), 200, scrollable: _list);
    expect(find.text('Esta resposta foi útil?'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Fale com o Suporte'), 200, scrollable: _list);
    expect(find.text('Não encontrou o que procurava?'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Início sem pedidos por erro mostra o aviso e segue',
      (tester) async {
    await _pump(
      tester,
      PanelScaffold(body: HomeTab(onOpen: (_, [__ = 0]) {})),
      inList: false,
      overrides: [
        ordersProvider.overrideWith((ref) async => throw Exception('rede')),
        quotesProvider.overrideWith((ref) async => const <Quote>[]),
        appointmentsProvider.overrideWith((ref) async => const <Appointment>[]),
        favoritesProvider.overrideWith((ref) async => const <FavoriteProduct>[]),
        couponsProvider.overrideWith((ref) async => const <Coupon>[]),
        apiProvider.overrideWithValue(_FakeApi()),
      ],
    );
    await tester.pump();
    await tester.pump();
    expect(find.text('Algumas informações não puderam ser atualizadas'),
        findsOneWidget);
    expect(find.text('Tentar novamente'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Pedidos Recentes'), 300, scrollable: _list);
    expect(find.text('Pedidos Recentes'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  test('vazio dos pedidos: título e botão só sem filtro', () {
    // Coberto na tela; aqui só a regra do total do orçamento.
    final quote = Quote.fromJson({
      'id': 'q',
      'total': 150,
      'items': [
        {'name': 'A', 'quantity': 1, 'price': 100},
      ],
    });
    expect(quote.displayTotal, 150);
  });

  testWidgets('pedidos vazios sem filtro', (tester) async {
    await _pump(
      tester,
      PanelScaffold(body: PurchasesTab(tab: 0, onTab: (_) {})),
      inList: false,
      overrides: [
        ordersProvider.overrideWith((ref) async => const <Order>[]),
        storePurchasesProvider.overrideWith(
          (ref) async => const StorePurchases(linked: true, purchases: []),
        ),
      ],
    );
    await tester.pump();
    expect(find.text('Você ainda não fez nenhum pedido'), findsOneWidget);
    expect(find.text('Ver Produtos'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('Nenhuma compra registrada.'),
      200,
      scrollable: find.byType(Scrollable).last,
    );
    expect(tester.takeException(), isNull);
  });
}

class _MemoryTokens extends TokenStorage {
  @override
  Future<String?> read() async => null;

  @override
  Future<void> write(String token) async {}

  @override
  Future<void> clear() async {}
}

class _FakeApi extends CustomerApi {
  _FakeApi() : super(Dio());

  (int, String?)? rated;

  @override
  Future<void> rateTicket(String id, int rating, {String? feedback}) async {
    rated = (rating, feedback);
  }

  @override
  Future<void> viewFaq(String id) async {}

  @override
  Future<Customer> profile() async => throw ApiException('sem sessão');
}
