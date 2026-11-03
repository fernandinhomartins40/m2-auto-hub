import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/providers.dart';
import '../account/account_tab.dart';
import '../account/privacy_screen.dart';
import '../auth/auth_controller.dart';
import '../benefits/benefits_tab.dart';
import '../home/home_tab.dart';
import '../purchases/purchases_tab.dart';
import '../support/support_screen.dart';
import '../vehicle/vehicle_tab.dart';

/// Áreas do painel, na ordem de `customerPrimaryNavigation` do PWA.
enum Section { home, purchases, vehicle, support, benefits, account }

/// Abre uma área do painel (e a aba dentro dela) a partir de qualquer tela.
typedef OpenSection = void Function(Section section, [int tab]);

/// Navegação principal igual ao PWA móvel: cabeçalho com a marca, barra
/// inferior com Início, Compras, Veículo, Ajuda e Mais. Benefícios e Conta
/// ficam no painel "Mais", como no `MobileDrawer`.
class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key});

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> {
  Section _section = Section.home;
  final Map<Section, int> _tabs = {};

  void _open(Section section, [int? tab]) {
    setState(() {
      _section = section;
      if (tab != null) _tabs[section] = tab;
    });
  }

  void _setTab(Section section, int tab) =>
      setState(() => _tabs[section] = tab);

  Future<void> _openMenu() async {
    final picked = await showGeneralDialog<Section>(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'Fechar menu',
      barrierColor: const Color(0xFF070B14).withValues(alpha: 0.52),
      transitionDuration: const Duration(milliseconds: 300),
      pageBuilder: (_, __, ___) => _MoreDrawer(current: _section),
      transitionBuilder: (_, animation, __, child) => SlideTransition(
        position: Tween(begin: const Offset(1, 0), end: Offset.zero).animate(
          CurvedAnimation(parent: animation, curve: Curves.easeOut),
        ),
        child: child,
      ),
    );
    if (picked != null) _open(picked, 0);
  }

  @override
  Widget build(BuildContext context) {
    final unread = ref.watch(unreadCountProvider).value ?? 0;
    const navSections = [
      Section.home,
      Section.purchases,
      Section.vehicle,
      Section.support,
    ];

    return PopScope(
      canPop: _section == Section.home,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _open(Section.home);
      },
      child: PanelScaffold(
        appBar: PanelHeaderBar(
          eyebrow: 'Sua garagem',
          title: 'M2 Cliente',
          actions: [
            IconButton(
              tooltip: unread > 0
                  ? 'Notificações, $unread não lidas'
                  : 'Notificações',
              icon: Badge(
                isLabelVisible: unread > 0,
                backgroundColor: AppTheme.primary,
                label: Text('$unread'),
                child: const Icon(LucideIcons.bell, size: 20),
              ),
              onPressed: () => _open(Section.account, 1),
            ),
          ],
        ),
        body: IndexedStack(
          index: _section.index,
          children: [
            HomeTab(onOpen: _open),
            PurchasesTab(
              tab: _tabs[Section.purchases] ?? 0,
              onTab: (tab) => _setTab(Section.purchases, tab),
            ),
            VehicleTab(
              tab: _tabs[Section.vehicle] ?? 0,
              onTab: (tab) => _setTab(Section.vehicle, tab),
            ),
            const SupportScreen(),
            BenefitsTab(
              tab: _tabs[Section.benefits] ?? 0,
              onTab: (tab) => _setTab(Section.benefits, tab),
            ),
            AccountTab(
              tab: _tabs[Section.account] ?? 0,
              onTab: (tab) => _setTab(Section.account, tab),
            ),
          ],
        ),
        bottomNavigationBar: PanelBottomNav(
          index: navSections.indexOf(_section),
          onTap: (index) =>
              index < navSections.length ? _open(navSections[index]) : _openMenu(),
          items: const [
            PanelNavItem('Início', LucideIcons.house),
            PanelNavItem('Compras', LucideIcons.package),
            PanelNavItem('Veículo', LucideIcons.car),
            PanelNavItem('Ajuda', LucideIcons.messageCircle),
            PanelNavItem('Mais', LucideIcons.menu),
          ],
        ),
      ),
    );
  }
}

/// Painel lateral "Mais" (`MobileDrawer` do PWA, com o vidro `.liquid-drawer`).
class _MoreDrawer extends ConsumerWidget {
  const _MoreDrawer({required this.current});

  final Section current;

  Future<void> _logout(BuildContext context, WidgetRef ref) async {
    final accepted = await confirm(
      context,
      title: 'Sair da conta?',
      message: 'Você vai precisar entrar de novo para ver seus dados.',
      confirmLabel: 'Sair',
    );
    if (!accepted || !context.mounted) return;
    Navigator.of(context).pop();
    await ref.read(authControllerProvider.notifier).logout();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final customer = ref.watch(authControllerProvider).customer;
    final navigator = Navigator.of(context);
    final width = MediaQuery.sizeOf(context).width;

    Widget item(IconData icon, String label, VoidCallback onTap,
        {bool active = false}) {
      return Material(
        color: active
            ? AppTheme.primary.withValues(alpha: 0.1)
            : Colors.transparent,
        borderRadius: BorderRadius.circular(8),
        child: InkWell(
          borderRadius: BorderRadius.circular(8),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                Icon(
                  icon,
                  size: 20,
                  color: active ? AppTheme.primary : const Color(0xFF374151),
                ),
                const SizedBox(width: 12),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: active ? FontWeight.w500 : FontWeight.w400,
                    color: active ? AppTheme.primary : const Color(0xFF374151),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    void push(Widget screen) {
      navigator.pop();
      navigator.push(MaterialPageRoute(builder: (_) => screen));
    }

    final initials = (customer?.name ?? 'CL')
        .trim()
        .split(RegExp(r'\s+'))
        .where((word) => word.isNotEmpty)
        .map((word) => word[0])
        .take(2)
        .join()
        .toUpperCase();

    return Align(
      alignment: Alignment.centerRight,
      child: Container(
        width: width * 0.85 > 320 ? 320 : width * 0.85,
        height: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: const Alignment(-0.57, -1),
            end: const Alignment(0.57, 1),
            colors: [
              Colors.white.withValues(alpha: 0.96),
              Colors.white.withValues(alpha: 0.9),
            ],
          ),
          borderRadius: const BorderRadius.horizontal(
            left: Radius.circular(28),
          ),
          border: Border.all(color: Colors.white.withValues(alpha: 0.76)),
          boxShadow: [
            BoxShadow(
              color: AppTheme.ink.withValues(alpha: 0.7),
              offset: const Offset(0, 32),
              blurRadius: 90,
              spreadRadius: -36,
            ),
          ],
        ),
        child: Material(
          type: MaterialType.transparency,
          child: SafeArea(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 8, 12),
                  child: Row(
                    children: [
                      const Expanded(
                        child: Text(
                          'Menu',
                          style: TextStyle(
                            fontFamily: AppTheme.headingFont,
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.slate950,
                          ),
                        ),
                      ),
                      IconButton(
                        tooltip: 'Fechar menu',
                        icon: const Icon(LucideIcons.x, size: 20),
                        onPressed: () => navigator.pop(),
                      ),
                    ],
                  ),
                ),
                const Divider(),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        AppTheme.primary.withValues(alpha: 0.1),
                        AppTheme.primary.withValues(alpha: 0.05),
                      ],
                    ),
                  ),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 28,
                        backgroundColor: AppTheme.primary,
                        child: Text(
                          initials,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              customer?.name ?? '',
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF111827),
                              ),
                            ),
                            Text(
                              customer?.email ?? '',
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 13,
                                color: Color(0xFF4B5563),
                              ),
                            ),
                            if (customer != null) ...[
                              const SizedBox(height: 4),
                              StatusChip(
                                'Cliente ${customer.levelLabel}',
                                tone: _levelTone(customer.level),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const Divider(),
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.all(8),
                    children: [
                      item(
                        LucideIcons.gift,
                        'Benefícios',
                        () => navigator.pop(Section.benefits),
                        active: current == Section.benefits,
                      ),
                      const SizedBox(height: 4),
                      item(
                        LucideIcons.user,
                        'Conta',
                        () => navigator.pop(Section.account),
                        active: current == Section.account,
                      ),
                      const SizedBox(height: 4),
                      item(
                        LucideIcons.lock,
                        'Alterar senha',
                        () => push(const ChangePasswordPage()),
                      ),
                      const SizedBox(height: 4),
                      item(
                        LucideIcons.shield,
                        'Privacidade',
                        () => push(const PrivacyScreen()),
                      ),
                    ],
                  ),
                ),
                const Divider(),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(
                        color: AppTheme.primary.withValues(alpha: 0.2),
                      ),
                    ),
                    onPressed: () => _logout(context, ref),
                    icon: const Icon(LucideIcons.logOut),
                    label: const Text('Sair da Conta'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Cor do selo de nível, como `getMembershipLevel` do PWA.
StatusTone _levelTone(String level) => switch (level) {
      'PLATINUM' => StatusTone.purple,
      'GOLD' => StatusTone.warning,
      'SILVER' => StatusTone.neutral,
      _ => StatusTone.orange,
    };
