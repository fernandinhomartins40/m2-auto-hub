import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:m2_core/m2_core.dart';
import 'package:m2_mecanico/data/mechanic_api.dart';
import 'package:m2_mecanico/data/models.dart';
import 'package:m2_mecanico/data/providers.dart';
import 'package:m2_mecanico/features/auth/forgot_password_screen.dart';
import 'package:m2_mecanico/features/orders/plate_lookup_screen.dart';
import 'package:m2_mecanico/features/revisions/budget_screen.dart';
import 'package:m2_mecanico/features/revisions/revision_details_screen.dart';
import 'package:m2_mecanico/features/revisions/revisions_tab.dart';

/// Correções da revisão de paridade (docs/apps-nativos/PARIDADE.md), na
/// largura de um celular comum.
Future<void> _pump(
  WidgetTester tester,
  Widget screen, {
  List overrides = const [],
}) async {
  tester.view.physicalSize = const Size(412 * 2.625, 915 * 2.625);
  tester.view.devicePixelRatio = 2.625;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [...overrides],
      child: MaterialApp(theme: AppTheme.light(), home: screen),
    ),
  );
}

const _customer = CustomerRef(
  id: 'c1',
  name: 'Maria Souza',
  email: 'maria@exemplo.com',
);

class _FakeApi extends MechanicApi {
  _FakeApi() : super(Dio());

  Map<String, dynamic>? vehicleSent;

  @override
  Future<PlateLookup> lookupPlate(String plate) async => PlateLookup.fromJson({
        'found': false,
        'plate': plate,
        'technicalData': {'brand': 'Fiat', 'model': 'Uno', 'year': 2015},
      });

  @override
  Future<List<CustomerRef>> searchCustomers(String term) async => [_customer];

  @override
  Future<VehicleRef> createVehicle(
    String customerId,
    Map<String, dynamic> data,
  ) async {
    vehicleSent = {...data, 'customerId': customerId};
    return VehicleRef(
      id: 'v1',
      brand: data['brand'] as String,
      model: data['model'] as String,
      plate: data['plate'] as String,
    );
  }

  @override
  Future<Revision> revision(String id) async => Revision.fromJson({
        'id': id,
        'status': 'COMPLETED',
        'createdAt': '2026-11-01T10:00:00Z',
        'completedAt': '2026-11-02T15:00:00Z',
        'assignedAt': '2026-11-01T11:00:00Z',
        'mechanicNotes': 'Cliente pediu para guardar as peças',
        'generalNotes': 'Carro chegou com barulho',
        'recommendations': 'Trocar pastilhas em 5 mil km',
        'assignedMechanic': {
          'id': 'm2',
          'name': 'Carlos Atribuído',
          'email': 'carlos@oficina.com',
          'role': 'STAFF',
        },
        'transferHistory': [
          {
            'fromName': 'João',
            'toName': 'Carlos',
            'transferredAt': '2026-11-01T12:00:00Z',
            'reason': 'Folga',
          },
        ],
        'checklistItems': [
          {
            'itemId': 'i1',
            'itemName': 'Pastilhas',
            'categoryName': 'Freios',
            'status': 'OK',
          },
          {
            'itemId': 'i2',
            'itemName': 'Disco',
            'categoryName': 'Freios',
            'status': 'NOT_CHECKED',
          },
        ],
      });
}

/// Rola até o texto ficar na tela (os ListView já constroem tudo).
Future<void> _scrollTo(WidgetTester tester, String text) async {
  await tester.ensureVisible(find.text(text));
  await tester.pumpAndSettle();
}

void main() {
  setUpAll(() => initializeDateFormatting('pt_BR'));

  testWidgets('placa não cadastrada vincula cliente e cadastra o veículo',
      (tester) async {
    final api = _FakeApi();
    PlateLookup? result;
    await _pump(
      tester,
      Builder(
        builder: (context) => TextButton(
          onPressed: () async {
            result = await Navigator.of(context).push<PlateLookup>(
              MaterialPageRoute(builder: (_) => const PlateLookupScreen()),
            );
          },
          child: const Text('abrir'),
        ),
      ),
      overrides: [apiProvider.overrideWithValue(api)],
    );
    await tester.tap(find.text('abrir'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'ABC1D23');
    await tester.tap(find.text('Consultar'));
    await tester.pumpAndSettle();

    expect(find.text('Placa ainda não cadastrada'), findsOneWidget);
    expect(find.text('Buscar cliente existente'), findsOneWidget);
    await _scrollTo(tester, 'Maria Souza');
    await tester.tap(find.text('Maria Souza'));
    await tester.pumpAndSettle();
    expect(find.text('Cliente selecionado'), findsOneWidget);
    expect(find.text('Pronto para vincular'), findsOneWidget);

    await _scrollTo(tester, 'Cadastrar veículo com esta placa');
    await tester.tap(find.text('Cadastrar veículo com esta placa'));
    await tester.pumpAndSettle();
    expect(find.text('Cadastrar Novo Veículo'), findsOneWidget);
    // Marca, modelo e ano vêm da consulta; falta a cor.
    await tester.tap(find.text('Criar Veículo'));
    await tester.pumpAndSettle();
    expect(find.text('Cor é obrigatória'), findsOneWidget);
    expect(api.vehicleSent, isNull);

    await tester.enterText(
      find.widgetWithText(TextFormField, 'Ex: Branco, Preto, Prata'),
      'Prata',
    );
    await tester.tap(find.text('Criar Veículo'));
    await tester.pumpAndSettle();
    expect(api.vehicleSent, {
      'brand': 'Fiat',
      'model': 'Uno',
      'year': 2015,
      'plate': 'ABC1D23',
      'color': 'Prata',
      'customerId': 'c1',
    });
    expect(result?.found, isTrue);
    expect(result?.customer?.id, 'c1');
    expect(result?.vehicle?.id, 'v1');
    expect(tester.takeException(), isNull);
  });

  testWidgets('detalhes da revisão mostram o atribuído, notas e histórico',
      (tester) async {
    await _pump(
      tester,
      const RevisionDetailsScreen(revisionId: 'r1'),
      overrides: [apiProvider.overrideWithValue(_FakeApi())],
    );
    await tester.pumpAndSettle();
    expect(find.textContaining('Concluída em:'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Carlos Atribuído'), 200);
    expect(find.textContaining('Atribuído em'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Recomendações'), 200);
    expect(find.text('Observações do Mecânico:'), findsOneWidget);
    expect(find.text('Observações Gerais'), findsOneWidget);
    expect(tester.takeException(), isNull);

    await tester.scrollUntilVisible(find.text('Checklist'), -200);
    await tester.tap(find.text('Checklist'));
    await tester.pumpAndSettle();
    expect(find.text('Disco'), findsOneWidget);
    expect(find.text('Não Verificado'), findsOneWidget);

    await tester.tap(find.text('Histórico'));
    await tester.pumpAndSettle();
    expect(find.text('Histórico de Transferências'), findsOneWidget);
    expect(find.text('De João para Carlos'), findsOneWidget);
    expect(find.text('Motivo: Folga'), findsOneWidget);
    expect(find.text('Mecânico Atribuído'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('orçamento busca produto por SKU e mostra SKU e estoque',
      (tester) async {
    final revision = Revision.fromJson({'id': 'r1', 'status': 'IN_PROGRESS'});
    await _pump(
      tester,
      BudgetScreen(
        revision: revision,
        entries: const [
          CheckEntry(
            itemId: 'i1',
            itemName: 'Pastilhas',
            categoryId: 'c',
            categoryName: 'Freios',
            status: CheckStatus.attention,
            notes: '',
          ),
        ],
        mileage: 0,
        payload: const {},
      ),
      overrides: [
        productsProvider.overrideWith(
          (ref) async => const [
            CatalogProduct(
              id: 'p1',
              name: 'Pastilha dianteira',
              category: 'Freios',
              price: 120,
              stock: 3,
              sku: 'FR-123',
            ),
          ],
        ),
      ],
    );
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).first, 'fr-1');
    await tester.pumpAndSettle();
    expect(find.text('SKU FR-123 · estoque 3'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('cartão de revisão mostra o e-mail quando não há telefone',
      (tester) async {
    await _pump(
      tester,
      const RevisionsTab(),
      overrides: [
        revisionQueueProvider.overrideWith(
          (ref) async => RevisionQueue([
            Revision.fromJson({
              'id': 'r1',
              'status': 'DRAFT',
              'customer': {'id': 'c1', 'name': 'Maria', 'email': 'maria@x.com'},
            }),
          ], const []),
        ),
      ],
    );
    await tester.pumpAndSettle();
    await _scrollTo(tester, 'maria@x.com');
    expect(find.text('maria@x.com'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('recuperar senha usa o texto do botão do PWA', (tester) async {
    await _pump(tester, const ForgotPasswordScreen());
    expect(find.text('Enviar link de recuperação'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
