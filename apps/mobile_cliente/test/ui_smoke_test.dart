import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:m2_cliente/data/customer_api.dart';
import 'package:m2_cliente/data/fipe_api.dart';
import 'package:m2_cliente/data/models.dart';
import 'package:m2_cliente/data/providers.dart';
import 'package:m2_cliente/features/account/account_tab.dart';
import 'package:m2_cliente/features/account/privacy_screen.dart';
import 'package:m2_cliente/features/auth/auth_controller.dart';
import 'package:m2_cliente/features/benefits/benefits_tab.dart';
import 'package:m2_cliente/features/purchases/purchases_tab.dart';
import 'package:m2_cliente/features/purchases/quote_detail_screen.dart';
import 'package:m2_cliente/features/vehicle/revision_detail_screen.dart';
import 'package:m2_cliente/features/vehicle/vehicle_form_screen.dart';
import 'package:m2_core/m2_core.dart';

/// Renderiza as telas novas e alteradas na largura de um celular comum,
/// para pegar estouro de layout antes de abrir o app.
Future<ProviderContainer> _pump(
  WidgetTester tester,
  Widget child, {
  bool inList = true,
  List overrides = const [],
}) async {
  tester.view.physicalSize = const Size(412 * 2.625, 915 * 2.625);
  tester.view.devicePixelRatio = 2.625;
  addTearDown(tester.view.reset);
  final container = ProviderContainer.test(
    overrides: [
      tokenStorageProvider.overrideWithValue(_MemoryTokens()),
      ...overrides.cast(),
    ],
  );
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
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
  return container;
}

void main() {
  setUpAll(() => initializeDateFormatting('pt_BR'));

  testWidgets('cadastro de veículo escolhe marca, modelo e ano na FIPE',
      (tester) async {
    await _pump(
      tester,
      const VehicleFormScreen(),
      inList: false,
      overrides: [fipeApiProvider.overrideWithValue(_FakeFipe())],
    );
    await tester.pump();
    expect(find.text('Selecione a marca primeiro'), findsOneWidget);

    await tester.ensureVisible(find.text('Criar Veículo'));
    await tester.tap(find.text('Criar Veículo'));
    await tester.pump();
    expect(find.text('Marca é obrigatória'), findsOneWidget);
    expect(find.text('Placa é obrigatória'), findsOneWidget);
    expect(find.text('Cor é obrigatória'), findsOneWidget);

    Future<void> pick(String field, String option) async {
      final target = find.widgetWithText(TextFormField, field);
      await tester.ensureVisible(target);
      await tester.tap(target);
      await tester.pumpAndSettle();
      await tester.tap(find.text(option));
      await tester.pumpAndSettle();
    }

    await pick('Selecione a marca', 'Fiat');
    await pick('Selecione o modelo', 'Uno Mille 1.0');
    await pick('Selecione o ano', '2020 Gasolina');
    expect(find.text('Fiat'), findsOneWidget);
    expect(find.text('Uno Mille 1.0'), findsOneWidget);
    expect(find.text('2020 Gasolina'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('edição de veículo mantém texto livre', (tester) async {
    await _pump(
      tester,
      VehicleFormScreen(
        vehicle: Vehicle.fromJson({
          'id': 'v1',
          'brand': 'Fiat',
          'model': 'Uno',
          'year': 2020,
          'plate': 'ABC1D23',
          'color': 'Branco',
        }),
      ),
      inList: false,
    );
    expect(find.text('Salvar Alterações'), findsOneWidget);
    expect(find.text('Fiat'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('orçamento tem Exportar PDF antes das decisões', (tester) async {
    await _pump(
      tester,
      QuoteCard(
        quote: Quote.fromJson({
          'id': 'abcdef123456',
          'status': 'QUOTED',
          'total': 300,
          'items': [
            {'name': 'Troca de óleo', 'quantity': 2, 'price': 100},
          ],
        }),
      ),
    );
    expect(find.text('Exportar PDF'), findsOneWidget);
    expect(
      tester.getTopLeft(find.text('Exportar PDF')).dy,
      lessThan(tester.getTopLeft(find.text('Aprovar e Virar Pedido')).dy),
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('revisão tem Exportar PDF', (tester) async {
    await _pump(
      tester,
      RevisionDetailScreen(
        revision: Revision.fromJson({
          'id': 'r1234567890',
          'date': '2026-11-02T12:00:00.000Z',
          'status': 'COMPLETED',
          'checklistItems': const [],
        }),
      ),
      inList: false,
    );
    await tester.scrollUntilVisible(find.text('Exportar PDF'), 200);
    expect(find.text('Exportar PDF'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('pedido com rastreio mostra Rastrear e Suporte', (tester) async {
    await _pump(
      tester,
      OrderCard(
        order: Order.fromJson({
          'id': 'o1234567890',
          'status': 'SHIPPED',
          'total': 120,
          'trackingCode': 'BR123456789',
          'items': [
            {'name': 'Filtro de óleo', 'quantity': 1, 'price': 120},
          ],
        }),
      ),
    );
    expect(find.text('Ver Detalhes'), findsOneWidget);
    expect(find.text('Rastrear'), findsOneWidget);
    expect(find.text('Suporte'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('favoritos: menu Mais com compartilhar, exportar e limpar',
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
              'createdAt': '2026-11-02T12:00:00.000Z',
              'product': {'name': 'Filtro de óleo', 'salePrice': '35.90'},
            }),
          ],
        ),
      ],
    );
    await tester.pump();
    await tester.tap(find.text('Mais'));
    await tester.pumpAndSettle();
    expect(find.text('Compartilhar'), findsOneWidget);
    expect(find.text('Exportar CSV'), findsOneWidget);
    await tester.tap(find.text('Limpar Todos'));
    await tester.pumpAndSettle();
    expect(find.textContaining('remover TODOS os favoritos'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  test('CSV dos favoritos com as colunas do PWA', () {
    final csv = favoritesCsv([
      FavoriteProduct.fromJson({
        'productId': 'p1',
        'createdAt': '2026-11-02T12:00:00.000',
        'product': {
          'name': 'Óleo 5W30, sintético',
          'category': 'Óleos',
          'salePrice': '50',
          'promoPrice': '45.5',
          'stock': 3,
          'status': 'ACTIVE',
        },
      }),
    ]);
    expect(csv.split('\n'), [
      'nome,categoria,subcategoria,preco,estoque,disponivel,adicionado_em',
      '"Óleo 5W30, sintético",Óleos,,45.50,3,Sim,02/11/2026',
    ]);
  });

  testWidgets('aviso de e-mail não confirmado', (tester) async {
    await _pump(tester, const VerifyEmailBox());
    expect(find.text('Reenviar confirmação de e-mail'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('excluir conta confirma, mostra a resposta e sai da sessão',
      (tester) async {
    final api = _FakeApi();
    final container = await _pump(
      tester,
      const PrivacyCard(),
      overrides: [apiProvider.overrideWithValue(api)],
    );
    expect(find.text('Baixar meus dados'), findsOneWidget);
    await tester.ensureVisible(find.text('Excluir minha conta'));
    await tester.tap(find.text('Excluir minha conta'));
    await tester.pumpAndSettle();
    expect(find.textContaining('excluída agora'), findsOneWidget);
    await tester.tap(find.text('Excluir conta'));
    await tester.pumpAndSettle();
    expect(api.deleted, isTrue);
    expect(find.text('Conta excluída. Apagamos seus dados.'), findsOneWidget);
    expect(
      container.read(authControllerProvider).status,
      AuthStatus.unauthenticated,
    );
    expect(tester.takeException(), isNull);
  });
}

class _MemoryTokens extends TokenStorage {
  String? _token;

  @override
  Future<String?> read() async => _token;

  @override
  Future<void> write(String token) async => _token = token;

  @override
  Future<void> clear() async => _token = null;
}

class _FakeApi extends CustomerApi {
  _FakeApi() : super(Dio());

  bool deleted = false;

  @override
  Future<String> deleteAccount() async {
    deleted = true;
    return 'Conta excluída. Apagamos seus dados.';
  }
}

class _FakeFipe extends FipeApi {
  @override
  Future<List<FipeOption>> brands() async =>
      const [FipeOption('21', 'Fiat'), FipeOption('22', 'Ford')];

  @override
  Future<List<FipeOption>> models(String brand) async =>
      const [FipeOption('1', 'Uno Mille 1.0')];

  @override
  Future<List<FipeOption>> years(String brand, String model) async =>
      const [FipeOption('2020-1', '2020 Gasolina')];
}
