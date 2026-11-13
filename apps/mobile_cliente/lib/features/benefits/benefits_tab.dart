import 'dart:convert';

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
  String _category = 'all';
  String _availability = 'all';
  bool _showStats = false;
  final _selected = <String>{};

  List<FavoriteProduct> _visible(List<FavoriteProduct> items) {
    final term = withoutAccents(_search.trim());
    final list = items
        .where((item) => _category == 'all' || item.category == _category)
        .where((item) => switch (_availability) {
              'available' => item.available,
              'unavailable' => !item.available,
              _ => true,
            })
        .where((item) =>
            term.isEmpty ||
            withoutAccents(item.name).contains(term) ||
            withoutAccents(item.category ?? '').contains(term) ||
            withoutAccents(item.subcategory ?? '').contains(term))
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

  /// "Remover" da barra de seleção do PWA.
  Future<void> _removeSelected() async {
    final ids = _selected.toList();
    final done = await runAction(
      context,
      () => Future.wait(ids.map(ref.read(apiProvider).removeFavorite)),
      success: '${ids.length} produtos foram removidos dos favoritos.',
    );
    if (!mounted) return;
    setState(_selected.clear);
    if (done) ref.invalidate(favoritesProvider);
  }

  Future<void> _clearAll() async {
    final accepted = await confirm(
      context,
      title: 'Limpar Todos',
      message: 'Tem certeza que deseja remover TODOS os favoritos? Esta ação '
          'não pode ser desfeita.',
      confirmLabel: 'Limpar Todos',
      destructive: true,
    );
    if (!accepted || !mounted) return;
    final done = await runAction(
      context,
      () => ref.read(apiProvider).clearFavorites(),
      success: 'Todos os favoritos foram removidos.',
    );
    if (done) ref.invalidate(favoritesProvider);
  }

  /// Mesmo texto do PWA: até cinco nomes e quantos faltam.
  Future<void> _share(BuildContext anchor, List<FavoriteProduct> items) {
    final names = items.take(5).map((item) => item.name).join(', ');
    final more = items.length > 5 ? ' e mais ${items.length - 5}...' : '';
    return shareText(
      anchor,
      'Confira meus produtos favoritos: $names$more',
      title: 'Meus Favoritos - M2 Center Auto',
    );
  }

  Future<void> _export(BuildContext anchor, List<FavoriteProduct> items) {
    final day = DateTime.now().toIso8601String().split('T').first;
    return runAction(
      context,
      () => shareBytes(
        anchor,
        utf8.encode(favoritesCsv(items)),
        name: 'favoritos-$day.csv',
        mimeType: 'text/csv',
      ),
      success: 'Lista de favoritos exportada com sucesso.',
    );
  }

  Widget _selectAll(List<FavoriteProduct> visible) {
    final all = visible.isNotEmpty &&
        visible.every((item) => _selected.contains(item.productId));
    return InkWell(
      onTap: () => setState(() {
        if (all) {
          _selected.clear();
        } else {
          _selected.addAll(visible.map((item) => item.productId));
        }
      }),
      child: Row(
        children: [
          IgnorePointer(child: Checkbox(value: all, onChanged: (_) {})),
          const Text('Selecionar Todos', style: TextStyle(fontSize: 14)),
        ],
      ),
    );
  }

  /// Barra do PWA com o número selecionado e "Remover". O "Adicionar ao
  /// Carrinho" em lote fica no site, como o carrinho.
  Widget _bulkBar() {
    final count = _selected.length;
    return GlassCard(
      color: const Color(0xFFF1F5F9),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Expanded(
            child: Text(
              '$count ${count == 1 ? 'item selecionado' : 'itens selecionados'}',
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
            ),
          ),
          FilledButton.icon(
            style: FilledButton.styleFrom(backgroundColor: AppTheme.destructive),
            onPressed: _removeSelected,
            icon: const Icon(LucideIcons.trash2),
            label: const Text('Remover'),
          ),
        ],
      ),
    );
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
        PanelPageHeader(
          icon: LucideIcons.heart,
          title: 'Meus favoritos',
          description: 'Produtos que você salvou para depois',
          actions: [
            OutlinedButton.icon(
              onPressed: () => setState(() => _showStats = !_showStats),
              icon: const Icon(LucideIcons.trendingUp),
              label: const Text('Estatísticas'),
            ),
            if (all.isNotEmpty)
              Builder(
                builder: (anchor) => MenuAnchor(
                  menuChildren: [
                    MenuItemButton(
                      leadingIcon: const Icon(LucideIcons.share2, size: 16),
                      onPressed: () => _share(anchor, _visible(all)),
                      child: const Text('Compartilhar'),
                    ),
                    MenuItemButton(
                      leadingIcon: const Icon(LucideIcons.download, size: 16),
                      onPressed: () => _export(anchor, _visible(all)),
                      child: const Text('Exportar CSV'),
                    ),
                    MenuItemButton(
                      leadingIcon: const Icon(LucideIcons.trash2,
                          size: 16, color: AppTheme.destructive),
                      onPressed: _clearAll,
                      child: const Text(
                        'Limpar Todos',
                        style: TextStyle(color: AppTheme.destructive),
                      ),
                    ),
                  ],
                  builder: (context, menu, _) => OutlinedButton.icon(
                    onPressed: () => menu.isOpen ? menu.close() : menu.open(),
                    icon: const Icon(LucideIcons.share2),
                    label: const Text('Mais'),
                  ),
                ),
              ),
          ],
        ),
        if (_showStats) _FavoriteStats(items: all),
        // Filtros e seleção só aparecem com favoritos, como no PWA.
        if (all.isNotEmpty) ...[
          SearchBox(
            hint: 'Buscar produtos...',
            onChanged: (value) => setState(() => _search = value),
          ),
          FilterSelect<String>(
            // A categoria some quando o último favorito dela é removido; a
            // chave recria o campo com a lista nova.
            key: ValueKey(all.map((item) => item.category).toSet().join('|')),
            value: all.any((item) => item.category == _category)
                ? _category
                : 'all',
            options: {
              'all': 'Todas Categorias',
              for (final item in all)
                if ((item.category ?? '').isNotEmpty)
                  item.category!: item.category!,
            },
            onChanged: (value) => setState(() => _category = value),
          ),
          FilterSelect<String>(
            value: _availability,
            options: const {
              'all': 'Todos',
              'available': 'Disponíveis',
              'unavailable': 'Indisponíveis',
            },
            onChanged: (value) => setState(() => _availability = value),
          ),
          FilterSelect<String>(
            value: _sort,
            options: _sorts,
            onChanged: (value) => setState(() => _sort = value),
          ),
          _selectAll(_visible(all)),
          if (_selected.isNotEmpty) _bulkBar(),
        ],
      ],
      isEmpty: (items) => _visible(items).isEmpty,
      emptyIcon: LucideIcons.heart,
      emptyTitle:
          all.isEmpty ? 'Nenhum produto favorito' : 'Nenhum produto encontrado',
      emptyMessage: all.isEmpty
          ? 'Adicione produtos aos favoritos para encontrá-los facilmente '
              'depois'
          : 'Tente ajustar os filtros para encontrar o que procura',
      emptyAction: all.isEmpty
          ? FilledButton(
              onPressed: () => openStore(context),
              child: const Text('Explorar Produtos'),
            )
          : null,
      builder: (items) {
        final visible = _visible(items);
        return [
          for (final item in visible)
            _FavoriteCard(
              item: item,
              selected: _selected.contains(item.productId),
              onSelect: () => setState(() {
                if (!_selected.remove(item.productId)) {
                  _selected.add(item.productId);
                }
              }),
              onRemove: () => _remove(item),
            ),
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

/// "Estatísticas dos Favoritos": total e contagem por categoria.
class _FavoriteStats extends StatelessWidget {
  const _FavoriteStats({required this.items});

  final List<FavoriteProduct> items;

  @override
  Widget build(BuildContext context) {
    final byCategory = <String, int>{};
    for (final item in items) {
      final category = item.category ?? '';
      if (category.isNotEmpty) {
        byCategory[category] = (byCategory[category] ?? 0) + 1;
      }
    }
    const muted = TextStyle(fontSize: 14, color: AppTheme.mutedForeground);
    return GlassCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Estatísticas dos Favoritos',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 12),
          const Text('Total de Favoritos', style: muted),
          Text(
            '${items.length}',
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700),
          ),
          if (byCategory.isNotEmpty) ...[
            const SizedBox(height: 12),
            const Text('Por Categoria', style: muted),
            const SizedBox(height: 6),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final entry in byCategory.entries)
                  StatusChip('${entry.key}: ${entry.value}',
                      tone: StatusTone.neutral),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _FavoriteCard extends StatelessWidget {
  const _FavoriteCard({
    required this.item,
    required this.onRemove,
    required this.selected,
    required this.onSelect,
  });

  final FavoriteProduct item;
  final VoidCallback onRemove;
  final bool selected;
  final VoidCallback onSelect;

  @override
  Widget build(BuildContext context) {
    final promo = item.promoPrice != null && item.promoPrice! < item.price;
    final discount =
        promo ? ((1 - item.promoPrice! / item.price) * 100).round() : 0;
    return GlassCard(
      padding: EdgeInsets.zero,
      borderColor: selected ? AppTheme.primary : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AspectRatio(
            aspectRatio: 1.6,
            child: Stack(
              fit: StackFit.expand,
              children: [
                _ProductImage(url: item.imageUrl),
                if (!item.available)
                  ColoredBox(
                    color: Colors.black.withValues(alpha: 0.5),
                    child: const Center(
                      child: StatusChip('Indisponível', tone: StatusTone.dark),
                    ),
                  ),
                Positioned(
                  left: 4,
                  top: 4,
                  child: Checkbox(
                    value: selected,
                    fillColor: WidgetStateProperty.resolveWith(
                      (states) => states.contains(WidgetState.selected)
                          ? AppTheme.primary
                          : Colors.white,
                    ),
                    onChanged: (_) => onSelect(),
                  ),
                ),
                if (promo)
                  Positioned(
                    left: 12,
                    top: 52,
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
                if ((item.subcategory ?? '').isNotEmpty)
                  Text(
                    item.subcategory!,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppTheme.mutedForeground,
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
                if (item.active && item.stock <= item.minStock) ...[
                  const SizedBox(height: 6),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: StatusChip(
                      'Estoque baixo (${item.stock} unidades)',
                      tone: StatusTone.orange,
                    ),
                  ),
                ],
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: item.available ? () => openStore(context) : null,
                  icon: const Icon(LucideIcons.shoppingCart),
                  label: Text(
                    item.available ? 'Adicionar ao Carrinho' : 'Indisponível',
                  ),
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

class _Coupons extends ConsumerStatefulWidget {
  const _Coupons({super.key, required this.tabs});

  final Widget tabs;

  @override
  ConsumerState<_Coupons> createState() => _CouponsState();
}

class _CouponsState extends ConsumerState<_Coupons> {
  String _search = '';

  List<Coupon> _visible(List<Coupon> items) {
    final term = withoutAccents(_search.trim());
    return items
        .where((coupon) =>
            withoutAccents(coupon.code).contains(term) ||
            withoutAccents(coupon.description).contains(term))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final tabs = widget.tabs;
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
        // A busca aparece com mais de 3 cupons, como no PWA.
        if (count > 3)
          SearchBox(
            hint: 'Buscar cupom...',
            onChanged: (value) => setState(() => _search = value),
          ),
      ],
      isEmpty: (items) => _visible(items).isEmpty,
      emptyIcon: LucideIcons.gift,
      emptyTitle: _search.isEmpty
          ? 'Nenhum cupom disponível no momento'
          : 'Nenhum cupom encontrado',
      emptyMessage: _search.isEmpty
          ? 'Novos cupons serão adicionados em breve'
          : 'Tente outro termo de busca',
      builder: (items) => [
        for (final coupon in _visible(items)) _CouponCard(coupon: coupon),
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
    // Dias restantes arredondados para cima (`getDaysRemaining` do PWA).
    final days = coupon.expiresAt == null
        ? null
        : (coupon.expiresAt!.difference(DateTime.now()).inMinutes / 1440).ceil();
    final expiringSoon = days != null && days <= 3;
    final limit = coupon.usageLimit;
    final usage = limit == null || limit == 0 ? 0.0 : coupon.usedCount / limit;
    final almostFull = limit != null && usage >= 0.8;
    const orange = Color(0xFFEA580C);
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
                  Row(
                    children: [
                      const Icon(LucideIcons.calendar,
                          size: 14, color: AppTheme.mutedForeground),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Válido até $expires'
                          '${expiringSoon ? ' ($days ${days == 1 ? 'dia' : 'dias'})' : ''}',
                          style: TextStyle(
                            fontSize: 13,
                            color: expiringSoon ? orange : AppTheme.mutedForeground,
                            fontWeight:
                                expiringSoon ? FontWeight.w500 : FontWeight.w400,
                          ),
                        ),
                      ),
                    ],
                  ),
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
                if (limit != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    '${limit - coupon.usedCount} de $limit usos disponíveis',
                    style: TextStyle(
                      fontSize: 13,
                      color: almostFull ? orange : AppTheme.mutedForeground,
                      fontWeight: almostFull ? FontWeight.w500 : FontWeight.w400,
                    ),
                  ),
                  const SizedBox(height: 4),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(999),
                    child: LinearProgressIndicator(
                      value: usage.clamp(0.0, 1.0),
                      minHeight: 6,
                      color: almostFull ? const Color(0xFFF97316) : AppTheme.success,
                      backgroundColor: const Color(0xFFE5E7EB),
                    ),
                  ),
                ],
                if (expiringSoon) ...[
                  const SizedBox(height: 12),
                  const NoticeBox(
                    icon: LucideIcons.circleAlert,
                    tone: StatusTone.warning,
                    child: Text('Este cupom expira em breve! Aproveite agora.'),
                  ),
                ],
                if (almostFull) ...[
                  const SizedBox(height: 12),
                  const NoticeBox(
                    icon: LucideIcons.circleAlert,
                    tone: StatusTone.warning,
                    child: Text('Poucos usos restantes! Garanta o seu desconto.'),
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

/// CSV de "Exportar CSV" com as colunas do PWA. Campos com vírgula ou aspas
/// vão entre aspas para não quebrar a planilha.
String favoritesCsv(List<FavoriteProduct> items) {
  String cell(Object? value) {
    final text = '${value ?? ''}';
    return text.contains(RegExp(r'[",\n]'))
        ? '"${text.replaceAll('"', '""')}"'
        : text;
  }

  return [
    'nome,categoria,subcategoria,preco,estoque,disponivel,adicionado_em',
    for (final item in items)
      [
        item.name,
        item.category,
        item.subcategory,
        (item.promoPrice ?? item.price).toStringAsFixed(2),
        item.stock,
        item.active ? 'Sim' : 'Não',
        item.addedAt == null
            ? ''
            : DateFormat('dd/MM/yyyy').format(item.addedAt!),
      ].map(cell).join(','),
  ].join('\n');
}
