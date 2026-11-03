import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../../shared/stat_tile.dart';
import 'revision_edit_screen.dart';

class RevisionsTab extends ConsumerStatefulWidget {
  const RevisionsTab({super.key});

  @override
  ConsumerState<RevisionsTab> createState() => _RevisionsTabState();
}

class _RevisionsTabState extends ConsumerState<RevisionsTab> {
  String? _filter;
  String? _busyId;

  Future<void> _run(String id, Future<void> Function() action, String ok) async {
    setState(() => _busyId = id);
    final done = await runAction(context, action, success: ok);
    if (!mounted) return;
    setState(() => _busyId = null);
    if (done) ref.invalidate(revisionQueueProvider);
  }

  Future<void> _open(Revision revision) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => RevisionEditScreen(revisionId: revision.id),
      ),
    );
    if (mounted) ref.invalidate(revisionQueueProvider);
  }

  @override
  Widget build(BuildContext context) {
    final api = ref.read(apiProvider);
    return AsyncPage<RevisionQueue>(
      value: ref.watch(revisionQueueProvider),
      onRefresh: () => ref.refresh(revisionQueueProvider.future),
      isEmpty: (queue) =>
          queue.revisions.isEmpty && queue.appointments.isEmpty,
      emptyIcon: Icons.fact_check_outlined,
      emptyMessage: 'Nenhuma revisão atribuída a você.',
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
        final visible = _filter == null
            ? revisions
            : revisions.where((r) => r.status == _filter).toList();

        return [
          StatRow(
            stats: [
              ('Agendados', queue.appointments.length),
              ('Pendentes', count('DRAFT')),
              ('Em andamento', count('IN_PROGRESS')),
              ('Concluídas hoje', completedToday),
            ],
          ),
          for (final appointment in queue.appointments)
            _AppointmentCard(
              appointment: appointment,
              busy: _busyId == appointment.id,
              onStart: () => _run(
                appointment.id,
                () => api.startAppointment(appointment.id),
                'Revisão iniciada',
              ),
            ),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: SegmentedButton<String?>(
              showSelectedIcon: false,
              segments: const [
                ButtonSegment(value: null, label: Text('Todas')),
                ButtonSegment(value: 'DRAFT', label: Text('Pendentes')),
                ButtonSegment(value: 'IN_PROGRESS', label: Text('Andamento')),
                ButtonSegment(value: 'COMPLETED', label: Text('Concluídas')),
              ],
              selected: {_filter},
              onSelectionChanged: (value) =>
                  setState(() => _filter = value.first),
            ),
          ),
          if (visible.isEmpty)
            const EmptyState(
              icon: Icons.filter_list_off,
              message: 'Nenhuma revisão neste filtro.',
            ),
          for (final revision in visible)
            _RevisionCard(
              revision: revision,
              busy: _busyId == revision.id,
              onOpen: () => _open(revision),
              onStart: () => _run(
                revision.id,
                () => api.startRevision(revision.id),
                'Revisão iniciada',
              ),
            ),
        ];
      },
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
    return Card(
      color: Theme.of(context).colorScheme.primaryContainer,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              '${appointment.customer?.name ?? 'Cliente'} · '
              '${vehicle?.label ?? 'Veículo'}',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 4),
            Text(
              '${vehicle?.plate ?? ''} · '
              '${formatDateTime(appointment.scheduledAt)}',
            ),
            if ((appointment.notes ?? '').isNotEmpty) Text(appointment.notes!),
            const SizedBox(height: 12),
            BusyButton(label: 'Iniciar revisão', busy: busy, onPressed: onStart),
          ],
        ),
      ),
    );
  }
}

class _RevisionCard extends StatelessWidget {
  const _RevisionCard({
    required this.revision,
    required this.busy,
    required this.onOpen,
    required this.onStart,
  });

  final Revision revision;
  final bool busy;
  final VoidCallback onOpen;
  final VoidCallback onStart;

  @override
  Widget build(BuildContext context) {
    final (label, tone) = revision.statusView;
    final vehicle = revision.vehicle;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onOpen,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      vehicle?.label ?? 'Veículo',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  ),
                  StatusChip(label, tone: tone),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                '${vehicle?.plate ?? ''} · ${revision.customer?.name ?? ''}',
              ),
              Text(formatDate(revision.date)),
              if (revision.status == 'DRAFT') ...[
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: busy ? null : onStart,
                  icon: const Icon(Icons.play_arrow),
                  label: const Text('Iniciar'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
