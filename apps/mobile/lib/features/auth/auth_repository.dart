import 'package:dio/dio.dart';

import '../../core/api/api_exception.dart';
import '../../core/api/api_response.dart';
import 'admin.dart';

/// Resultado do login: admin + token JWT devolvido no corpo pela API.
class LoginResult {
  LoginResult({required this.admin, required this.token});
  final Admin admin;
  final String token;
}

/// Acesso à API de autenticação de admin.
///
/// Espelha `authService.ts` do painel web, mas usando token Bearer em vez de
/// cookie httpOnly. Rotas: `POST /auth/admin/login`, `GET /auth/admin/profile`,
/// `POST /auth/admin/logout`.
class AuthRepository {
  AuthRepository(this._dio);
  final Dio _dio;

  Future<LoginResult> login({
    required String email,
    required String password,
  }) async {
    try {
      final res = await _dio.post(
        '/auth/admin/login',
        data: {'email': email, 'password': password},
      );
      final data = unwrapObject(res.data);
      final token = data['token']?.toString();
      if (token == null || token.isEmpty) {
        throw ApiException(
          'A API não retornou o token de acesso. '
          'Atualize o backend para incluir o token no login.',
        );
      }
      return LoginResult(
        admin: Admin.fromJson(data['admin'] as Map<String, dynamic>),
        token: token,
      );
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<Admin> getProfile() async {
    try {
      final res = await _dio.get('/auth/admin/profile');
      return Admin.fromJson(unwrapObject(res.data));
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<void> logout() async {
    try {
      await _dio.post('/auth/admin/logout');
    } on DioException {
      // Logout local não deve falhar por erro de rede — ignoramos.
    }
  }
}
