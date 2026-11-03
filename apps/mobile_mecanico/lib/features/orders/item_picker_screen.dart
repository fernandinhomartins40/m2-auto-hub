import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';

/// Escolhe produtos e serviços do catálogo, ou lança um item avulso.
/// Devolve a lista escolhida ao fechar.
class ItemPickerScreen extends ConsumerStatefulWidget {
  const ItemPickerScreen({super.key});

  @override
  ConsumerState<ItemPickerScreen> createState() => _ItemPickerScreenState();
}

class _ItemPickerScreenState extends ConsumerState<ItemPickerScreen> {
  final _search = TextEditingController();
  final List<OrderItem> _picked = [];

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  bool _matches(String name, String category) {
    final term = withoutAccents(_search.text);
    return term.isEmpty ||
        withoutAccents(name).contains(term) ||
        withoutAccents(category).contains(term);
  }

  void _pick(OrderItem item) {
    final duplicate = _picked.any(
      (i) =>
          (item.productId != null && i.productId == item.productId) ||
          (item.serviceId != null && i.serviceId == item.serviceId),
    );
    if (duplicate) {
      showMessage(context, 'Item já adicionado', error: true);
      return;
    }
    setState(() => _picked.add(item));
  }

  Future<void> _addManual() async {
    final item = await showModalBottomSheet<OrderItem>(
      context: context,
      isScrollControlled: true,
      builder: (_) => const _ManualItemSheet(),
    );
    if (item != null) setState(() => _picked.add(item));
  }

  void _changeQuantity(int index, int delta) {
    final item = _picked[index];
    final quantity = item.quantity + delta;
    if (quantity < 1) {
      setState(() => _picked.removeAt(index));
      return;
    }
    if (delta > 0 && item.stock != null && quantity > item.stock!) {
      showMessage(
        context,
        'Apenas ${item.stock} unidade(s) em estoque',
        error: true,
      );
      return;
    }
    setState(() => _picked[index] = item.copyWith(quantity: quantity));
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Adicionar itens'),
          actions: [
            IconButton(
              tooltip: 'Item avulso',
              icon: const Icon(Icons.edit_note),
              onPressed: _addManual,
            ),
          ],
          bottom: const TabBar(
            tabs: [Tab(text: 'Produtos'), Tab(text: 'Serviços')],
          ),
        ),
        bottomNavigationBar: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                ConstrainedBox(
                  constraints: const BoxConstraints(maxHeight: 180),
                  child: ListView(
                    shrinkWrap: true,
                    children: [
                      for (var i = 0; i < _picked.length; i++)
                        _PickedRow(
                          item: _picked[i],
                          onChange: (delta) => _changeQuantity(i, delta),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                FilledButton(
                  onPressed: _picked.isEmpty
                      ? null
                      : () => Navigator.of(context).pop(_picked),
                  child: Text('Adicionar (${_picked.length})'),
                ),
              ],
            ),
          ),
        ),
        body: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(12),
              child: TextField(
                controller: _search,
                onChanged: (_) => setState(() {}),
                decoration: const InputDecoration(
                  labelText: 'Buscar',
                  prefixIcon: Icon(Icons.search),
                ),
              ),
            ),
            Expanded(
              child: TabBarView(
                children: [
                  AsyncPage<List<CatalogProduct>>(
                    value: ref.watch(productsProvider),
                    onRefresh: () => ref.refresh(productsProvider.future),
                    builder: (products) => [
                      for (final product in products)
                        if (_matches(product.name, product.category))
                          ListTile(
                            title: Text(product.name),
                            subtitle: Text(
                              '${formatMoney(product.price)} · '
                              '${product.stock} em estoque',
                            ),
                            trailing: const Icon(Icons.add_circle_outline),
                            onTap: () => _pick(product.toItem()),
                          ),
                    ],
                  ),
                  AsyncPage<List<CatalogService>>(
                    value: ref.watch(servicesProvider),
                    onRefresh: () => ref.refresh(servicesProvider.future),
                    builder: (services) => [
                      for (final service in services)
                        if (_matches(service.name, service.category))
                          ListTile(
                            title: Text(service.name),
                            subtitle: Text(formatMoney(service.price)),
                            trailing: const Icon(Icons.add_circle_outline),
                            onTap: () => _pick(service.toItem()),
                          ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PickedRow extends StatelessWidget {
  const _PickedRow({required this.item, required this.onChange});

  final OrderItem item;
  final ValueChanged<int> onChange;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(item.name, maxLines: 1, overflow: TextOverflow.ellipsis),
        ),
        IconButton(
          tooltip: 'Diminuir ${item.name}',
          icon: const Icon(Icons.remove_circle_outline),
          onPressed: () => onChange(-1),
        ),
        Text('${item.quantity}'),
        IconButton(
          tooltip: 'Aumentar ${item.name}',
          icon: const Icon(Icons.add_circle_outline),
          onPressed: () => onChange(1),
        ),
      ],
    );
  }
}

class _ManualItemSheet extends StatefulWidget {
  const _ManualItemSheet();

  @override
  State<_ManualItemSheet> createState() => _ManualItemSheetState();
}

class _ManualItemSheetState extends State<_ManualItemSheet> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _price = TextEditingController();
  String _type = 'SERVICE';

  @override
  void dispose() {
    _name.dispose();
    _price.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    Navigator.of(context).pop(
      OrderItem(
        type: _type,
        name: _name.text.trim(),
        unitPrice: double.tryParse(_price.text.replaceAll(',', '.')) ?? 0,
        quantity: 1,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        16,
        16,
        16,
        16 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'SERVICE', label: Text('Serviço')),
                ButtonSegment(value: 'PRODUCT', label: Text('Peça')),
              ],
              selected: {_type},
              onSelectionChanged: (value) =>
                  setState(() => _type = value.first),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _name,
              autofocus: true,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(labelText: 'Descrição'),
              validator: (v) =>
                  (v ?? '').trim().isEmpty ? 'Informe a descrição' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _price,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(labelText: 'Valor (R\$)'),
            ),
            const SizedBox(height: 16),
            FilledButton(onPressed: _submit, child: const Text('Adicionar')),
          ],
        ),
      ),
    );
  }
}
