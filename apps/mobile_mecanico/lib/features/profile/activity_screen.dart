import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';

class ActivityScreen extends ConsumerWidget {
  const ActivityScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Histórico de atividades')),
      body: AsyncPage<List<Activity>>(
        value: ref.watch(activityProvider),
        onRefresh: () => ref.refresh(activityProvider.future),
        isEmpty: (items) => items.isEmpty,
        emptyIcon: Icons.history,
        emptyMessage: 'Seu histórico aparece aqui.',
        builder: (items) => [
          for (final item in items)
            Card(
              child: ListTile(
                title: Text(item.vehicleInfo),
                subtitle: Text(
                  '${item.customerName}\n${formatDateTime(item.date)}',
                ),
                isThreeLine: true,
                trailing: StatusChip(
                  item.status == 'COMPLETED' ? 'Concluída' : 'Em andamento',
                  tone: item.status == 'COMPLETED'
                      ? StatusTone.success
                      : StatusTone.info,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
