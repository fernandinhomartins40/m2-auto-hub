import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../../shared/ui.dart';

/// "Adição rápida de itens" do PWA: escolhe serviços e produtos do catálogo,
/// ou lança um item avulso. Devolve a lista escolhida ao fechar.
class ItemPickerScreen extends ConsumerStatefulWidget {
  const ItemPickerScreen({super.key, this.subtitle});

  /// "OS #1 · João Silva".
  final String? subtitle;

  @override
  ConsumerState<ItemPickerScreen> createState() => _ItemPickerScreenState();
}

class _ItemPickerScreenState extends ConsumerState<ItemPickerScreen> {
  final _search = TextEditingController();
  final List<OrderItem> _picked = [];
  int _tab = 0;

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
      builder: (_) => const ManualItemSheet(),
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
    final services = _tab == 0;
    return PanelScaffold(
      appBar: PanelAppBar(
        title: 'Adição rápida de itens',
        actions: [
          IconButton(
            tooltip: 'Item avulso',
            icon: const Icon(LucideIcons.squarePlus, size: 20),
            onPressed: _addManual,
          ),
        ],
      ),
      bottomNavigationBar: DecoratedBox(
        decoration: frostedBarDecoration(top: false),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            child: Row(
              children: [
                OutlinedButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Voltar'),
                ),
                const Spacer(),
                FilledButton.icon(
                  onPressed: _picked.isEmpty
                      ? null
                      : () => Navigator.of(context).pop(_picked),
                  icon: const Icon(LucideIcons.plus),
                  label: const Text('Adicionar'),
                ),
              ],
            ),
          ),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (widget.subtitle != null)
              Text(
                widget.subtitle!,
                style: const TextStyle(
                  fontSize: 14,
                  color: AppTheme.mutedForeground,
                ),
              ),
            const SizedBox(height: 12),
            Center(
              child: WorkspaceTabs(
                index: _tab,
                onChanged: (tab) => setState(() => _tab = tab),
                tabs: const [
                  WorkspaceTab('Serviços', icon: LucideIcons.wrench),
                  WorkspaceTab('Produtos', icon: LucideIcons.package),
                ],
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _search,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(
                hintText: services ? 'Buscar serviços...' : 'Buscar produtos...',
                fillColor: Colors.white.withValues(alpha: 0.85),
                prefixIcon: const Icon(LucideIcons.search, size: 16),
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              flex: 3,
              child: services
                  ? AsyncPage<List<CatalogService>>(
                      value: ref.watch(servicesProvider),
                      onRefresh: () => ref.refresh(servicesProvider.future),
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      builder: (list) => [
                        for (final service in list)
                          if (_matches(service.name, service.category))
                            _CatalogCard(
                              name: service.name,
                              detail: service.category,
                              price: service.price,
                              onTap: () => _pick(service.toItem()),
                            ),
                      ],
                    )
                  : AsyncPage<List<CatalogProduct>>(
                      value: ref.watch(productsProvider),
                      onRefresh: () => ref.refresh(productsProvider.future),
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      builder: (list) => [
                        for (final product in list)
                          if (_matches(product.name, product.category))
                            _CatalogCard(
                              name: product.name,
                              detail:
                                  '${product.category} · ${product.stock} em estoque',
                              price: product.price,
                              onTap: () => _pick(product.toItem()),
                            ),
                      ],
                    ),
            ),
            const Divider(),
            const SizedBox(height: 12),
            Text(
              'Itens a adicionar (${_picked.length})',
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            Expanded(
              flex: 2,
              child: _picked.isEmpty
                  ? const Align(
                      alignment: Alignment.topCenter,
                      child: DashedBox(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(LucideIcons.zap, size: 28, color: gray400),
                            SizedBox(height: 6),
                            Text(
                              'Selecione itens acima para adicionar à OS',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 14,
                                color: AppTheme.mutedForeground,
                              ),
                            ),
                          ],
                        ),
                      ),
                    )
                  : ListView(
                      children: [
                        for (var i = 0; i < _picked.length; i++)
                          _PickedRow(
                            item: _picked[i],
                            onChange: (delta) => _changeQuantity(i, delta),
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

class _CatalogCard extends StatelessWidget {
  const _CatalogCard({
    required this.name,
    required this.detail,
    required this.price,
    required this.onTap,
  });

  final String name;
  final String detail;
  final double price;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white.withValues(alpha: 0.85),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: const BorderSide(color: AppTheme.border),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                        color: AppTheme.slate950,
                      ),
                    ),
                    Text(
                      detail,
                      style: const TextStyle(fontSize: 12, color: gray600),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      formatMoney(price),
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF2563EB),
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(LucideIcons.plus, size: 20, color: Color(0xFF2563EB)),
            ],
          ),
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
    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.fromLTRB(10, 4, 4, 4),
      decoration: BoxDecoration(
        color: gray50,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        children: [
          StatusChip(
            item.isProduct ? 'Produto' : 'Serviço',
            tone: item.isProduct ? StatusTone.info : StatusTone.orange,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              item.name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
            ),
          ),
          IconButton(
            tooltip: 'Diminuir ${item.name}',
            iconSize: 16,
            visualDensity: VisualDensity.compact,
            icon: const Icon(LucideIcons.minus),
            onPressed: () => onChange(-1),
          ),
          Text('${item.quantity}'),
          IconButton(
            tooltip: 'Aumentar ${item.name}',
            iconSize: 16,
            visualDensity: VisualDensity.compact,
            icon: const Icon(LucideIcons.plus),
            onPressed: () => onChange(1),
          ),
        ],
      ),
    );
  }
}

/// Item avulso (peça ou serviço fora do catálogo).
class ManualItemSheet extends StatefulWidget {
  const ManualItemSheet({super.key});

  @override
  State<ManualItemSheet> createState() => _ManualItemSheetState();
}

class _ManualItemSheetState extends State<ManualItemSheet> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _price = TextEditingController();
  int _type = 0;

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
        type: _type == 0 ? 'SERVICE' : 'PRODUCT',
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
        0,
        16,
        16 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Item avulso',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 12),
            WorkspaceTabs(
              expand: true,
              index: _type,
              onChanged: (type) => setState(() => _type = type),
              tabs: const [
                WorkspaceTab('Mão de obra', icon: LucideIcons.wrench),
                WorkspaceTab('Peça', icon: LucideIcons.package),
              ],
            ),
            const SizedBox(height: 12),
            FormInput(
              label: 'Nome do item',
              controller: _name,
              hint: 'Peça ou serviço',
              capitalization: TextCapitalization.sentences,
              validator: (v) =>
                  (v ?? '').trim().isEmpty ? 'Informe a descrição' : null,
            ),
            const SizedBox(height: 12),
            FormInput(
              label: 'Valor (R\$)',
              controller: _price,
              hint: '0,00',
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
            ),
            const SizedBox(height: 16),
            FilledButton(onPressed: _submit, child: const Text('Adicionar')),
          ],
        ),
      ),
    );
  }
}
