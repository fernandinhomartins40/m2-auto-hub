import 'dart:io';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Guarda o JWT no armazenamento seguro (Keystore no Android, Keychain no iOS).
class TokenStorage {
  TokenStorage([FlutterSecureStorage? storage])
      : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;
  static const _key = 'session_token';

  Future<String?> read() => _storage.read(key: _key);

  Future<void> write(String token) => _storage.write(key: _key, value: token);

  Future<void> clear() => _storage.delete(key: _key);
}

/// O Keychain do iOS sobrevive à desinstalação; a pasta do app, não.
/// Sem a marca na pasta, é a primeira abertura após instalar: apaga o token antigo.
/// [appDir] só é informado nos testes; no Android não faz nada.
Future<void> clearTokenAfterReinstall(TokenStorage tokens,
    {String? appDir}) async {
  final home = Platform.environment['HOME'];
  final dir = appDir ?? (Platform.isIOS && home != null ? '$home/Library' : null);
  if (dir == null) return;
  final marker = File('$dir/.m2_instalado');
  try {
    if (await marker.exists()) return;
    await tokens.clear();
    await marker.create(recursive: true);
  } catch (_) {
    // Falha aqui não pode impedir o app de abrir; tenta de novo na próxima abertura.
  }
}
