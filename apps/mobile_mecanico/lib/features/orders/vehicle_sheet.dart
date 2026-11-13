import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../../shared/ui.dart';

/// Cadastro de veículo do cliente (`CreateVehicleModal`), aberto pela leitura
/// de placa quando a placa ainda não existe. Devolve o veículo criado.
///
/// Só os campos que `POST /admin/customers/:id/vehicles` grava; combustível,
/// cilindrada, potência, município e UF do PWA são ignorados pelo servidor.
class VehicleSheet extends ConsumerStatefulWidget {
  const VehicleSheet({
    super.key,
    required this.customerId,
    required this.plate,
    this.technical,
  });

  final String customerId;
  final String plate;

  /// `technicalData` da consulta da placa, para não redigitar.
  final Map<String, dynamic>? technical;

  @override
  ConsumerState<VehicleSheet> createState() => _VehicleSheetState();
}

class _VehicleSheetState extends ConsumerState<VehicleSheet> {
  final _formKey = GlobalKey<FormState>();
  late final _brand = _field('brand');
  late final _model = _field('model');
  late final _year = _field('year');
  late final _plate = TextEditingController(text: widget.plate);
  late final _color = _field('color');
  final _mileage = TextEditingController();
  late final _chassis = _field('chassisNumber');
  bool _busy = false;

  TextEditingController _field(String key) =>
      TextEditingController(text: widget.technical?[key]?.toString() ?? "");

  @override
  void dispose() {
    for (final c in [_brand, _model, _year, _plate, _color, _mileage, _chassis]) {
      c.dispose();
    }
    super.dispose();
  }

  String? _required(String? value, String message) =>
      (value ?? "").trim().isEmpty ? message : null;

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _busy = true);
    VehicleRef? created;
    await runAction(
      context,
      () async {
        created = await ref.read(apiProvider).createVehicle(widget.customerId, {
          'brand': _brand.text.trim(),
          'model': _model.text.trim(),
          'year': int.parse(_year.text.trim()),
          'plate': normalizePlate(_plate.text),
          'color': _color.text.trim(),
          if (_mileage.text.trim().isNotEmpty)
            'mileage': int.parse(_mileage.text.trim()),
          if (_chassis.text.trim().isNotEmpty)
            'chassisNumber': _chassis.text.trim(),
        });
      },
      success: 'Veículo cadastrado com sucesso!',
    );
    if (!mounted) return;
    setState(() => _busy = false);
    if (created != null) Navigator.of(context).pop(created);
  }

  @override
  Widget build(BuildContext context) {
    final maxYear = DateTime.now().year + 1;
    return Padding(
      padding: EdgeInsets.fromLTRB(
        16,
        0,
        16,
        16 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  const Icon(LucideIcons.car, size: 20, color: AppTheme.primary),
                  const SizedBox(width: 8),
                  Flexible(
                    child: Text(
                      'Cadastrar Novo Veículo',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              FormInput(
                label: 'Marca *',
                controller: _brand,
                hint: 'Ex: Fiat, Ford, Chevrolet',
                capitalization: TextCapitalization.words,
                validator: (v) => _required(v, 'Marca é obrigatória'),
              ),
              const SizedBox(height: 12),
              FormInput(
                label: 'Modelo *',
                controller: _model,
                hint: 'Ex: Uno, Fiesta, Onix',
                capitalization: TextCapitalization.words,
                validator: (v) => _required(v, 'Modelo é obrigatório'),
              ),
              const SizedBox(height: 12),
              FormInput(
                label: 'Ano *',
                controller: _year,
                hint: '2020',
                keyboardType: TextInputType.number,
                validator: (v) {
                  if ((v ?? "").trim().isEmpty) return 'Ano é obrigatório';
                  final year = int.tryParse(v!.trim()) ?? 0;
                  return year < 1900 || year > maxYear
                      ? 'Ano deve estar entre 1900 e $maxYear'
                      : null;
                },
              ),
              const SizedBox(height: 12),
              FormInput(
                label: 'Placa *',
                controller: _plate,
                hint: 'ABC-1234 ou ABC1D23',
                capitalization: TextCapitalization.characters,
                validator: (v) {
                  if ((v ?? "").trim().isEmpty) return 'Placa é obrigatória';
                  return normalizePlate(v!).length != 7
                      ? 'Placa deve ter 7 caracteres'
                      : null;
                },
              ),
              const SizedBox(height: 12),
              FormInput(
                label: 'Cor *',
                controller: _color,
                hint: 'Ex: Branco, Preto, Prata',
                capitalization: TextCapitalization.words,
                validator: (v) => _required(v, 'Cor é obrigatória'),
              ),
              const SizedBox(height: 12),
              FormInput(
                label: 'Quilometragem (opcional)',
                controller: _mileage,
                hint: '50000',
                keyboardType: TextInputType.number,
                validator: (v) {
                  if ((v ?? "").trim().isEmpty) return null;
                  final km = int.tryParse(v!.trim());
                  return km == null || km < 0 ? 'Quilometragem inválida' : null;
                },
              ),
              const SizedBox(height: 12),
              FormInput(
                label: 'Número do Chassi (opcional)',
                controller: _chassis,
                hint: '9BWZZZ377VT004251',
                capitalization: TextCapitalization.characters,
              ),
              const SizedBox(height: 16),
              BusyButton(
                label: 'Criar Veículo',
                icon: LucideIcons.save,
                busy: _busy,
                onPressed: _submit,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
