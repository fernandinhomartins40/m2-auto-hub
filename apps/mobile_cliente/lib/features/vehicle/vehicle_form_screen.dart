import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';

class VehicleFormScreen extends ConsumerStatefulWidget {
  const VehicleFormScreen({super.key, this.vehicle});

  final Vehicle? vehicle;

  @override
  ConsumerState<VehicleFormScreen> createState() => _VehicleFormScreenState();
}

class _VehicleFormScreenState extends ConsumerState<VehicleFormScreen> {
  final _formKey = GlobalKey<FormState>();
  late final _brand = TextEditingController(text: widget.vehicle?.brand);
  late final _model = TextEditingController(text: widget.vehicle?.model);
  late final _year = TextEditingController(text: widget.vehicle?.year.toString());
  late final _plate = TextEditingController(text: widget.vehicle?.plate);
  late final _color = TextEditingController(text: widget.vehicle?.color);
  late final _mileage =
      TextEditingController(text: widget.vehicle?.mileage?.toString());
  bool _busy = false;

  @override
  void dispose() {
    _brand.dispose();
    _model.dispose();
    _year.dispose();
    _plate.dispose();
    _color.dispose();
    _mileage.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _busy = true);
    final mileage = int.tryParse(_mileage.text.trim());
    final done = await runAction(
      context,
      () => ref.read(apiProvider).saveVehicle(widget.vehicle?.id, {
        'brand': _brand.text.trim(),
        'model': _model.text.trim(),
        'year': int.parse(_year.text.trim()),
        'plate': normalizePlate(_plate.text),
        'color': _color.text.trim(),
        if (mileage != null) 'mileage': mileage,
      }),
      success: 'Veículo salvo',
    );
    if (!mounted) return;
    setState(() => _busy = false);
    if (done) {
      ref.invalidate(vehiclesProvider);
      Navigator.of(context).pop();
    }
  }

  Future<void> _delete() async {
    final accepted = await confirm(
      context,
      title: 'Excluir veículo?',
      message: 'O veículo sai da sua conta.',
      confirmLabel: 'Excluir',
      destructive: true,
    );
    if (!accepted || !mounted) return;
    final done = await runAction(
      context,
      () => ref.read(apiProvider).deleteVehicle(widget.vehicle!.id),
      success: 'Veículo excluído',
    );
    if (done && mounted) {
      ref.invalidate(vehiclesProvider);
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final editing = widget.vehicle != null;
    final currentYear = DateTime.now().year;
    String? required(String? value) =>
        (value ?? '').trim().isEmpty ? 'Campo obrigatório' : null;

    return Scaffold(
      appBar: AppBar(
        title: Text(editing ? 'Editar veículo' : 'Novo veículo'),
        actions: [
          if (editing)
            IconButton(
              tooltip: 'Excluir veículo',
              icon: const Icon(Icons.delete_outline),
              onPressed: _delete,
            ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _plate,
              textCapitalization: TextCapitalization.characters,
              decoration: const InputDecoration(labelText: 'Placa'),
              validator: (v) =>
                  isValidPlate(v ?? '') ? null : 'Placa inválida',
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _brand,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(labelText: 'Marca'),
              validator: required,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _model,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(labelText: 'Modelo'),
              validator: required,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _year,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Ano'),
              validator: (v) {
                final year = int.tryParse((v ?? '').trim());
                return year == null || year < 1900 || year > currentYear + 1
                    ? 'Ano inválido'
                    : null;
              },
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _color,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(labelText: 'Cor'),
              validator: required,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _mileage,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Quilometragem (opcional)',
              ),
            ),
            const SizedBox(height: 24),
            BusyButton(label: 'Salvar', busy: _busy, onPressed: _save),
          ],
        ),
      ),
    );
  }
}
