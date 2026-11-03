import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../../data/revision_rules.dart';
import '../orders/item_picker_screen.dart';

/// Último passo da revisão: lança peças e mão de obra para os itens marcados
/// como Atenção ou Crítico. Ao concluir, cria a OS e fecha a revisão.
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
  final List<BudgetLine> _lines = [];
  bool _saving = false;

  /// Finalizar são três chamadas. Se a última falhar, tentar de novo não pode
  /// criar uma segunda OS para a mesma revisão.
  bool _orderCreated = false;

  double get _total => _lines.fold(0, (sum, line) => sum + line.item.subtotal);

  Future<void> _add(CheckEntry problem) async {
    final items = await Navigator.of(context).push<List<OrderItem>>(
      MaterialPageRoute(builder: (_) => const ItemPickerScreen()),
    );
    if (items == null) return;
    setState(() {
      _lines.addAll(
        items.map((i) => BudgetLine(originItemId: problem.itemId, item: i)),
      );
    });
  }

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

  @override
  Widget build(BuildContext context) {
    final problems =
        widget.entries.where((entry) => entry.status.isProblem).toList();
    return Scaffold(
      appBar: AppBar(title: const Text('O que precisa ser feito?')),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              InfoRow('Total da OS', formatMoney(_total), emphasized: true),
              const SizedBox(height: 8),
              BusyButton(
                label: 'Finalizar e criar OS',
                busy: _saving,
                onPressed: _finish,
              ),
            ],
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (problems.isEmpty)
            const EmptyState(
              icon: Icons.check_circle_outline,
              message: 'Nenhum problema encontrado. A OS será criada sem itens '
                  'e pode ser complementada depois.',
            ),
          for (final problem in problems) ...[
            _ProblemCard(
              problem: problem,
              lines: _lines
                  .where((line) => line.originItemId == problem.itemId)
                  .toList(),
              onAdd: () => _add(problem),
              onRemove: (line) => setState(() => _lines.remove(line)),
            ),
            const SizedBox(height: 12),
          ],
        ],
      ),
    );
  }
}

class _ProblemCard extends StatelessWidget {
  const _ProblemCard({
    required this.problem,
    required this.lines,
    required this.onAdd,
    required this.onRemove,
  });

  final CheckEntry problem;
  final List<BudgetLine> lines;
  final VoidCallback onAdd;
  final ValueChanged<BudgetLine> onRemove;

  @override
  Widget build(BuildContext context) {
    final critical = problem.status == CheckStatus.critical;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    problem.itemName,
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
                ),
                StatusChip(
                  critical ? 'Crítico' : 'Atenção',
                  tone: critical ? StatusTone.danger : StatusTone.warning,
                ),
              ],
            ),
            if (problem.notes.isNotEmpty) Text(problem.notes),
            for (final line in lines)
              ListTile(
                dense: true,
                contentPadding: EdgeInsets.zero,
                title: Text('${line.item.quantity}x ${line.item.name}'),
                subtitle: Text(formatMoney(line.item.subtotal)),
                trailing: IconButton(
                  tooltip: 'Remover ${line.item.name}',
                  icon: const Icon(Icons.delete_outline),
                  onPressed: () => onRemove(line),
                ),
              ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: onAdd,
              icon: const Icon(Icons.add),
              label: const Text('Adicionar peça ou serviço'),
            ),
          ],
        ),
      ),
    );
  }
}
