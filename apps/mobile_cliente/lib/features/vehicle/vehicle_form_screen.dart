import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/fipe_api.dart';
import '../../data/models.dart';
import '../../data/providers.dart';
import '../../shared/ui.dart';

/// Cadastro (`CreateVehicleModalCustomer`) e edição
/// (`EditVehicleModalCustomer`) de veículo. Como no PWA, o cadastro escolhe
/// marca, modelo e ano na tabela FIPE e a edição usa texto livre.
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
  FipeOption? _fipeBrand;
  FipeOption? _fipeModel;
  FipeOption? _fipeYear;
  bool _busy = false;

  bool get _editing => widget.vehicle != null;

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
        'brand': _editing ? _brand.text.trim() : _fipeBrand!.name,
        'model': _editing ? _model.text.trim() : _fipeModel!.name,
        'year': _editing
            ? int.parse(_year.text.trim())
            : FipeApi.yearOf(_fipeYear!.code),
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
    final maxYear = DateTime.now().year + 1;
    FormFieldValidator<String> required(String message) =>
        (value) => (value ?? '').trim().isEmpty ? message : null;
    String? yearProblem(int? year) =>
        year == null || year < 1900 || year > maxYear
            ? 'Ano deve estar entre 1900 e $maxYear'
            : null;

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

    final brand = _fipeBrand;
    final model = _fipeModel;
    final Widget brandField;
    final Widget modelField;
    final Widget yearField;
    if (_editing) {
      brandField = field('Marca *', _brand, 'Ex: Fiat, Ford, Chevrolet',
          validator: required('Marca é obrigatória'));
      modelField = field('Modelo *', _model, 'Ex: Uno, Fiesta, Onix',
          validator: required('Modelo é obrigatório'));
      yearField = field(
        'Ano *',
        _year,
        '2020',
        keyboard: TextInputType.number,
        maxLength: 4,
        validator: (v) => (v ?? '').trim().isEmpty
            ? 'Ano é obrigatório'
            : yearProblem(int.tryParse(v!.trim())),
      );
    } else {
      final yearsKey =
          brand == null || model == null ? null : (brand.code, model.code);
      brandField = FipeField(
        label: 'Marca *',
        options: ref.watch(fipeBrandsProvider),
        selected: brand,
        hint: 'Selecione a marca',
        searchHint: 'Buscar marca...',
        emptyText: 'Nenhuma marca encontrada',
        enabled: !_busy,
        onRetry: () => ref.invalidate(fipeBrandsProvider),
        onSelected: (option) => setState(() {
          _fipeBrand = option;
          _fipeModel = null;
          _fipeYear = null;
        }),
        validator: (_) => brand == null ? 'Marca é obrigatória' : null,
      );
      modelField = FipeField(
        label: 'Modelo *',
        options:
            brand == null ? null : ref.watch(fipeModelsProvider(brand.code)),
        selected: model,
        hint: brand == null ? 'Selecione a marca primeiro' : 'Selecione o modelo',
        searchHint: 'Buscar modelo...',
        emptyText: 'Nenhum modelo encontrado',
        enabled: !_busy,
        onRetry: () => ref.invalidate(fipeModelsProvider(brand!.code)),
        onSelected: (option) => setState(() {
          _fipeModel = option;
          _fipeYear = null;
        }),
        validator: (_) => model == null ? 'Modelo é obrigatório' : null,
      );
      yearField = FipeField(
        label: 'Ano *',
        options:
            yearsKey == null ? null : ref.watch(fipeYearsProvider(yearsKey)),
        selected: _fipeYear,
        hint: model == null ? 'Selecione o modelo primeiro' : 'Selecione o ano',
        searchHint: 'Buscar ano...',
        emptyText: 'Nenhum ano encontrado',
        enabled: !_busy,
        onRetry: () => ref.invalidate(fipeYearsProvider(yearsKey!)),
        onSelected: (option) => setState(() => _fipeYear = option),
        validator: (_) => _fipeYear == null
            ? 'Ano é obrigatório'
            : yearProblem(FipeApi.yearOf(_fipeYear!.code)),
      );
    }

    final title = _editing ? 'Editar Veículo' : 'Cadastrar Novo Veículo';
    return FormPage(
      title: title,
      formKey: _formKey,
      header: PanelPageHeader(
        icon: LucideIcons.car,
        title: title,
        description: 'Os campos com * são obrigatórios.',
      ),
      children: [
        pair(brandField, modelField),
        pair(
          yearField,
          field(
            'Placa *',
            _plate,
            'ABC-1234 ou ABC1D23',
            caps: TextCapitalization.characters,
            maxLength: 8,
            validator: (v) {
              final plate = normalizePlate(v ?? '');
              if (plate.isEmpty) return 'Placa é obrigatória';
              if (plate.length != 7) return 'Placa deve ter 7 caracteres';
              return isValidPlate(plate) ? null : 'Placa inválida';
            },
          ),
        ),
        pair(
          field('Cor *', _color, 'Ex: Branco, Preto, Prata',
              validator: required('Cor é obrigatória')),
          field(
            'Quilometragem (opcional)',
            _mileage,
            '50000',
            keyboard: TextInputType.number,
            validator: (v) {
              final text = (v ?? '').trim();
              final km = int.tryParse(text);
              return text.isNotEmpty && (km == null || km < 0)
                  ? 'Quilometragem inválida'
                  : null;
            },
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
                label: _editing ? 'Salvar Alterações' : 'Criar Veículo',
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

/// Campo de seleção com busca (`Combobox` do PWA) para a tabela FIPE.
/// [options] nulo indica que o campo anterior ainda não foi escolhido.
class FipeField extends StatelessWidget {
  const FipeField({
    super.key,
    required this.label,
    required this.options,
    required this.selected,
    required this.hint,
    required this.searchHint,
    required this.emptyText,
    required this.onSelected,
    required this.onRetry,
    required this.validator,
    this.enabled = true,
  });

  final String label;
  final AsyncValue<List<FipeOption>>? options;
  final FipeOption? selected;
  final String hint;
  final String searchHint;
  final String emptyText;
  final ValueChanged<FipeOption> onSelected;
  final VoidCallback onRetry;
  final FormFieldValidator<String> validator;
  final bool enabled;

  Future<void> _pick(BuildContext context, List<FipeOption> items) async {
    final picked = await showModalBottomSheet<FipeOption>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _FipeSheet(
        items: items,
        searchHint: searchHint,
        emptyText: emptyText,
      ),
    );
    if (picked != null) onSelected(picked);
  }

  @override
  Widget build(BuildContext context) {
    final value = options;
    final items = value?.value;
    var shown = hint;
    VoidCallback? onTap;
    if (items != null) {
      onTap = () => _pick(context, items);
    } else if (value != null && value.hasError) {
      shown = 'Erro ao carregar. Toque para tentar de novo';
      onTap = onRetry;
    } else if (value != null) {
      shown = 'Carregando...';
    }
    return LabeledField(
      label: label,
      child: TextFormField(
        // A chave troca o texto mostrado quando a escolha muda.
        key: ValueKey(selected?.code),
        initialValue: selected?.name,
        readOnly: true,
        enabled: enabled && onTap != null,
        onTap: onTap,
        validator: validator,
        decoration: InputDecoration(
          hintText: shown,
          suffixIcon: const Icon(LucideIcons.chevronsUpDown, size: 16),
        ),
      ),
    );
  }
}

class _FipeSheet extends StatefulWidget {
  const _FipeSheet({
    required this.items,
    required this.searchHint,
    required this.emptyText,
  });

  final List<FipeOption> items;
  final String searchHint;
  final String emptyText;

  @override
  State<_FipeSheet> createState() => _FipeSheetState();
}

class _FipeSheetState extends State<_FipeSheet> {
  String _term = '';

  @override
  Widget build(BuildContext context) {
    final term = withoutAccents(_term.trim());
    final items = widget.items
        .where((item) => withoutAccents(item.name).contains(term))
        .toList();
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SizedBox(
        height: MediaQuery.sizeOf(context).height * 0.75,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: SearchBox(
                hint: widget.searchHint,
                onChanged: (value) => setState(() => _term = value),
              ),
            ),
            Expanded(
              child: items.isEmpty
                  ? Center(
                      child: Text(
                        widget.emptyText,
                        style: const TextStyle(color: AppTheme.mutedForeground),
                      ),
                    )
                  : ListView.builder(
                      itemCount: items.length,
                      itemBuilder: (context, index) => ListTile(
                        title: Text(items[index].name),
                        onTap: () => Navigator.of(context).pop(items[index]),
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
