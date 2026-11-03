import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

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
    final hasUnread =
        notifications.value?.any((item) => !item.read) ?? false;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notificações'),
        actions: [
          if (hasUnread)
            IconButton(
              tooltip: 'Marcar todas como lidas',
              icon: const Icon(Icons.done_all),
              onPressed: () => _update(context, ref, api.markAllRead),
            ),
        ],
      ),
      body: AsyncPage<List<AppNotification>>(
        value: notifications,
        onRefresh: () => ref.refresh(notificationsProvider.future),
        isEmpty: (items) => items.isEmpty,
        emptyIcon: Icons.notifications_none,
        emptyMessage: 'Você está em dia com suas atualizações.',
        builder: (items) => [
          for (final item in items)
            Card(
              clipBehavior: Clip.antiAlias,
              child: ListTile(
                leading: Icon(
                  item.read ? Icons.drafts_outlined : Icons.mail,
                  color: item.read
                      ? null
                      : Theme.of(context).colorScheme.primary,
                ),
                title: Text(item.title),
                subtitle: Text(
                  '${item.message}\n${formatDateTime(item.createdAt)}',
                ),
                isThreeLine: true,
                onTap: item.read
                    ? null
                    : () => _update(context, ref, () => api.markRead(item.id)),
              ),
            ),
        ],
      ),
    );
  }
}
