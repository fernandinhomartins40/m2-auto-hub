import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../../shared/stat_tile.dart';
import 'order_detail_screen.dart';
import 'order_form_screen.dart';
import 'plate_lookup_screen.dart';

class OrdersTab extends ConsumerStatefulWidget {
  const OrdersTab({super.key});

  @override
  ConsumerState<OrdersTab> createState() => _OrdersTabState();
}

class _OrdersTabState extends ConsumerState<OrdersTab> {
  final _search = TextEditingController();
  String? _status;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _newOrder() async {
    final navigator = Navigator.of(context);
    final lookup = await navigator.push<PlateLookup>(
      MaterialPageRoute(builder: (_) => const PlateLookupScreen()),
    );
    if (lookup == null) return;
    await navigator.push(
      MaterialPageRoute(builder: (_) => OrderFormScreen(lookup: lookup)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _newOrder,
        icon: const Icon(Icons.add),
        label: const Text('Nova OS'),
      ),
      body: AsyncPage<OrderBoard>(
        value: ref.watch(orderBoardProvider),
        onRefresh: () => ref.refresh(orderBoardProvider.future),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
        builder: (board) {
          final orders = board.orders
              .where((o) => _status == null || o.status == _status)
              .where((o) => o.matches(_search.text))
              .toList();
          return [
            StatRow(
              stats: [
                ('Abertas', board.stats.open),
                ('Em andamento', board.stats.inProgress),
                ('Concluídas hoje', board.stats.completedToday),
                ('Total', board.stats.total),
              ],
            ),
            TextField(
              controller: _search,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(
                labelText: 'Buscar por nº, cliente ou placa',
                prefixIcon: Icon(Icons.search),
              ),
            ),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: SegmentedButton<String?>(
                showSelectedIcon: false,
                segments: const [
                  ButtonSegment(value: null, label: Text('Todas')),
                  ButtonSegment(value: 'OPEN', label: Text('Abertas')),
                  ButtonSegment(value: 'IN_PROGRESS', label: Text('Andamento')),
                  ButtonSegment(value: 'COMPLETED', label: Text('Concluídas')),
                ],
                selected: {_status},
                onSelectionChanged: (value) =>
                    setState(() => _status = value.first),
              ),
            ),
            if (orders.isEmpty)
              const EmptyState(
                icon: Icons.assignment_outlined,
                message: 'Nenhuma ordem de serviço encontrada.',
              ),
            for (final order in orders)
              _OrderCard(
                order: order,
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => OrderDetailScreen(orderId: order.id),
                  ),
                ),
              ),
          ];
        },
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  const _OrderCard({required this.order, required this.onTap});

  final ServiceOrder order;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final (label, tone) = order.statusView;
    final theme = Theme.of(context);
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'OS #${order.number}',
                      style: theme.textTheme.titleMedium,
                    ),
                  ),
                  StatusChip(label, tone: tone),
                ],
              ),
              const SizedBox(height: 4),
              Text(order.customerName),
              if (order.vehicleText.isNotEmpty) Text(order.vehicleText),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(child: Text(formatDate(order.createdAt))),
                  Text(
                    formatMoney(order.total),
                    style: theme.textTheme.titleSmall,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
