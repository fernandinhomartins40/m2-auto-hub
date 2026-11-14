import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import 'app/router.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initLocale();
  await clearTokenAfterReinstall(TokenStorage());
  // Sem repetição automática: a tela mostra o erro com "Tentar novamente".
  runApp(ProviderScope(retry: (_, __) => null, child: const M2MecanicoApp()));
}

class M2MecanicoApp extends ConsumerWidget {
  const M2MecanicoApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'M2 Mecânico',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      locale: appLocale,
      supportedLocales: const [appLocale],
      localizationsDelegates: appLocalizationsDelegates,
      routerConfig: ref.watch(routerProvider),
      // Build abaixo do mínimo da API vê "Atualize o app" no lugar das telas.
      builder: (_, child) => MinVersionGate(app: 'mecanico', child: child!),
    );
  }
}
