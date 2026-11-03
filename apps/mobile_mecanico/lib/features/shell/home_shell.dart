import 'package:flutter/material.dart';

import '../orders/orders_tab.dart';
import '../profile/profile_tab.dart';
import '../revisions/revisions_tab.dart';

/// Navegação principal. No PWA "Trabalho" reúne revisões e OS em abas; aqui
/// cada uma vira um destino da barra inferior, a um toque de distância.
class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    const titles = ['Minhas revisões', 'Minhas ordens de serviço', 'Perfil'];
    return PopScope(
      canPop: _index == 0,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) setState(() => _index = 0);
      },
      child: Scaffold(
        appBar: AppBar(title: Text(titles[_index])),
        body: IndexedStack(
          index: _index,
          children: const [RevisionsTab(), OrdersTab(), ProfileTab()],
        ),
        bottomNavigationBar: NavigationBar(
          selectedIndex: _index,
          onDestinationSelected: (index) => setState(() => _index = index),
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.fact_check_outlined),
              selectedIcon: Icon(Icons.fact_check),
              label: 'Revisões',
            ),
            NavigationDestination(
              icon: Icon(Icons.assignment_outlined),
              selectedIcon: Icon(Icons.assignment),
              label: 'Ordens',
            ),
            NavigationDestination(
              icon: Icon(Icons.person_outline),
              selectedIcon: Icon(Icons.person),
              label: 'Perfil',
            ),
          ],
        ),
      ),
    );
  }
}
