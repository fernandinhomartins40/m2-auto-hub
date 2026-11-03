import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../../shared/links.dart';
import '../../shared/ui.dart';

const _benefitTabs = [WorkspaceTab('Favoritos'), WorkspaceTab('Cupons')];

/// Benefícios: Favoritos e Cupons (`CustomerFavorites`, `CustomerCoupons`).
class BenefitsTab extends StatelessWidget {
  const BenefitsTab({super.key, required this.tab, required this.onTab});

  final int tab;
  final ValueChanged<int> onTab;

  @override
  Widget build(BuildContext context) {
    final tabs = WorkspaceTabs(tabs: _benefitTabs, index: tab, onChanged: onTab);
    return tab == 0
        ? _Favorites(key: const ValueKey('favorites'), tabs: tabs)
        : _Coupons(key: const ValueKey('coupons'), tabs: tabs);
  }
}

const _sorts = {
  'date-desc': 'Mais Recentes',
  'date-asc': 'Mais Antigos',
  'price-asc': 'Menor Preço',
  'price-desc': 'Maior Preço',
  'name-asc': 'Nome A-Z',
  'name-desc': 'Nome Z-A',
};

class _Favorites extends ConsumerStatefulWidget {
  const _Favorites({super.key, required this.tabs});

  final Widget tabs;

  @override
  ConsumerState<_Favorites> createState() => _FavoritesState();
}

class _FavoritesState extends ConsumerState<_Favorites> {
  String _search = '';
  String _sort = 'date-desc';

  List<FavoriteProduct> _visible(List<FavoriteProduct> items) {
    final term = withoutAccents(_search.trim());
    final list = items
        .where((item) =>
            term.isEmpty ||
            withoutAccents(item.name).contains(term) ||
            withoutAccents(item.category ?? '').contains(term))
        .toList();
    double price(FavoriteProduct item) => item.promoPrice ?? item.price;
    DateTime date(FavoriteProduct item) => item.addedAt ?? DateTime(0);
    list.sort(
      (a, b) => switch (_sort) {
        'date-asc' => date(a).compareTo(date(b)),
        'price-asc' => price(a).compareTo(price(b)),
        'price-desc' => price(b).compareTo(price(a)),
        'name-asc' => a.name.compareTo(b.name),
        'name-desc' => b.name.compareTo(a.name),
        _ => date(b).compareTo(date(a)),
      },
    );
    return list;
  }

  Future<void> _remove(FavoriteProduct item) async {
    final done = await runAction(
      context,
      () => ref.read(apiProvider).removeFavorite(item.productId),
      success: 'Removido dos favoritos',
    );
    if (done) ref.invalidate(favoritesProvider);
  }

  @override
  Widget build(BuildContext context) {
    final favorites = ref.watch(favoritesProvider);
    final all = favorites.value ?? const <FavoriteProduct>[];
    return AsyncPage<List<FavoriteProduct>>(
      value: favorites,
      onRefresh: () => ref.refresh(favoritesProvider.future),
      header: [
        widget.tabs,
        const PanelPageHeader(
          icon: LucideIcons.heart,
          title: 'Meus favoritos',
          description: 'Produtos que você salvou para depois',
        ),
        SearchBox(
          hint: 'Buscar produtos...',
          onChanged: (value) => setState(() => _search = value),
        ),
        FilterSelect<String>(
          value: _sort,
          options: _sorts,
          onChanged: (value) => setState(() => _sort = value),
        ),
      ],
      isEmpty: (items) => _visible(items).isEmpty,
      emptyIcon: LucideIcons.heart,
      emptyMessage: all.isEmpty
          ? 'Nenhum produto favorito. Adicione produtos aos favoritos para '
              'encontrá-los facilmente depois.'
          : 'Nenhum produto encontrado. Tente ajustar os filtros para '
              'encontrar o que procura.',
      emptyAction: all.isEmpty
          ? OutlinedButton(
              onPressed: () => openStore(context),
              child: const Text('Explorar produtos'),
            )
          : null,
      builder: (items) {
        final visible = _visible(items);
        return [
          for (final item in visible)
            _FavoriteCard(item: item, onRemove: () => _remove(item)),
          Text(
            'Mostrando ${visible.length} de ${items.length} produtos',
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppTheme.mutedForeground),
          ),
        ];
      },
    );
  }
}

class _FavoriteCard extends StatelessWidget {
  const _FavoriteCard({required this.item, required this.onRemove});

  final FavoriteProduct item;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final promo = item.promoPrice != null && item.promoPrice! < item.price;
    final discount =
        promo ? ((1 - item.promoPrice! / item.price) * 100).round() : 0;
    return GlassCard(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AspectRatio(
            aspectRatio: 1.6,
            child: Stack(
              fit: StackFit.expand,
              children: [
                _ProductImage(url: item.imageUrl),
                if (promo)
                  Positioned(
                    left: 12,
                    top: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEF4444),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        '-$discount%',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                Positioned(
                  right: 8,
                  top: 8,
                  child: IconButton(
                    tooltip: 'Remover dos favoritos',
                    style: IconButton.styleFrom(
                      backgroundColor: Colors.white.withValues(alpha: 0.85),
                    ),
                    icon: const Icon(
                      Icons.favorite,
                      size: 18,
                      color: Color(0xFFEF4444),
                    ),
                    onPressed: onRemove,
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    if ((item.category ?? '').isNotEmpty)
                      StatusChip(item.category!, tone: StatusTone.dark),
                    const Spacer(),
                    if (item.addedAt != null)
                      Text(
                        formatDate(item.addedAt),
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppTheme.mutedForeground,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  item.name,
                  style: const TextStyle(
                    fontFamily: AppTheme.headingFont,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 12),
                if (promo)
                  Text(
                    formatMoney(item.price),
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppTheme.mutedForeground,
                      decoration: TextDecoration.lineThrough,
                    ),
                  ),
                Text(
                  formatMoney(promo ? item.promoPrice! : item.price),
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: promo ? AppTheme.danger : AppTheme.success,
                  ),
                ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: () => openStore(context),
                  icon: const Icon(LucideIcons.shoppingCart),
                  label: const Text('Adicionar ao Carrinho'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ProductImage extends StatelessWidget {
  const _ProductImage({required this.url});

  final String? url;

  @override
  Widget build(BuildContext context) {
    const placeholder = ColoredBox(
      color: Color(0xFFF3F4F6),
      child: Center(
        child: Icon(LucideIcons.package, size: 40, color: Color(0xFF9CA3AF)),
      ),
    );
    final image = url;
    if (image == null) return placeholder;
    return Image.network(
      image,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => placeholder,
    );
  }
}

class _Coupons extends ConsumerWidget {
  const _Coupons({super.key, required this.tabs});

  final Widget tabs;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final coupons = ref.watch(couponsProvider);
    final count = coupons.value?.length ?? 0;
    return AsyncPage<List<Coupon>>(
      value: coupons,
      onRefresh: () => ref.refresh(couponsProvider.future),
      header: [
        tabs,
        PanelPageHeader(
          icon: LucideIcons.gift,
          title: 'Cupons disponíveis',
          description: 'Aproveite descontos especiais nas suas compras',
          badge: count == 0
              ? null
              : Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppTheme.primary,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    '$count ${count == 1 ? 'cupom' : 'cupons'}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
        ),
      ],
      isEmpty: (items) => items.isEmpty,
      emptyIcon: LucideIcons.gift,
      emptyMessage: 'Nenhum cupom disponível no momento',
      builder: (items) => [
        for (final coupon in items) _CouponCard(coupon: coupon),
        const NoticeBox(
          icon: LucideIcons.gift,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Como usar seus cupons',
                style: TextStyle(
                  fontFamily: AppTheme.headingFont,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
              SizedBox(height: 8),
              Text('✓ Copie o código do cupom desejado'),
              Text('✓ Adicione produtos ao carrinho'),
              Text('✓ No checkout, cole o código no campo "Cupom de desconto"'),
              Text('✓ Veja o desconto aplicado antes de finalizar!'),
            ],
          ),
        ),
      ],
    );
  }
}

class _CouponCard extends StatelessWidget {
  const _CouponCard({required this.coupon});

  final Coupon coupon;

  String get _off => coupon.discountType == 'PERCENTAGE'
      ? '${coupon.discountValue.toStringAsFixed(0)}% OFF'
      : '${formatMoney(coupon.discountValue)} OFF';

  @override
  Widget build(BuildContext context) {
    final expires = coupon.expiresAt == null
        ? null
        : DateFormat("d 'de' MMM. 'de' y", 'pt_BR').format(coupon.expiresAt!);
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFBFDBFE), width: 2),
      ),
      child: Stack(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Row(
                  children: [
                    Icon(LucideIcons.tag, size: 16, color: AppTheme.primary),
                    SizedBox(width: 8),
                    Text(
                      'Código do cupom:',
                      style: TextStyle(
                        fontSize: 13,
                        color: AppTheme.mutedForeground,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 10,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF3F4F6),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          coupon.code,
                          style: const TextStyle(
                            fontFamily: 'monospace',
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(40, 40),
                        padding: EdgeInsets.zero,
                      ),
                      onPressed: () async {
                        await Clipboard.setData(
                          ClipboardData(text: coupon.code),
                        );
                        if (context.mounted) {
                          showMessage(context, 'Cupom ${coupon.code} copiado');
                        }
                      },
                      child: const Icon(LucideIcons.copy, size: 16),
                    ),
                  ],
                ),
                if (coupon.description.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text(
                    coupon.description,
                    style: const TextStyle(
                      fontSize: 14,
                      color: AppTheme.mutedForeground,
                    ),
                  ),
                ],
                const SizedBox(height: 12),
                if (expires != null)
                  MetaLine(LucideIcons.calendar, 'Válido até $expires'),
                if ((coupon.minValue ?? 0) > 0) ...[
                  const SizedBox(height: 6),
                  MetaLine(
                    LucideIcons.trendingUp,
                    'Compra mínima: ${formatMoney(coupon.minValue!)}',
                  ),
                ],
                if ((coupon.maxDiscount ?? 0) > 0) ...[
                  const SizedBox(height: 6),
                  MetaLine(
                    LucideIcons.trendingDown,
                    'Desconto máximo: ${formatMoney(coupon.maxDiscount!)}',
                  ),
                ],
              ],
            ),
          ),
          Positioned(
            right: 0,
            top: 0,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: const BoxDecoration(
                color: AppTheme.primary,
                borderRadius: BorderRadius.only(
                  topRight: Radius.circular(6),
                  bottomLeft: Radius.circular(8),
                ),
              ),
              child: Text(
                _off,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
