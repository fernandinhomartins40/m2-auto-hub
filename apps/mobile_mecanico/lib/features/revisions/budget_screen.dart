import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../../data/revision_rules.dart';
import '../../shared/ui.dart';

/// Último passo da revisão (`StepBudget` do PWA): lança peças e mão de obra
/// para os itens marcados como Atenção ou Crítico. Ao concluir, cria a OS e
/// fecha a revisão.
class BudgetScreen extends ConsumerStatefulWidget {
  const BudgetScreen({
    super.key,
    required this.revision,
    required this.entries,
    required this.mileage,
    required this.payload,
  });

  final Revision revision;
  final List<CheckEntry> entries;
  final int mileage;

  /// Corpo do salvamento final da revisão.
  final Map<String, dynamic> payload;

  @override
  ConsumerState<BudgetScreen> createState() => _BudgetScreenState();
}

class _BudgetScreenState extends ConsumerState<BudgetScreen> {
  /// Cada linha tem um id fixo: trocar o valor não recria o campo digitado.
  final List<_Slot> _slots = [];
  int _nextId = 0;
  bool _saving = false;

  List<BudgetLine> get _lines => [for (final slot in _slots) slot.line];

  /// Finalizar são três chamadas. Se a última falhar, tentar de novo não pode
  /// criar uma segunda OS para a mesma revisão.
  bool _orderCreated = false;

  double get _total => _lines.fold(0, (sum, line) => sum + line.item.subtotal);

  Future<void> _finish() async {
    final api = ref.read(apiProvider);
    final revision = widget.revision;
    final navigator = Navigator.of(context);
    setState(() => _saving = true);
    final done = await runAction(
      context,
      () async {
        if (!_orderCreated) {
          final saved = await api.saveRevision(revision.id, widget.payload);
          await api.createOrder(
            buildRevisionOrder(
              revision: revision,
              entries: widget.entries,
              lines: _lines,
              checkIds: revisionCheckIds(saved),
              mileage: widget.mileage,
            ),
          );
          _orderCreated = true;
        }
        await api.completeRevision(revision.id);
      },
      success: 'Revisão finalizada e OS criada',
    );
    if (!mounted) return;
    setState(() => _saving = false);
    if (done) {
      ref.invalidate(orderBoardProvider);
      navigator.pop(true);
    }
  }

  void _replace(_Slot slot, OrderItem item) {
    setState(
      () => slot.line =
          BudgetLine(originItemId: slot.line.originItemId, item: item),
    );
  }

  @override
  Widget build(BuildContext context) {
    final problems =
        widget.entries.where((entry) => entry.status.isProblem).toList();
    final products = ref.watch(productsProvider);
    final revision = widget.revision;
    return PanelScaffold(
      appBar: const PanelAppBar(title: 'Continuar Revisão'),
      bottomNavigationBar: DecoratedBox(
        decoration: frostedBarDecoration(top: false),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_lines.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      children: [
                        const Expanded(
                          child: Text(
                            'Total da OS',
                            style: TextStyle(
                              fontSize: 14,
                              color: AppTheme.mutedForeground,
                            ),
                          ),
                        ),
                        Text(
                          formatMoney(_total),
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                Row(
                  children: [
                    OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(0, 44),
                      ),
                      onPressed: _saving ? null : () => Navigator.pop(context),
                      child: const Text('Voltar'),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: FilledButton(
                        style: FilledButton.styleFrom(
                          minimumSize: const Size(0, 44),
                        ),
                        onPressed: _saving ? null : _finish,
                        child: _saving
                            ? const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  SizedBox.square(
                                    dimension: 16,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  ),
                                  SizedBox(width: 8),
                                  Text('Salvando...'),
                                ],
                              )
                            : const Text('Concluir e gerar OS'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        children: [
          Text(
            '${revision.customer?.name ?? 'Cliente'} - '
            '${revision.vehicle?.label ?? 'Veículo'} '
            '(${revision.vehicle?.plate ?? ''})',
            style: const TextStyle(
              fontSize: 12,
              color: AppTheme.mutedForeground,
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'O que precisa ser feito?',
            style: TextStyle(
              fontFamily: AppTheme.headingFont,
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: AppTheme.slate950,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Lance peças e mão de obra para cada problema encontrado. Uma '
            'ordem de serviço será criada com tudo isto.',
            style: TextStyle(fontSize: 14, color: AppTheme.mutedForeground),
          ),
          const SizedBox(height: 20),
          if (problems.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDF4).withValues(alpha: 0.7),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF86EFAC)),
              ),
              child: const Column(
                children: [
                  Icon(LucideIcons.check, size: 32, color: green600),
                  SizedBox(height: 8),
                  Text(
                    'Nenhum problema encontrado',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF14532D),
                    ),
                  ),
                  Text(
                    'A ordem de serviço será criada sem itens de orçamento e '
                    'poderá ser complementada depois.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 14, color: Color(0xFF166534)),
                  ),
                ],
              ),
            ),
          for (final problem in problems) ...[
            _ProblemCard(
              problem: problem,
              products: products.value ?? const [],
              loadingProducts: products.isLoading && !products.hasValue,
              slots: _slots
                  .where((slot) => slot.line.originItemId == problem.itemId)
                  .toList(),
              onAdd: (item) => setState(
                () => _slots.add(
                  _Slot(
                    _nextId++,
                    BudgetLine(originItemId: problem.itemId, item: item),
                  ),
                ),
              ),
              onChange: _replace,
              onRemove: (slot) => setState(() => _slots.remove(slot)),
            ),
            const SizedBox(height: 16),
          ],
        ],
      ),
    );
  }
}

class _Slot {
  _Slot(this.id, this.line);

  final int id;
  BudgetLine line;
}

class _ProblemCard extends StatefulWidget {
  const _ProblemCard({
    required this.problem,
    required this.products,
    required this.loadingProducts,
    required this.slots,
    required this.onAdd,
    required this.onChange,
    required this.onRemove,
  });

  final CheckEntry problem;
  final List<CatalogProduct> products;
  final bool loadingProducts;
  final List<_Slot> slots;
  final ValueChanged<OrderItem> onAdd;
  final void Function(_Slot slot, OrderItem item) onChange;
  final ValueChanged<_Slot> onRemove;

  @override
  State<_ProblemCard> createState() => _ProblemCardState();
}

class _ProblemCardState extends State<_ProblemCard> {
  final _search = TextEditingController();
  final _name = TextEditingController();
  final _price = TextEditingController();

  @override
  void dispose() {
    _search.dispose();
    _name.dispose();
    _price.dispose();
    super.dispose();
  }

  void _addManual(String type) {
    final name = _name.text.trim();
    if (name.isEmpty) return;
    widget.onAdd(
      OrderItem(
        type: type,
        name: name,
        unitPrice: double.tryParse(_price.text.replaceAll(',', '.')) ?? 0,
        quantity: 1,
      ),
    );
    setState(() {
      _name.clear();
      _price.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    final problem = widget.problem;
    final critical = problem.status == CheckStatus.critical;
    final term = withoutAccents(_search.text.trim());
    final found = term.isEmpty
        ? const <CatalogProduct>[]
        : widget.products
            .where(
              (p) =>
                  withoutAccents(p.name).contains(term) ||
                  withoutAccents(p.category).contains(term) ||
                  withoutAccents(p.sku).contains(term),
            )
            .take(8)
            .toList();
    final canAdd = _name.text.trim().isNotEmpty;

    return GlassCard(
      radius: 12,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(
                LucideIcons.triangleAlert,
                size: 20,
                color: critical ? red600 : const Color(0xFFCA8A04),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      problem.itemName,
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    if (problem.notes.isNotEmpty)
                      Text(
                        problem.notes,
                        style: const TextStyle(
                          fontSize: 14,
                          color: AppTheme.mutedForeground,
                        ),
                      ),
                  ],
                ),
              ),
              StatusChip(
                critical ? 'Crítico' : 'Atenção',
                tone: critical ? StatusTone.danger : StatusTone.warning,
              ),
            ],
          ),
          const SizedBox(height: 12),
          for (final slot in widget.slots) ...[
            _LineRow(
              key: ValueKey(slot.id),
              line: slot.line,
              onPrice: (price) => widget.onChange(
                slot,
                slot.line.item.copyWith(unitPrice: price),
              ),
              onRemove: () => widget.onRemove(slot),
            ),
            const SizedBox(height: 6),
          ],
          if (widget.slots.isNotEmpty) const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.muted.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppTheme.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const UpperLabel(
                  'Produto do catálogo',
                  icon: LucideIcons.package,
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _search,
                  enabled: !widget.loadingProducts,
                  onChanged: (_) => setState(() {}),
                  decoration: InputDecoration(
                    fillColor: Colors.white,
                    hintText: widget.loadingProducts
                        ? 'Carregando produtos...'
                        : 'Buscar por nome, categoria ou SKU',
                    prefixIcon: const Icon(LucideIcons.search, size: 16),
                  ),
                ),
                if (found.isNotEmpty)
                  Container(
                    margin: const EdgeInsets.only(top: 8),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: AppTheme.border),
                    ),
                    child: Column(
                      children: [
                        for (final product in found)
                          InkWell(
                            onTap: () {
                              widget.onAdd(product.toItem());
                              setState(_search.clear);
                            },
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 8,
                              ),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          product.name,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                        Text(
                                          'SKU ${product.sku} · estoque '
                                          '${product.stock}',
                                          style: const TextStyle(
                                            fontSize: 12,
                                            color: AppTheme.mutedForeground,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Text(
                                    formatMoney(product.price),
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          const UpperLabel('Item manual ou mão de obra'),
          const SizedBox(height: 8),
          TextField(
            controller: _name,
            onChanged: (_) => setState(() {}),
            textCapitalization: TextCapitalization.sentences,
            decoration: const InputDecoration(
              hintText: 'Peça ou serviço',
              fillColor: Colors.white,
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _price,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(
              hintText: '0,00',
              fillColor: Colors.white,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  style: compact(null),
                  onPressed: canAdd ? () => _addManual('SERVICE') : null,
                  icon: const Icon(LucideIcons.wrench),
                  label: const Text('Mão de obra'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  style: compact(null),
                  onPressed: canAdd ? () => _addManual('PRODUCT') : null,
                  icon: const Icon(LucideIcons.package),
                  label: const Text('Peça manual'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Linha lançada: ícone do tipo, nome, valor editável e lixeira.
class _LineRow extends StatefulWidget {
  const _LineRow({
    super.key,
    required this.line,
    required this.onPrice,
    required this.onRemove,
  });

  final BudgetLine line;
  final ValueChanged<double> onPrice;
  final VoidCallback onRemove;

  @override
  State<_LineRow> createState() => _LineRowState();
}

class _LineRowState extends State<_LineRow> {
  late final _price = TextEditingController(
    text: widget.line.item.unitPrice.toStringAsFixed(2),
  );

  @override
  void dispose() {
    _price.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final item = widget.line.item;
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 6, 4, 6),
      decoration: BoxDecoration(
        color: AppTheme.muted.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(
            item.isProduct ? LucideIcons.package : LucideIcons.wrench,
            size: 16,
            color: AppTheme.mutedForeground,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              item.name,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 14),
            ),
          ),
          SizedBox(
            width: 104,
            child: TextField(
              controller: _price,
              textAlign: TextAlign.right,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              onChanged: (value) =>
                  widget.onPrice(double.tryParse(value.replaceAll(',', '.')) ?? 0),
              decoration: const InputDecoration(
                fillColor: Colors.white,
                contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              ),
            ),
          ),
          IconButton(
            tooltip: 'Remover ${item.name}',
            iconSize: 14,
            visualDensity: VisualDensity.compact,
            onPressed: widget.onRemove,
            icon: const Icon(LucideIcons.trash2),
          ),
        ],
      ),
    );
  }
}
