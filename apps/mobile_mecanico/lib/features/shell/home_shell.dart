import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../auth/auth_controller.dart';
import '../orders/orders_tab.dart';
import '../profile/profile_tab.dart';
import '../revisions/revisions_tab.dart';

/// Casca do painel da oficina, como o `StoreLayout` móvel do PWA: marca no
/// topo e barra inferior com Trabalho, Perfil e Sair.
class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key});

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> {
  int _index = 0;

  Future<void> _logout() async {
    final accepted = await confirm(
      context,
      title: 'Sair da conta?',
      message: 'Você vai precisar entrar de novo para ver seu trabalho.',
      confirmLabel: 'Sair',
    );
    if (accepted) await ref.read(authControllerProvider.notifier).logout();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: _index == 0,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) setState(() => _index = 0);
      },
      child: PanelScaffold(
        appBar: const PanelHeaderBar(eyebrow: 'Oficina', title: 'M2 Oficina'),
        body: IndexedStack(
          index: _index,
          children: const [_WorkQueue(), ProfileTab()],
        ),
        bottomNavigationBar: PanelBottomNav(
          index: _index,
          items: const [
            PanelNavItem('Trabalho', LucideIcons.briefcaseBusiness),
            PanelNavItem('Perfil', LucideIcons.user),
            PanelNavItem('Sair', LucideIcons.logOut),
          ],
          onTap: (index) {
            if (index == 2) {
              _logout();
            } else {
              setState(() => _index = index);
            }
          },
        ),
      ),
    );
  }
}

/// Fila de trabalho (`MechanicWorkQueue`): revisões e OS em duas abas.
class _WorkQueue extends StatefulWidget {
  const _WorkQueue();

  @override
  State<_WorkQueue> createState() => _WorkQueueState();
}

class _WorkQueueState extends State<_WorkQueue> {
  int _view = 0;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
          child: WorkspaceTabs(
            expand: true,
            index: _view,
            onChanged: (view) => setState(() => _view = view),
            tabs: const [
              WorkspaceTab('Revisões', icon: LucideIcons.clipboardCheck),
              WorkspaceTab('Ordens de serviço', icon: LucideIcons.clipboardList),
            ],
          ),
        ),
        Expanded(
          child: IndexedStack(
            index: _view,
            children: const [RevisionsTab(), OrdersTab()],
          ),
        ),
      ],
    );
  }
}
