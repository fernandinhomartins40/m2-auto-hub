import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../auth/auth_controller.dart';
import 'item_picker_screen.dart';

/// Cria uma OS a partir da consulta de placa, ou edita uma existente.
class OrderFormScreen extends ConsumerStatefulWidget {
  const OrderFormScreen({super.key, this.order, this.lookup});

  final ServiceOrder? order;
  final PlateLookup? lookup;

  @override
  ConsumerState<OrderFormScreen> createState() => _OrderFormScreenState();
}

class _OrderFormScreenState extends ConsumerState<OrderFormScreen> {
  final _formKey = GlobalKey<FormState>();
  late final ServiceOrder? _order = widget.order;
  late final PlateLookup? _lookup = widget.lookup;

  late final _customer = TextEditingController(
    text: _order?.customerName ?? _lookup?.customer?.name,
  );
  late final _phone = TextEditingController(
    text: _order?.customerPhone ?? _lookup?.customer?.phone,
  );
  late final _vehicle = TextEditingController(
    text: _order?.vehicleLabel ??
        _lookup?.vehicle?.label ??
        _lookup?.vehicleLabel,
  );
  late final _plate = TextEditingController(
    text: _order?.vehiclePlate ?? _lookup?.plate,
  );
  late final _mileage = TextEditingController(
    text: (_order?.mileage ?? _lookup?.vehicle?.mileage)?.toString(),
  );
  late final _description = TextEditingController(text: _order?.description);
  late final _notes = TextEditingController(text: _order?.internalNotes);
  late final _discount = TextEditingController(
    text: (_order?.discount ?? 0) > 0 ? _order!.discount.toString() : '',
  );
  late final List<OrderItem> _items = [...?_order?.items];
  bool _busy = false;

  String? get _customerId =>
      _order?.customerId ?? _idOrNull(_lookup?.customer?.id);
  String? get _vehicleId =>
      _order?.vehicleId ?? _idOrNull(_lookup?.vehicle?.id);

  static String? _idOrNull(String? id) => (id ?? '').isEmpty ? null : id;

  @override
  void dispose() {
    _customer.dispose();
    _phone.dispose();
    _vehicle.dispose();
    _plate.dispose();
    _mileage.dispose();
    _description.dispose();
    _notes.dispose();
    _discount.dispose();
    super.dispose();
  }

  String? _text(TextEditingController controller) {
    final value = controller.text.trim();
    return value.isEmpty ? null : value;
  }

  Future<void> _addItems() async {
    final items = await Navigator.of(context).push<List<OrderItem>>(
      MaterialPageRoute(builder: (_) => const ItemPickerScreen()),
    );
    if (items != null) setState(() => _items.addAll(items));
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    final api = ref.read(apiProvider);
    final data = <String, dynamic>{
      'customerId': _customerId,
      'vehicleId': _vehicleId,
      'customerName': _customer.text.trim(),
      'customerPhone': _text(_phone),
      'vehicleLabel': _text(_vehicle),
      'vehiclePlate': _text(_plate) == null ? null : normalizePlate(_plate.text),
      'mileage': int.tryParse(_mileage.text.trim()),
      'description': _text(_description),
      'internalNotes': _text(_notes),
      'discount': double.tryParse(_discount.text.replaceAll(',', '.')) ?? 0,
      'items': [for (final item in _items) item.toJson()],
    };

    setState(() => _busy = true);
    final order = _order;
    final done = await runAction(
      context,
      () {
        if (order != null) return api.updateOrder(order.id, data);
        // A lista do app mostra só as OS atribuídas a quem está logado.
        data['assignedMechanicId'] = ref.read(mechanicIdProvider);
        return api.createOrder(data);
      },
      success: order == null ? 'OS criada' : 'OS atualizada',
    );
    if (!mounted) return;
    setState(() => _busy = false);
    if (done) {
      ref.invalidate(orderBoardProvider);
      if (order != null) ref.invalidate(orderProvider(order.id));
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final total = _items.fold<double>(0, (sum, item) => sum + item.subtotal);
    return Scaffold(
      appBar: AppBar(
        title: Text(_order == null ? 'Nova OS' : 'OS #${_order.number}'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _customer,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(labelText: 'Cliente'),
              validator: (v) =>
                  (v ?? '').trim().isEmpty ? 'Informe o cliente' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _phone,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'Telefone'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _vehicle,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(labelText: 'Veículo'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _plate,
              textCapitalization: TextCapitalization.characters,
              decoration: const InputDecoration(labelText: 'Placa'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _mileage,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Quilometragem'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _description,
              maxLines: 3,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(labelText: 'Descrição'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _notes,
              maxLines: 2,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(
                labelText: 'Observações internas',
              ),
            ),
            const SectionTitle('Itens'),
            for (var i = 0; i < _items.length; i++)
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text('${_items[i].quantity}x ${_items[i].name}'),
                subtitle: Text(formatMoney(_items[i].subtotal)),
                trailing: IconButton(
                  tooltip: 'Remover ${_items[i].name}',
                  icon: const Icon(Icons.delete_outline),
                  onPressed: () => setState(() => _items.removeAt(i)),
                ),
              ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: _addItems,
              icon: const Icon(Icons.add),
              label: const Text('Adicionar itens'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _discount,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(labelText: 'Desconto (R\$)'),
            ),
            const SizedBox(height: 12),
            InfoRow('Subtotal', formatMoney(total), emphasized: true),
            const SizedBox(height: 16),
            BusyButton(label: 'Salvar', busy: _busy, onPressed: _save),
          ],
        ),
      ),
    );
  }
}
