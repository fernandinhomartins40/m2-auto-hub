import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:m2_core/m2_core.dart';

import '../features/auth/auth_controller.dart';
import '../features/auth/forgot_password_screen.dart';
import '../features/auth/login_screen.dart';
import '../features/shell/home_shell.dart';

const _publicRoutes = {'/login', '/recuperar-senha'};

/// O go_router só cuida da sessão. Dentro do app, cada tela de detalhe é
/// empilhada com `Navigator.push`, e sai junto quando a sessão termina.
final routerProvider = Provider<GoRouter>((ref) {
  final refresh = _AuthRefresh(ref);

  return GoRouter(
    initialLocation: '/trabalho',
    refreshListenable: refresh,
    redirect: (context, state) {
      final status = ref.read(authControllerProvider).status;
      final location = state.matchedLocation;

      if (status == AuthStatus.unknown) {
        return location == '/splash' ? null : '/splash';
      }
      if (status == AuthStatus.unauthenticated) {
        return _publicRoutes.contains(location) ? null : '/login';
      }
      return _publicRoutes.contains(location) || location == '/splash'
          ? '/trabalho'
          : null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, __) => const _SplashScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(
        path: '/recuperar-senha',
        builder: (_, __) => const ForgotPasswordScreen(),
      ),
      GoRoute(path: '/trabalho', builder: (_, __) => const HomeShell()),
    ],
  );
});

class _AuthRefresh extends ChangeNotifier {
  _AuthRefresh(Ref ref) {
    ref.listen(authControllerProvider, (_, __) => notifyListeners());
  }
}

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    return const PanelScaffold(
      login: true,
      body: Center(child: CircularProgressIndicator()),
    );
  }
}
