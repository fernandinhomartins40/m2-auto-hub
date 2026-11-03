import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:m2_core/m2_core.dart';

DioException _badResponse(int status, Object body) {
  final options = RequestOptions(path: '/x');
  return DioException(
    requestOptions: options,
    type: DioExceptionType.badResponse,
    response: Response(requestOptions: options, statusCode: status, data: body),
  );
}

void main() {
  setUpAll(() => initializeDateFormatting('pt_BR'));

  group('ApiException', () {
    test('usa o detalhe da validação em vez de "Validation failed"', () {
      final error = ApiException.fromDio(_badResponse(400, {
        'error': 'Validation failed',
        'details': [
          {'field': 'phone', 'message': 'Phone must be 10 or 11 digits'},
        ],
      }));
      expect(error.message, 'O telefone deve ter 10 ou 11 dígitos');
    });

    test('traduz o erro de login e preserva o status', () {
      final error = ApiException.fromDio(
        _badResponse(401, {'error': 'Invalid phone/email or password'}),
      );
      expect(error.message, 'Telefone/e-mail ou senha incorretos');
      expect(error.isUnauthorized, isTrue);
    });

    test('mantém mensagem que já vem em português', () {
      final error = ApiException.fromDio(
        _badResponse(409, {'error': 'Ja existe uma solicitacao aberta'}),
      );
      expect(error.message, 'Ja existe uma solicitacao aberta');
    });
  });

  group('sessão', () {
    late List<int> expired;
    late Dio dio;

    setUp(() {
      expired = [];
      dio = buildDio(
        tokenStorage: _MemoryTokenStorage(),
        onUnauthorized: () => expired.add(1),
      );
      dio.httpClientAdapter = _Unauthorized();
    });

    test('401 comum encerra a sessão', () async {
      await expectLater(dio.get('/x'), throwsA(isA<DioException>()));
      expect(expired, hasLength(1));
    });

    test('401 esperado não derruba quem errou a senha', () async {
      await expectLater(
        dio.put('/auth/change-password', options: allowUnauthorized()),
        throwsA(isA<DioException>()),
      );
      expect(expired, isEmpty);
    });
  });

  test('envelope e conversões da API', () {
    expect(unwrapObject({'data': {'a': 1}}), {'a': 1});
    expect(unwrapList({'data': [1, 2]}), [1, 2]);
    expect(unwrapList([1]), [1]);
    expect(asDouble('120.50'), 120.5);
    expect(asInt('7'), 7);
    expect(asDate(null), isNull);
  });

  test('formatação pt-BR', () {
    expect(formatMoney(1234.5), contains('1.234,50'));
    expect(formatKm(45000), '45.000 km');
    expect(formatKm(null), 'Não informada');
  });

  test('placa antiga e Mercosul', () {
    expect(isValidPlate('abc-1234'), isTrue);
    expect(isValidPlate('ABC1D23'), isTrue);
    expect(isValidPlate('AB12345'), isFalse);
    expect(normalizePlate('abc-1d23'), 'ABC1D23');
  });

  test('busca ignora acento e caixa', () {
    expect(withoutAccents('Óleo do Motor'), 'oleo do motor');
    expect(withoutAccents('Suspensão'), 'suspensao');
  });

  test('regra de senha do backend', () {
    expect(passwordProblem('Abc@1234'), isNull);
    expect(passwordProblem('abc@1234'), 'Inclua uma letra maiúscula');
    expect(passwordProblem('Abc12345'), 'Inclua um caractere especial');
    expect(passwordProblem('Ab@1'), 'Use pelo menos 8 caracteres');
  });
}

class _MemoryTokenStorage implements TokenStorage {
  @override
  Future<String?> read() async => 'token';

  @override
  Future<void> write(String token) async {}

  @override
  Future<void> clear() async {}
}

class _Unauthorized implements HttpClientAdapter {
  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    return ResponseBody.fromString(
      '{"success":false,"error":"Invalid or expired token"}',
      401,
      headers: {
        Headers.contentTypeHeader: ['application/json'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}
