import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:m2_core/m2_core.dart';
import 'package:package_info_plus/package_info_plus.dart';

void _installed(String build) => PackageInfo.setMockInitialValues(
      appName: 'M2',
      packageName: 'br.com.m2centerauto.cliente',
      version: '1.0.0',
      buildNumber: build,
      buildSignature: '',
    );

/// Responde à rota de versão com [body] e guarda a URL pedida.
Dio _api(String? body, {List<Uri>? calls}) {
  final dio = Dio(BaseOptions(baseUrl: 'https://api.test'));
  dio.httpClientAdapter = _Fake(body, calls);
  return dio;
}

const _min3 =
    '{"success":true,"data":{"app":"cliente","platform":"android","minBuild":3,'
    '"storeUrl":"https://play.google.com/store/apps/details?id=x"}}';

void main() {
  group('versão mínima', () {
    test('build abaixo do mínimo pede atualização com o link da loja',
        () async {
      _installed('2');
      final calls = <Uri>[];
      final update = await checkMinVersion(_api(_min3, calls: calls), 'cliente');
      expect(update?.storeUrl, contains('play.google.com'));
      expect(calls.single.queryParameters,
          {'app': 'cliente', 'platform': 'android'});
    });

    test('build igual ou acima do mínimo segue', () async {
      _installed('3');
      expect(await checkMinVersion(_api(_min3), 'cliente'), isNull);
    });

    test('sem link da loja mostra só o aviso', () async {
      _installed('1');
      final update = await checkMinVersion(
        _api('{"success":true,"data":{"minBuild":2,"storeUrl":null}}'),
        'mecanico',
      );
      expect(update, isNotNull);
      expect(update!.storeUrl, isNull);
    });

    test('falha de rede não bloqueia', () async {
      _installed('1');
      expect(await checkMinVersion(_api(null), 'cliente'), isNull);
    });

    test('build ilegível não bloqueia', () async {
      _installed('');
      expect(await checkMinVersion(_api(_min3), 'cliente'), isNull);
    });

    testWidgets('portão troca o app pela tela de atualização', (tester) async {
      _installed('1');
      tester.view.physicalSize = const Size(412 * 2.625, 915 * 2.625);
      tester.view.devicePixelRatio = 2.625;
      addTearDown(tester.view.reset);
      await tester.pumpWidget(ProviderScope(
        overrides: [dioProvider.overrideWithValue(_api(_min3))],
        child: MaterialApp(
          theme: AppTheme.light(),
          builder: (_, child) => MinVersionGate(app: 'cliente', child: child!),
          home: const Text('app aberto'),
        ),
      ));
      expect(find.text('app aberto'), findsOneWidget);
      // O Dio usa timers reais: espera fora do relógio falso do teste.
      for (var i = 0; i < 20 && find.text('Atualize o app').evaluate().isEmpty; i++) {
        await tester.runAsync(
          () => Future<void>.delayed(const Duration(milliseconds: 20)),
        );
        await tester.pump(const Duration(milliseconds: 100));
      }
      expect(find.text('Atualize o app'), findsOneWidget);
      expect(find.text('Atualizar agora'), findsOneWidget);
      expect(find.text('app aberto'), findsNothing);
      expect(tester.takeException(), isNull);
    });
  });

  test('nome do arquivo vem do Content-Disposition', () {
    expect(
      fileNameFromDisposition('attachment; filename="orcamento-ab12.pdf"', 'x'),
      'orcamento-ab12.pdf',
    );
    expect(
      fileNameFromDisposition('attachment; filename=meus-dados.json', 'x'),
      'meus-dados.json',
    );
    expect(fileNameFromDisposition(null, 'revisao.pdf'), 'revisao.pdf');
  });
}

class _Fake implements HttpClientAdapter {
  _Fake(this.body, this.calls);

  final String? body;
  final List<Uri>? calls;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    calls?.add(options.uri);
    if (body == null) {
      throw DioException.connectionError(
        requestOptions: options,
        reason: 'sem rede',
      );
    }
    return ResponseBody.fromString(body!, 200, headers: {
      Headers.contentTypeHeader: ['application/json'],
    });
  }

  @override
  void close({bool force = false}) {}
}
