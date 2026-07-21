import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/sections.dart';
import '../auth/auth_controller.dart';

/// Tela inicial após o login: grade de atalhos para as seções do painel.
class HomeShell extends ConsumerWidget {
  const HomeShell({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final admin = ref.watch(authControllerProvider).admin;
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('M2 Auto Hub'),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.account_circle),
            onSelected: (v) async {
              if (v == 'logout') {
                await ref.read(authControllerProvider.notifier).logout();
              }
            },
            itemBuilder: (context) => [
              PopupMenuItem<String>(
                enabled: false,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(admin?.name ?? 'Admin',
                        style: theme.textTheme.titleSmall),
                    Text(admin?.email ?? '',
                        style: theme.textTheme.bodySmall),
                  ],
                ),
              ),
              const PopupMenuDivider(),
              const PopupMenuItem<String>(
                value: 'logout',
                child: ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(Icons.logout),
                  title: Text('Sair'),
                ),
              ),
            ],
          ),
        ],
      ),
      body: GridView.count(
        crossAxisCount: 2,
        padding: const EdgeInsets.all(16),
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 1.1,
        children: [
          for (final section in kAdminSections)
            _SectionCard(
              section: section,
              onTap: () => context.push(section.route),
            ),
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.section, required this.onTap});

  final AdminSection section;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(section.icon, size: 40, color: theme.colorScheme.primary),
              const SizedBox(height: 12),
              Text(
                section.label,
                textAlign: TextAlign.center,
                style: theme.textTheme.titleSmall,
              ),
              if (!section.implemented) ...[
                const SizedBox(height: 6),
                Text(
                  'em breve',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
