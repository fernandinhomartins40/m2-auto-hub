import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../../shared/links.dart';
import '../../shared/ui.dart';
import '../support/new_ticket_screen.dart';
import 'order_detail_screen.dart';
import 'order_parts.dart';
import 'quote_detail_screen.dart';
import 'request_quote_screen.dart';

const _purchaseTabs = [WorkspaceTab('Pedidos'), WorkspaceTab('Orçamentos')];

/// Compras: Pedidos e Orçamentos (`CustomerOrders`, `CustomerQuotes`).
class PurchasesTab extends StatelessWidget {
  const PurchasesTab({super.key, required this.tab, required this.onTab});

  final int tab;
  final ValueChanged<int> onTab;

  @override
  Widget build(BuildContext context) {
    final tabs = WorkspaceTabs(tabs: _purchaseTabs, index: tab, onChanged: onTab);
    return tab == 0
        ? _Orders(key: const ValueKey('orders'), tabs: tabs)
        : _Quotes(key: const ValueKey('quotes'), tabs: tabs);
  }
}

const _orderFilters = {
  'all': 'Todos os Status',
  'PENDING': 'Pendente',
  'CONFIRMED': 'Confirmado',
  'PREPARING': 'Preparando',
  'SHIPPED': 'Enviado',
  'DELIVERED': 'Entregue',
  'CANCELLED': 'Cancelado',
};

class _Orders extends ConsumerStatefulWidget {
  const _Orders({super.key, required this.tabs});

  final Widget tabs;

  @override
  ConsumerState<_Orders> createState() => _OrdersState();
}

class _OrdersState extends ConsumerState<_Orders> {
  String _search = '';
  String _status = 'all';

  bool _matches(Order order) {
    final status = order.status == 'IN_PRODUCTION' ? 'PREPARING' : order.status;
    if (_status != 'all' && status != _status) return false;
    final term = withoutAccents(_search.trim());
    if (term.isEmpty) return true;
    return withoutAccents(order.id).contains(term) ||
        order.items.any((item) => withoutAccents(item.name).contains(term));
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _search.isNotEmpty || _status != 'all';
    return AsyncPage<List<Order>>(
      value: ref.watch(ordersProvider),
      onRefresh: () => ref.refresh(ordersProvider.future),
      header: [
        widget.tabs,
        PanelPageHeader(
          icon: LucideIcons.package,
          title: 'Meus pedidos',
          description: 'Acompanhe o status dos seus pedidos',
          actions: [
            OutlinedButton.icon(
              onPressed: () => ref.invalidate(ordersProvider),
              icon: const Icon(LucideIcons.refreshCw),
              label: const Text('Atualizar'),
            ),
          ],
        ),
        FiltersCard(
          children: [
            SearchBox(
              hint: 'Buscar por número do pedido ou produto',
              onChanged: (value) => setState(() => _search = value),
            ),
            FilterSelect<String>(
              value: _status,
              options: _orderFilters,
              onChanged: (value) => setState(() => _status = value),
            ),
          ],
        ),
      ],
      isEmpty: (orders) => orders.where(_matches).isEmpty,
      emptyIcon: LucideIcons.package,
      emptyTitle:
          filtered ? 'Nenhum pedido encontrado' : 'Você ainda não fez nenhum pedido',
      emptyMessage: filtered
          ? 'Tente ajustar os filtros de busca'
          : 'Que tal explorar nossos produtos?',
      emptyAction: filtered
          ? null
          : FilledButton(
              onPressed: () => openStore(context),
              child: const Text('Ver Produtos'),
            ),
      builder: (orders) => [
        for (final order in orders.where(_matches)) OrderCard(order: order),
      ],
      footer: const [StorePurchasesCard()],
    );
  }
}

/// Cartão do pedido como na lista do PWA: itens, pagamento, cidade e ações.
class OrderCard extends ConsumerWidget {
  const OrderCard({super.key, required this.order});

  final Order order;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final (label, tone) = order.statusView;
    final navigator = Navigator.of(context);
    return GlassCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Icon(orderStatusIcon(order.status),
                    size: 18, color: AppTheme.mutedForeground),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Pedido #${order.id}',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Realizado em ${formatDate(order.createdAt)}',
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppTheme.mutedForeground,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Align(
            alignment: Alignment.centerLeft,
            child: StatusChip(label, tone: tone),
          ),
          const SizedBox(height: 4),
          Text(
            formatMoney(order.total),
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 16),
          Text(
            'Itens do Pedido (${order.items.length})',
            style: const TextStyle(
              fontFamily: AppTheme.headingFont,
              fontSize: 15,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          for (final item in order.items) ...[
            ItemLine(
              name: item.name,
              trailing: '${item.quantity}x ${formatMoney(item.price)}',
            ),
            const SizedBox(height: 6),
          ],
          const Divider(height: 24),
          if ((order.paymentMethod ?? '').isNotEmpty) ...[
            MetaLine(LucideIcons.creditCard, 'Pagamento: ${order.paymentMethod}'),
            const SizedBox(height: 8),
          ],
          if ((order.invoiceKey ?? '').isNotEmpty) ...[
            InvoiceLine(order: order),
            const SizedBox(height: 8),
          ],
          if ((order.trackingCode ?? '').isNotEmpty) ...[
            TrackingLink(code: order.trackingCode!),
            const SizedBox(height: 8),
          ],
          if (order.address != null) ...[
            MetaLine(
              LucideIcons.mapPin,
              '${order.address!.city}, ${order.address!.state}',
            ),
            const SizedBox(height: 8),
          ],
          if (order.estimatedDelivery != null) ...[
            MetaLine(
              LucideIcons.calendar,
              'Entrega prevista: ${formatDate(order.estimatedDelivery)}',
            ),
            const SizedBox(height: 8),
          ],
          const Divider(height: 16),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              OutlinedButton.icon(
                onPressed: () => navigator.push(
                  MaterialPageRoute(
                    builder: (_) => OrderDetailScreen(order: order),
                  ),
                ),
                icon: const Icon(LucideIcons.eye),
                label: const Text('Ver Detalhes'),
              ),
              if ((order.trackingCode ?? '').isNotEmpty)
                OutlinedButton.icon(
                  onPressed: () => openStoreWhatsApp(
                    context,
                    ref,
                    trackingMessage(order.trackingCode!),
                  ),
                  icon: const Icon(LucideIcons.truck),
                  label: const Text('Rastrear'),
                ),
              OutlinedButton.icon(
                onPressed: () => openStoreWhatsApp(
                  context,
                  ref,
                  'Olá! Preciso de ajuda com meu pedido #${order.id}. '
                  'Pode me ajudar?',
                  fallback: () => navigator.push(
                    MaterialPageRoute(
                      builder: (_) => NewTicketScreen(
                        initialCategory: 'ORDER_ISSUE',
                        initialSubject: 'Pedido #${order.shortId}',
                      ),
                    ),
                  ),
                ),
                icon: const Icon(LucideIcons.messageCircle),
                label: const Text('Suporte'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

const _quoteFilters = {
  'all': 'Todos os status',
  'PENDING': 'Pendente',
  'ANALYZING': 'Em análise',
  'QUOTED': 'Orçado',
  'APPROVED': 'Aprovado',
  'REJECTED': 'Rejeitado',
};

class _Quotes extends ConsumerStatefulWidget {
  const _Quotes({super.key, required this.tabs});

  final Widget tabs;

  @override
  ConsumerState<_Quotes> createState() => _QuotesState();
}

class _QuotesState extends ConsumerState<_Quotes> {
  String _search = '';
  String _status = 'all';

  bool _matches(Quote quote) {
    if (_status != 'all' && quote.status != _status) return false;
    final term = withoutAccents(_search.trim());
    if (term.isEmpty) return true;
    return withoutAccents(quote.id).contains(term) ||
        quote.items.any((item) => withoutAccents(item.name).contains(term));
  }

  @override
  Widget build(BuildContext context) {
    final quotes = ref.watch(quotesProvider);
    final all = quotes.value ?? const <Quote>[];
    int count(Set<String> statuses) =>
        all.where((quote) => statuses.contains(quote.status)).length;

    return AsyncPage<List<Quote>>(
      value: quotes,
      onRefresh: () => ref.refresh(quotesProvider.future),
      header: [
        widget.tabs,
        PanelPageHeader(
          icon: LucideIcons.fileText,
          title: 'Meus orçamentos',
          description:
              'Solicite, acompanhe e aprove os orçamentos enviados pela loja.',
          actions: [
            Row(
              children: [
                OutlinedButton.icon(
                  onPressed: () => ref.invalidate(quotesProvider),
                  icon: const Icon(LucideIcons.refreshCw),
                  label: const Text('Atualizar'),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => const RequestQuoteScreen(),
                      ),
                    ),
                    icon: const Icon(LucideIcons.wrench),
                    label: const Text('Solicitar orçamento'),
                  ),
                ),
              ],
            ),
          ],
        ),
        TwoColumnGrid(
          children: [
            StatTile(
              label: 'Total',
              value: '${all.length}',
              caption: 'Solicitações registradas',
            ),
            StatTile(
              label: 'Pendentes',
              value: '${count({'PENDING', 'ANALYZING'})}',
              caption: 'Aguardando análise da loja',
            ),
            StatTile(
              label: 'Respondidos',
              value: '${count({'QUOTED'})}',
              caption: 'Prontos para sua decisão',
            ),
            StatTile(
              label: 'Aprovados',
              value: '${count({'APPROVED'})}',
              caption: 'Convertidos em serviço',
            ),
          ],
        ),
        FiltersCard(
          children: [
            SearchBox(
              hint: 'Buscar por número do orçamento ou serviço',
              onChanged: (value) => setState(() => _search = value),
            ),
            FilterSelect<String>(
              value: _status,
              options: _quoteFilters,
              onChanged: (value) => setState(() => _status = value),
            ),
          ],
        ),
      ],
      isEmpty: (items) => items.where(_matches).isEmpty,
      emptyIcon: LucideIcons.fileText,
      emptyTitle: 'Nenhum orçamento encontrado',
      emptyMessage:
          'Solicite seu primeiro orçamento para acompanhar tudo pelo painel.',
      emptyAction: FilledButton(
        onPressed: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const RequestQuoteScreen()),
        ),
        child: const Text('Solicitar primeiro orçamento'),
      ),
      builder: (items) => [
        for (final quote in items.where(_matches)) QuoteCard(quote: quote),
      ],
    );
  }
}
