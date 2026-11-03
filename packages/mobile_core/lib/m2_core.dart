/// Núcleo compartilhado dos apps Android M2.
///
/// Reúne o que cliente e mecânico têm em comum: acesso à API, sessão por
/// token, tema, formatação pt-BR e os estados de tela (carregando, erro, vazio).
library;

export 'src/api/api_exception.dart';
export 'src/api/api_response.dart';
export 'src/api/dio_client.dart';
export 'src/auth/token_storage.dart';
export 'src/env.dart';
export 'src/format.dart';
export 'src/providers.dart';
export 'src/localization.dart';
export 'src/theme/app_theme.dart';
export 'src/widgets/change_password_screen.dart';
export 'src/widgets/async_page.dart';
export 'src/widgets/feedback.dart';
export 'src/widgets/password_field.dart';
export 'src/widgets/status_chip.dart';
