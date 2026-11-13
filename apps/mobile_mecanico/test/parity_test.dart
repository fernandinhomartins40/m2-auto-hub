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

  @override
  Future<Uint8List> revisionPdf(String id) async =>
      Uint8List.fromList([37, 80, 68, 70]);
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

  testWidgets('detalhes da revisão exporta o PDF pelo compartilhamento',
      (tester) async {
    String? sharedName;
    int? sharedSize;
    await _pump(
      tester,
      RevisionDetailsScreen(
        revisionId: 'abcdef123456',
        share: (context, bytes, name) async {
          sharedName = name;
          sharedSize = bytes.length;
        },
      ),
      overrides: [
        apiProvider.overrideWithValue(_FakeApi()),
        tokenStorageProvider.overrideWithValue(_NoToken()),
      ],
    );
    await tester.pumpAndSettle();
    expect(find.text('Fechar'), findsOneWidget);
    await tester.tap(find.text('Exportar PDF'));
    await tester.pumpAndSettle();
    expect(sharedName, 'revisao-abcdef12.pdf');
    expect(sharedSize, 4);
    expect(find.text('PDF gerado'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
