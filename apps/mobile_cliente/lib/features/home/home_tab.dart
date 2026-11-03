import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../../shared/links.dart';
import '../../shared/ui.dart';
import '../auth/auth_controller.dart';
import '../purchases/quote_detail_screen.dart';
import '../shell/home_shell.dart';

/// Início (`CustomerDashboard` do PWA).
class HomeTab extends ConsumerWidget {
  const HomeTab({super.key, required this.onOpen});

  final OpenSection onOpen;

  Future<void> _refresh(WidgetRef ref) async {
    ref.invalidate(ordersProvider);
    ref.invalidate(quotesProvider);
    ref.invalidate(appointmentsProvider);
    ref.invalidate(unreadCountProvider);
    ref.invalidate(favoritesProvider);
    ref.invalidate(couponsProvider);
    // Abriu sem internet: a conta ainda não foi carregada.
    if (ref.read(authControllerProvider).customer == null) {
      await ref.read(authControllerProvider.notifier).refresh();
    }
    await ref.read(ordersProvider.future);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final customer = ref.watch(authControllerProvider).customer;
    final quotes = ref.watch(quotesProvider).value ?? const <Quote>[];
    final appointments =
        ref.watch(appointmentsProvider).value ?? const <Appointment>[];

    final toApprove = quotes.where((quote) => quote.awaitsApproval).toList();
    final nextVisit = appointments.where((item) => item.canCancel).toList();

    return AsyncPage<List<Order>>(
      value: ref.watch(ordersProvider),
      onRefresh: () => _refresh(ref),
      header: [
        PanelPageHeader(
          icon: LucideIcons.shoppingBag,
          title: customer == null ? 'Olá!' : 'Olá, ${customer.firstName}!',
          description: 'Bem-vindo ao seu painel do cliente',
          badge: customer == null
              ? null
              : _SoftBadge('Cliente ${customer.levelLabel}'),
        ),
        // Atalhos para o que pede ação do cliente; o PWA mostra o mesmo nas
        // listas de orçamentos e revisões.
        for (final quote in toApprove)
          _Highlight(
            icon: LucideIcons.fileText,
            title: 'Orçamento pronto para aprovar',
            subtitle: formatMoney(quote.total),
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => QuoteDetailScreen(quote: quote)),
            ),
          ),
        for (final visit in nextVisit)
          _Highlight(
            icon: LucideIcons.calendar,
            title: visit.status == 'SCHEDULED'
                ? 'Revisão agendada'
                : 'Revisão solicitada',
            subtitle: formatDateTime(visit.scheduledAt ?? visit.preferredDate),
            onTap: () => onOpen(Section.vehicle, 1),
          ),
        _QuickActions(onOpen: onOpen),
        _Summary(customer: customer),
      ],
      builder: (orders) => [_RecentOrders(orders: orders, onOpen: onOpen)],
    );
  }
}

/// Selo azul claro do nível (`bg-moria-orange/10 text-moria-orange`).
class _SoftBadge extends StatelessWidget {
  const _SoftBadge(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
      decoration: BoxDecoration(
        color: AppTheme.primary.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: AppTheme.primary,
          height: 1.5,
        ),
      ),
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
    return GlassCard(
      accent: true,
      onTap: onTap,
      child: Row(
        children: [
          IconTile(icon: icon),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF111827),
                  ),
                ),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppTheme.mutedForeground,
                  ),
                ),
              ],
            ),
          ),
          const Icon(LucideIcons.chevronRight,
              size: 18, color: AppTheme.mutedForeground),
        ],
      ),
    );
  }
}

/// "O que você quer fazer?": três atalhos com ícone em quadrado colorido.
class _QuickActions extends StatelessWidget {
  const _QuickActions({required this.onOpen});

  final OpenSection onOpen;

  @override
  Widget build(BuildContext context) {
    Widget action(
      IconData icon,
      Color color,
      String title,
      String description,
      VoidCallback onTap,
    ) {
      return Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: onTap,
          child: Container(
            constraints: const BoxConstraints(minHeight: 96),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.border.withValues(alpha: 0.6)),
            ),
            child: Row(
              children: [
                IconTile(icon: icon, color: color, size: 44, filled: true),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF111827),
                        ),
                      ),
                      Text(
                        description,
                        style: const TextStyle(
                          fontSize: 14,
                          color: AppTheme.mutedForeground,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: glassDecoration().copyWith(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Colors.white, Color(0xFFFFF7ED)],
        ),
        border: Border.all(color: AppTheme.primary.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'O que você quer fazer?',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 6),
          const Text(
            'Escolha um objetivo. Você chega à ação principal em até três '
            'passos.',
            style: TextStyle(color: AppTheme.mutedForeground),
          ),
          const SizedBox(height: 20),
          action(
            LucideIcons.shoppingBag,
            const Color(0xFF3B82F6),
            'Nova Compra',
            'Explorar produtos',
            () => openStore(context),
          ),
          const SizedBox(height: 12),
          action(
            LucideIcons.truck,
            const Color(0xFF22C55E),
            'Rastrear Pedido',
            'Acompanhar entrega',
            () => onOpen(Section.purchases, 0),
          ),
          const SizedBox(height: 12),
          action(
            LucideIcons.calendar,
            const Color(0xFFF97316),
            'Cuidar do Veículo',
            'Agendar ou acompanhar revisão',
            () => onOpen(Section.vehicle, 1),
          ),
        ],
      ),
    );
  }
}

/// "Meu resumo e benefícios": recolhido por padrão, como o `<details>` do PWA.
class _Summary extends ConsumerStatefulWidget {
  const _Summary({required this.customer});

  final Customer? customer;

  @override
  ConsumerState<_Summary> createState() => _SummaryState();
}

class _SummaryState extends ConsumerState<_Summary> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    final customer = widget.customer;
    final favorites = ref.watch(favoritesProvider).value?.length ?? 0;
    final coupons = ref.watch(couponsProvider).value?.length ?? 0;

    Widget stat(IconData icon, Color color, String label, String value) {
      return GlassCard(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(icon, size: 28, color: color),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: AppTheme.mutedForeground,
                    ),
                  ),
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: Alignment.centerLeft,
                    child: Text(
                      value,
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return GlassCard(
      padding: EdgeInsets.zero,
      radius: 12,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          InkWell(
            onTap: () => setState(() => _open = !_open),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  const Expanded(
                    child: Text(
                      'Meu resumo e benefícios',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                  Text(
                    _open ? 'Ocultar' : 'Mostrar',
                    style: const TextStyle(
                      fontSize: 14,
                      color: AppTheme.mutedForeground,
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (_open) ...[
            const Divider(),
            Padding(
              padding: const EdgeInsets.all(16),
              child: TwoColumnGrid(
                children: [
                  stat(
                    LucideIcons.package,
                    const Color(0xFF2563EB),
                    'Total de Pedidos',
                    '${customer?.totalOrders ?? 0}',
                  ),
                  stat(
                    LucideIcons.trendingUp,
                    AppTheme.success,
                    'Total Gasto',
                    formatMoney(customer?.totalSpent ?? 0),
                  ),
                  stat(
                    LucideIcons.heart,
                    AppTheme.primary,
                    'Favoritos',
                    '$favorites',
                  ),
                  stat(
                    LucideIcons.gift,
                    AppTheme.purple,
                    'Cupons Disponíveis',
                    '$coupons',
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _RecentOrders extends StatelessWidget {
  const _RecentOrders({required this.orders, required this.onOpen});

  final List<Order> orders;
  final OpenSection onOpen;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CardHeading(
            icon: LucideIcons.package,
            title: 'Pedidos Recentes',
            description: 'Seus últimos pedidos e atualizações',
            trailing: OutlinedButton(
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(0, 36),
                padding: const EdgeInsets.symmetric(horizontal: 12),
              ),
              onPressed: () => onOpen(Section.purchases, 0),
              child: const Text('Ver Todos'),
            ),
          ),
          const SizedBox(height: 16),
          if (orders.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Column(
                children: [
                  Icon(
                    LucideIcons.package,
                    size: 48,
                    color: AppTheme.mutedForeground.withValues(alpha: 0.5),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Nenhum pedido encontrado',
                    style: TextStyle(color: AppTheme.mutedForeground),
                  ),
                  const SizedBox(height: 16),
                  OutlinedButton(
                    onPressed: () => openStore(context),
                    child: const Text('Fazer Primeiro Pedido'),
                  ),
                ],
              ),
            )
          else
            for (final order in orders.take(3)) ...[
              _RecentOrderRow(order: order),
              const SizedBox(height: 12),
            ],
        ],
      ),
    );
  }
}

class _RecentOrderRow extends StatelessWidget {
  const _RecentOrderRow({required this.order});

  final Order order;

  @override
  Widget build(BuildContext context) {
    final (label, tone) = order.statusView;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.only(top: 2),
                child: Icon(LucideIcons.clock,
                    size: 16, color: AppTheme.mutedForeground),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Pedido #${order.shortId}',
                      style: const TextStyle(fontWeight: FontWeight.w500),
                    ),
                    Text(
                      formatDate(order.createdAt),
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppTheme.mutedForeground,
                      ),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  StatusChip(label, tone: tone),
                  const SizedBox(height: 4),
                  Text(
                    formatMoney(order.total),
                    style: const TextStyle(fontWeight: FontWeight.w500),
                  ),
                ],
              ),
            ],
          ),
          const Divider(height: 24),
          Text(
            '${order.items.length} itens',
            style: const TextStyle(
              fontSize: 13,
              color: AppTheme.mutedForeground,
            ),
          ),
        ],
      ),
    );
  }
}
