import 'package:dio/dio.dart';

/// Mensagens do backend (em inglês) traduzidas para o usuário.
///
/// Mesma lista de `apps/frontend/src/lib/apiError.ts`, mais as de login.
const _translations = <String, String>{
  'Current password is incorrect': 'Senha atual incorreta',
  'Current password is required to change the email':
      'Informe a senha atual para alterar o e-mail',
  'Email already in use': 'Este e-mail já está em uso',
  'Email already registered': 'Este e-mail já está cadastrado',
  'Phone already registered': 'Este telefone já está cadastrado',
  'Phone already in use': 'Este telefone já está em uso',
  'CPF already registered': 'Este CPF já está cadastrado',
  'CPF already in use': 'Este CPF já está em uso',
  'Invalid email format': 'Formato de e-mail inválido',
  'Validation failed': 'Verifique os dados informados',
  'Name must be at least 3 characters':
      'O nome deve ter pelo menos 3 caracteres',
  'Phone must be 10 or 11 digits': 'O telefone deve ter 10 ou 11 dígitos',
  'CPF must be 11 digits': 'O CPF deve ter 11 dígitos',
  'Invalid birth date': 'Data de nascimento inválida',
  'Password must be at least 8 characters':
      'A senha deve ter pelo menos 8 caracteres',
  'Passwords do not match': 'As senhas não coincidem',
  'Invalid phone/email or password': 'Telefone/e-mail ou senha incorretos',
  'Invalid email or password': 'E-mail ou senha incorretos',
  'Your account has been blocked': 'Sua conta está bloqueada',
  'Your account is not active': 'Sua conta não está ativa',
};

/// Erro de API já traduzido para uma mensagem amigável em pt-BR.
class ApiException implements Exception {
  ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  bool get isUnauthorized => statusCode == 401;

  factory ApiException.fromDio(DioException e) {
    final status = e.response?.statusCode;
    final fromBody = _messageFromBody(e.response?.data);
    if (fromBody != null) return ApiException(fromBody, statusCode: status);

    final message = switch (e.type) {
      DioExceptionType.connectionTimeout ||
      DioExceptionType.sendTimeout ||
      DioExceptionType.receiveTimeout =>
        'Tempo de conexão esgotado. Verifique sua internet.',
      DioExceptionType.connectionError =>
        'Sem conexão com o servidor. Verifique sua internet.',
      DioExceptionType.badResponse => 'O servidor retornou um erro ($status).',
      _ => 'Ocorreu um erro inesperado. Tente novamente.',
    };
    return ApiException(message, statusCode: status);
  }

  /// Nos erros de validação a mensagem útil fica em `details[].message`;
  /// `error` traz apenas "Validation failed".
  static String? _messageFromBody(dynamic data) {
    if (data is! Map) return null;
    final details = data['details'];
    if (details is List && details.isNotEmpty && details.first is Map) {
      final detail = (details.first as Map)['message'];
      if (detail is String && detail.isNotEmpty) return translate(detail);
    }
    final message = data['message'] ?? data['error'];
    if (message is String && message.isNotEmpty) return translate(message);
    return null;
  }

  static String translate(String message) => _translations[message] ?? message;

  @override
  String toString() => message;
}

/// Executa uma chamada de API trocando [DioException] por [ApiException].
Future<T> guardApi<T>(Future<T> Function() call) async {
  try {
    return await call();
  } on DioException catch (e) {
    throw ApiException.fromDio(e);
  }
}

/// Texto seguro para a tela: nunca expõe exceção interna ao usuário.
String friendlyError(Object? error) {
  return error is ApiException
      ? error.message
      : 'Não foi possível concluir. Tente novamente.';
}
