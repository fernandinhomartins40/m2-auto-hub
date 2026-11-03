import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../../shared/ui.dart';
import 'revision_detail_screen.dart';
import 'schedule_revision_screen.dart';
import 'vehicle_form_screen.dart';

const _vehicleTabs = [WorkspaceTab('Veículos'), WorkspaceTab('Revisões')];

/// Meu veículo: Veículos e Revisões (`CustomerVehicles`, `CustomerRevisions`).
class VehicleTab extends StatelessWidget {
  const VehicleTab({super.key, required this.tab, required this.onTab});

  final int tab;
  final ValueChanged<int> onTab;

  @override
  Widget build(BuildContext context) {
    final tabs = WorkspaceTabs(tabs: _vehicleTabs, index: tab, onChanged: onTab);
    return tab == 0
        ? _Vehicles(key: const ValueKey('vehicles'), tabs: tabs)
        : _Revisions(key: const ValueKey('revisions'), tabs: tabs);
  }
}

class _Vehicles extends ConsumerWidget {
  const _Vehicles({super.key, required this.tabs});

  final Widget tabs;

  Future<void> _delete(BuildContext context, WidgetRef ref, Vehicle vehicle) async {
    final accepted = await confirm(
      context,
      title: 'Remover veículo?',
      message: '${vehicle.label} (${vehicle.plate}) sai da sua conta.',
      confirmLabel: 'Remover',
      destructive: true,
    );
    if (!accepted || !context.mounted) return;
    final done = await runAction(
      context,
      () => ref.read(apiProvider).deleteVehicle(vehicle.id),
      success: 'Veículo removido',
    );
    if (done) ref.invalidate(vehiclesProvider);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final navigator = Navigator.of(context);
    void openForm([Vehicle? vehicle]) => navigator.push(
          MaterialPageRoute(
            builder: (_) => VehicleFormScreen(vehicle: vehicle),
          ),
        );

    return AsyncPage<List<Vehicle>>(
      value: ref.watch(vehiclesProvider),
      onRefresh: () => ref.refresh(vehiclesProvider.future),
      header: [
        tabs,
        PanelPageHeader(
          icon: LucideIcons.car,
          title: 'Meus veículos',
          description: 'Gerencie seus veículos cadastrados',
          actions: [
            FilledButton.icon(
              onPressed: openForm,
              icon: const Icon(LucideIcons.plus),
              label: const Text('Cadastrar Veículo'),
            ),
          ],
        ),
        const NoticeBox(
          icon: LucideIcons.circleAlert,
          tone: StatusTone.neutral,
          child: Text(
            'Cadastre seus veículos para facilitar o agendamento de revisões '
            'e acompanhar o histórico de manutenções.',
          ),
        ),
      ],
      isEmpty: (vehicles) => vehicles.isEmpty,
      emptyIcon: LucideIcons.car,
      emptyMessage: 'Nenhum veículo cadastrado ainda.',
      builder: (vehicles) => [
        for (final vehicle in vehicles)
          _VehicleCard(
            vehicle: vehicle,
            onSchedule: () => navigator.push(
              MaterialPageRoute(
                builder: (_) => ScheduleRevisionScreen(vehicle: vehicle),
              ),
            ),
            onEdit: () => openForm(vehicle),
            onDelete: () => _delete(context, ref, vehicle),
          ),
      ],
    );
  }
}

class _VehicleCard extends StatelessWidget {
  const _VehicleCard({
    required this.vehicle,
    required this.onSchedule,
    required this.onEdit,
    required this.onDelete,
  });

  final Vehicle vehicle;
  final VoidCallback onSchedule;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    const muted = TextStyle(fontSize: 13, color: AppTheme.mutedForeground);
    const strong = TextStyle(
      fontSize: 15,
      fontWeight: FontWeight.w600,
      color: AppTheme.slate950,
    );
    return GlassCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const IconTile(icon: LucideIcons.car, size: 48),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      vehicle.label,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 8,
                      children: [
                        PlateChip(vehicle.plate),
                        const Text('•', style: muted),
                        Text('Ano: ${vehicle.year}', style: muted),
                      ],
                    ),
                    if (vehicle.color.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text('Cor: ${vehicle.color}', style: muted),
                    ],
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Row(
                  children: [
                    const Icon(LucideIcons.gauge,
                        size: 16, color: AppTheme.mutedForeground),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Quilometragem', style: muted),
                          Text(formatKm(vehicle.mileage), style: strong),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              if (vehicle.createdAt != null)
                Expanded(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Padding(
                        padding: EdgeInsets.only(top: 18),
                        child: Icon(LucideIcons.calendar,
                            size: 16, color: AppTheme.mutedForeground),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Cadastrado em', style: muted),
                            Text(
                              DateFormat("dd 'de' MMMM 'de' y", 'pt_BR')
                                  .format(vehicle.createdAt!),
                              style: strong,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
          const Divider(height: 32),
          FilledButton.icon(
            onPressed: onSchedule,
            icon: const Icon(LucideIcons.clipboardCheck),
            label: const Text('Agendar Revisão'),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: onEdit,
                  icon: const Icon(LucideIcons.squarePen),
                  label: const Text('Editar'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  style: dangerOutline(),
                  onPressed: onDelete,
                  icon: const Icon(LucideIcons.trash2),
                  label: const Text('Remover'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _RevisionsData {
  const _RevisionsData(this.appointments, this.revisions);

  final List<Appointment> appointments;
  final List<Revision> revisions;
}

final _revisionsDataProvider = FutureProvider.autoDispose<_RevisionsData>(
  (ref) async {
    final appointments = ref.watch(appointmentsProvider.future);
    final revisions = ref.watch(revisionsProvider.future);
    return _RevisionsData(await appointments, await revisions);
  },
);

class _Revisions extends ConsumerStatefulWidget {
  const _Revisions({super.key, required this.tabs});

  final Widget tabs;

  @override
  ConsumerState<_Revisions> createState() => _RevisionsState();
}

class _RevisionsState extends ConsumerState<_Revisions> {
  /// 0 agendamentos, 1 todas, 2 concluídas, 3 em andamento.
  int _filter = 0;

  Future<void> _cancel(Appointment appointment) async {
    final accepted = await confirm(
      context,
      title: 'Cancelar solicitação?',
      message: 'A oficina será avisada do cancelamento.',
      confirmLabel: 'Cancelar solicitação',
      destructive: true,
    );
    if (!accepted || !mounted) return;
    final done = await runAction(
      context,
      () => ref.read(apiProvider).cancelAppointment(appointment.id),
      success: 'Agendamento cancelado',
    );
    if (done) ref.invalidate(appointmentsProvider);
  }

  Future<void> _refresh() async {
    ref.invalidate(appointmentsProvider);
    ref.invalidate(revisionsProvider);
    await ref
        .read(_revisionsDataProvider.future)
        .then<void>((_) {}, onError: (_) {});
  }

  @override
  Widget build(BuildContext context) {
    final value = ref.watch(_revisionsDataProvider);
    final data = value.value;
    final revisions = data?.revisions ?? const <Revision>[];
    final appointments = data?.appointments ?? const <Appointment>[];
    final completed = revisions.where((r) => r.status == 'COMPLETED').toList();
    final inProgress =
        revisions.where((r) => r.status == 'IN_PROGRESS').toList();

    return AsyncPage<_RevisionsData>(
      value: value,
      onRefresh: _refresh,
      header: [
        widget.tabs,
        const PanelPageHeader(
          icon: LucideIcons.clipboardCheck,
          title: 'Minhas revisões',
          description: 'Acompanhe seus agendamentos, histórico de revisões e '
              'alertas importantes',
        ),
        ..._alerts(completed),
        _FilterPills(
          index: _filter,
          onChanged: (index) => setState(() => _filter = index),
          labels: [
            'Agendamentos (${appointments.length})',
            'Todas (${revisions.length})',
            'Concluídas (${completed.length})',
            'Em andamento (${inProgress.length})',
          ],
        ),
      ],
      builder: (data) {
        if (_filter == 0) return _appointments(data.appointments);
        final list = switch (_filter) {
          2 => completed,
          3 => inProgress,
          _ => data.revisions,
        };
        if (list.isEmpty) {
          return const [
            _EmptyCard(
              icon: LucideIcons.clipboardCheck,
              title: 'Nenhuma revisão encontrada',
              message: 'Suas revisões aparecerão aqui.',
            ),
          ];
        }
        return [for (final revision in list) _RevisionCard(revision: revision)];
      },
    );
  }

  /// Itens críticos e de atenção da revisão concluída mais recente de cada
  /// veículo, como os alertas do topo do PWA.
  List<Widget> _alerts(List<Revision> completed) {
    final latest = <String, Revision>{};
    for (final revision in completed) {
      final key = revision.vehicle?.plate ?? revision.id;
      final current = latest[key];
      if (current == null ||
          (revision.date ?? DateTime(0)).isAfter(current.date ?? DateTime(0))) {
        latest[key] = revision;
      }
    }
    final widgets = <Widget>[];
    for (final revision in latest.values) {
      for (final (status, tone, icon, title) in const [
        ('CRITICAL', StatusTone.danger, LucideIcons.circleX, 'Atenção imediata'),
        (
          'ATTENTION',
          StatusTone.warning,
          LucideIcons.triangleAlert,
          'Manutenção recomendada'
        ),
      ]) {
        final items = revision.checks.where((c) => c.status == status).toList();
        if (items.isEmpty) continue;
        final vehicle = revision.vehicle;
        widgets.add(
          NoticeBox(
            icon: icon,
            tone: tone,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$title • ${vehicle == null ? 'Veículo' : '${vehicle.label} - ${vehicle.plate}'}',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 6),
                Text(
                  'Revisão em ${DateFormat("dd 'de' MMMM 'de' y", 'pt_BR').format(revision.date ?? DateTime.now())}',
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppTheme.mutedForeground,
                  ),
                ),
                const SizedBox(height: 6),
                for (final item in items.take(3))
                  Text(
                    '${item.name} (${item.category})',
                    style: const TextStyle(fontSize: 13),
                  ),
              ],
            ),
          ),
        );
      }
    }
    return widgets;
  }

  List<Widget> _appointments(List<Appointment> appointments) {
    if (appointments.isEmpty) {
      return const [
        _EmptyCard(
          icon: LucideIcons.calendarClock,
          title: 'Nenhum agendamento encontrado',
          message: 'Acesse a aba de veículos para solicitar sua próxima revisão.',
        ),
      ];
    }
    final active = appointments.where((item) => item.canCancel).length;
    return [
      if (active > 0)
        NoticeBox(
          icon: LucideIcons.calendarClock,
          child: Text(
            '$active agendamento(s) ativo(s). A oficina pode confirmar ou '
            'ajustar o horário informado.',
          ),
        ),
      for (final appointment in appointments)
        _AppointmentCard(
          appointment: appointment,
          onCancel: () => _cancel(appointment),
        ),
    ];
  }
}

/// Abas internas das revisões (`TabsList` com quebra de linha).
class _FilterPills extends StatelessWidget {
  const _FilterPills({
    required this.index,
    required this.onChanged,
    required this.labels,
  });

  final int index;
  final ValueChanged<int> onChanged;
  final List<String> labels;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(6),
      decoration: glassDecoration(opacity: 0.62),
      child: Wrap(
        alignment: WrapAlignment.center,
        spacing: 4,
        runSpacing: 4,
        children: [
          for (var i = 0; i < labels.length; i++)
            GestureDetector(
              onTap: () => onChanged(i),
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: i == index ? AppTheme.primary : null,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  labels[i],
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: i == index ? Colors.white : AppTheme.slate500,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _EmptyCard extends StatelessWidget {
  const _EmptyCard({
    required this.icon,
    required this.title,
    required this.message,
  });

  final IconData icon;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 48),
      child: Column(
        children: [
          Icon(icon, size: 48, color: const Color(0xFF9CA3AF)),
          const SizedBox(height: 16),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 14,
              color: AppTheme.mutedForeground,
            ),
          ),
        ],
      ),
    );
  }
}

class _AppointmentCard extends StatelessWidget {
  const _AppointmentCard({required this.appointment, required this.onCancel});

  final Appointment appointment;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    final (label, tone) = appointment.statusView;
    final vehicle = appointment.vehicle;
    const muted = TextStyle(fontSize: 13, color: AppTheme.mutedForeground);
    return GlassCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const Icon(LucideIcons.car, size: 20, color: AppTheme.primary),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  vehicle?.label ?? 'Veículo',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (vehicle != null)
            Wrap(
              crossAxisAlignment: WrapCrossAlignment.center,
              spacing: 8,
              children: [
                PlateChip(vehicle.plate),
                const Text('•', style: muted),
                Text('Ano ${vehicle.year}', style: muted),
              ],
            ),
          const SizedBox(height: 4),
          Text(
            'Solicitado para ${formatDateTime(appointment.preferredDate)}',
            style: muted,
          ),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerLeft,
            child: StatusChip(label, tone: tone),
          ),
          const SizedBox(height: 16),
          LabeledBox(
            label: 'Horário confirmado',
            value: appointment.scheduledAt == null
                ? '-'
                : formatDateTime(appointment.scheduledAt),
          ),
          const SizedBox(height: 12),
          LabeledBox(
            label: 'Mecânico responsável',
            icon: LucideIcons.userCog,
            value: appointment.mechanicName ?? 'Aguardando atribuição',
          ),
          if ((appointment.notes ?? '').isNotEmpty) ...[
            const SizedBox(height: 12),
            NoticeBox(
              icon: LucideIcons.fileText,
              tone: StatusTone.neutral,
              child: Text(appointment.notes!),
            ),
          ],
          if ((appointment.adminNotes ?? '').isNotEmpty) ...[
            const SizedBox(height: 12),
            NoticeBox(
              icon: LucideIcons.circleAlert,
              child: Text(appointment.adminNotes!),
            ),
          ],
          if (appointment.revisionId != null) ...[
            const SizedBox(height: 12),
            NoticeBox(
              icon: LucideIcons.circleCheck,
              tone: StatusTone.success,
              child: Text(
                'Revisão vinculada #${appointment.revisionId!.substring(0, 8)} '
                'criada para este atendimento.',
              ),
            ),
          ],
          if (appointment.canCancel) ...[
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: onCancel,
              icon: const Icon(LucideIcons.circleX),
              label: const Text('Cancelar solicitação'),
            ),
          ],
        ],
      ),
    );
  }
}

class _RevisionCard extends StatelessWidget {
  const _RevisionCard({required this.revision});

  final Revision revision;

  @override
  Widget build(BuildContext context) {
    final (label, color) = switch (revision.status) {
      'IN_PROGRESS' => ('Em andamento', const Color(0xFF3B82F6)),
      'COMPLETED' => ('Concluída', const Color(0xFF22C55E)),
      'CANCELLED' => ('Cancelada', const Color(0xFFEF4444)),
      _ => ('Rascunho', const Color(0xFF6B7280)),
    };
    final vehicle = revision.vehicle;
    final checked = revision.checks.where((check) => check.evaluated).length;
    const muted = TextStyle(fontSize: 13, color: AppTheme.mutedForeground);

    Widget stat(Color background, Color color, IconData icon, String value,
        String caption, {String? suffix}) {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Icon(icon, size: 16, color: color),
                const SizedBox(width: 4),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    color: color,
                  ),
                ),
                if (suffix != null)
                  Text(suffix, style: TextStyle(fontSize: 13, color: color)),
              ],
            ),
            const SizedBox(height: 4),
            Text(caption, style: const TextStyle(fontSize: 12, color: AppTheme.mutedForeground)),
          ],
        ),
      );
    }

    return GlassCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const IconTile(icon: LucideIcons.car, size: 48),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      vehicle?.label ?? 'Revisão',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    if (vehicle != null)
                      Text(
                        'Placa ${vehicle.plate} • Ano ${vehicle.year}',
                        style: muted,
                      ),
                    const SizedBox(height: 2),
                    Wrap(
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 6,
                      children: [
                        const Icon(LucideIcons.calendar,
                            size: 12, color: AppTheme.mutedForeground),
                        Text(formatDate(revision.date), style: muted),
                        if (revision.mileage != null) ...[
                          const Text('•', style: muted),
                          const Icon(LucideIcons.gauge,
                              size: 12, color: AppTheme.mutedForeground),
                          Text(formatKm(revision.mileage), style: muted),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Align(
            alignment: Alignment.centerLeft,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                label,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                  height: 1.5,
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          TwoColumnGrid(
            children: [
              stat(
                const Color(0xFFF9FAFB),
                const Color(0xFF4B5563),
                LucideIcons.fileText,
                '$checked',
                'Verificados',
                suffix: '/${revision.checks.length}',
              ),
              stat(
                const Color(0xFFF0FDF4),
                AppTheme.success,
                LucideIcons.circleCheck,
                '${revision.countOf('OK')}',
                'OK',
              ),
              stat(
                const Color(0xFFFEFCE8),
                AppTheme.warning,
                LucideIcons.triangleAlert,
                '${revision.countOf('ATTENTION')}',
                'Atenção',
              ),
              stat(
                const Color(0xFFFEF2F2),
                AppTheme.danger,
                LucideIcons.circleX,
                '${revision.countOf('CRITICAL')}',
                'Crítico',
              ),
            ],
          ),
          if ((revision.recommendations ?? '').isNotEmpty) ...[
            const SizedBox(height: 16),
            NoticeBox(
              icon: LucideIcons.trendingUp,
              tone: StatusTone.neutral,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Recomendações',
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                  ),
                  const SizedBox(height: 4),
                  Text(revision.recommendations!, style: const TextStyle(fontSize: 13)),
                ],
              ),
            ),
          ],
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => RevisionDetailScreen(revision: revision),
              ),
            ),
            icon: const Icon(LucideIcons.eye),
            label: const Text('Ver detalhes completos'),
          ),
        ],
      ),
    );
  }
}
