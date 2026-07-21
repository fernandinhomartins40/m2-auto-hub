import 'package:flutter_riverpod/flutter_riverpod.dart';
// StateNotifier/StateNotifierProvider são API legada no Riverpod 3.x.
import 'package:flutter_riverpod/legacy.dart';

import '../../core/providers.dart';
import 'admin.dart';
import 'auth_repository.dart';

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(ref.watch(dioProvider)),
);

/// Estado de autenticação do app.
enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthState {
  const AuthState({required this.status, this.admin});

  final AuthStatus status;
  final Admin? admin;

  const AuthState.unknown() : this(status: AuthStatus.unknown);
  const AuthState.unauthenticated()
      : this(status: AuthStatus.unauthenticated);
  AuthState.authenticated(Admin admin)
      : this(status: AuthStatus.authenticated, admin: admin);
}

/// Controla login, logout e restauração de sessão.
class AuthController extends StateNotifier<AuthState> {
  AuthController(this._ref) : super(const AuthState.unknown()) {
    _restore();
    // Reage a 401 vindo de qualquer requisição (token expirado).
    _ref.listen(unauthorizedSignalProvider, (_, __) {
      state = const AuthState.unauthenticated();
    });
  }

  final Ref _ref;

  AuthRepository get _repo => _ref.read(authRepositoryProvider);

  /// Ao iniciar: se há token guardado, valida com /profile.
  Future<void> _restore() async {
    final token = await _ref.read(tokenStorageProvider).read();
    if (token == null || token.isEmpty) {
      state = const AuthState.unauthenticated();
      return;
    }
    try {
      final admin = await _repo.getProfile();
      state = AuthState.authenticated(admin);
    } catch (_) {
      await _ref.read(tokenStorageProvider).clear();
      state = const AuthState.unauthenticated();
    }
  }

  /// Faz login e guarda o token. Lança [ApiException] em caso de erro.
  Future<void> login(String email, String password) async {
    final result = await _repo.login(email: email, password: password);
    await _ref.read(tokenStorageProvider).write(result.token);
    state = AuthState.authenticated(result.admin);
  }

  Future<void> logout() async {
    await _repo.logout();
    await _ref.read(tokenStorageProvider).clear();
    state = const AuthState.unauthenticated();
  }
}

final authControllerProvider =
    StateNotifierProvider<AuthController, AuthState>(
  (ref) => AuthController(ref),
);
