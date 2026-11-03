import 'package:flutter_riverpod/flutter_riverpod.dart';
// StateNotifier é API legada no Riverpod 3.x, como no app admin.
import 'package:flutter_riverpod/legacy.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/customer_api.dart';
import '../../data/models.dart';
import '../../data/providers.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthState {
  const AuthState(this.status, [this.customer]);

  final AuthStatus status;
  final Customer? customer;
}

class AuthController extends StateNotifier<AuthState> {
  AuthController(this._ref) : super(const AuthState(AuthStatus.unknown)) {
    _restore();
    _ref.listen(unauthorizedSignalProvider, (_, __) {
      state = const AuthState(AuthStatus.unauthenticated);
    });
  }

  final Ref _ref;

  CustomerApi get _api => _ref.read(apiProvider);
  TokenStorage get _tokens => _ref.read(tokenStorageProvider);

  /// Sem internet na abertura o token continua guardado: só uma resposta 401
  /// da API encerra a sessão.
  Future<void> _restore() async {
    final token = await _tokens.read();
    if (token == null || token.isEmpty) {
      state = const AuthState(AuthStatus.unauthenticated);
      return;
    }
    try {
      state = AuthState(AuthStatus.authenticated, await _api.profile());
    } on ApiException catch (error) {
      if (error.isUnauthorized) {
        state = const AuthState(AuthStatus.unauthenticated);
      } else {
        state = const AuthState(AuthStatus.authenticated);
      }
    }
  }

  Future<void> login(String identifier, String password) async {
    await _startSession(await _api.login(identifier, password));
  }

  Future<void> register({
    required String name,
    required String email,
    required String phone,
    required String password,
    String? cpf,
  }) async {
    await _startSession(
      await _api.register(
        name: name,
        email: email,
        phone: phone,
        password: password,
        cpf: cpf,
      ),
    );
  }

  /// O token é gravado antes de avisar as telas: elas já chamam a API ao abrir.
  Future<void> _startSession(AuthResult result) async {
    await _tokens.write(result.token);
    state = AuthState(AuthStatus.authenticated, result.customer);
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
