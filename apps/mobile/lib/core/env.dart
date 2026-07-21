/// Configuração de ambiente do app.
///
/// A URL base da API é injetada em tempo de build via `--dart-define`:
///
/// ```
/// flutter run --dart-define=API_BASE_URL=https://seu-dominio/api
/// ```
///
/// Sem hardcode: dev aponta para o backend local/VPS, prod para o domínio
/// de produção (`/api` no mesmo host do painel web).
class Env {
  /// URL base da API (ex.: `https://m2autohub.com/api`).
  ///
  /// O default aponta para o emulador Android acessando um backend local
  /// (`10.0.2.2` é o host da máquina visto de dentro do emulador).
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000/api',
  );
}
