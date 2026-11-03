import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../../shared/ui.dart';

/// Agendar revisão (`ScheduleRevisionModal` do PWA).
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
    return FormPage(
      title: 'Agendar Revisão',
      header: const PanelPageHeader(
        icon: LucideIcons.calendarClock,
        title: 'Agendar Revisão',
        description: 'Escolha o melhor horário. A oficina confirma ou ajusta '
            'na confirmação final.',
      ),
      children: [
        NoticeBox(
          icon: LucideIcons.car,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                vehicle.label,
                style: const TextStyle(fontWeight: FontWeight.w500),
              ),
              Text(
                'Placa ${vehicle.plate} • Ano ${vehicle.year}',
                style: const TextStyle(
                  fontSize: 13,
                  color: AppTheme.mutedForeground,
                ),
              ),
            ],
          ),
        ),
        LabeledField(
          label: 'Data e horário desejados',
          helper: 'A oficina poderá ajustar esse horário na confirmação final.',
          child: InkWell(
            onTap: _pick,
            borderRadius: BorderRadius.circular(6),
            child: InputDecorator(
              decoration: const InputDecoration(
                prefixIcon: Icon(LucideIcons.calendar, size: 16),
              ),
              child: Text(
                _when == null
                    ? 'Escolher data e horário'
                    : formatDateTime(_when),
                style: TextStyle(
                  fontSize: 14,
                  color: _when == null
                      ? AppTheme.mutedForeground
                      : AppTheme.foreground,
                ),
              ),
            ),
          ),
        ),
        LabeledField(
          label: 'Observações para a oficina',
          child: TextField(
            controller: _notes,
            maxLines: 4,
            maxLength: 2000,
            decoration: const InputDecoration(
              hintText: 'Descreva sintomas, urgência ou alguma preferência.',
            ),
          ),
        ),
        Row(
          children: [
            OutlinedButton(
              onPressed: _busy ? null : () => Navigator.of(context).pop(),
              child: const Text('Cancelar'),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: BusyButton(
                label: 'Solicitar agendamento',
                busy: _busy,
                onPressed: _when == null ? null : _submit,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
