/// Configuração de ambiente, injetada em tempo de build via `--dart-define`.
///
/// ```
/// flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3001
/// ```
///
/// O default é produção: um build de loja sem o define continua funcionando.
class Env {
  /// URL base da API. No emulador, `10.0.2.2` é a máquina de desenvolvimento.
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://m2centerauto.com.br/api',
  );

  /// Site público: loja, aviso de privacidade e exclusão de conta.
  static const String siteUrl = String.fromEnvironment(
    'SITE_URL',
    defaultValue: 'https://m2centerauto.com.br',
  );

  /// Origem da API, para montar a URL de imagens em `/uploads`.
  static String get apiOrigin =>
      apiBaseUrl.replaceFirst(RegExp(r'/api/?$'), '');
}
