import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
// StateProvider é API legada no Riverpod 3.x.
import 'package:flutter_riverpod/legacy.dart';

import 'api/dio_client.dart';
import 'auth/token_storage.dart';

final tokenStorageProvider = Provider<TokenStorage>((ref) => TokenStorage());

/// Sinaliza que a API respondeu 401 fora de um caso esperado.
final unauthorizedSignalProvider = StateProvider<int>((ref) => 0);

final dioProvider = Provider<Dio>((ref) {
  return buildDio(
    tokenStorage: ref.watch(tokenStorageProvider),
    onUnauthorized: () {
      ref.read(unauthorizedSignalProvider.notifier).state++;
    },
  );
});
