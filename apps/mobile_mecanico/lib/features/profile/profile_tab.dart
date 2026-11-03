import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../../shared/stat_tile.dart';
import '../auth/auth_controller.dart';
import 'activity_screen.dart';
import 'edit_profile_screen.dart';
import 'preferences_screen.dart';

class ProfileTab extends ConsumerWidget {
  const ProfileTab({super.key});

  Future<void> _logout(BuildContext context, WidgetRef ref) async {
    final accepted = await confirm(
      context,
      title: 'Sair da conta?',
      message: 'Você vai precisar entrar de novo para ver seu trabalho.',
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
    final mechanic = ref.watch(authControllerProvider).mechanic;
    final navigator = Navigator.of(context);

    void open(Widget screen) =>
        navigator.push(MaterialPageRoute(builder: (_) => screen));

    return AsyncPage<MechanicStats>(
      value: ref.watch(statsProvider),
      onRefresh: () => ref.refresh(statsProvider.future),
      builder: (stats) => [
        if (mechanic != null)
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: CircleAvatar(
              child: Text(
                mechanic.name.isEmpty ? '?' : mechanic.name[0].toUpperCase(),
              ),
            ),
            title: Text(mechanic.name),
            subtitle: Text(mechanic.email),
          ),
        StatRow(
          stats: [
            ('Revisões', stats.total),
            ('Concluídas', stats.completed),
            ('Em andamento', stats.inProgress),
            ('Taxa %', stats.completionRate.round()),
          ],
        ),
        Card(
          clipBehavior: Clip.antiAlias,
          child: Column(
            children: [
              _Item(
                Icons.person_outline,
                'Dados da conta',
                () => open(const EditProfileScreen()),
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
              _Item(
                Icons.history,
                'Histórico de atividades',
                () => open(const ActivityScreen()),
              ),
              _Item(
                Icons.tune,
                'Preferências',
                () => open(const PreferencesScreen()),
              ),
              _Item(
                Icons.shield_outlined,
                'Aviso de privacidade',
                () => launchUrl(
                  Uri.parse('${Env.siteUrl}/privacidade'),
                  mode: LaunchMode.externalApplication,
                ),
              ),
            ],
          ),
        ),
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
