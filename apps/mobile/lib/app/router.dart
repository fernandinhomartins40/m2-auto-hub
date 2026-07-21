import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/auth_controller.dart';
import '../features/dashboard/home_shell.dart';
import '../features/auth/login_screen.dart';
import '../features/plate_lookup/plate_lookup_screen.dart';
import '../features/section_placeholder.dart';
import 'sections.dart';

/// Router com guarda de autenticação.
///
/// - Sessão desconhecida (restaurando token) → tela de splash.
/// - Não autenticado → /login.
/// - Autenticado → /home e seções.
final routerProvider = Provider<GoRouter>((ref) {
  final refresh = _AuthRefresh(ref);

  return GoRouter(
    initialLocation: '/home',
    refreshListenable: refresh,
    redirect: (context, state) {
      final status = ref.read(authControllerProvider).status;
      final loc = state.matchedLocation;

      if (status == AuthStatus.unknown) {
        return loc == '/splash' ? null : '/splash';
      }
      final loggedIn = status == AuthStatus.authenticated;
      final atAuthScreen = loc == '/login' || loc == '/splash';

      if (!loggedIn) return atAuthScreen && loc == '/login' ? null : '/login';
      if (loggedIn && atAuthScreen) return '/home';
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, __) => const _SplashScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/home', builder: (_, __) => const HomeShell()),
      GoRoute(
        path: '/section/:id',
        builder: (context, state) {
          final section = sectionById(state.pathParameters['id'] ?? '');
          if (section.id == 'plate-lookup') {
            return const PlateLookupScreen();
          }
          return SectionPlaceholder(section: section);
        },
      ),
    ],
  );
});

/// Reavalia o redirect sempre que o estado de auth muda.
class _AuthRefresh extends ChangeNotifier {
  _AuthRefresh(Ref ref) {
    ref.listen(authControllerProvider, (_, __) => notifyListeners());
  }
}

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: CircularProgressIndicator()),
    );
  }
}
