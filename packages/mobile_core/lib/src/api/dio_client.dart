import 'package:dio/dio.dart';

import '../auth/token_storage.dart';
import '../env.dart';

/// Disparado quando a sessão deixa de valer, para o app voltar ao login.
typedef OnUnauthorized = void Function();

const _expectedUnauthorized = 'expectedUnauthorized';

/// Marca uma requisição cujo 401 é erro de negócio, não sessão expirada:
/// senha errada no login ou "senha atual" incorreta ao trocar a senha.
Options allowUnauthorized() =>
    Options(extra: const {_expectedUnauthorized: true});

/// Cria o [Dio] usado pelos repositórios.
///
/// O app não guarda cookies: autentica só via `Authorization: Bearer`, e por
/// isso também não cai na proteção de origem das sessões por cookie da API.
Dio buildDio({
  required TokenStorage tokenStorage,
  OnUnauthorized? onUnauthorized,
}) {
  final dio = Dio(
    BaseOptions(
      baseUrl: Env.apiBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      headers: {'Accept': 'application/json'},
    ),
  );

  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await tokenStorage.read();
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (e, handler) async {
        final expected = e.requestOptions.extra[_expectedUnauthorized] == true;
        if (e.response?.statusCode == 401 && !expected) {
          await tokenStorage.clear();
          onUnauthorized?.call();
        }
        handler.next(e);
      },
    ),
  );

  return dio;
}
