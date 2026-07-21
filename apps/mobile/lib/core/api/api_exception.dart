import 'package:dio/dio.dart';

/// Erro de API já traduzido para uma mensagem amigável em pt-BR.
///
/// Centraliza o tratamento do envelope de erro do backend
/// (`{ success: false, message | error }`) e das falhas de rede do dio.
class ApiException implements Exception {
  ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  /// Indica sessão expirada / não autenticado.
  bool get isUnauthorized => statusCode == 401;

  factory ApiException.fromDio(DioException e) {
    final status = e.response?.statusCode;
    final data = e.response?.data;

    // Backend responde { success: false, message?: string, error?: string }
    if (data is Map) {
      final msg = data['message'] ?? data['error'];
      if (msg is String && msg.isNotEmpty) {
        return ApiException(msg, statusCode: status);
      }
    }

    final message = switch (e.type) {
      DioExceptionType.connectionTimeout ||
      DioExceptionType.sendTimeout ||
      DioExceptionType.receiveTimeout =>
        'Tempo de conexão esgotado. Verifique sua internet.',
      DioExceptionType.connectionError =>
        'Sem conexão com o servidor. Verifique sua internet.',
      DioExceptionType.badResponse =>
        'O servidor retornou um erro ($status).',
      _ => 'Ocorreu um erro inesperado. Tente novamente.',
    };
    return ApiException(message, statusCode: status);
  }

  @override
  String toString() => message;
}
