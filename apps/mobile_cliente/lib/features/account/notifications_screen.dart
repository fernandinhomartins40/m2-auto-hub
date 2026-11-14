import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';

/// Aba Notificações da Conta (`CustomerNotifications` do PWA).
class NotificationsList extends ConsumerWidget {
  const NotificationsList({super.key, required this.tabs});

  final Widget tabs;

  Future<void> _update(
    BuildContext context,
    WidgetRef ref,
    Future<void> Function() action,
  ) async {
    final done = await runAction(context, action);
    if (done) {
      ref.invalidate(notificationsProvider);
      ref.invalidate(unreadCountProvider);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifications = ref.watch(notificationsProvider);
    final api = ref.read(apiProvider);
    final unread =
        notifications.value?.where((item) => !item.read).length ?? 0;

    return AsyncPage<List<AppNotification>>(
      value: notifications,
      onRefresh: () => ref.refresh(notificationsProvider.future),
      header: [
        tabs,
        PanelPageHeader(
          icon: LucideIcons.bell,
          title: 'Notificações',
          description: unread == 0
              ? 'Você está em dia com suas atualizações'
              : unread == 1
                  ? '1 atualização não lida'
                  : '$unread atualizações não lidas',
          actions: [
            if (unread > 0)
              OutlinedButton.icon(
                onPressed: () => _update(context, ref, api.markAllRead),
                icon: const Icon(LucideIcons.checkCheck),
                label: const Text('Marcar todas como lidas'),
              ),
          ],
        ),
      ],
      isEmpty: (items) => items.isEmpty,
      emptyIcon: LucideIcons.bellOff,
      emptyMessage: 'Nenhuma notificação encontrada',
      builder: (items) => [
        for (final item in items)
          GlassCard(
            padding: const EdgeInsets.fromLTRB(20, 20, 12, 20),
            color: item.read ? null : const Color(0xFFF5F9FF),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.title,
                        style: TextStyle(
                          fontFamily: AppTheme.headingFont,
                          fontSize: 16,
                          fontWeight:
                              item.read ? FontWeight.w600 : FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        item.message,
                        style: const TextStyle(
                          color: AppTheme.mutedForeground,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        formatDateTime(item.createdAt),
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppTheme.mutedForeground,
                        ),
                      ),
                    ],
                  ),
                ),
                if (!item.read)
                  IconButton(
                    tooltip: 'Marcar como lida',
                    icon: const Icon(LucideIcons.eye, size: 18),
                    onPressed: () =>
                        _update(context, ref, () => api.markRead(item.id)),
                  ),
              ],
            ),
          ),
      ],
    );
  }
}
