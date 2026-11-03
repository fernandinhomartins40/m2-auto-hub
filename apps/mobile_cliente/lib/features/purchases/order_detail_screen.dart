import 'package:flutter/material.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../shared/ui.dart';

/// Detalhes do pedido (diálogo "Ver Detalhes" do PWA).
class OrderDetailScreen extends StatelessWidget {
  const OrderDetailScreen({super.key, required this.order});

  final Order order;

  @override
  Widget build(BuildContext context) {
    final (label, tone) = order.statusView;
    return PanelScaffold(
      appBar: PanelAppBar(title: 'Pedido #${order.shortId}'),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
        children: [
          PanelPageHeader(
            icon: LucideIcons.package,
            title: 'Pedido #${order.shortId}',
            description: 'Realizado em ${formatDateTime(order.createdAt)}',
            badge: StatusChip(label, tone: tone),
          ),
          const SizedBox(height: 16),
          GlassCard(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const CardHeading(
                  icon: LucideIcons.shoppingBag,
                  title: 'Itens do Pedido',
                ),
                const SizedBox(height: 12),
                for (final item in order.items) ...[
                  ItemLine(
                    name: '${item.quantity}x ${item.name}',
                    trailing: formatMoney(item.price * item.quantity),
                  ),
                  const SizedBox(height: 6),
                ],
                const Divider(height: 24),
                if (order.discount > 0)
                  InfoRow('Desconto', '- ${formatMoney(order.discount)}'),
                InfoRow('Total', formatMoney(order.total), emphasized: true),
              ],
            ),
          ),
          const SizedBox(height: 16),
          GlassCard(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const CardHeading(icon: LucideIcons.info, title: 'Informações'),
                const SizedBox(height: 12),
                LabeledBox(
                  label: 'Data',
                  value: formatDateTime(order.createdAt),
                ),
                if ((order.paymentMethod ?? '').isNotEmpty) ...[
                  const SizedBox(height: 12),
                  LabeledBox(
                    label: 'Pagamento',
                    icon: LucideIcons.creditCard,
                    value: order.paymentMethod!,
                  ),
                ],
                if ((order.trackingCode ?? '').isNotEmpty) ...[
                  const SizedBox(height: 12),
                  LabeledBox(
                    label: 'Rastreio',
                    icon: LucideIcons.truck,
                    value: order.trackingCode!,
                  ),
                ],
                if (order.address != null) ...[
                  const SizedBox(height: 12),
                  LabeledBox(
                    label: 'Entrega',
                    icon: LucideIcons.mapPin,
                    value: order.address!.line,
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
