import 'package:flutter_riverpod/flutter_riverpod.dart';
// StateNotifier é API legada no Riverpod 3.x, como no app admin.
import 'package:flutter_riverpod/legacy.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/mechanic_api.dart';
import '../../data/models.dart';
import '../../data/providers.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthState {
  const AuthState(this.status, [this.mechanic]);

  final AuthStatus status;
  final Mechanic? mechanic;
}

class AuthController extends StateNotifier<AuthState> {
  AuthController(this._ref) : super(const AuthState(AuthStatus.unknown)) {
    _restore();
    _ref.listen(unauthorizedSignalProvider, (_, __) {
      state = const AuthState(AuthStatus.unauthenticated);
    });
  }

  final Ref _ref;

  MechanicApi get _api => _ref.read(apiProvider);
  TokenStorage get _tokens => _ref.read(tokenStorageProvider);

  /// Sem internet na abertura o token continua guardado: só uma resposta da
  /// API encerra a sessão.
  Future<void> _restore() async {
    final token = await _tokens.read();
    if (token == null || token.isEmpty) {
      state = const AuthState(AuthStatus.unauthenticated);
      return;
    }
    try {
      final mechanic = await _api.profile();
      if (mechanic.isMechanic) {
        state = AuthState(AuthStatus.authenticated, mechanic);
      } else {
        await logout();
      }
    } on ApiException catch (error) {
      state = AuthState(
        error.isUnauthorized
            ? AuthStatus.unauthenticated
            : AuthStatus.authenticated,
      );
    }
  }

  Future<void> login(String email, String password) async {
    final result = await _api.login(email, password);
    if (!result.mechanic.isMechanic) {
      throw ApiException(
        'Este app é para mecânicos. Acesse pelo painel da loja no site.',
      );
    }
    // O token é gravado antes de avisar as telas: elas já chamam a API ao abrir.
    await _tokens.write(result.token);
    state = AuthState(AuthStatus.authenticated, result.mechanic);
  }

  Future<void> refresh() async {
    state = AuthState(AuthStatus.authenticated, await _api.profile());
  }

  Future<void> logout() async {
    await _tokens.clear();
    state = const AuthState(AuthStatus.unauthenticated);
  }
}

final authControllerProvider =
    StateNotifierProvider<AuthController, AuthState>(
  (ref) => AuthController(ref),
);

/// Id do mecânico logado; só muda quando a sessão muda.
final mechanicIdProvider = Provider<String?>(
  (ref) => ref.watch(authControllerProvider).mechanic?.id,
);
