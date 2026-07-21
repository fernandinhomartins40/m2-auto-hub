import 'package:dio/dio.dart';

import '../auth/token_storage.dart';
import '../env.dart';

/// Callback disparado quando a API responde 401 (sessão expirada),
/// para que a camada de auth faça logout e redirecione ao login.
typedef OnUnauthorized = void Function();

/// Cria e configura o [Dio] usado por todos os repositórios.
///
/// - `baseURL` vem de [Env.apiBaseUrl].
/// - Interceptor injeta `Authorization: Bearer <token>` (equivalente ao
///   `withCredentials` do painel web, mas com token em vez de cookie).
/// - Em 401, limpa o token e notifica via [onUnauthorized].
Dio buildDio({
  required TokenStorage tokenStorage,
  OnUnauthorized? onUnauthorized,
}) {
  final dio = Dio(
    BaseOptions(
      baseUrl: Env.apiBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 20),
      headers: {'Content-Type': 'application/json'},
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
        if (e.response?.statusCode == 401) {
          await tokenStorage.clear();
          onUnauthorized?.call();
        }
        handler.next(e);
      },
    ),
  );

  return dio;
}
