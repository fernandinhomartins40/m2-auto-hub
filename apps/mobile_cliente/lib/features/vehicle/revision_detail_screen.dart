import 'package:flutter/material.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../shared/ui.dart';

/// Detalhes da revisão (`RevisionDetailsDialog` do PWA).
class RevisionDetailScreen extends StatelessWidget {
  const RevisionDetailScreen({super.key, required this.revision});

  final Revision revision;

  @override
  Widget build(BuildContext context) {
    final evaluated = revision.checks.where((check) => check.evaluated);
    final byCategory = <String, List<RevisionCheck>>{};
    for (final check in evaluated) {
      byCategory.putIfAbsent(check.category, () => []).add(check);
    }
    final vehicle = revision.vehicle;

    Widget info(String label, String value, [IconData? icon]) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              color: AppTheme.mutedForeground,
            ),
          ),
          Row(
            children: [
              if (icon != null) ...[
                Icon(icon, size: 14),
                const SizedBox(width: 4),
              ],
              Flexible(
                child: Text(
                  value,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ],
      );
    }

    return PanelScaffold(
      appBar: const PanelAppBar(title: 'Detalhes da Revisão'),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
        children: [
          GlassCard(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const _Title(LucideIcons.car, 'Informações do Veículo',
                    color: AppTheme.primary),
                const SizedBox(height: 16),
                TwoColumnGrid(
                  gap: 16,
                  children: [
                    info('Veículo', vehicle?.label ?? '-'),
                    info('Ano', vehicle == null ? '-' : '${vehicle.year}'),
                    info('Placa', vehicle?.plate ?? '-'),
                    if ((vehicle?.color ?? '').isNotEmpty)
                      info('Cor', vehicle!.color),
                    if (revision.mileage != null)
                      info('Quilometragem', formatKm(revision.mileage),
                          LucideIcons.gauge),
                    info('Data da Revisão', formatDate(revision.date),
                        LucideIcons.calendar),
                    if ((revision.mechanicName ?? '').isNotEmpty)
                      info('Mecânico', revision.mechanicName!),
                  ],
                ),
              ],
            ),
          ),
          if ((revision.generalNotes ?? '').isNotEmpty) ...[
            const SizedBox(height: 16),
            GlassCard(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const _Title(LucideIcons.fileText, 'Observações Gerais'),
                  const SizedBox(height: 12),
                  Text(revision.generalNotes!, style: const TextStyle(fontSize: 14)),
                ],
              ),
            ),
          ],
          if ((revision.recommendations ?? '').isNotEmpty) ...[
            const SizedBox(height: 16),
            GlassCard(
              padding: const EdgeInsets.all(20),
              color: const Color(0xFFEFF6FF),
              borderColor: const Color(0xFFBFDBFE),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const _Title(LucideIcons.triangleAlert, 'Recomendações',
                      color: Color(0xFF1E3A8A)),
                  const SizedBox(height: 12),
                  Text(
                    revision.recommendations!,
                    style: const TextStyle(fontSize: 14, color: Color(0xFF1E3A8A)),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 24),
          Text(
            'Checklist Detalhado',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 12),
          if (byCategory.isEmpty)
            const NoticeBox(
              icon: LucideIcons.info,
              tone: StatusTone.neutral,
              child: Text('Os itens avaliados aparecem aqui.'),
            ),
          for (final entry in byCategory.entries) ...[
            GlassCard(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          entry.key,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                      ),
                      StatusChip(
                        '${entry.value.length} '
                        '${entry.value.length == 1 ? 'item' : 'itens'}',
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  for (final check in entry.value) ...[
                    _CheckRow(check: check),
                    const SizedBox(height: 12),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],
          GlassCard(
            color: const Color(0xFFF9FAFB),
            padding: const EdgeInsets.all(16),
            child: Text(
              'Revisão ID: ${revision.id}',
              style: const TextStyle(
                fontSize: 13,
                color: AppTheme.mutedForeground,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Title extends StatelessWidget {
  const _Title(this.icon, this.title, {this.color = AppTheme.slate950});

  final IconData icon;
  final String title;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 20, color: color),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            title,
            style: Theme.of(context)
                .textTheme
                .titleMedium
                ?.copyWith(color: color == AppTheme.primary ? null : color),
          ),
        ),
      ],
    );
  }
}

/// Item avaliado com borda e fundo da cor do status (`statusConfig`).
class _CheckRow extends StatelessWidget {
  const _CheckRow({required this.check});

  final RevisionCheck check;

  static const _styles = {
    'OK': (LucideIcons.circleCheck, Color(0xFF16A34A), Color(0xFFF0FDF4),
        Color(0xFF86EFAC), 'OK'),
    'ATTENTION': (LucideIcons.triangleAlert, Color(0xFFCA8A04),
        Color(0xFFFEFCE8), Color(0xFFFDE047), 'Atenção'),
    'CRITICAL': (LucideIcons.circleX, Color(0xFFDC2626), Color(0xFFFEF2F2),
        Color(0xFFFCA5A5), 'Crítico'),
    'NOT_APPLICABLE': (LucideIcons.circleMinus, Color(0xFF6B7280),
        Color(0xFFF9FAFB), Color(0xFFD1D5DB), 'Não se aplica'),
  };

  @override
  Widget build(BuildContext context) {
    final (icon, color, background, border, label) = _styles[check.status] ??
        (LucideIcons.circle, const Color(0xFF9CA3AF), const Color(0xFFF9FAFB),
            const Color(0xFFD1D5DB), 'Não verificado');
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: border, width: 2),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Icon(icon, size: 18, color: color),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        check.name,
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
                if ((check.notes ?? '').isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(color: AppTheme.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Observações:',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        Text(
                          check.notes!,
                          style: const TextStyle(
                            fontSize: 13,
                            color: Color(0xFF374151),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
            decoration: BoxDecoration(
              color: background,
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: border),
            ),
            child: Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: color,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
