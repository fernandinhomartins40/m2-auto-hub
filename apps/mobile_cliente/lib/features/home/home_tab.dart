import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../../shared/links.dart';
import '../auth/auth_controller.dart';
import '../purchases/order_detail_screen.dart';
import '../purchases/purchases_tab.dart';
import '../purchases/quote_detail_screen.dart';
import '../support/support_screen.dart';

class HomeTab extends ConsumerWidget {
  const HomeTab({super.key, required this.onOpenTab});

  final ValueChanged<int> onOpenTab;

  Future<void> _refresh(WidgetRef ref) async {
    ref.invalidate(ordersProvider);
    ref.invalidate(quotesProvider);
    ref.invalidate(appointmentsProvider);
    ref.invalidate(unreadCountProvider);
    // Abriu sem internet: a conta ainda não foi carregada.
    if (ref.read(authControllerProvider).customer == null) {
      await ref.read(authControllerProvider.notifier).refresh();
    }
    await ref.read(ordersProvider.future);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final customer = ref.watch(authControllerProvider).customer;
    final orders = ref.watch(ordersProvider);
    final quotes = ref.watch(quotesProvider).value ?? const <Quote>[];
    final appointments =
        ref.watch(appointmentsProvider).value ?? const <Appointment>[];

    final toApprove = quotes.where((quote) => quote.awaitsApproval).toList();
    final nextVisit = appointments.where((item) => item.canCancel).toList();

    return AsyncPage<List<Order>>(
      value: orders,
      onRefresh: () => _refresh(ref),
      builder: (items) => [
        Text(
          customer == null ? 'Olá!' : 'Olá, ${customer.firstName}!',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        if (customer != null)
          Align(
            alignment: Alignment.centerLeft,
            child: StatusChip(
              'Cliente ${customer.levelLabel}',
              tone: StatusTone.info,
            ),
          ),
        for (final quote in toApprove)
          _Highlight(
            icon: Icons.request_quote_outlined,
            title: 'Orçamento pronto para aprovar',
            subtitle: formatMoney(quote.total),
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => QuoteDetailScreen(quote: quote)),
            ),
          ),
        for (final visit in nextVisit)
          _Highlight(
            icon: Icons.event_outlined,
            title: visit.status == 'SCHEDULED'
                ? 'Revisão agendada'
                : 'Revisão solicitada',
            subtitle: formatDateTime(visit.scheduledAt ?? visit.preferredDate),
            onTap: () => onOpenTab(2),
          ),
        const SectionTitle('O que você quer fazer?'),
        _Action(
          icon: Icons.shopping_bag_outlined,
          title: 'Nova compra',
          subtitle: 'Explorar produtos no site',
          onTap: () => openStore(context),
        ),
        _Action(
          icon: Icons.local_shipping_outlined,
          title: 'Acompanhar pedidos',
          subtitle: 'Compras e orçamentos',
          onTap: () => onOpenTab(1),
        ),
        _Action(
          icon: Icons.build_circle_outlined,
          title: 'Cuidar do veículo',
          subtitle: 'Agendar ou acompanhar revisão',
          onTap: () => onOpenTab(2),
        ),
        _Action(
          icon: Icons.support_agent,
          title: 'Ajuda',
          subtitle: 'Falar com a M2 e perguntas frequentes',
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const SupportScreen()),
          ),
        ),
        if (items.isNotEmpty) ...[
          const SectionTitle('Pedidos recentes'),
          for (final order in items.take(3))
            OrderCard(
              order: order,
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => OrderDetailScreen(order: order),
                ),
              ),
            ),
        ],
      ],
    );
  }
}

class _Highlight extends StatelessWidget {
  const _Highlight({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      color: scheme.primaryContainer,
      clipBehavior: Clip.antiAlias,
      child: ListTile(
        leading: Icon(icon, color: scheme.onPrimaryContainer),
        title: Text(title, style: TextStyle(color: scheme.onPrimaryContainer)),
        subtitle:
            Text(subtitle, style: TextStyle(color: scheme.onPrimaryContainer)),
        trailing: Icon(Icons.chevron_right, color: scheme.onPrimaryContainer),
        onTap: onTap,
      ),
    );
  }
}

class _Action extends StatelessWidget {
  const _Action({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: ListTile(
        leading: Icon(icon, color: Theme.of(context).colorScheme.primary),
        title: Text(title),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}
