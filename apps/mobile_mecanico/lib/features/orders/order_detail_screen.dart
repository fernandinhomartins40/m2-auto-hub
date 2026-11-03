import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import 'item_picker_screen.dart';
import 'order_form_screen.dart';

class OrderDetailScreen extends ConsumerStatefulWidget {
  const OrderDetailScreen({super.key, required this.orderId});

  final String orderId;

  @override
  ConsumerState<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends ConsumerState<OrderDetailScreen> {
  bool _busy = false;

  void _reload() {
    ref.invalidate(orderProvider(widget.orderId));
    ref.invalidate(orderBoardProvider);
  }

  Future<void> _run(Future<void> Function() action, String message) async {
    setState(() => _busy = true);
    final done = await runAction(context, action, success: message);
    if (!mounted) return;
    setState(() => _busy = false);
    if (done) _reload();
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
        () => ref.read(apiProvider).completeOrder(order.id),
        'OS concluída',
      );
    }
  }

  /// A API substitui a lista inteira ao receber `items`: os novos entram
  /// junto com os que já estão na OS.
  Future<void> _addItems(ServiceOrder order) async {
    final items = await Navigator.of(context).push<List<OrderItem>>(
      MaterialPageRoute(builder: (_) => const ItemPickerScreen()),
    );
    if (items == null || !mounted) return;
    await _run(
      () => ref.read(apiProvider).updateOrder(order.id, {
        'items': [for (final item in [...order.items, ...items]) item.toJson()],
        'discount': order.discount,
      }),
      'Itens adicionados à OS',
    );
  }

  Future<void> _call(String phone) async {
    final opened = await launchUrl(Uri(scheme: 'tel', path: digitsOnly(phone)));
    if (!opened && mounted) {
      showMessage(context, 'Não foi possível abrir o telefone.', error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final value = ref.watch(orderProvider(widget.orderId));
    final order = value.value;
    final api = ref.read(apiProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(order == null ? 'Ordem de serviço' : 'OS #${order.number}'),
        actions: [
          if (order != null && order.isOpen)
            IconButton(
              tooltip: 'Editar OS',
              icon: const Icon(Icons.edit_outlined),
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => OrderFormScreen(order: order)),
              ),
            ),
        ],
      ),
      bottomNavigationBar: order == null || !order.isOpen
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    if (order.status == 'OPEN') ...[
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _busy
                              ? null
                              : () => _run(
                                    () => api.startOrder(order.id),
                                    'OS iniciada',
                                  ),
                          icon: const Icon(Icons.play_arrow),
                          label: const Text('Iniciar'),
                        ),
                      ),
                      const SizedBox(width: 8),
                    ],
                    Expanded(
                      child: BusyButton(
                        label: 'Concluir',
                        icon: Icons.check,
                        busy: _busy,
                        onPressed: () => _complete(order),
                      ),
                    ),
                  ],
                ),
              ),
            ),
      body: AsyncPage<ServiceOrder>(
        value: value,
        onRefresh: () => ref.refresh(orderProvider(widget.orderId).future),
        builder: (order) => [
          Align(
            alignment: Alignment.centerLeft,
            child: StatusChip(order.statusView.$1, tone: order.statusView.$2),
          ),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  InfoRow('Cliente', order.customerName),
                  if (order.vehicleText.isNotEmpty)
                    InfoRow('Veículo', order.vehicleText),
                  InfoRow('Quilometragem', formatKm(order.mileage)),
                  InfoRow('Aberta em', formatDateTime(order.createdAt)),
                  if ((order.customerPhone ?? '').isNotEmpty) ...[
                    const SizedBox(height: 8),
                    OutlinedButton.icon(
                      onPressed: () => _call(order.customerPhone!),
                      icon: const Icon(Icons.call_outlined),
                      label: Text('Ligar: ${order.customerPhone}'),
                    ),
                  ],
                ],
              ),
            ),
          ),
          if ((order.description ?? '').isNotEmpty) ...[
            const SectionTitle('Descrição'),
            Text(order.description!),
          ],
          if ((order.internalNotes ?? '').isNotEmpty) ...[
            const SectionTitle('Observações internas'),
            Text(order.internalNotes!),
          ],
          const SectionTitle('Itens'),
          if (order.items.isEmpty) const Text('Sem itens.'),
          for (final item in order.items)
            InfoRow(
              '${item.quantity}x ${item.name} '
              '(${item.isProduct ? 'peça' : 'serviço'})',
              formatMoney(item.subtotal),
            ),
          if (order.isOpen)
            OutlinedButton.icon(
              onPressed: _busy ? null : () => _addItems(order),
              icon: const Icon(Icons.add),
              label: const Text('Adicionar itens'),
            ),
          const Divider(),
          InfoRow('Mão de obra', formatMoney(order.laborTotal)),
          InfoRow('Produtos', formatMoney(order.partsTotal)),
          if (order.discount > 0)
            InfoRow('Desconto', '- ${formatMoney(order.discount)}'),
          InfoRow('Total', formatMoney(order.total), emphasized: true),
        ],
      ),
    );
  }
}
