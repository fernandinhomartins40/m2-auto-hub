import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../../shared/ui.dart';

/// Cadastro e edição de veículo (`CreateVehicleModalCustomer` do PWA).
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
  late final _chassis =
      TextEditingController(text: widget.vehicle?.chassisNumber);
  bool _busy = false;

  @override
  void dispose() {
    _brand.dispose();
    _model.dispose();
    _year.dispose();
    _plate.dispose();
    _color.dispose();
    _mileage.dispose();
    _chassis.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _busy = true);
    final mileage = int.tryParse(_mileage.text.trim());
    final chassis = _chassis.text.trim().toUpperCase();
    final done = await runAction(
      context,
      () => ref.read(apiProvider).saveVehicle(widget.vehicle?.id, {
        'brand': _brand.text.trim(),
        'model': _model.text.trim(),
        'year': int.parse(_year.text.trim()),
        'plate': normalizePlate(_plate.text),
        'color': _color.text.trim(),
        if (mileage != null) 'mileage': mileage,
        if (chassis.isNotEmpty) 'chassisNumber': chassis,
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

  @override
  Widget build(BuildContext context) {
    final editing = widget.vehicle != null;
    final currentYear = DateTime.now().year;
    String? required(String? value) =>
        (value ?? '').trim().isEmpty ? 'Campo obrigatório' : null;

    Widget field(
      String label,
      TextEditingController controller,
      String hint, {
      FormFieldValidator<String>? validator,
      TextInputType? keyboard,
      TextCapitalization caps = TextCapitalization.words,
      int? maxLength,
    }) {
      return LabeledField(
        label: label,
        child: TextFormField(
          controller: controller,
          keyboardType: keyboard,
          textCapitalization: caps,
          maxLength: maxLength,
          decoration: InputDecoration(hintText: hint, counterText: ''),
          validator: validator,
        ),
      );
    }

    Widget pair(Widget left, Widget right) => Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: left),
            const SizedBox(width: 12),
            Expanded(child: right),
          ],
        );

    return FormPage(
      title: editing ? 'Editar Veículo' : 'Cadastrar Novo Veículo',
      formKey: _formKey,
      header: PanelPageHeader(
        icon: LucideIcons.car,
        title: editing ? 'Editar Veículo' : 'Cadastrar Novo Veículo',
        description: 'Os campos com * são obrigatórios.',
      ),
      children: [
        pair(
          field('Marca *', _brand, 'Ex: Volkswagen', validator: required),
          field('Modelo *', _model, 'Ex: Gol 1.6', validator: required),
        ),
        pair(
          field(
            'Ano *',
            _year,
            '2020',
            keyboard: TextInputType.number,
            maxLength: 4,
            validator: (v) {
              final year = int.tryParse((v ?? '').trim());
              return year == null || year < 1900 || year > currentYear + 1
                  ? 'Ano inválido'
                  : null;
            },
          ),
          field(
            'Placa *',
            _plate,
            'ABC1D23',
            caps: TextCapitalization.characters,
            maxLength: 8,
            validator: (v) => isValidPlate(v ?? '') ? null : 'Placa inválida',
          ),
        ),
        pair(
          field('Cor *', _color, 'Ex: Branco, Preto, Prata',
              validator: required),
          field(
            'Quilometragem (opcional)',
            _mileage,
            '50000',
            keyboard: TextInputType.number,
          ),
        ),
        field(
          'Número do Chassi (opcional)',
          _chassis,
          '9BWZZZ377VT004251',
          caps: TextCapitalization.characters,
          maxLength: 17,
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
                label: editing ? 'Salvar Alterações' : 'Cadastrar Veículo',
                busy: _busy,
                onPressed: _save,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
