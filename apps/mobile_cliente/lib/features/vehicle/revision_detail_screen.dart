import 'package:flutter/material.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';

class RevisionDetailScreen extends StatelessWidget {
  const RevisionDetailScreen({super.key, required this.revision});

  final Revision revision;

  @override
  Widget build(BuildContext context) {
    final (label, tone) = revision.statusView;
    final evaluated = revision.checks.where((check) => check.evaluated);
    final byCategory = <String, List<RevisionCheck>>{};
    for (final check in evaluated) {
      byCategory.putIfAbsent(check.category, () => []).add(check);
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Revisão')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: StatusChip(label, tone: tone),
          ),
          const SizedBox(height: 12),
          InfoRow('Data', formatDate(revision.date)),
          if (revision.vehicle != null)
            InfoRow('Veículo', revision.vehicle!.label),
          InfoRow('Quilometragem', formatKm(revision.mileage)),
          if ((revision.mechanicName ?? '').isNotEmpty)
            InfoRow('Mecânico', revision.mechanicName!),
          if ((revision.recommendations ?? '').isNotEmpty) ...[
            const SizedBox(height: 12),
            const SectionTitle('Recomendações'),
            const SizedBox(height: 4),
            Text(revision.recommendations!),
          ],
          if ((revision.generalNotes ?? '').isNotEmpty) ...[
            const SizedBox(height: 12),
            const SectionTitle('Observações'),
            const SizedBox(height: 4),
            Text(revision.generalNotes!),
          ],
          const Divider(height: 32),
          if (byCategory.isEmpty)
            const Text('Os itens avaliados aparecem aqui.'),
          for (final entry in byCategory.entries) ...[
            SectionTitle(entry.key),
            const SizedBox(height: 4),
            for (final check in entry.value) _CheckRow(check: check),
            const SizedBox(height: 12),
          ],
        ],
      ),
    );
  }
}

class _CheckRow extends StatelessWidget {
  const _CheckRow({required this.check});

  final RevisionCheck check;

  @override
  Widget build(BuildContext context) {
    final (label, tone) = check.statusView;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(check.name),
                if ((check.notes ?? '').isNotEmpty)
                  Text(
                    check.notes!,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          StatusChip(label, tone: tone),
        ],
      ),
    );
  }
}
