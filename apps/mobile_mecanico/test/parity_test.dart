import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:m2_core/m2_core.dart';
import 'package:m2_mecanico/data/mechanic_api.dart';
import 'package:m2_mecanico/data/models.dart';
import 'package:m2_mecanico/data/providers.dart';
import 'package:m2_mecanico/features/orders/plate_lookup_screen.dart';
import 'package:m2_mecanico/features/revisions/revision_details_screen.dart';

/// Telas inteiras na largura de um celular comum, como em `ui_smoke_test`.
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

class _NoToken extends TokenStorage {
  @override
  Future<String?> read() async => null;
}

class _FakeApi extends MechanicApi {
  _FakeApi() : super(Dio());

  @override
  Future<Revision> revision(String id) async =>
      Revision.fromJson({'id': id, 'status': 'IN_PROGRESS'});
}

void main() {
  testWidgets('câmera negada vira mensagem e a placa segue digitável',
      (tester) async {
    await _pump(
      tester,
      PlateLookupScreen(
        pickPhoto: () async =>
            throw PlatformException(code: 'camera_access_denied'),
      ),
    );
    await tester.tap(find.text('Fotografar a placa'));
    await tester.pump();
    expect(
      find.textContaining('Não foi possível acessar a câmera'),
      findsOneWidget,
    );
    final field = tester.widget<TextField>(find.byType(TextField));
    expect(field.enabled, isTrue);
    expect(tester.takeException(), isNull);
  });

  testWidgets('fechar a câmera sem foto não mostra erro', (tester) async {
    await _pump(tester, PlateLookupScreen(pickPhoto: () async => null));
    await tester.tap(find.text('Fotografar a placa'));
    await tester.pump();
    expect(
      find.textContaining('Não foi possível acessar a câmera'),
      findsNothing,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('detalhes da revisão pede o PDF com POST na rota do mecânico',
      (tester) async {
    RequestOptions? sent;
    final dio = Dio()
      ..interceptors.add(InterceptorsWrapper(
        onRequest: (options, handler) {
          sent = options;
          // Sem plugin de compartilhamento no teste: para no 403.
          handler.reject(DioException(
            requestOptions: options,
            type: DioExceptionType.badResponse,
            response: Response(requestOptions: options, statusCode: 403),
          ));
        },
      ));
    await _pump(
      tester,
      const RevisionDetailsScreen(revisionId: 'abcdef123456'),
      overrides: [
        apiProvider.overrideWithValue(_FakeApi()),
        tokenStorageProvider.overrideWithValue(_NoToken()),
        dioProvider.overrideWithValue(dio),
      ],
    );
    await tester.pumpAndSettle();
    expect(find.text('Fechar'), findsOneWidget);
    await tester.tap(find.text('Exportar PDF'));
    await tester.pumpAndSettle();
    expect(sent?.method, 'POST');
    expect(sent?.path, '/admin/revisions/abcdef123456/export-pdf');
    expect(sent?.data, isEmpty);
    expect(find.text('O servidor retornou um erro (403).'), findsOneWidget);
    expect(find.text('Exportar PDF'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
