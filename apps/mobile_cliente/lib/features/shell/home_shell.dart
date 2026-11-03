import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/providers.dart';
import '../account/account_tab.dart';
import '../account/notifications_screen.dart';
import '../benefits/benefits_tab.dart';
import '../home/home_tab.dart';
import '../purchases/purchases_tab.dart';
import '../vehicle/vehicle_tab.dart';

/// Navegação principal: as mesmas áreas do menu do PWA do cliente. "Ajuda" fica
/// em Conta e no Início para caber nos cinco destinos da barra inferior.
class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key});

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> {
  int _index = 0;

  void _select(int index) => setState(() => _index = index);

  @override
  Widget build(BuildContext context) {
    final titles = const ['Início', 'Compras', 'Meu veículo', 'Benefícios', 'Conta'];
    final unread = ref.watch(unreadCountProvider).value ?? 0;

    return PopScope(
      canPop: _index == 0,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _select(0);
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(titles[_index]),
          actions: [
            IconButton(
              tooltip: unread > 0
                  ? 'Notificações, $unread não lidas'
                  : 'Notificações',
              icon: Badge(
                isLabelVisible: unread > 0,
                label: Text('$unread'),
                child: const Icon(Icons.notifications_outlined),
              ),
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const NotificationsScreen()),
              ),
            ),
          ],
        ),
        body: IndexedStack(
          index: _index,
          children: [
            HomeTab(onOpenTab: _select),
            const PurchasesTab(),
            const VehicleTab(),
            const BenefitsTab(),
            const AccountTab(),
          ],
        ),
        bottomNavigationBar: NavigationBar(
          selectedIndex: _index,
          onDestinationSelected: _select,
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home),
              label: 'Início',
            ),
            NavigationDestination(
              icon: Icon(Icons.receipt_long_outlined),
              selectedIcon: Icon(Icons.receipt_long),
              label: 'Compras',
            ),
            NavigationDestination(
              icon: Icon(Icons.directions_car_outlined),
              selectedIcon: Icon(Icons.directions_car),
              label: 'Veículo',
            ),
            NavigationDestination(
              icon: Icon(Icons.card_giftcard_outlined),
              selectedIcon: Icon(Icons.card_giftcard),
              label: 'Benefícios',
            ),
            NavigationDestination(
              icon: Icon(Icons.person_outline),
              selectedIcon: Icon(Icons.person),
              label: 'Conta',
            ),
          ],
        ),
      ),
    );
  }
}
