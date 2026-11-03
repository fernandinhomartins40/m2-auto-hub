import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../../shared/ui.dart';
import '../auth/auth_controller.dart';
import 'item_picker_screen.dart';
import 'order_detail_screen.dart';
import 'order_form_screen.dart';
import 'plate_lookup_screen.dart';

/// Ordens de serviço do mecânico (`ServiceOrdersContent` em modo restrito).
class OrdersTab extends ConsumerStatefulWidget {
  const OrdersTab({super.key});

  @override
  ConsumerState<OrdersTab> createState() => _OrdersTabState();
}

class _OrdersTabState extends ConsumerState<OrdersTab> {
  final _search = TextEditingController();
  String _status = '';
  String? _busyId;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _push(Widget screen) async {
    await Navigator.of(context).push(MaterialPageRoute(builder: (_) => screen));
    if (mounted) ref.invalidate(orderBoardProvider);
  }

  /// Criação rápida: lê a placa e abre o assistente já preenchido.
  Future<void> _quickCreate() async {
    final navigator = Navigator.of(context);
    final lookup = await navigator.push<PlateLookup>(
      MaterialPageRoute(builder: (_) => const PlateLookupScreen()),
    );
    if (lookup == null || !mounted) return;
    await _push(OrderFormScreen(lookup: lookup));
  }

  Future<void> _run(String id, Future<void> Function() action, String ok) async {
    setState(() => _busyId = id);
    final done = await runAction(context, action, success: ok);
    if (!mounted) return;
    setState(() => _busyId = null);
    if (done) ref.invalidate(orderBoardProvider);
  }

  Future<void> _complete(ServiceOrder order) async {
    final accepted = await confirm(
      context,
      title: 'Concluir OS #${order.number}?',
      message: 'A baixa de estoque dos produtos é feita ao concluir.',
      confirmLabel: 'Concluir',
    );
    if (accepted && mounted) {
      await _run(
        order.id,
        () => ref.read(apiProvider).completeOrder(order.id),
        'OS concluída',
      );
    }
  }

  /// A API substitui a lista inteira ao receber `items`: os novos entram
  /// junto com os que já estão na OS.
  Future<void> _addItems(ServiceOrder order) async {
    final items = await Navigator.of(context).push<List<OrderItem>>(
      MaterialPageRoute(
        builder: (_) => ItemPickerScreen(
          subtitle: 'OS #${order.number} · ${order.customerName}',
        ),
      ),
    );
    if (items == null || !mounted) return;
    await _run(
      order.id,
      () => ref.read(apiProvider).updateOrder(order.id, {
        'items': [for (final item in [...order.items, ...items]) item.toJson()],
        'discount': order.discount,
      }),
      'Itens adicionados à OS',
    );
  }

  @override
  Widget build(BuildContext context) {
    final api = ref.read(apiProvider);
    final mechanicName = ref.watch(authControllerProvider).mechanic?.name;
    return AsyncPage<OrderBoard>(
      value: ref.watch(orderBoardProvider),
      onRefresh: () => ref.refresh(orderBoardProvider.future),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      builder: (board) {
        final orders = board.orders
            .where((o) => _status.isEmpty || o.status == _status)
            .where((o) => o.matches(_search.text))
            .toList();
        return [
          PanelPageHeader(
            icon: LucideIcons.clipboardList,
            title: 'Minhas Ordens de Serviço',
            description: 'Gerencie serviços executados e produtos usados, '
                'com atribuição de mecânico.',
            actions: [
              OutlinedButton.icon(
                onPressed: () => ref.invalidate(orderBoardProvider),
                icon: const Icon(LucideIcons.refreshCw),
                label: const Text('Atualizar'),
              ),
              OutlinedButton.icon(
                onPressed: _quickCreate,
                icon: const Icon(LucideIcons.camera),
                label: const Text('Criação rápida (ler placa)'),
              ),
              FilledButton.icon(
                onPressed: () => _push(const OrderFormScreen()),
                icon: const Icon(LucideIcons.plus),
                label: const Text('Nova OS'),
              ),
            ],
          ),
          TwoColumnGrid(
            children: [
              StatTile(
                label: 'Abertas',
                value: '${board.stats.open}',
                valueColor: const Color(0xFFCA8A04),
              ),
              StatTile(
                label: 'Em andamento',
                value: '${board.stats.inProgress}',
                valueColor: const Color(0xFF2563EB),
              ),
              StatTile(
                label: 'Concluídas hoje',
                value: '${board.stats.completedToday}',
                valueColor: green600,
              ),
              StatTile(label: 'Total', value: '${board.stats.total}'),
            ],
          ),
          TextField(
            controller: _search,
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(
              hintText: 'Buscar por nº, cliente ou placa...',
              fillColor: Colors.white.withValues(alpha: 0.8),
              prefixIcon: const Icon(LucideIcons.search, size: 16),
            ),
          ),
          SelectField<String>(
            value: _status,
            options: const {
              '': 'Todos os status',
              'OPEN': 'Abertas',
              'IN_PROGRESS': 'Em andamento',
              'COMPLETED': 'Concluídas',
              'CANCELLED': 'Canceladas',
            },
            onChanged: (value) => setState(() => _status = value),
          ),
          if (orders.isEmpty)
            const EmptyState(
              icon: LucideIcons.clipboardList,
              message: 'Nenhuma ordem de serviço encontrada.',
            ),
          for (final order in orders)
            _OrderCard(
              order: order,
              mechanicName: mechanicName,
              busy: _busyId == order.id,
              onView: () => _push(OrderDetailScreen(orderId: order.id)),
              onAddItems: () => _addItems(order),
              onEdit: () => _push(OrderFormScreen(order: order)),
              onStart: () => _run(
                order.id,
                () => api.startOrder(order.id),
                'OS iniciada',
              ),
              onComplete: () => _complete(order),
            ),
        ];
      },
    );
  }
}

class _OrderCard extends StatelessWidget {
  const _OrderCard({
    required this.order,
    required this.mechanicName,
    required this.busy,
    required this.onView,
    required this.onAddItems,
    required this.onEdit,
    required this.onStart,
    required this.onComplete,
  });

  final ServiceOrder order;
  final String? mechanicName;
  final bool busy;
  final VoidCallback onView;
  final VoidCallback onAddItems;
  final VoidCallback onEdit;
  final VoidCallback onStart;
  final VoidCallback onComplete;

  @override
  Widget build(BuildContext context) {
    final (label, tone) = order.statusView;
    return GlassCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Wrap(
                  spacing: 8,
                  runSpacing: 4,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text(
                      'OS #${order.number}',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.slate950,
                      ),
                    ),
                    StatusChip(label, tone: tone),
                    if (order.revisionId != null) const _RevisionBadge(),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    formatMoney(order.total),
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF2563EB),
                    ),
                  ),
                  Text(
                    formatDate(order.createdAt),
                    style: const TextStyle(fontSize: 12, color: gray600),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 6),
          MetaLine(LucideIcons.user, order.customerName),
          if (order.vehicleText.isNotEmpty) ...[
            const SizedBox(height: 2),
            MetaLine(LucideIcons.car, order.vehicleText),
          ],
          if (mechanicName != null) ...[
            const SizedBox(height: 2),
            Text(
              'Mecânico: $mechanicName',
              style: const TextStyle(fontSize: 12, color: gray600),
            ),
          ],
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              OutlinedButton.icon(
                style: compact(null),
                onPressed: onView,
                icon: const Icon(LucideIcons.eye),
                label: const Text('Ver'),
              ),
              if (order.isOpen) ...[
                OutlinedButton.icon(
                  style: compact(null),
                  onPressed: busy ? null : onAddItems,
                  icon: const Icon(LucideIcons.zap),
                  label: const Text('Adicionar itens'),
                ),
                OutlinedButton.icon(
                  style: compact(null),
                  onPressed: busy ? null : onEdit,
                  icon: const Icon(LucideIcons.pencil),
                  label: const Text('Editar'),
                ),
              ],
              if (order.status == 'OPEN')
                OutlinedButton.icon(
                  style: compact(null),
                  onPressed: busy ? null : onStart,
                  icon: const Icon(LucideIcons.play),
                  label: const Text('Iniciar'),
                ),
              if (order.isOpen)
                FilledButton.icon(
                  style: successFilled.merge(
                    FilledButton.styleFrom(minimumSize: const Size(0, 36)),
                  ),
                  onPressed: busy ? null : onComplete,
                  icon: const Icon(LucideIcons.circleCheck),
                  label: const Text('Concluir'),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Selo azul de contorno da OS que nasceu de uma revisão.
class _RevisionBadge extends StatelessWidget {
  const _RevisionBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 1),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: const Color(0xFF93C5FD)),
      ),
      child: const Text(
        'Revisão',
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: Color(0xFF1D4ED8),
        ),
      ),
    );
  }
}
