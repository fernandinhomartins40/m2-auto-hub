import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/providers.dart';
import '../auth/auth_controller.dart';
import '../support/support_screen.dart';
import 'addresses_screen.dart';
import 'notifications_screen.dart';
import 'privacy_screen.dart';
import 'profile_screen.dart';

class AccountTab extends ConsumerWidget {
  const AccountTab({super.key});

  Future<void> _logout(BuildContext context, WidgetRef ref) async {
    final accepted = await confirm(
      context,
      title: 'Sair da conta?',
      message: 'Você vai precisar entrar de novo para ver seus dados.',
      confirmLabel: 'Sair',
    );
    if (accepted) await ref.read(authControllerProvider.notifier).logout();
  }

  Future<void> _changePassword(
    NavigatorState navigator,
    WidgetRef ref,
    String current,
    String next,
  ) async {
    await ref.read(apiProvider).changePassword(current, next);
    navigator.pop();
    await ref.read(authControllerProvider.notifier).logout();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final customer = ref.watch(authControllerProvider).customer;
    final navigator = Navigator.of(context);

    void open(Widget screen) =>
        navigator.push(MaterialPageRoute(builder: (_) => screen));

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (customer != null)
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: CircleAvatar(
              child: Text(
                customer.name.isEmpty ? '?' : customer.name[0].toUpperCase(),
              ),
            ),
            title: Text(customer.name),
            subtitle: Text(customer.email),
          ),
        const SizedBox(height: 8),
        Card(
          clipBehavior: Clip.antiAlias,
          child: Column(
            children: [
              _Item(
                Icons.person_outline,
                'Dados pessoais',
                () => open(const ProfileScreen()),
              ),
              _Item(
                Icons.place_outlined,
                'Endereços',
                () => open(const AddressesScreen()),
              ),
              _Item(
                Icons.notifications_outlined,
                'Notificações',
                () => open(const NotificationsScreen()),
              ),
              _Item(
                Icons.lock_outline,
                'Alterar senha',
                () => open(
                  ChangePasswordScreen(
                    onSubmit: (current, next) =>
                        _changePassword(navigator, ref, current, next),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Card(
          clipBehavior: Clip.antiAlias,
          child: Column(
            children: [
              _Item(
                Icons.support_agent,
                'Ajuda',
                () => open(const SupportScreen()),
              ),
              _Item(
                Icons.shield_outlined,
                'Privacidade',
                () => open(const PrivacyScreen()),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: () => _logout(context, ref),
          icon: const Icon(Icons.logout),
          label: const Text('Sair'),
        ),
      ],
    );
  }
}

class _Item extends StatelessWidget {
  const _Item(this.icon, this.title, this.onTap);

  final IconData icon;
  final String title;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon),
      title: Text(title),
      trailing: const Icon(Icons.chevron_right),
      onTap: onTap,
    );
  }
}
