import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../../shared/ui.dart';
import '../auth/auth_controller.dart';
import 'order_form_screen.dart';

/// Detalhe da OS (`ServiceOrderDetailsModal`).
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
    final mechanic = ref.watch(authControllerProvider).mechanic;

    return PanelScaffold(
      appBar: PanelAppBar(
        title: order == null ? 'Ordem de serviço' : 'OS #${order.number}',
        actions: [
          if (order != null) ...[
            Center(
              child: StatusChip(order.statusView.$1, tone: order.statusView.$2),
            ),
            if (order.isOpen)
              IconButton(
                tooltip: 'Editar OS',
                icon: const Icon(LucideIcons.pencil, size: 18),
                onPressed: () async {
                  await Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => OrderFormScreen(order: order),
                    ),
                  );
                  _reload();
                },
              ),
          ],
        ],
      ),
      bottomNavigationBar: order == null
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                child: Row(
                  children: [
                    FilledButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Voltar'),
                    ),
                    if (order.status == 'OPEN') ...[
                      const SizedBox(width: 8),
                      OutlinedButton.icon(
                        onPressed: _busy
                            ? null
                            : () => _run(
                                  () => api.startOrder(order.id),
                                  'OS iniciada',
                                ),
                        icon: const Icon(LucideIcons.play),
                        label: const Text('Iniciar'),
                      ),
                    ],
                    if (order.isOpen) ...[
                      const SizedBox(width: 8),
                      FilledButton.icon(
                        style: successFilled,
                        onPressed: _busy ? null : () => _complete(order),
                        icon: const Icon(LucideIcons.circleCheck),
                        label: const Text('Concluir'),
                      ),
                    ],
                  ],
                ),
              ),
            ),
      body: AsyncPage<ServiceOrder>(
        value: value,
        onRefresh: () => ref.refresh(orderProvider(widget.orderId).future),
        builder: (order) => [
          if (order.revisionId != null)
            Align(
              alignment: Alignment.centerLeft,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: const Color(0xFF93C5FD)),
                ),
                child: Text(
                  'Originada pela revisão #'
                  '${order.revisionId!.length > 8 ? order.revisionId!.substring(0, 8) : order.revisionId}',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1D4ED8),
                  ),
                ),
              ),
            ),
          GlassCard(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  order.customerName,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.slate950,
                  ),
                ),
                if ((order.customerPhone ?? '').isNotEmpty)
                  GestureDetector(
                    onTap: () => _call(order.customerPhone!),
                    child: Text(
                      order.customerPhone!,
                      style: const TextStyle(fontSize: 14, color: gray600),
                    ),
                  ),
                Text(
                  [
                    if (order.vehicleText.isNotEmpty) order.vehicleText,
                    if ((order.mileage ?? 0) > 0) '${order.mileage} km',
                  ].join(' · '),
                  style: const TextStyle(fontSize: 14, color: gray600),
                ),
                if ((order.description ?? '').isNotEmpty) ...[
                  const SizedBox(height: 12),
                  const Text(
                    'Descrição',
                    style: TextStyle(fontSize: 12, color: AppTheme.mutedForeground),
                  ),
                  Text(order.description!, style: const TextStyle(fontSize: 14)),
                ],
                if ((order.internalNotes ?? '').isNotEmpty) ...[
                  const SizedBox(height: 12),
                  const Text(
                    'Observações internas',
                    style: TextStyle(fontSize: 12, color: AppTheme.mutedForeground),
                  ),
                  Text(
                    order.internalNotes!,
                    style: const TextStyle(fontSize: 14),
                  ),
                ],
                const SizedBox(height: 12),
                const Divider(),
                const SizedBox(height: 12),
                const Text(
                  'Itens',
                  style: TextStyle(fontSize: 12, color: AppTheme.mutedForeground),
                ),
                const SizedBox(height: 4),
                if (order.items.isEmpty)
                  const Text(
                    'Sem itens.',
                    style: TextStyle(fontSize: 14, color: gray600),
                  ),
                for (final item in order.items)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        StatusChip(
                          item.isProduct ? 'Produto' : 'Serviço',
                          tone: item.isProduct
                              ? StatusTone.info
                              : StatusTone.orange,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            '${item.name} × ${item.quantity}',
                            style: const TextStyle(fontSize: 14),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          formatMoney(item.subtotal),
                          style: const TextStyle(fontSize: 14),
                        ),
                      ],
                    ),
                  ),
                const SizedBox(height: 8),
                const Divider(),
                const SizedBox(height: 8),
                _TotalRow('Mão de obra', formatMoney(order.laborTotal)),
                _TotalRow('Produtos', formatMoney(order.partsTotal)),
                if (order.discount > 0)
                  _TotalRow('Desconto', '- ${formatMoney(order.discount)}'),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Expanded(
                      child: Text(
                        'Total',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    Text(
                      formatMoney(order.total),
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF2563EB),
                      ),
                    ),
                  ],
                ),
                if (mechanic != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    'Mecânico responsável: ${mechanic.name}',
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppTheme.mutedForeground,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TotalRow extends StatelessWidget {
  const _TotalRow(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: const TextStyle(fontSize: 14, color: AppTheme.mutedForeground),
            ),
          ),
          Text(value, style: const TextStyle(fontSize: 14)),
        ],
      ),
    );
  }
}
