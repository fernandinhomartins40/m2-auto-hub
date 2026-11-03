import 'package:flutter/material.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';

class OrderDetailScreen extends StatelessWidget {
  const OrderDetailScreen({super.key, required this.order});

  final Order order;

  @override
  Widget build(BuildContext context) {
    final (label, tone) = order.statusView;
    return Scaffold(
      appBar: AppBar(title: Text('Pedido ${order.shortId}')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: StatusChip(label, tone: tone),
          ),
          const SizedBox(height: 12),
          InfoRow('Data', formatDateTime(order.createdAt)),
          if ((order.trackingCode ?? '').isNotEmpty)
            InfoRow('Rastreio', order.trackingCode!),
          if ((order.paymentMethod ?? '').isNotEmpty)
            InfoRow('Pagamento', order.paymentMethod!),
          if (order.address != null) InfoRow('Entrega', order.address!.line),
          const Divider(height: 32),
          const SectionTitle('Itens'),
          const SizedBox(height: 8),
          for (final item in order.items)
            InfoRow(
              '${item.quantity}x ${item.name}',
              formatMoney(item.price * item.quantity),
            ),
          const Divider(height: 32),
          if (order.discount > 0)
            InfoRow('Desconto', '- ${formatMoney(order.discount)}'),
          InfoRow('Total', formatMoney(order.total), emphasized: true),
        ],
      ),
    );
  }
}
