import 'package:flutter/material.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';

/// Detalhes do pedido (diálogo "Ver Detalhes" do PWA): status e total,
/// itens, endereço de entrega e a linha do tempo "Status do Pedido".
class OrderDetailScreen extends StatelessWidget {
  const OrderDetailScreen({super.key, required this.order});

  final Order order;

  @override
  Widget build(BuildContext context) {
    final (label, tone) = order.statusView;
    final address = order.address;
    const muted = TextStyle(fontSize: 13, color: AppTheme.mutedForeground);
    const heading = TextStyle(
      fontFamily: AppTheme.headingFont,
      fontSize: 15,
      fontWeight: FontWeight.w600,
    );

    Widget step(IconData icon, Color color, String text) => Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Row(
            children: [
              Icon(icon, size: 16, color: color),
              const SizedBox(width: 12),
              Flexible(child: Text(text, style: const TextStyle(fontSize: 14))),
            ],
          ),
        );

    return PanelScaffold(
      appBar: PanelAppBar(title: 'Pedido #${order.shortId}'),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
        children: [
          PanelPageHeader(
            icon: LucideIcons.package,
            title: 'Detalhes do Pedido #${order.shortId}',
            description: 'Informações completas do seu pedido',
          ),
          const SizedBox(height: 16),
          GlassCard(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    StatusChip(label, tone: tone),
                    const Spacer(),
                    Text(
                      formatMoney(order.total),
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                const Text('Itens', style: heading),
                const SizedBox(height: 12),
                for (final item in order.items) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppTheme.border),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                item.name,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              Text('Quantidade: ${item.quantity}', style: muted),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              formatMoney(item.price * item.quantity),
                              style: const TextStyle(
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            Text('${formatMoney(item.price)} cada', style: muted),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),
                ],
                if (address != null) ...[
                  const SizedBox(height: 12),
                  const Text('Endereço de Entrega', style: heading),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      [
                        '${address.street}, ${address.number}',
                        if ((address.complement ?? '').isNotEmpty)
                          address.complement!,
                        address.neighborhood,
                        '${address.city}, ${address.state}',
                        'CEP: ${address.zipCode}',
                      ].join('\n'),
                      style: const TextStyle(fontSize: 14, height: 1.5),
                    ),
                  ),
                ],
                const SizedBox(height: 20),
                const Text('Status do Pedido', style: heading),
                const SizedBox(height: 12),
                step(LucideIcons.circleCheck, AppTheme.success, 'Pedido confirmado'),
                if (order.status != 'PENDING')
                  step(LucideIcons.package, const Color(0xFFEA580C),
                      'Pedido sendo preparado'),
                if (order.status == 'SHIPPED' || order.status == 'DELIVERED')
                  step(LucideIcons.truck, const Color(0xFF9333EA),
                      'Pedido enviado'),
                if (order.status == 'DELIVERED')
                  step(LucideIcons.circleCheck, AppTheme.success,
                      'Pedido entregue'),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
