import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import 'revision_detail_screen.dart';
import 'schedule_revision_screen.dart';
import 'vehicle_form_screen.dart';

class VehicleTab extends StatelessWidget {
  const VehicleTab({super.key});

  @override
  Widget build(BuildContext context) {
    return const DefaultTabController(
      length: 2,
      child: Column(
        children: [
          TabBar(tabs: [Tab(text: 'Veículos'), Tab(text: 'Revisões')]),
          Expanded(child: TabBarView(children: [_Vehicles(), _Revisions()])),
        ],
      ),
    );
  }
}

class _Vehicles extends ConsumerWidget {
  const _Vehicles();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    void openForm([Vehicle? vehicle]) => Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => VehicleFormScreen(vehicle: vehicle),
          ),
        );

    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'new-vehicle',
        onPressed: openForm,
        icon: const Icon(Icons.add),
        label: const Text('Adicionar'),
      ),
      body: AsyncPage<List<Vehicle>>(
        value: ref.watch(vehiclesProvider),
        onRefresh: () => ref.refresh(vehiclesProvider.future),
        isEmpty: (vehicles) => vehicles.isEmpty,
        emptyIcon: Icons.directions_car_outlined,
        emptyMessage: 'Cadastre seu veículo para agendar revisões.',
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
        builder: (vehicles) => [
          for (final vehicle in vehicles)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      vehicle.label,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${vehicle.plate} · ${vehicle.year} · ${vehicle.color}',
                    ),
                    Text('Quilometragem: ${formatKm(vehicle.mileage)}'),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: FilledButton(
                            onPressed: () => Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) =>
                                    ScheduleRevisionScreen(vehicle: vehicle),
                              ),
                            ),
                            child: const Text('Agendar revisão'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        OutlinedButton(
                          onPressed: () => openForm(vehicle),
                          child: const Text('Editar'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
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

class _Revisions extends ConsumerWidget {
  const _Revisions();

  Future<void> _cancel(
    BuildContext context,
    WidgetRef ref,
    Appointment appointment,
  ) async {
    final accepted = await confirm(
      context,
      title: 'Cancelar agendamento?',
      message: 'A oficina será avisada do cancelamento.',
      confirmLabel: 'Cancelar agendamento',
      destructive: true,
    );
    if (!accepted || !context.mounted) return;
    final done = await runAction(
      context,
      () => ref.read(apiProvider).cancelAppointment(appointment.id),
      success: 'Agendamento cancelado',
    );
    if (done) ref.invalidate(appointmentsProvider);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    Future<void> refresh() async {
      ref.invalidate(appointmentsProvider);
      ref.invalidate(revisionsProvider);
      await ref
          .read(_revisionsDataProvider.future)
          .then<void>((_) {}, onError: (_) {});
    }

    return AsyncPage<_RevisionsData>(
      value: ref.watch(_revisionsDataProvider),
      onRefresh: refresh,
      isEmpty: (data) => data.appointments.isEmpty && data.revisions.isEmpty,
      emptyIcon: Icons.build_circle_outlined,
      emptyMessage: 'Nenhuma revisão ainda. Agende pela aba Veículos.',
      builder: (data) => [
        if (data.appointments.isNotEmpty) const SectionTitle('Agendamentos'),
        for (final appointment in data.appointments)
          _AppointmentCard(
            appointment: appointment,
            onCancel: () => _cancel(context, ref, appointment),
          ),
        if (data.revisions.isNotEmpty) const SectionTitle('Revisões'),
        for (final revision in data.revisions) _RevisionCard(revision: revision),
      ],
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
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
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
            const SizedBox(height: 8),
            if (vehicle != null) InfoRow('Placa', vehicle.plate),
            InfoRow('Solicitado para', formatDateTime(appointment.preferredDate)),
            if (appointment.scheduledAt != null)
              InfoRow('Confirmado para', formatDateTime(appointment.scheduledAt)),
            InfoRow(
              'Mecânico',
              appointment.mechanicName ?? 'Aguardando atribuição',
            ),
            if ((appointment.adminNotes ?? '').isNotEmpty)
              InfoRow('Recado da oficina', appointment.adminNotes!),
            if (appointment.canCancel) ...[
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: onCancel,
                  child: const Text('Cancelar agendamento'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _RevisionCard extends StatelessWidget {
  const _RevisionCard({required this.revision});

  final Revision revision;

  @override
  Widget build(BuildContext context) {
    final (label, tone) = revision.statusView;
    final critical = revision.countOf('CRITICAL');
    final attention = revision.countOf('ATTENTION');
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => RevisionDetailScreen(revision: revision),
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      revision.vehicle?.label ?? 'Revisão',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  ),
                  StatusChip(label, tone: tone),
                ],
              ),
              const SizedBox(height: 6),
              Text(formatDate(revision.date)),
              if (critical + attention > 0) ...[
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  children: [
                    if (critical > 0)
                      StatusChip(
                        '$critical crítico(s)',
                        tone: StatusTone.danger,
                      ),
                    if (attention > 0)
                      StatusChip(
                        '$attention atenção',
                        tone: StatusTone.warning,
                      ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
