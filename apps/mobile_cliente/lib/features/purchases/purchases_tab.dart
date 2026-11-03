import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../../shared/links.dart';
import 'order_detail_screen.dart';
import 'quote_detail_screen.dart';
import 'request_quote_screen.dart';

class PurchasesTab extends StatelessWidget {
  const PurchasesTab({super.key});

  @override
  Widget build(BuildContext context) {
    return const DefaultTabController(
      length: 2,
      child: Column(
        children: [
          TabBar(tabs: [Tab(text: 'Pedidos'), Tab(text: 'Orçamentos')]),
          Expanded(child: TabBarView(children: [_Orders(), _Quotes()])),
        ],
      ),
    );
  }
}

class _Orders extends ConsumerWidget {
  const _Orders();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return AsyncPage<List<Order>>(
      value: ref.watch(ordersProvider),
      onRefresh: () => ref.refresh(ordersProvider.future),
      isEmpty: (orders) => orders.isEmpty,
      emptyIcon: Icons.receipt_long_outlined,
      emptyMessage: 'Você ainda não fez pedidos.',
      emptyAction: OutlinedButton(
        onPressed: () => openStore(context),
        child: const Text('Explorar produtos'),
      ),
      builder: (orders) => [
        for (final order in orders)
          OrderCard(
            order: order,
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => OrderDetailScreen(order: order)),
            ),
          ),
      ],
    );
  }
}

class OrderCard extends StatelessWidget {
  const OrderCard({super.key, required this.order, required this.onTap});

  final Order order;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final (label, tone) = order.statusView;
    final summary = order.items.map((item) => item.name).join(', ');
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
                      'Pedido ${order.shortId}',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  ),
                  StatusChip(label, tone: tone),
                ],
              ),
              const SizedBox(height: 6),
              Text(summary, maxLines: 2, overflow: TextOverflow.ellipsis),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(child: Text(formatDate(order.createdAt))),
                  Text(
                    formatMoney(order.total),
                    style: Theme.of(context).textTheme.titleSmall,
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

class _Quotes extends ConsumerWidget {
  const _Quotes();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    void openRequest() => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const RequestQuoteScreen()),
        );

    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'request-quote',
        onPressed: openRequest,
        icon: const Icon(Icons.add),
        label: const Text('Pedir orçamento'),
      ),
      body: AsyncPage<List<Quote>>(
        value: ref.watch(quotesProvider),
        onRefresh: () => ref.refresh(quotesProvider.future),
        isEmpty: (quotes) => quotes.isEmpty,
        emptyIcon: Icons.request_quote_outlined,
        emptyMessage: 'Peça um orçamento de serviços para o seu veículo.',
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
        builder: (quotes) => [
          for (final quote in quotes)
            Card(
              clipBehavior: Clip.antiAlias,
              child: ListTile(
                contentPadding: const EdgeInsets.all(12),
                title: Text('Orçamento ${quote.shortId}'),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 4),
                    Text(
                      '${quote.items.length} serviço(s) · '
                      '${formatDate(quote.createdAt)}',
                    ),
                    const SizedBox(height: 6),
                    StatusChip(quote.statusView.$1, tone: quote.statusView.$2),
                  ],
                ),
                trailing: Text(formatMoney(quote.total)),
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => QuoteDetailScreen(quote: quote),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
