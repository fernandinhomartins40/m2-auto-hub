import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
// StateProvider é API legada no Riverpod 3.x.
import 'package:flutter_riverpod/legacy.dart';

import 'api/dio_client.dart';
import 'auth/token_storage.dart';

/// Providers de infraestrutura compartilhados por todo o app.

final tokenStorageProvider = Provider<TokenStorage>((ref) => TokenStorage());

/// Sinaliza que a API respondeu 401 em algum lugar.
/// A camada de auth observa e faz logout/redirect.
final unauthorizedSignalProvider = StateProvider<int>((ref) => 0);

final dioProvider = Provider<Dio>((ref) {
  final storage = ref.watch(tokenStorageProvider);
  return buildDio(
    tokenStorage: storage,
    onUnauthorized: () {
      // Incrementa o sinal para acordar quem observa.
      ref.read(unauthorizedSignalProvider.notifier).state++;
    },
  );
});
