import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../../shared/ui.dart';
import 'revision_details_screen.dart';
import 'revision_edit_screen.dart';

/// Revisões do mecânico (`MechanicRevisionsView`): próximos agendamentos,
/// números do dia e a lista com filtro por status.
class RevisionsTab extends ConsumerStatefulWidget {
  const RevisionsTab({super.key});

  @override
  ConsumerState<RevisionsTab> createState() => _RevisionsTabState();
}

const _filters = [null, 'DRAFT', 'IN_PROGRESS', 'COMPLETED'];
const _filterLabels = ['Todas', 'Pendentes', 'Em andamento', 'Concluídas'];
const _emptyMessages = [
  'Nenhuma revisão atribuída.',
  'Nenhuma revisão pendente.',
  'Nenhuma revisão em andamento.',
  'Nenhuma revisão concluída ainda.',
];

class _RevisionsTabState extends ConsumerState<RevisionsTab> {
  int _filter = 0;
  String? _busyId;

  Future<void> _run(String id, Future<void> Function() action, String ok) async {
    setState(() => _busyId = id);
    final done = await runAction(context, action, success: ok);
    if (!mounted) return;
    setState(() => _busyId = null);
    if (done) ref.invalidate(revisionQueueProvider);
  }

  Future<void> _push(Widget screen) async {
    await Navigator.of(context).push(MaterialPageRoute(builder: (_) => screen));
    if (mounted) ref.invalidate(revisionQueueProvider);
  }

  @override
  Widget build(BuildContext context) {
    final api = ref.read(apiProvider);
    final value = ref.watch(revisionQueueProvider);
    return AsyncPage<RevisionQueue>(
      value: value,
      onRefresh: () => ref.refresh(revisionQueueProvider.future),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      builder: (queue) {
        final revisions = queue.revisions;
        int count(String status) =>
            revisions.where((r) => r.status == status).length;
        final today = DateUtils.dateOnly(DateTime.now());
        final completedToday = revisions
            .where(
              (r) =>
                  r.status == 'COMPLETED' &&
                  r.completedAt != null &&
                  DateUtils.dateOnly(r.completedAt!) == today,
            )
            .length;
        final status = _filters[_filter];
        final visible = status == null
            ? revisions
            : revisions.where((r) => r.status == status).toList();

        return [
          if (queue.appointments.isNotEmpty)
            GlassCard(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Próximos Agendamentos',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 20),
                  for (final appointment in queue.appointments) ...[
                    _AppointmentCard(
                      appointment: appointment,
                      busy: _busyId == appointment.id,
                      onStart: () => _run(
                        appointment.id,
                        () => api.startAppointment(appointment.id),
                        'Revisão iniciada a partir do agendamento',
                      ),
                    ),
                    if (appointment != queue.appointments.last)
                      const SizedBox(height: 12),
                  ],
                ],
              ),
            ),
          _StatCard(
            title: 'Agendados',
            value: queue.appointments.length,
            caption: 'Fila de hoje e próximos horários',
            icon: LucideIcons.clock,
            color: const Color(0xFF6366F1),
          ),
          _StatCard(
            title: 'Pendentes',
            value: count('DRAFT'),
            caption: 'Aguardando início',
            icon: LucideIcons.circleAlert,
            color: const Color(0xFFEAB308),
          ),
          _StatCard(
            title: 'Em andamento',
            value: count('IN_PROGRESS'),
            caption: 'Trabalhos ativos',
            icon: LucideIcons.clock,
            color: const Color(0xFF3B82F6),
          ),
          _StatCard(
            title: 'Concluídas hoje',
            value: completedToday,
            caption: 'Trabalhos finalizados',
            icon: LucideIcons.circleCheck,
            color: const Color(0xFF22C55E),
          ),
          _StatCard(
            title: 'Total de revisões',
            value: revisions.length,
            caption: 'Todas as atribuídas',
          ),
          GlassCard(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                FilterPills(
                  labels: _filterLabels,
                  counts: [
                    revisions.length,
                    count('DRAFT'),
                    count('IN_PROGRESS'),
                    count('COMPLETED'),
                  ],
                  index: _filter,
                  onChanged: (index) => setState(() => _filter = index),
                ),
                const SizedBox(height: 20),
                if (visible.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 32),
                    child: EmptyState(
                      icon: LucideIcons.fileText,
                      message: _emptyMessages[_filter],
                    ),
                  ),
                for (final revision in visible) ...[
                  _RevisionCard(
                    revision: revision,
                    busy: _busyId == revision.id,
                    onView: () =>
                        _push(RevisionDetailsScreen(revisionId: revision.id)),
                    onEdit: () =>
                        _push(RevisionEditScreen(revisionId: revision.id)),
                    onStart: () => _run(
                      revision.id,
                      () => api.startRevision(revision.id),
                      'Revisão iniciada',
                    ),
                    // Concluir passa pelo orçamento: é ele que cria a OS.
                    onComplete: () => _push(
                      RevisionEditScreen(
                        revisionId: revision.id,
                        openBudget: true,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
              ],
            ),
          ),
          Center(
            child: FilledButton(
              onPressed: value.isLoading
                  ? null
                  : () => ref.invalidate(revisionQueueProvider),
              child: Text(value.isLoading ? 'Atualizando...' : 'Atualizar lista'),
            ),
          ),
        ];
      },
    );
  }
}

/// Cartão de número (`Card` com título, ícone colorido, valor e legenda).
class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.title,
    required this.value,
    required this.caption,
    this.icon,
    this.color = AppTheme.primary,
  });

  final String title;
  final int value;
  final String caption;
  final IconData? icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: AppTheme.slate950,
                  ),
                ),
              ),
              if (icon != null) Icon(icon, size: 16, color: color),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            '$value',
            style: const TextStyle(
              fontSize: 30,
              fontWeight: FontWeight.w700,
              height: 1.2,
              color: AppTheme.slate950,
            ),
          ),
          Text(
            caption,
            style: const TextStyle(fontSize: 12, color: gray600),
          ),
        ],
      ),
    );
  }
}

class _AppointmentCard extends StatelessWidget {
  const _AppointmentCard({
    required this.appointment,
    required this.busy,
    required this.onStart,
  });

  final Appointment appointment;
  final bool busy;
  final VoidCallback onStart;

  @override
  Widget build(BuildContext context) {
    final vehicle = appointment.vehicle;
    final when = appointment.scheduledAt == null
        ? 'Sem horário confirmado'
        : formatDateTime(appointment.scheduledAt);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.primary.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.primary.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            '${appointment.customer?.name ?? 'Cliente'} • '
            '${vehicle?.label ?? 'Veículo'}',
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppTheme.slate950,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '${vehicle?.plate ?? ''} • $when',
            style: const TextStyle(fontSize: 14, color: gray600),
          ),
          if ((appointment.notes ?? '').isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              appointment.notes!,
              style: const TextStyle(fontSize: 14, color: gray600),
            ),
          ],
          const SizedBox(height: 12),
          const StatusChip('Agendado', tone: StatusTone.info),
          const SizedBox(height: 8),
          BusyButton(label: 'Iniciar revisão', busy: busy, onPressed: onStart),
        ],
      ),
    );
  }
}

/// Cartão de revisão no formato móvel do `RevisionCard`.
class _RevisionCard extends StatelessWidget {
  const _RevisionCard({
    required this.revision,
    required this.busy,
    required this.onView,
    required this.onEdit,
    required this.onStart,
    required this.onComplete,
  });

  final Revision revision;
  final bool busy;
  final VoidCallback onView;
  final VoidCallback onEdit;
  final VoidCallback onStart;
  final VoidCallback onComplete;

  @override
  Widget build(BuildContext context) {
    final vehicle = revision.vehicle;
    final customer = revision.customer;
    final open = revision.status == 'DRAFT' || revision.status == 'IN_PROGRESS';
    final blue = compact(
      OutlinedButton.styleFrom(foregroundColor: const Color(0xFF2563EB)),
    );
    final buttons = <Widget>[
      OutlinedButton.icon(
        style: compact(null),
        onPressed: onView,
        icon: const Icon(LucideIcons.eye),
        label: const Text('Ver'),
      ),
      if (open)
        OutlinedButton.icon(
          style: blue,
          onPressed: busy ? null : onEdit,
          icon: const Icon(LucideIcons.squarePen),
          label: Text(revision.status == 'DRAFT' ? 'Editar' : 'Continuar'),
        ),
      if (revision.status == 'DRAFT')
        OutlinedButton.icon(
          style: blue,
          onPressed: busy ? null : onStart,
          icon: const Icon(LucideIcons.play),
          label: const Text('Iniciar'),
        ),
      if (revision.status == 'IN_PROGRESS')
        OutlinedButton.icon(
          style: compact(successOutlined),
          onPressed: busy ? null : onComplete,
          icon: const Icon(LucideIcons.circleCheck),
          label: const Text('Concluir'),
        ),
    ];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.7),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.white),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              revisionStatusChip(revision.status),
              const Spacer(),
              const Icon(LucideIcons.calendar, size: 14, color: gray400),
              const SizedBox(width: 4),
              Flexible(
                child: Text(
                  formatDate(revision.date),
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12, color: gray600),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _PersonLine(
            icon: LucideIcons.user,
            title: customer?.name ?? 'N/A',
            subtitle: (customer?.phone ?? '').isNotEmpty
                ? customer!.phone!
                : customer?.email ?? '',
          ),
          const SizedBox(height: 10),
          _PersonLine(
            icon: LucideIcons.car,
            title: vehicle?.label ?? 'N/A',
            subtitle: 'Placa: ${vehicle?.plate ?? 'N/A'}',
          ),
          const SizedBox(height: 12),
          const Divider(),
          const SizedBox(height: 12),
          Wrap(spacing: 8, runSpacing: 8, children: buttons),
        ],
      ),
    );
  }
}

class _PersonLine extends StatelessWidget {
  const _PersonLine({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 2),
          child: Icon(icon, size: 16, color: gray400),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: AppTheme.slate950,
                ),
              ),
              if (subtitle.isNotEmpty)
                Text(
                  subtitle,
                  style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280)),
                ),
            ],
          ),
        ),
      ],
    );
  }
}
