import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';

class ScheduleRevisionScreen extends ConsumerStatefulWidget {
  const ScheduleRevisionScreen({super.key, required this.vehicle});

  final Vehicle vehicle;

  @override
  ConsumerState<ScheduleRevisionScreen> createState() =>
      _ScheduleRevisionScreenState();
}

class _ScheduleRevisionScreenState
    extends ConsumerState<ScheduleRevisionScreen> {
  final _notes = TextEditingController();
  DateTime? _when;
  bool _busy = false;

  @override
  void dispose() {
    _notes.dispose();
    super.dispose();
  }

  Future<void> _pick() async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
      initialDate: _when ?? now,
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: const TimeOfDay(hour: 9, minute: 0),
    );
    if (time == null) return;
    setState(() {
      _when = DateTime(date.year, date.month, date.day, time.hour, time.minute);
    });
  }

  Future<void> _submit() async {
    final notes = _notes.text.trim();
    setState(() => _busy = true);
    final done = await runAction(
      context,
      () => ref.read(apiProvider).scheduleRevision(
            vehicleId: widget.vehicle.id,
            preferredDate: _when!,
            notes: notes.isEmpty ? null : notes,
          ),
      success: 'Agendamento solicitado. A oficina vai confirmar o horário.',
    );
    if (!mounted) return;
    setState(() => _busy = false);
    if (done) {
      ref.invalidate(appointmentsProvider);
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final vehicle = widget.vehicle;
    return Scaffold(
      appBar: AppBar(title: const Text('Agendar revisão')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: ListTile(
              leading: const Icon(Icons.directions_car),
              title: Text(vehicle.label),
              subtitle: Text('Placa ${vehicle.plate} · Ano ${vehicle.year}'),
            ),
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: _pick,
            icon: const Icon(Icons.event),
            label: Text(
              _when == null
                  ? 'Escolher data e horário'
                  : formatDateTime(_when),
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _notes,
            maxLines: 3,
            decoration: const InputDecoration(
              labelText: 'Observações (opcional)',
              hintText: 'Algum barulho, luz no painel, ou serviço desejado',
            ),
          ),
          const SizedBox(height: 24),
          BusyButton(
            label: 'Solicitar agendamento',
            busy: _busy,
            onPressed: _when == null ? null : _submit,
          ),
        ],
      ),
    );
  }
}
